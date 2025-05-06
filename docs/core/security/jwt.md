# JWT Utilities Documentation

## Core Functions

### `createAccessToken(user)`
Creates a signed JWT access token with:
- **Payload**:
  - `userId`: User's MongoDB _id (string)
  - `role`: User role from authentication
  - `authLevel`: "full" for admin, "standard" for others
- **Configuration**:
  - Uses `JWT_SECRET` from environment
  - Expires based on `ACCESS_TOKEN_EXPIRY` env var
  - HS256 algorithm

### `createRefreshToken(user)`
Creates a signed refresh token with:
- **Payload**:
  - `userId`: User's MongoDB _id (string)
- **Configuration**:
  - Uses `JWT_SECRET` from environment
  - Expires based on `REFRESH_TOKEN_EXPIRY` env var
  - HS256 algorithm

### `authenticate(req, res, next)`
Authentication middleware that:
1. Checks for token in:
   - Cookies (accessToken)
   - Authorization header (Bearer token)
2. Validates token claims:
   - Requires `userId` and `role`
3. Sets `req.user` with standardized:
   - `_id`: User ID
   - `role`: User role
   - `authLevel`: Authorization level

## Helper Functions

### `extractTokenFromHeader(req)`
Extracts Bearer token from:
- `Authorization: Bearer <token>` headers

### `verifyToken(token)`
Verifies token with:
- JWT_SECRET validation
- Payload structure check
- Error handling for:
  - Expired tokens
  - Invalid signatures
  - Malformed payloads

## Security Features
- Environment variable validation
- Standardized error messages
- Token claim verification
- Dual token source (cookies + headers)

## Example Usage
```javascript
// Token creation
const accessToken = jwtUtils.createAccessToken(user);
const refreshToken = jwtUtils.createRefreshToken(user);

// Route protection
router.get('/protected', jwtUtils.authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Token extraction
const token = jwtUtils.extractTokenFromHeader(request);