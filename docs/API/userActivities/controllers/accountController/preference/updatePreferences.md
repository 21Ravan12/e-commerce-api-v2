# Update Preferences Endpoint Documentation

## `PUT /api/users/preferences/update`

### Description
Allows authenticated users to update their preferences, including language, theme, and notification settings. Handles validation, preference updates, and audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Request Body Schema
```json
{
  "language": "string (optional, max 2 characters, valid values: en, es, fr, de, tr)",
  "theme": "string (optional, valid values: light, dark, system)",
  "notifications": {
    "email": "boolean (optional)",
    "push": "boolean (optional)",
    "sms": "boolean (optional)"
  }
}
