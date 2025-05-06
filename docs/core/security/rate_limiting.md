# rate_limiting.md
```markdown
## Rate Limiting Configuration

### API Rate Limiter
```javascript
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated headers
  store: RedisStore, // Redis-backed storage
  handler: (req, res) => { // Custom response
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
}