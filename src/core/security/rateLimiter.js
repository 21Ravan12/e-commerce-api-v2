const rateLimit = require('express-rate-limit');
const { default: RedisStore } = require('rate-limit-redis');
const redisClient = require('../../lib/redis'); // Using your RedisClient class

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args), // Correct way to use ioredis
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Login attempts
  skipSuccessfulRequests: true,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

module.exports = {
  apiLimiter,
  authLimiter,
};