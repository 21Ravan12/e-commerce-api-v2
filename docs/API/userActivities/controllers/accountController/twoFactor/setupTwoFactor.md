# Setup Two-Factor Authentication Endpoint Documentation

## `POST /api/userActivities/2fa/enable`

### Description
Allows authenticated users to set up two-factor authentication (2FA) by providing a secret key. This process will enable two-factor authentication for the user account.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Request Body Schema
```json
{
  "secret": "string (required)"
}
