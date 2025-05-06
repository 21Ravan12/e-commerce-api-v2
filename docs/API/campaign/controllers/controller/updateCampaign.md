# Update Campaign Endpoint Documentation

## `PUT /api/campaign/update/:id`

### Description
Modifies an existing marketing campaign with comprehensive validation and audit logging. Requires admin privileges.

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
| `id` | Campaign ID to update |

### Request Body Schema
```json
{
  "campaignName": "string (1-100 chars, optional)",
  "startDate": "ISO 8601 date (optional)",
  "endDate": "ISO 8601 date > startDate (optional)",
  "campaignAmount": "number (1-100 for %, >0 for fixed, optional)",
  "usageLimit": "number (optional, min 1)",
  "status": "enum: draft/active/paused/completed/archived (optional)",
  "validCategories": "ObjectId[] (optional)",
  "excludedProducts": "ObjectId[] (optional)",
  "minPurchaseAmount": "number (optional)",
  "maxDiscountAmount": "number (optional)",
  "customerSegments": "enum: all/new/returning/vip/custom (optional)",
  "customCustomers": "ObjectId[] (required if changing to segment=custom)"
}