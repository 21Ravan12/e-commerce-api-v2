# Get Preferences Endpoint Documentation

## `GET /api/users/preferences/get`

### Description
Allows authenticated users to retrieve their preferences. If preferences have not been set, default preferences will be returned.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Response Body Schema
```json
{
  "theme": "string (e.g., light or dark)",
  "language": "string (e.g., en or tr)",
  "notifications": {
    "email": "boolean",
    "sms": "boolean"
  },
  "cancellationReason": "string (max 500 chars, optional)"
}
