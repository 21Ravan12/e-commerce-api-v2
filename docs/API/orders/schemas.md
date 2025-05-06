# Order Schema Documentation

## Validation Rules

### Order Creation Schema (`createOrderSchema`)

**Core Fields:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `shippingAddress` | Object | Yes | Nested validation | "Shipping address must be an object" |
| `shippingAddress.street` | String | Yes | - | "Street is required" |
| `shippingAddress.city` | String | Yes | - | "City is required" |
| `shippingAddress.state` | String | Yes | - | "State is required" |
| `shippingAddress.postalCode` | String | Yes | - | "Postal code is required" |
| `shippingAddress.country` | String | Yes | - | "Country is required" |
| `paymentMethod` | String | Yes | `credit_card`/`paypal`/`stripe`/`cod`/`bank_transfer`/`cash_on_delivery` | "Payment method is required" |
| `shippingMethod` | String | No | `standard`/`express`/`next_day` (default: standard) | "Invalid shipping method" |
| `promotionCode` | String | No | 3-20 chars if provided | "Promotion code must be 3-20 characters" |

### Order Listing Schema (`getOrdersSchema`)

**Query Parameters:**
| Param | Type | Default | Validation | Error Messages |
|-------|------|---------|------------|----------------|
| `page` | Number | 1 | Min 1, integer | "Page must be at least 1" |
| `limit` | Number | 10 | 1-100, integer | "Limit must be 1-100" |
| `status` | String | - | `pending`/`processing`/`shipped`/`delivered`/`cancelled`/`refunded` | "Invalid status" |
| `sortBy` | String | `createdAt` | `createdAt`/`total`/`estimatedDelivery` | "Invalid sort field" |
| `sortOrder` | String | `desc` | `asc`/`desc` | "Invalid sort direction" |

### Admin Order Listing Schema (`getAdminOrdersSchema`)

**Additional Admin Filters:**
| Param | Type | Validation | Error Messages |
|-------|------|------------|----------------|
| `idCustomer` | String | Valid ObjectId | "Invalid customer ID" |
| `dateFrom`/`dateTo` | ISO Date | Valid date range | "Invalid date format" |
| `minTotal`/`maxTotal` | Number | Non-negative | "Cannot be negative" |

### Order Update Schemas

**Standard Update (`updateOrderSchema`):**
| Field | Validation | Notes |
|-------|------------|-------|
| `status` | Valid status values | Cannot skip required transitions |
| `paymentStatus` | Valid payment states | - |
| `shippingAddress` | Partial address update | - |
| `shippingMethod` | Valid methods | - |

**Admin Update (`updateAdminOrderSchema`):**
Additional fields:
| Field | Validation | Notes |
|-------|------------|-------|
| `adminNotes` | Max 1000 chars | Internal use only |
| `forceUpdate` | Boolean | Overrides business rules |

**Cancellation (`cancelOrderSchema`):**
| Field | Validation | Notes |
|-------|------------|-------|
| `status` | Must be `cancelled` | Final state |
| `cancellationReason` | Max 500 chars | Customer-facing |

## Validation Features

1. **Strict Mode**:
   - Rejects unknown fields
   - Aborts early on first error (configurable)

2. **Custom Messages**:
   - Field-specific error messages
   - Clear validation requirements

3. **Conditional Validation**:
   - Payment method requirements
   - Shipping address dependencies
   - Admin-specific overrides

4. **Data Sanitization**:
   - Automatic trimming of strings
   - Default values for optional fields
   - Case normalization where applicable

## Example Payloads

**Valid Create Request:**
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "credit_card",
  "shippingMethod": "express"
}