const crypto = require('crypto');
const RedisClient = require('../../lib/redis'); // Using your RedisClient class

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};


const verifyCSRFToken = async (req, res, next) => {
  try {
    const token =
      req.headers['x-csrf-token'] ||
      req.headers['xsrf-token'] ||
      req.cookies['XSRF-TOKEN'];

    if (!token) {
      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_MISSING'
      });
    }

    const stored = await RedisClient.get(`csrf:${token}`);

    if (!stored) {
      return res.status(403).json({
        error: 'Invalid or expired CSRF token',
        code: 'CSRF_INVALID'
      });
    }

    // Optional: You can delete the token after verification to make it single-use
    // await RedisClient.del(`csrf:${token}`);

    next();
  } catch (err) {
    logger.error(`CSRF token verification error: ${err.message}`);
    res.status(500).json({ error: 'Failed to verify CSRF token' });
  }
};


module.exports = {
  generateCSRFToken,
  verifyCSRFToken
};