# Add Campaign Endpoint Documentation

## `POST /api/campaign/add`

### Description
Creates a new marketing campaign with comprehensive validation and audit logging. Requires admin privileges.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |

### Request Body Schema
```json
{
  "campaignName": "string (1-100 chars)",
  "startDate": "ISO 8601 date",
  "endDate": "ISO 8601 date > startDate",
  "campaignType": "enum: fixed/percentage/free_shipping/bundle/buy_x_get_y",
  "campaignAmount": "number (1-100 for %, >0 for fixed)",
  "usageLimit": "number (optional, min 1)",
  "validCategories": "ObjectId[] (optional)",
  "excludedProducts": "ObjectId[] (optional)",
  "minPurchaseAmount": "number (optional)",
  "maxDiscountAmount": "number (required for percentage)",
  "customerSegments": "enum: all/new/returning/vip/custom",
  "customCustomers": "ObjectId[] (required if segment=custom)"
}