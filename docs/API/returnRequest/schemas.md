# Return Request Schema Documentation

## Validation Rules

### Return Request Creation Schema (`returnRequestSchema`)

**Core Fields:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `orderId` | ObjectId | Yes | Valid MongoDB ID | "Order ID is required" |
| `reason` | String | Yes | Max 255 chars | "Reason cannot exceed 255 characters" |
| `description` | String | No | Max 500 chars | "Description cannot exceed 500 characters" |
| `returnType` | String | Yes | `refund`/`exchange`/`store_credit` | "Return type is required" |
| `returnShippingMethod` | String | No | `customer`/`merchant`/`pickup` (default: customer) | "Invalid shipping method" |

**Conditional Fields:**
| Field | Appears When | Validation | Error Messages |
|-------|-------------|------------|----------------|
| `exchangeProductId` | `returnType=exchange` | Valid MongoDB ID | "Exchange product ID required" |
| `refundAmount` | `returnType=refund` or `store_credit` | Positive number (2 decimals) | "Must be positive with 2 decimal places" |
| `refundAmount` | `returnType=exchange` | Must be 0 | "Must be 0 for exchanges" |

### Customer Update Schema (`returnRequestCustomerUpdateSchema`)

**Allowed Fields:**
| Field | Validation | Notes |
|-------|------------|-------|
| `description` | Max 500 chars | Optional update |
| `returnShippingMethod` | Valid methods | Can change shipping method |

**Restricted Fields:**
- `status` (admin-only)
- `refundAmount` (admin-only)
- `adminNotes` (admin-only)
- `exchangeProductId` (immutable after submission)

### Admin Update Schema (`returnRequestAdminUpdateSchema`)

**Admin-Only Fields:**
| Field | Validation | Notes |
|-------|------------|-------|
| `status` | Valid workflow states | Controls return lifecycle |
| `adminNotes` | Max 1000 chars | Internal documentation |
| `refundMethod` | Valid payment methods | Required for refunds |
| `restockingFee` | 0-100 (2 decimals) | Percentage fee |

**Conditional Rules:**
- `exchangeProductId` only editable when status=`approved`
- All updates require at least one field

## Validation Features

1. **Strict ObjectId Validation**:
   - Custom validator for MongoDB IDs
   - Clear error messages

2. **Workflow Enforcement**:
   - Prevents invalid status transitions
   - Ensures required fields for each return type

3. **Role-Based Access**:
   - Separate schemas for customer/admin
   - Explicit field restrictions

4. **Financial Precision**:
   - Enforces 2 decimal places
   - Valid amount ranges

## Example Payloads

**Valid Creation Request (Refund):**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "reason": "Product damaged",
  "returnType": "refund",
  "refundAmount": 29.99,
  "returnShippingMethod": "merchant"
}