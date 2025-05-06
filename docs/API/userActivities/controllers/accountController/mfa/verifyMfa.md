# Verify MFA Endpoint Documentation

## `POST /api/auth/mfa/verify`

### Description
Verifies a user's Multi-Factor Authentication (MFA) code during the login or authentication process. Supports TOTP and backup codes. Includes rate limiting, audit logging, and device tracking. On success, issues access and refresh tokens.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `auth:verify_mfa`

### Request Headers
| Header           | Value                 | Required |
|------------------|-----------------------|----------|
| `Authorization`  | `Bearer <token>`      | Yes      |
| `Content-Type`   | `application/json`    | Yes      |

### Request Body Schema
```json
{
  "code": "string (required, TOTP or backup code)",
  "deviceId": "string (optional)",
  "deviceName": "string (optional, used if deviceId is not provided)"
}
