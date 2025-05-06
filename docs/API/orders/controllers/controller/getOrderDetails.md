# Get Order Details Endpoint Documentation

## `GET /api/orders/get/:orderId`

### Description
Retrieves comprehensive details for a specific order, including line items, shipping information, and order history. The endpoint enforces order ownership validation to ensure users can only access their own orders.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scopes**: `customer` or `admin`

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | String | Yes | Valid MongoDB Order ID |

### Response Structure

**Success Response (200):**
```json
{
  "order": {
    "_id": "ObjectId",
    "orderNumber": "String",
    "status": "String",
    "paymentMethod": "String",
    "paymentStatus": "String",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "estimatedDelivery": "ISO8601",
    "subtotal": "Number",
    "tax": "Number",
    "shippingCost": "Number",
    "total": "Number",
    "shippingAddress": {
      "street": "String",
      "city": "String",
      "state": "String",
      "postalCode": "String",
      "country": "String"
    },
    "shippingMethod": "String",
    "items": [
      {
        "productId": "ObjectId",
        "product": {
          "name": "String",
          "description": "String",
          "images": ["String"],
          "slug": "String",
          "stock": "Number"
        },
        "quantity": "Number",
        "priceAtPurchase": "Number",
        "subtotal": "Number"
      }
    ],
    "history": [
      {
        "timestamp": "ISO8601",
        "event": "String",
        "details": "String"
      }
    ]
  },
  "message": "Order details retrieved successfully"
}