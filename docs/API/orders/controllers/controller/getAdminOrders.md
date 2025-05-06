# Admin Orders Endpoint Documentation

## `GET /api/orders/admin-get`

### Overview
Admin-only endpoint for comprehensive order management with advanced filtering, sorting, and analytics capabilities. Provides complete order records with administrative fields not available through standard customer endpoints.

---

## Authentication & Authorization
- **Authentication Type**: Bearer Token (JWT)
- **Required Role**: `admin`
- **Permission Scope**: `orders:read_all`

---

## Request Parameters

### Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `X-Requested-With` | `XMLHttpRequest` | Recommended |

### Query Parameters
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `page` | Integer | 1 | Min: 1 | Pagination page number |
| `limit` | Integer | 10 | 1-100 | Items per page |
| `status` | String | - | `pending`/`processing`/`shipped`/`delivered`/`cancelled`/`refunded` | Filter by order status |
| `idCustomer` | String (ObjectId) | - | Valid MongoDB ID | Filter by customer |
| `dateFrom` | ISO Date | - | Valid date | Start date range (inclusive) |
| `dateTo` | ISO Date | - | Valid date ≥ dateFrom | End date range (inclusive) |
| `minTotal` | Number | - | ≥0 | Minimum order total |
| `maxTotal` | Number | - | ≥minTotal | Maximum order total |
| `sortBy` | String | `createdAt` | `createdAt`/`updatedAt`/`total`/`estimatedDelivery` | Sorting field |
| `sortOrder` | String | `desc` | `asc`/`desc` | Sorting direction |

---

## Business Logic Flow
1. **Role Verification**: Confirms admin privileges
2. **Parameter Validation**: 
   - Validates all query parameters against Joi schema
   - Converts date/amount ranges
   - Checks ObjectId validity
3. **Query Construction**:
   - Builds MongoDB query with dynamic filters
   - Handles date ranges and amount ranges
4. **Data Fetching**:
   - Uses `Order.fetchAdminOrders()` for database operations
   - Applies pagination and sorting
5. **Response Formatting**:
   - Includes customer details
   - Preserves historical pricing
   - Adds admin-only fields
6. **Audit Logging**:
   - Records access with filter metadata
   - Tracks performance metrics

---

## Response Format

### Success (200)
```json
{
  "orders": [
    {
      "_id": "ObjectId",
      "orderNumber": "STRING-1234",
      "status": "processing",
      "total": 99.99,
      "estimatedDelivery": "ISO_DATE",
      "paymentMethod": "credit_card",
      "paymentStatus": "completed",
      "createdAt": "ISO_DATE",
      "updatedAt": "ISO_DATE",
      "customer": {
        "_id": "ObjectId",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [
        {
          "productId": "ObjectId",
          "quantity": 2,
          "priceAtPurchase": 49.99,
          "subtotal": 99.98
        }
      ],
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "USA"
      },
      "shippingMethod": "express",
      "shippingCost": 9.99,
      "tax": 8.50,
      "notes": "Customer requested gift wrapping",
      "internalFlags": ["fraud_review"]
    }
  ],
  "count": 25,
  "total": 150,
  "page": 1,
  "pages": 6,
  "filters": {
    "status": "processing",
    "dateFrom": "2023-01-01",
    "minTotal": 50
  }
}