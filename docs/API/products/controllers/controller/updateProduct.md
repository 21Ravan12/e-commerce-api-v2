# Update Product Endpoint Documentation

## `PUT /api/products/update/:id`

### Description
Updates an existing product with comprehensive validation, audit logging, and cache invalidation. Requires admin privileges.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID (optional) | No |

### Path Parameters
| Parameter | Description |
|-----------|-------------|
| `id` | Valid Product ID (MongoDB ObjectId) |

### Request Body Schema
```json
{
  "name": "string (2-100 chars, optional)",
  "description": "string (10-2000 chars, optional)",
  "price": "number (min 0, 2 decimal places, optional)",
  "stockQuantity": "integer (min 0, optional)",
  "category": "ObjectId (optional)",
  "status": "enum: draft/published/archived (optional)",
  "specifications": [
    {
      "key": "string (required)",
      "value": "string (required)"
    }
  ],
  "version": "integer (min 0, optional)"
}