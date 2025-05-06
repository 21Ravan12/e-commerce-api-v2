# Admin Order Update Endpoint Documentation

## `PUT /api/orders/admin-update/:id`

### Description
Allows administrators to modify any order with comprehensive validation, status transition checks, and automatic refund processing. Includes detailed audit logging of all changes.

---

## Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

---

## Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String (ObjectId) | Yes | Order ID to update |

---

## Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |

---

## Request Body Schema
```json
{
  "status": "pending|processing|shipped|delivered|cancelled|refunded",
  "paymentStatus": "pending|completed|failed|refunded",
  "shippingAddress": {
    "street": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "country": "string"
  },
  "shippingMethod": "standard|express|next_day",
  "adminNotes": "string (max 1000 chars)",
  "forceUpdate": "boolean (default: false)"
}