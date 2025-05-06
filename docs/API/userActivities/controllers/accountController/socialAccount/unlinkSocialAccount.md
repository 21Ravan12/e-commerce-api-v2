# Unlink Social Account Endpoint Documentation

## `POST /api/userActivities/social/unlink`

### Description
Allows authenticated users to unlink a social media account from their profile. Handles logging and ensures proper tracking for auditing purposes.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header             | Value                                    | Required |
|--------------------|------------------------------------------|----------|
| `Authorization`     | `Bearer <token>`                         | Yes      |
| `Content-Type`      | `application/json`                       | Yes      |

### Request Body Schema
```json
{
  "provider": "string (required)"
}
