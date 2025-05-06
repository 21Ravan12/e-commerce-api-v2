# Create Product Endpoint Documentation

## `POST /api/products/add`

### Description
Creates a new product listing with comprehensive validation, audit logging, and inventory initialization. Requires seller privileges.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `seller`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | UUID (optional) | No |
| `X-Source` | Request origin (web/app/api) | No |

### Request Body Schema
```json
{
  "name": "string (3-100 chars)",
  "description": "string (20-2000 chars)",
  "price": "number (positive, 2 decimal places)",
  "stockQuantity": "integer ≥0",
  "categories": ["valid ObjectId"],
  "images": [
    {
      "url": "valid HTTP/HTTPS URL",
      "altText": "string ≤100 chars (optional)",
      "isPrimary": "boolean"
    }
  ],
  "specifications": [
    {
      "key": "string ≤50 chars",
      "value": "string ≤200 chars"
    }
  ],
  "status": "draft/published/archived (default: draft)"
}