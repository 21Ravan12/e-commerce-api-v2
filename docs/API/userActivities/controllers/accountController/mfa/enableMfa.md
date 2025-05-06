# Enable MFA Endpoint Documentation

## `POST /api/auth/mfa/enable`

### Description
Enables Multi-Factor Authentication (MFA) for the authenticated user using an authenticator app. This includes generating a secret key, QR code URL, backup codes, and logging the action for audit purposes.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value              | Required |
|--------|--------------------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type`  | `application/json` | Yes |

### Request Body Schema
**No body parameters are required for this request.**

### Response Schema (200 OK)
```json
{
  "message": "MFA enabled successfully",
  "qrUrl": "string (OTPAuth URL for QR code)",
  "expiresAt": "ISO 8601 datetime (expires in 5 minutes)",
  "backupCodesExpireAt": "ISO 8601 datetime (expires in 30 days)",
  "secret": "string (only in development)",
  "backupCodes": ["string", "string", "..."] // only in development
}
