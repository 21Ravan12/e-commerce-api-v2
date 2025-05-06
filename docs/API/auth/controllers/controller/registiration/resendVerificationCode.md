# Verification Code Resend Module Documentation

## Endpoint: `/api/auth/resend-verification-code` (POST)

### Request Flow
1. **Request Validation**
   - Strict Content-Type enforcement (application/json)
   - Schema validation using Joi
   - Challenge parameter sanitization

2. **Session Retrieval**
   - Redis lookup with encrypted challenge key
   - Multi-layer decryption process
   - JSON parsing with data integrity checks

3. **Code Regeneration**
   - New 16-byte verification code
   - Fresh Redis challenge key
   - SHA-256 hashed token storage

4. **Data Protection**
   - Re-encryption of all session data
   - Automatic old key invalidation
   - 24-hour verification expiry

5. **Email Delivery**
   - Decrypts recipient email
   - Sends new verification code
   - Automatic cleanup on failure

### Security Features
| Layer               | Implementation Details |
|---------------------|-----------------------|
| Data Validation     | Triple-layer (headers, schema, runtime) |
| Encryption          | End-to-end AES-256 encryption |
| Token Rotation      | Full challenge/key regeneration |
| Headers             | CSP, X-Frame-Options, No-Sniff |
| Audit Logging       | Full request context capture |
| Error Sanitization  | Stack traces only in development |

### Response Types

**Success (200)**
```json
{
  "message": "New verification code sent to your email",
  "cooldown": 180,
  "challenge": "x9y8z7w6...",
  "security": {
    "level": "high",
    "features": [
      "token_rotation", 
      "encrypted_storage",
      "header_protection"
    ]
  }
}