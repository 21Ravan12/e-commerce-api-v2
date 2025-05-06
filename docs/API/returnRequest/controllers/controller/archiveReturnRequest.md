# Archive Return Request Endpoint Documentation

## `PUT /api/returnRequest/archive/:id`

### Description
Performs a soft-delete/archive operation on completed return requests. Maintains all data for compliance while removing from active processing systems.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | Transaction ID | No (auto-generated if missing) |

### Path Parameters
| Parameter | Description |
|-----------|-------------|
| `id` | Valid Return Request ID (ObjectId) |

### Business Rules
1. Only processes with status `completed` or `refunded` can be archived
2. Maintains all original documents for 7 years (compliance)
3. Generates immutable audit trail

### Success Response (200)
```json
{
  "success": true,
  "message": "Return request archived successfully",
  "data": {
    "id": "ObjectId",
    "status": "archived",
    "archivedAt": "ISO8601"
  },
  "metadata": {
    "transactionId": "uuidv4",
    "timestamp": "ISO8601"
  }
}