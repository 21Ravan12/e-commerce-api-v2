# Update Cart Item Endpoint Documentation

## `PUT /api/cart/items/:itemId`

### Description
Allows authenticated users to update items in their shopping cart. Handles updating the quantity, size, color, or other item attributes.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Path Parameters
| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `itemId`  | String | Valid MongoDB Item ID (to identify the cart item) |

### Request Body Schema
```json
{
  "quantity": "number (optional)",
  "size": "string (optional)",
  "color": "string (optional)"
}
