# Update Return Request Endpoint Documentation

## `PUT /api/return-requests/update/:id`

### Description
Allows customers to update specific fields of their existing return requests. Implements strict field-level permissions and comprehensive audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `customer`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No |

### Allowed Update Fields
| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| `description` | String | Max 500 chars | Additional return details |
| `returnShippingMethod` | String | `customer`/`merchant`/`pickup` | Return logistics preference |

### Restricted Fields
Customers cannot modify:
- `status`
- `refundAmount` 
- `adminNotes`
- `exchangeProductId` (after submission)

### Validation Rules
1. **Request Structure**
   - Must be valid JSON
   - No unknown fields allowed
   - Minimum 1 update field required

2. **Data Integrity**
   - Return request must exist
   - User must own the return request
   - Return cannot be in `completed`/`archived` state

### Success Response (200)
```json
{
  "success": true,
  "message": "Return request updated successfully",
  "data": {
    "returnRequest": {
      "id": "ObjectId",
      "status": "string",
      "description": "string",
      "returnShippingMethod": "string"
    },
    "_links": {
      "self": { "href": "/api/v1/returns/:id" },
      "track": { "href": "/api/v1/returns/:id/track" }
    }
  }
}