# Get Promotion Code Endpoint Documentation

## `GET /api/promotionCode/get:id`

### Description
Retrieves detailed information about a specific promotion code, including calculated virtual properties.

### Authentication
- **Type**: None (Public endpoint)
- **Required Role**: None

### Path Parameters
| Parameter | Type | Description | Validation |
|-----------|------|-------------|------------|
| `id` | String | Promotion Code ID | Valid MongoDB ObjectId |

### Response Headers
| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

### Success Response (200)
```json
{
  "promotionCode": {
    "_id": "ObjectId",
    "promotionCode": "string",
    "startDate": "ISO 8601",
    "endDate": "ISO 8601",
    "promotionType": "fixed/percentage/free_shipping/bundle",
    "promotionAmount": "number",
    "usageLimit": "number|null",
    "usageCount": "number",
    "status": "string",
    "isActive": "boolean",
    "remainingUses": "number|null",
    "minPurchaseAmount": "number|null",
    "maxDiscountAmount": "number|null"
  },
  "links": {
    "list": "/promotion-codes",
    "edit": "/admin/promotion-codes/:id/edit"
  }
}