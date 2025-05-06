# Disable MFA Endpoint Documentation

## `POST /api/auth/mfa/disable`

### Description
Allows authenticated users to disable Multi-Factor Authentication (MFA) on their account. This endpoint verifies the user's TOTP or backup code, clears all MFA settings, and logs audit events for security tracking.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value               | Required |
|--------|---------------------|----------|
| `Authorization` | `Bearer <token>`     | Yes      |
| `Content-Type`  | `application/json`   | Yes      |

### Request Body Schema
```json
{
  "verificationCode": "string (required)"
}
