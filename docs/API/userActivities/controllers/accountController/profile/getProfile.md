# Get Profile Endpoint Documentation

## `GET /api/userActivities/profile/get`

### Description
Allows authenticated users to retrieve their profile details. The response includes basic account information such as the account verification status and username.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header           | Value                        | Required |
|------------------|------------------------------|----------|
| `Authorization`  | `Bearer <token>`             | Yes      |
| `Content-Type`   | `application/json`           | Yes      |

### Response
#### Success (200)
```json
{
  "accountVerified": true,
  "username": "john_doe"
}
