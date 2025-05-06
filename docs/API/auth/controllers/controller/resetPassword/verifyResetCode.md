# Password Reset Verification Module Documentation

## Endpoint: `/api/auth/verify-reset-code` (POST)

### Verification Flow
1. **Request Validation**
   - Enforces JSON content-type
   - Validates challenge and code format
   - Implements IP-based rate limiting (50 attempts/hour)

2. **Challenge Verification**
   - Retrieves encrypted reset data from Redis
   - Tracks attempts (max 3 per challenge)
   - Auto-expires after 15 minutes

3. **Code Matching**
   - Compares input against stored verification code
   - Invalidates challenge after 3 failed attempts

4. **Token Generation**
   - Creates one-time reset token (32-byte hex)
   - Sets 15-minute expiration
   - Stores token-user mapping in Redis

### Security Protocol
| Protection Layer      | Implementation Details |
|----------------------|-----------------------|
| Rate Limiting        | Dual-layer (IP + challenge) |
| Data Validation      | Joi schema enforcement |
| Token Security       | Cryptographically random |
| Session Management   | Redis-backed state |
| Audit Trail         | Full request context logging |

### Response Types

**Success (200)**
```json
{
  "message": "Verification successful",
  "resetToken": "a1b2c3...",
  "security": {
    "token_expiry": 900,
    "single_use": true
  }
}