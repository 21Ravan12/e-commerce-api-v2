# Promotion Code Deletion Endpoint

## `DELETE /api/promotionCode/delete/:id`

### Description
Permanently removes a promotion code from the system. Requires admin privileges and prevents deletion of codes with usage history.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Path Parameters
| Parameter | Type | Description | Validation |
|-----------|------|-------------|------------|
| `id` | String | Promotion Code ID | Valid MongoDB ObjectId |

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |

### Success Response (200)
```json
{
  "message": "Promotion code deleted successfully",
  "deletedCode": {
    "id": "ObjectId",
    "code": "string",
    "type": "string"
  },
  "timestamp": "ISO8601",
  "links": {
    "list": "/promotion-codes",
    "create": "/promotion-codes"
  }
}