# Authentication Module Documentation

## Endpoint: `/api/auth/login` (POST)

### Request Flow
1. **Content Validation**
   - Enforces JSON content-type
   - Validates against Joi schema with strict rules
   - Normalizes email (lowercase + trim)

2. **Credential Verification**
   - Locates user via email hash
   - Validates bcrypt password format
   - Performs secure password comparison

3. **Account Checks**
   - Verifies account status (active/inactive)
   - Confirms password login availability
   - Validates role assignment

4. **Session Initiation**
   - Generates JWT access/refresh tokens
   - Updates login metadata (IP, timestamps)
   - Records login history

### Security Features
| Layer               | Implementation Details |
|---------------------|-----------------------|
| Credential Hashing  | bcrypt password verification |
| Token Generation    | JWT with role claims |
| Cookie Security     | HttpOnly, Secure, SameSite=Strict |
| Headers             | Strict transport security |
| Audit Logging       | Full session metadata |

### Response Types

**Success (200)**
```json
{
  "message": "Login successful",
  "user": {
    "id": "usr_abc123",
    "name": "jdoe2023",
    "email": "user@example.com",
    "role": "customer",
    "mfaEnabled": false
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "accessTokenExpiresIn": 900,
    "refreshTokenExpiresIn": 604800
  }
}