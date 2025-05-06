# Fetch Category Endpoint Documentation

## `GET /api/category/fetch/:id`

### Description
Retrieves detailed information about a specific product category including optional hierarchical relationships.

### Authentication
- **Required**: No
- **Optional Admin Fields**: Include `?admin=true` in query for sensitive fields

### Request Parameters

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Valid MongoDB ObjectId |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `admin` | Boolean | false | Include admin-only fields (isActive, displayOrder, seo) |
| `include` | String | - | Set to "children" to include subcategories |

### Response Schema

**Base Response Fields:**
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string",
  "slug": "string",
  "image": "string|null",
  "parentCategory": {
    "_id": "ObjectId",
    "name": "string",
    "slug": "string"
  } | null,
  "links": {
    "self": "string",
    "products": "string"
  },
  "productCount": "number"
}