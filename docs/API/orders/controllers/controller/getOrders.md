# Get Orders Endpoint Documentation

## `GET /api/orders/get`

### Description
Retrieves a paginated list of orders for the authenticated customer, with optional filtering by order status. Implements comprehensive validation, audit logging, and error handling.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `customer` (or higher)

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |

### Query Parameters
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `page` | Number | 1 | Min: 1, Integer | Pagination page number |
| `limit` | Number | 10 | 1-100, Integer | Items per page |
| `status` | String | - | `pending`/`processing`/`shipped`/`delivered`/`cancelled`/`refunded` | Filter by order status |

### Request Flow
1. **Authentication & Authorization**:
   - Validates JWT token
   - Confirms user has customer privileges

2. **Input Validation**:
   - Validates query parameters against `getOrdersSchema`
   - Returns detailed field-specific errors if invalid

3. **Data Retrieval**:
   - Fetches orders for the authenticated user
   - Applies pagination (skip/limit)
   - Optionally filters by status

4. **Response Formatting**:
   - Transforms raw order data into consistent response format
   - Calculates pagination metadata

5. **Audit Logging**:
   - Records successful/failed access attempts
   - Captures request metadata

6. **Response**:
   - Returns formatted order list with pagination info
   - Includes security headers

### Success Response (200)
```json
{
  "orders": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-123456",
      "status": "processing",
      "total": 99.99,
      "estimatedDelivery": "2023-12-15",
      "paymentMethod": "credit_card",
      "createdAt": "2023-12-01T10:30:00Z"
    }
  ],
  "count": 5,
  "total": 23,
  "page": 1,
  "pages": 5
}