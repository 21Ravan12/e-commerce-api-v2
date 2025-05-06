# Update Admin Return Request Endpoint Documentation

## `PUT /api/return-requests/update-admin/:id`

### Description
Allows administrators to update return requests with extended privileges including status changes, refund processing, and administrative notes. Enforces strict validation and comprehensive audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No |

### Path Parameters
| Parameter | Description |
|-----------|-------------|
| `id` | Valid Return Request ID (MongoDB ObjectId) |

### Request Body Schema
```json
{
  "status": "enum: pending/approved/rejected/processing/completed/refunded",
  "adminNotes": "string (max 1000 chars, optional)",
  "returnShippingMethod": "enum: customer/merchant/pickup",
  "exchangeProductId": "ObjectId (conditional)",
  "refundMethod": "enum: original_payment/store_credit/bank_transfer",
  "restockingFee": "number (0-100, 2 decimal places)"
}