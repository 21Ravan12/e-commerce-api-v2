# Update Category Endpoint Documentation

## `PUT /api/category/update/:id`

### Description
Updates an existing product category with comprehensive validation and audit logging. Requires admin privileges.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |

### Path Parameters
| Parameter | Description |
|-----------|-------------|
| `id` | MongoDB ObjectId of the category to update |

### Request Body Schema
```json
{
  "name": "string (2-50 chars, optional)",
  "description": "string (8-500 chars, optional)",
  "parentCategory": "ObjectId or null (optional)",
  "image": "valid image URL (JPG/PNG/WEBP/SVG, optional)",
  "isActive": "boolean (optional)",
  "displayOrder": "number ≥ 0 (optional)",
  "seo": {
    "metaTitle": "string ≤60 chars (optional)",
    "metaDescription": "string ≤160 chars (optional)",
    "keywords": "string[] (optional)"
  },
  "attributes": "ObjectId[] (optional)"
}