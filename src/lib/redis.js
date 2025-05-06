const redis = require('redis');
const logger = require('../services/logger'); // Assuming you have a logger

class RedisClient {
  
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: process.env.NODE_ENV === 'production',
        rejectUnauthorized: false,
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.client.on('error', (err) => {
      logger.error(`Redis client error: ${err.message}`);
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    // Automatically connect when instantiated
    this.connect().catch(err => {
      logger.error(`Initial Redis connection failed: ${err.message}`);
    });
  }

  async connect() {
    if (!this.client.isOpen && !this.client.isReady) {
      try {
        await this.client.connect();
      } catch (err) {
        logger.error(`Redis connection error: ${err.message}`);
        throw err;
      }
    }
  }

  async set(key, value, options = {}) {
    try {
      await this.connect();
      
      if (!key || typeof key !== 'string') {
        throw new TypeError('Redis key must be a non-empty string');
      }

      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (options.EX) {
        return await this.client.set(key, stringValue, {
          EX: options.EX
        });
      }
      return await this.client.set(key, stringValue);
    } catch (err) {
      logger.error(`Redis set operation failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  async get(key) {
    try {
      await this.connect();
      
      if (!key || typeof key !== 'string') {
        throw new TypeError('Redis key must be a non-empty string');
      }

      const result = await this.client.get(key);
      return result;
    } catch (err) {
      logger.error(`Redis get operation failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  async del(key) {
    try {
      await this.connect();
      
      if (!key || typeof key !== 'string') {
        throw new TypeError('Redis key must be a non-empty string');
      }

      return await this.client.del(key);
    } catch (err) {
      logger.error(`Redis del operation failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  // Inside RedisClient class
  call(...args) {
    try {
      const command = args.map(arg => arg.toString());
      return this.client.sendCommand(command);
    } catch (err) {
      logger.error(`Redis call failed: ${err.message}`);
      throw err;
    }
  }
  
  async exists(key) {
    try {
      await this.connect();
      
      if (!key || typeof key !== 'string') {
        throw new TypeError('Redis key must be a non-empty string');
      }

      return await this.client.exists(key);
    } catch (err) {
      logger.error(`Redis exists operation failed for key ${key}: ${err.message}`);
      throw err;
    }
  }

  async disconnect() {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (err) {
      logger.error(`Redis disconnection failed: ${err.message}`);
      throw err;
    }
  }

  async incr(key) {
    try {
      return await this.client.incr(key);
    } catch (err) {
      console.error('Redis incr error:', err);
      throw err;
    }
  }

  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (err) {
      console.error('Redis expire error:', err);
      throw err;
    }
  }
}

// Singleton instance
const redisClient = new RedisClient();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisClient.disconnect();
  process.exit(0);
});

module.exports = redisClient;