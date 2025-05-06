# Remove from Wishlist Endpoint Documentation

## `DELETE /api/wishlist/:productId`

### Description
Allows authenticated users to remove a specific product from their wishlist. Also logs the operation for audit and debugging purposes.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header           | Value               | Required |
|------------------|---------------------|----------|
| `Authorization`  | `Bearer <token>`    | Yes      |
| `Content-Type`   | `application/json`  | Yes      |

### Path Parameters
| Parameter   | Type   | Description              |
|-------------|--------|--------------------------|
| `productId` | String | Valid MongoDB Product ID |

### Request Body Schema
_None_

### Success Response

**Status Code**: `200 OK`

**Response Body**:
```json
{
  "success": true,
  "message": "Product removed from wishlist.",
  "productDetails": {
    "id": "string",
    "name": "string",
    "price": "number"
  }
}
