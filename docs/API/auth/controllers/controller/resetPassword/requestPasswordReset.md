# Password Reset Module Documentation

## Endpoint: `/api/auth/request-password-reset` (POST)

### Security Workflow
1. **Initial Validation**
   - Strict Content-Type enforcement (application/json only)
   - Joi schema validation with:
     - All error reporting (not just first error)
     - Unknown field stripping
     - XSS filtering on email input

2. **Rate Limiting**
   - Redis-tracked attempts per email:
     - 200 max attempts per hour
     - 5-minute sliding window
     - Automatic 1-hour lockout on threshold breach

3. **Identity Verification**
   - Email normalization (lowercase + trim)
   - Cryptographic hashing for database lookup
   - Account status check (active accounts only)

4. **Token Generation**
   - 16-byte verification code
   - 32-byte hex challenge string
   - Redis storage with:
     - 15-minute TTL
     - Device fingerprinting
     - IP/user-agent tracking

### Response Patterns

**Successful Request (200)**
```json
{
  "message": "If this email exists, a reset link has been sent",
  "cooldown": 300,
  "challenge": "e5f7a9b3...",
  "security": {
    "token_expiry": 900,
    "max_attempts": 3
  }
}