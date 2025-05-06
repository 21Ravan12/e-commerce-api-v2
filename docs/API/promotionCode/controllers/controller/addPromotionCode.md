# Add Promotion Code Endpoint Documentation

## `POST /api/promotionCode/add`

### Description
Creates a new promotion code with comprehensive validation and audit logging. Requires admin privileges.

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
  "promotionCode": "string (1-50 chars)",
  "startDate": "ISO 8601 date",
  "endDate": "ISO 8601 date > startDate",
  "promotionType": "enum: fixed/percentage/free_shipping/bundle",
  "promotionAmount": "number (≥0)",
  "usageLimit": "number (≥1 or null)",
  "minPurchaseAmount": "number (≥0, optional)",
  "maxDiscountAmount": "number (≥0, required for percentage)",
  "applicableCategories": "ObjectId[] (optional)",
  "excludedProducts": "ObjectId[] (optional)",
  "singleUsePerCustomer": "boolean (default: false)",
  "customerEligibility": "enum: all/new_customers/returning_customers/specific_customers",
  "eligibleCustomers": "ObjectId[] (required if eligibility=specific_customers)"
}