# Get Return Request Endpoint Documentation

## `GET /api/returnRequest/get/:id`

### Description
Retrieves detailed information about a specific return request with comprehensive access control and audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scopes**: 
  - `customer` (for own returns)
  - `admin` (for all returns)

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No (auto-generated if missing) |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | ObjectId | Valid MongoDB Return Request ID |

### Response Structure
```json
{
  "success": true,
  "data": {
    "returnRequest": {
      "id": "ObjectId",
      "status": "String",
      "reason": "String",
      "returnType": "String",
      "refundAmount": "Number",
      "createdAt": "ISODate",
      "customer": {
        "id": "ObjectId",
        "username": "String",
        "email": "String"
      },
      "order": {
        "id": "ObjectId",
        "totalAmount": "Number",
        "status": "String"
      },
      "exchangeProduct": {
        "id": "ObjectId",
        "name": "String",
        "price": "Number"
      }
    },
    "_links": {
      "self": {
        "href": "String",
        "method": "GET"
      },
      "update": {
        "href": "String",
        "method": "PATCH"
      },
      "cancel": {
        "href": "String",
        "method": "DELETE"
      }
    }
  }
}