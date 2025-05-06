# Deactivate Account Endpoint Documentation

## `PATCH /api/userActivities/deactivate`

### Description
Allows authenticated users to deactivate their accounts. Updates the account status to `suspended`, logs the action for auditing purposes, and optionally stores a user-provided reason for the deactivation.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |
| `x-device-fingerprint` | `string` | No |
| `x-geo-location` | `string` | No |

### Request Body Schema
```json
{
  "reason": "string (optional, max 500 chars)"
}
