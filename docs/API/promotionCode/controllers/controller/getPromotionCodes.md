# Get Promotion Codes Endpoint Documentation

## `GET /api/promotionCode/get`

### Description
Retrieves a paginated list of promotion codes with advanced filtering capabilities. Returns enhanced code information including calculated fields like `isActive` status and `remainingUses`.

### Authentication
- **Optional**: Bearer Token (JWT) for extended results

### Query Parameters
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `page` | Integer | 1 | ≥1 | Pagination page number |
| `limit` | Integer | 10 | 1-100 | Items per page |
| `status` | String | - | `active`/`inactive`/`expired`/`upcoming` | Filter by administrative status |
| `type` | String | - | `percentage`/`fixed`/`free_shipping`/`bundle` | Filter by discount type |
| `active` | Boolean | - | - | Filters currently active codes (date-sensitive) |
| `search` | String | - | ≤100 chars | Search term for code/description |

### Response Structure
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 2,
  "pages": 5,
  "promotionCodes": [
    {
      "_id": "ObjectId",
      "promotionCode": "SUMMER25",
      "promotionType": "percentage",
      "promotionAmount": 25,
      "startDate": "ISO8601",
      "endDate": "ISO8601",
      "isActive": true,
      "remainingUses": 42,
      "usageLimit": 100,
      "minPurchaseAmount": 50,
      "links": {
        "self": "/promotion-codes/abc123",
        "admin": "/admin/promotion-codes/abc123"
      }
    }
  ],
  "links": {
    "first": "/promotion-codes?page=1&limit=10",
    "last": "/promotion-codes?page=5&limit=10",
    "prev": "/promotion-codes?page=1&limit=10",
    "next": "/promotion-codes?page=3&limit=10"
  }
}