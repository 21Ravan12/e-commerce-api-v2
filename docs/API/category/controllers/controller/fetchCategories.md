# Fetch Categories Endpoint Documentation

## `GET /api/category/fetch`

### Description
Retrieves a paginated list of product categories with advanced filtering, sorting, and relationship inclusion capabilities.

### Authentication
- **Optional**: No authentication required for basic access
- **Admin Features**: Add `?admin=true` to view all fields (requires valid JWT)

### Query Parameters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `page` | Number | Pagination page number | 1 | `?page=2` |
| `limit` | Number | Items per page | 25 | `?limit=50` |
| `isActive` | Boolean | Filter by active status | All | `?isActive=true` |
| `parentCategory` | String | Filter by parent category ID | All | `?parentCategory=507f1f77bcf86cd799439011` |
| `hasProducts` | Boolean | Only categories containing products | All | `?hasProducts=true` |
| `search` | String | Search term (name/description) | None | `?search=electronics` |
| `includeChildren` | Boolean | Include subcategories | false | `?includeChildren=true` |
| `sort` | String | Sort field and direction | `displayOrder:asc` | `?sort=-name` |
| `admin` | Boolean | Show admin-only fields | false | `?admin=true` |

### Response Structure

**Successful Response (200):**
```json
{
  "categories": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Electronics",
      "slug": "electronics",
      "description": "All electronic devices",
      "image": "/images/electronics.jpg",
      "productCount": 42,
      "links": {
        "self": "/categories/electronics",
        "products": "/products?category=electronics"
      },
      "children": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Laptops",
          "slug": "laptops",
          "image": "/images/laptops.jpg"
        }
      ]
    }
  ],
  "total": 15,
  "page": 1,
  "pages": 3,
  "filters": {
    "isActive": true,
    "parentCategory": null,
    "search": "electronics",
    "includeChildren": true
  }
}