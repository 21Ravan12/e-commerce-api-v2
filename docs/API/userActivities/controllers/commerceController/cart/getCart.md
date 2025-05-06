# Get Cart Endpoint Documentation

## `GET /api/cart`

### Description
Retrieves the current user's shopping cart with populated product details, total cost, and item count. Handles edge cases like suspended accounts and logs all access attempts.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header           | Value                 | Required |
|------------------|-----------------------|----------|
| `Authorization`  | `Bearer <token>`      | Yes      |
| `Content-Type`   | `application/json`    | Yes      |

### Response Schema
```json
{
  "items": [
    {
      "_id": "string",
      "product": {
        "_id": "string",
        "name": "string",
        "price": number
      },
      "quantity": number,
      "itemTotal": number
    }
  ],
  "total": number,
  "itemsCount": number,
  "updatedAt": "ISODate string"
}
