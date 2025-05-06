# Update Profile Endpoint Documentation

## `PUT /api/userActivities/profile/update`

### Description
Allows authenticated users to update their profile details, including username and avatar. Handles input validation, profile data update, and detailed audit logging.

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
  "username": "string (optional, 3-30 chars, alphanumeric with underscores)",
  "avatar": "string (optional, URL)"
}
