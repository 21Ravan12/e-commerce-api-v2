# Get Campaign Endpoint Documentation

## `GET /api/campaign/get/:id`

### Description
Retrieves complete details for a specific marketing campaign including all associated references and metadata.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: None (public endpoint)

### Request Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | URL path | Valid MongoDB ObjectId |

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | ObjectId | Unique campaign identifier |
| `campaignName` | String | Marketing display name |
| `campaignType` | String | Discount type (fixed/percentage/etc) |
| `status` | String | Current lifecycle state |
| `startDate` | ISO Date | Activation timestamp |
| `endDate` | ISO Date | Expiration timestamp |
| `isActive` | Boolean | Computed active status |
| `campaignAmount` | Number | Discount value/percentage |
| `usage*` fields | Number | Usage tracking metrics |
| `min/max` amounts | Number | Purchase/discount limits |
| `customerSegments` | String | Target audience type |
| `media` fields | String | Marketing assets URLs |
| `timestamps` | ISO Date | Creation/modification times |
| `references` | Object[] | Populated category/product/customer data |

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

### Success Response (200)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "campaignName": "Summer Sale 2024",
  "campaignType": "percentage",
  "status": "active",
  "startDate": "2024-06-01T00:00:00Z",
  "endDate": "2024-08-31T23:59:59Z",
  "isActive": true,
  "campaignAmount": 20,
  "usageLimit": 1000,
  "usageCount": 342,
  "minPurchaseAmount": 50,
  "maxDiscountAmount": 100,
  "validCategories": [
    {
      "_id": "5123f6f8bcf86cd799439012",
      "name": "Electronics",
      "slug": "electronics"
    }
  ],
  "promotionCodes": ["SUMMER24"],
  "createdAt": "2024-01-15T09:30:00Z"
}