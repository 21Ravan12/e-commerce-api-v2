# Logout Module Documentation

## Endpoint: `/api/auth/logout` (POST)

### Request Flow
1. **Token Extraction**
   - Accepts tokens from both cookies and request body
   - Handles missing tokens gracefully

2. **Cookie Cleanup**
   - Clears HTTP-only, secure cookies
   - Matches login cookie configuration:
     ```javascript
     {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'strict',
       domain: process.env.JWT_COOKIE_DOMAIN,
       path: '/'
     }
     ```

3. **Token Verification**
   - Validates access token if present
   - Silently handles expired tokens
   - Extracts user ID and role from valid tokens

4. **Audit Logging**
   - Records logout event with:
     - User metadata
     - Device fingerprint
     - Session type
   - Hashes sensitive email information

### Security Features
| Feature               | Implementation Details |
|-----------------------|-----------------------|
| Cookie Security       | HTTP-only, SameSite=strict |
| Token Handling        | Graceful expiration handling |
| Audit Trail           | Full session termination record |
| Error Handling        | Silent failures for non-critical operations |

### Response Types

**Successful Logout (200)**
```json
{
  "message": "Logout successful",
  "status": "success",
  "timestamp": "2023-07-15T12:34:56.789Z",
  "user": {
    "id": "507f1f77bcf86cd799439011"
  }
}