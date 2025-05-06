# Change User Role Endpoint Documentation

## `PATCH /api/userActivities/role/change`

### Description
Allows administrators to change the role of a specific user. Captures full audit logs for accountability, including metadata like reason, IP, device fingerprint, and user agent.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header               | Value               | Required |
|----------------------|---------------------|----------|
| `Authorization`      | `Bearer <token>`    | Yes      |
| `Content-Type`       | `application/json`  | Yes      |
| `x-device-fingerprint` | `string`         | No       |
| `x-geo-location`     | `string`            | No       |

### Request Body Schema
```json
{
  "userId": "string (valid MongoDB user ID)",
  "newRole": "string (e.g., 'moderator', 'admin')",
  "reason": "string (optional, max 500 chars)"
}
