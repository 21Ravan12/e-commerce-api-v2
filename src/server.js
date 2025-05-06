require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');
const { app, initializeDatabase } = require('./app');
const redis = require('./lib/redis');
const logger = require('./services/logger');
const mongoose = require('mongoose');
const port = process.env.PORT || 443;

function validateFilePath(filePath, description) {
  if (!filePath || !fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
    throw new Error(`${description} is invalid or not a file: ${filePath}`);
  }
}

function getSslOptions() {
  try {
    validateFilePath(process.env.SSL_KEY_PATH, 'SSL Key Path');
    validateFilePath(process.env.SSL_CERT_PATH, 'SSL Cert Path');
    
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
      minVersion: 'TLSv1.2',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256'
      ].join(':'),
      honorCipherOrder: true
    };

    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SSL_CA_PATH) {
        throw new Error('SSL_CA_PATH is required in production');
      }
      validateFilePath(process.env.SSL_CA_PATH, 'SSL CA Path');
      options.ca = fs.readFileSync(process.env.SSL_CA_PATH);
      options.requestCert = true;
      options.rejectUnauthorized = true;
    }

    return options;
  } catch (err) {
    logger.error('SSL configuration error:', err);
    throw err;
  }
}

async function startServer() {
  try {
    await Promise.all([
      redis.connect().catch(err => {
        logger.error('Redis connection error:', err);
        throw err;
      }),
      initializeDatabase()
    ]);
    
    logger.info('Redis and MongoDB connected successfully');

    const sslOptions = getSslOptions();
    const server = https.createServer(sslOptions, app);

    server.listen(port, () => {
      logger.info(`Secure server running on port ${port} (${process.env.NODE_ENV})`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        redis.client?.quit();
        mongoose.connection.close();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        redis.client?.quit();
        mongoose.connection.close();
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (err) {
    logger.error('Server failed to start:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  startServer().catch(err => {
    logger.error('Fatal error during server startup:', err);
    process.exit(1);
  });
} else {
  logger.error('Invalid NODE_ENV value. Server not started.');
  process.exit(1);
}