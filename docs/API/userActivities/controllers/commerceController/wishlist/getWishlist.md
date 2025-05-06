# Get Wishlist Endpoint Documentation

## `GET /api/users/wishlist`

### Description
Allows authenticated users to retrieve their wishlist. The response includes the list of wishlist items and their count. An audit log is created for both successful and failed attempts to access the wishlist.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header           | Value                  | Required |
|------------------|------------------------|----------|
| `Authorization`  | `Bearer <token>`       | Yes      |
| `Content-Type`   | `application/json`     | Yes      |

### Request Body
_Not required._

### Response
#### Success Response (200 OK)
```json
{
  "wishlist": [ /* Array of wishlist items */ ],
  "count": 5
}
