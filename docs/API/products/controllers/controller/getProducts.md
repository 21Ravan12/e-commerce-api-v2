# Get Products Endpoint Documentation

## `GET /api/products/fetch/products`

### Description
Retrieves a paginated list of products with advanced filtering, sorting, and caching capabilities. Designed for high-performance catalog browsing.

### Authentication
- **Optional**: Bearer Token (JWT) for personalized results

### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | Number | Pagination page number | 1 |
| `limit` | Number | Items per page (max 100) | 10 |
| `status` | String | Filter by product status (`draft`/`published`/etc) | All active |
| `search` | String | Full-text search query | None |
| `sortBy` | String | Sort field and direction (`field:asc`/`field:desc`) | `createdAt:desc` |

### Cache Strategy
- **Redis Cache**: 5-minute TTL
- **Cache Key**: Composite of all query parameters
- **Bypass Cache**: `Cache-Control: no-cache` header

### Response Fields
```json
{
  "success": true,
  "data": {
    "count": 25,
    "total": 150,
    "page": 2,
    "pages": 6,
    "products": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Premium Widget",
        "description": "High-quality widget...",
        "price": 29.99,
        "category": "64a3b...",
        "stockQuantity": 42,
        "status": "published",
        "createdAt": "2023-07-15T09:30:00Z",
        "links": {
          "self": "/products/507f1f77bcf86cd799439011"
        }
      }
    ]
  },
  "links": {
    "self": "/products?page=2&limit=25",
    "prev": "/products?page=1&limit=25",
    "next": "/products?page=3&limit=25"
  },
  "metadata": {
    "transactionId": "a1b2c3d4-e5f6-7890",
    "processedIn": "48ms"
  }
}