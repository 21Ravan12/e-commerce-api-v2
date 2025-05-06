# Add to Wishlist Endpoint Documentation

## `POST /api/wishlist/add`

### Description
Allows authenticated users to add a product to their wishlist. Also creates a detailed audit log of the action, including metadata such as product name and price.

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
  "productId": "string (required)"
}
