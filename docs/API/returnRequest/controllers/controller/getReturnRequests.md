# Get Return Requests Endpoint Documentation

## `GET /api/returnRequest/get`

### Description
Retrieves a paginated list of return requests with advanced filtering and sorting capabilities. The response varies based on user role (customer vs admin).

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scopes**: 
  - Customers: `read:returns` 
  - Admins: `read:all-returns`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No |

### Query Parameters
| Parameter | Type | Default | Description | Validation |
|-----------|------|---------|-------------|------------|
| `page` | Integer | 1 | Pagination page number | Min: 1 |
| `limit` | Integer | 10 | Items per page | Min: 1, Max: 100 |
| `status` | String | - | Filter by status | `pending`/`approved`/`rejected`/`processing`/`completed`/`refunded` |
| `returnType` | String | - | Filter by return type | `refund`/`exchange`/`store_credit` |
| `orderId` | ObjectId | - | Filter by original order | Valid MongoDB ID |
| `sort` | String | `-createdAt` | Sort field(s) | Comma-separated fields with optional `-` prefix for descending |

### Response Schema (200)
```json
{
  "success": true,
  "data": {
    "returnRequests": [
      {
        "id": "ObjectId",
        "reason": "string",
        "status": "string",
        "returnType": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "customer": {
          "id": "ObjectId"
        },
        "order": {
          "id": "ObjectId"
        },
        "exchangeProduct": {
          "id": "ObjectId",
          "name": "string",
          "price": "number"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    },
    "_links": {
      "self": { "href": "string" },
      "first": { "href": "string" },
      "last": { "href": "string" },
      "prev": { "href": "string" },
      "next": { "href": "string" }
    }
  }
}