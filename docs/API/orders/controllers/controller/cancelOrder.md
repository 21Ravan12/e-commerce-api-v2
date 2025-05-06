# Cancel Order Endpoint Documentation

## `PUT /api/orders/cancel/:id`

### Description
Allows authenticated users to cancel their own orders. Handles order status updates, refund processing (when applicable), and comprehensive audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | String | Valid MongoDB Order ID |

### Request Body Schema
```json
{
  "cancellationReason": "string (max 500 chars, optional)"
}