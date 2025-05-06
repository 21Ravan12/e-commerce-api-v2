# Link Social Account Endpoint Documentation

## `POST /api/userActivities/social/link`

### Description
Allows authenticated users to link their social media accounts (e.g., Facebook, Google, etc.) to their profile. It associates a user's social media credentials with their existing user account.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header             | Value                      | Required |
|--------------------|----------------------------|----------|
| `Authorization`     | `Bearer <token>`           | Yes      |
| `Content-Type`      | `application/json`         | Yes      |

### Request Body Schema
```json
{
  "provider": "string (e.g., 'google', 'facebook')",
  "providerId": "string (unique ID from social provider)"
}
