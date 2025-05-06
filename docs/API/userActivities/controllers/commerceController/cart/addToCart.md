# Add to Cart Endpoint Documentation

## `POST /api/cart/add`

### Description
Allows authenticated users to add products to their shopping cart. This endpoint handles adding a product to the user's cart, specifying quantity, size, and color. It also logs the action for audit purposes.

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
  "productId": "string (required)",
  "quantity": "integer (required)",
  "size": "string (optional)",
  "color": "string (optional)"
}
