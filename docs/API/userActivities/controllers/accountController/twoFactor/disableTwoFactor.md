# Disable Two-Factor Authentication Endpoint Documentation

## `POST /api/userActivities/2fa/disable`

### Description
Allows authenticated users to disable their two-factor authentication (2FA). This endpoint removes the 2FA secret and updates the user's 2FA status to disabled.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header             | Value                       | Required |
|--------------------|-----------------------------|----------|
| `Authorization`     | `Bearer <token>`            | Yes      |
| `Content-Type`      | `application/json`          | Yes      |

### Request Body Schema
```json
{
  "cancellationReason": "string (max 500 chars, optional)"
}
