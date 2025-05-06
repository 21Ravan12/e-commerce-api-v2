# Clear Cart Endpoint Documentation

## `DELETE /api/cart/clear`

### Description
Allows authenticated users to clear all items from their shopping cart. Logs the operation through the audit logging system, capturing metadata such as the number of items removed and the user's device info.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header           | Value                  | Required |
|------------------|------------------------|----------|
| `Authorization`  | `Bearer <token>`       | Yes      |
| `Content-Type`   | `application/json`     | Yes      |

### Request Body
No request body is required.

### Response
- **200 OK**  
  Returns a JSON object containing the result of the clear operation, including the number of items removed.

```json
{
  "message": "Cart cleared successfully",
  "itemsRemoved": 5
}
