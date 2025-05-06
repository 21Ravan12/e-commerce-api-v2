# Promotion Code Schema Documentation

## Validation Rules

### Promotion Code Creation Schema (`promotionCodeSchema`)

**Core Fields:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `promotionCode` | String | Yes | 1-50 chars | "Required field" |
| `startDate` | ISO Date | Yes | Valid date | "Must be valid ISO date" |
| `endDate` | ISO Date | Yes | ≥ startDate | "Must be after start date" |
| `promotionType` | String | Yes | `fixed`/`percentage`/`free_shipping`/`bundle` | "Invalid promotion type" |
| `promotionAmount` | Number | Yes | ≥ 0 | "Must be positive number" |

**Usage Controls:**
| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `usageLimit` | Number | ≥1 or null | Null = unlimited uses |
| `singleUsePerCustomer` | Boolean | - | Default: false |
| `customerEligibility` | String | `all`/`new_customers`/`returning_customers`/`specific_customers` | Default: `all` |
| `eligibleCustomers` | ObjectId[] | Required when eligibility=`specific_customers` | Valid customer IDs |

**Value Rules:**
| Field | Type | Validation | Dependencies |
|-------|------|------------|--------------|
| `minPurchaseAmount` | Number | ≥0 | Applies to all types |
| `maxDiscountAmount` | Number | ≥0 or null | Required for percentage type |
| `applicableCategories` | ObjectId[] | Valid category IDs | - |
| `excludedProducts` | ObjectId[] | Valid product IDs | - |

### Promotion Code Update Schema (`promotionCodeUpdateSchema`)

**Partial Update Rules:**
- Requires at least 1 field
- Maintains all creation validations
- Additional field:
  - `status`: `active`/`inactive`/`expired`

### Promotion Code Listing Schema (`promotionCodeGetSchema`)

**Query Parameters:**
| Param | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `page` | Number | 1 | ≥1 integer | Pagination page |
| `limit` | Number | 10 | 1-100 integer | Items per page |
| `status` | String | - | `active`/`inactive`/`expired`/`upcoming` | Filter by status |
| `type` | String | - | `percentage`/`fixed` | Filter by discount type |
| `active` | Boolean | - | - | Currently active codes |
| `search` | String | - | ≤100 chars | Code name search |

## Validation Features

1. **Cross-Field Validation**:
   - `endDate` must be ≥ `startDate`
   - `eligibleCustomers` required when `customerEligibility=specific_customers`

2. **Conditional Rules**:
   ```javascript
   eligibleCustomers: Joi.when('customerEligibility', {
     is: 'specific_customers',
     then: Joi.array().items(objectId).min(1).required()
   })