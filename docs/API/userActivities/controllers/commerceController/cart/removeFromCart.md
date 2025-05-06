# Remove from Cart Endpoint Documentation

## `DELETE /api/cart/remove/:itemId`

### Description
Allows authenticated users to remove a specific item from their shopping cart. The operation logs the event in the audit log and returns the updated cart information.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header            | Value                | Required |
|-------------------|----------------------|----------|
| `Authorization`   | `Bearer <token>`     | Yes      |
| `Content-Type`    | `application/json`   | Yes      |

### Path Parameters
| Parameter | Type   | Description              |
|-----------|--------|--------------------------|
| `itemId`  | String | Unique ID of the cart item to be removed |

### Response

#### Success (200 OK)
```json
{
  "message": "Item removed successfully",
  "itemDetails": {
    "productId": "string",
    "quantity": number
  },
  "updatedCart": {
    // Updated cart structure
  }
}
