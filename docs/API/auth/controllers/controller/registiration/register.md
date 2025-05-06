# Registration Module Documentation

## Endpoint: `/api/auth/register` (POST)

### Request Flow
1. **Input Validation**
   - Validates against Joi schema with strict rules
   - Normalizes email (lowercase + trim)
   - Creates secure hashes for email and phone

2. **Duplicate Check**
   - Verifies email/phone uniqueness using cryptographic hashes
   - Returns 409 Conflict if duplicates found

3. **Rate Limiting**
   - Tracks attempts per email (200 max/hour)
   - Implements 5-minute sliding window

4. **Verification Setup**
   - Generates 16-byte verification code
   - Creates 32-byte hex challenge
   - Builds unique username from name components

5. **Data Protection**
   - Encrypts all PII using AES-256
   - Hashes password with bcrypt (10 rounds)

6. **Verification Storage**
   - Stores payload in Redis (15min TTL)
   - Includes device fingerprinting
   - Encrypts all Redis data

7. **Email Delivery**
   - Sends verification code via SMTP
   - Automatic cleanup on failure

### Security Features
| Layer               | Implementation Details |
|---------------------|-----------------------|
| Data Encryption     | AES-256 for PII fields |
| Hashing             | bcrypt (password), SHA-3 (contact info) |
| Rate Limiting       | Redis-backed sliding window |
| Headers             | CSP, X-Frame-Options, No-Sniff |
| Audit Logging       | Full request metadata capture |
| Token Security      | Partial logging of sensitive tokens |

### Response Types

**Success (200)**
```json
{
  "message": "Verification code sent to your email",
  "cooldown": 180,
  "challenge": "a1b2c3d4...",
  "security": {
    "level": "high",
    "features": [
      "csrf_protection",
      "rate_limiting", 
      "encrypted_storage"
    ]
  }
}