# Update Promotion Code Endpoint Documentation

## `PUT /api/promotionCode/update/:id`

### Description
Updates an existing promotion code with comprehensive validation and audit logging. Requires admin privileges.

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
| `id` | Valid Promotion Code ID (MongoDB ObjectId) |

### Request Body Schema
```json
{
  "promotionCode": "string (1-50 chars, optional)",
  "startDate": "ISO 8601 date (optional)",
  "endDate": "ISO 8601 date ≥ startDate (optional)",
  "status": "enum: active/inactive/expired (optional)",
  "promotionAmount": "number ≥ 0 (optional)",
  "minPurchaseAmount": "number ≥ 0 (optional)",
  "maxDiscountAmount": "number ≥ 0 or null (required for percentage type)",
  "applicableCategories": "ObjectId[] (optional)",
  "excludedProducts": "ObjectId[] (optional)",
  "singleUsePerCustomer": "boolean (optional)",
  "customerEligibility": "enum: all/new_customers/returning_customers/specific_customers (optional)",
  "eligibleCustomers": "ObjectId[] (required when eligibility=specific_customers)"
}