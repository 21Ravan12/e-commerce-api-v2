# Add Category Endpoint Documentation

## `POST /api/category/add`

### Description
Creates a new product category in the system hierarchy with full validation and audit logging. Requires admin privileges.

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
  "name": "string (2-50 chars, unique)",
  "description": "string (8-500 chars)",
  "parentCategory": "ObjectId (optional)",
  "image": "string (matching image URL pattern)",
  "isActive": "boolean (default: true)",
  "displayOrder": "number (min 0, default: 0)",
  "seo": {
    "metaTitle": "string (max 60 chars, optional)",
    "metaDescription": "string (max 160 chars, optional)",
    "keywords": "string[] (optional)"
  }
}