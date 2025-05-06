require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const { apiLimiter } = require('./core/security/rateLimiter');
const errorHandler = require('./core/middlewares/errorHandler');
const Category = require('../src/models/Category');
const cookieParser = require('cookie-parser');
const logger = require('../src/services/logger');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');

const app = express();

// 1. Initial Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

const corsOptions = {
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// 2. Body Parsing Middlewares (must come before sanitization)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 3. Cookie Parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// 4. Data Sanitization Middlewares (order is important)
// Move xss-clean before custom sanitization
//app.use(xss());

//app.use(
//  mongoSanitize({
//    replaceWith: '_', // Replace prohibited characters with an underscore
//  })
//);

app.use((req, res, next) => {
  // Custom sanitizer that won't modify read-only properties
  try {
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    next();
  } catch (err) {
    logger.warn('Sanitization warning:', err.message);
    next();
  }

  function sanitize(obj) {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      } else if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/[$<>]/g, '');
      }
    });
  }
});

// 5. Security Middlewares (safer alternatives)
app.use(hpp());

// 6. Rate limiting
app.use('/api/', apiLimiter);

// Database initialization
async function initializeDatabase() {
  try {
    await mongoose.connect(`mongodb://${process.env.DB_HOST}:27017/${process.env.DB_NAME}`);
    logger.info('Connected to MongoDB');

    await Category.initializeRootCategory();
    logger.info('Database categories initialized');
  } catch (err) {
    logger.error('Database initialization failed', err);
    throw err;
  }
}

// Load routes with error handling
try {
  app.use('/api/auth', require('./modules/auth/routes'));
  app.use('/api/category', require('./modules/category/routes'));
  app.use('/api/campaign', require('./modules/campaign/routes'));
  app.use('/api/products', require('./modules/products/routes'));
  app.use('/api/promotionCode', require('./modules/promotionCode/routes'));
  app.use('/api/returnRequest', require('./modules/returnRequest/routes'));
  app.use('/api/userActivities', require('./modules/userActivities/routes'));
  app.use('/api/orders', require('./modules/orders/routes'));
} catch (err) {
  logger.error('Critical error loading routes:', err);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use(errorHandler);

module.exports = { app, initializeDatabase };