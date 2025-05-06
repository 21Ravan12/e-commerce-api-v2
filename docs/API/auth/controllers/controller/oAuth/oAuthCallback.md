# OAuth Callback Module Documentation

## Endpoint: `/api/auth/:provider/callback` (GET)

### Authentication Flow
1. **Provider Handshake**
   - Validates OAuth provider (google/facebook/github)
   - Verifies state parameter against Redis store
   - Processes provider response data

2. **User Resolution**
   - Normalizes and hashes provider email
   - Checks for existing account via email hash
   - Handles new vs returning user paths

3. **Session Management**
   - Generates JWT access/refresh tokens
   - Updates last login timestamp
   - Stores provider metadata

### Security Protocols
| Control               | Implementation |
|-----------------------|---------------|
| State Validation      | Redis-stored state tokens with TTL |
| Email Protection      | SHA-3 hashing of normalized email |
| Token Security        | Short-lived access tokens (JWT) |
| Audit Trail           | Full OAuth context logging |
| Device Fingerprinting | Client device identification |

### Response Types

**Existing User (200)**
```json
{
  "message": "Login successful",
  "user": {
    "id": "usr_abc123",
    "name": "johndoe",
    "email": "user@example.com",
    "role": "customer",
    "mfaEnabled": false
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}