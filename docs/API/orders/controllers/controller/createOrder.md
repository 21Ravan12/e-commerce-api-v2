# Create Order Endpoint Documentation

## `POST /api/orders/add`

### Description
Creates a new customer order with comprehensive validation, inventory checks, and payment processing. Handles the complete order lifecycle from cart to fulfillment.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: Authenticated user

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |

### Request Body Schema
```json
{
  "shippingAddress": {
    "street": "string (required)",
    "city": "string (required)",
    "state": "string (required)",
    "postalCode": "string (required)",
    "country": "string (required)"
  },
  "paymentMethod": "enum: credit_card/paypal/stripe/cod/bank_transfer/cash_on_delivery (required)",
  "shippingMethod": "enum: standard/express/next_day (default: standard)",
  "promotionCode": "string (3-20 chars, optional)"
}