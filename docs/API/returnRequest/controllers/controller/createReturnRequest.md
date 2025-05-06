# Create Return Request Endpoint Documentation

## `POST /api/returnRequest/add`

### Description
Creates a new product return request with comprehensive validation and processing. Handles refunds, exchanges, and store credit requests.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `customer` or `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No |

### Request Body Schema
```json
{
  "orderId": "ObjectId (required)",
  "reason": "string (required, max 255 chars)",
  "description": "string (optional, max 500 chars)",
  "returnType": "enum: refund/exchange/store_credit (required)",
  "returnShippingMethod": "enum: customer/merchant/pickup (default: customer)",
  "exchangeProductId": "ObjectId (required for exchanges)",
  "refundAmount": "number (required for refund/store_credit, 2 decimal places)"
}