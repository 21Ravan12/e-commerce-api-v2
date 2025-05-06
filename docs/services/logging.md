# logging.md
```markdown
```javascript
// Logging System Documentation
// ===========================

// Import and configure Winston logger
const winston = require('winston');

/**
 * Logger Configuration:
 * - Level: 'info' (minimum log level)
 * - Format: Timestamp + log level + message
 * - Transports:
 *   - Console output
 *   - File output ('logs/app.log')
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => 
      `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// Compatibility Methods
logger.warning = logger.warn;  // Alias for .warn()
logger.debug = logger.debug;   // Explicit debug method

// Available Log Levels:
// - logger.error('message')   // For errors
// - logger.warn('message')    // For warnings
// - logger.info('message')    // For informational messages

// Example Usage:
// logger.info('Server started on port 3000');
// logger.error('Database connection failed', { error: err });

module.exports = logger;