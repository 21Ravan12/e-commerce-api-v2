# Order Service Documentation

## Core Service Functions

### `calculateTax(subtotal, shippingAddress)`
Calculates tax based on order subtotal and destination address.

**Parameters:**
- `subtotal` (Number): Order amount before taxes
- `shippingAddress` (Object): Destination address object

**Returns:**  
Promise resolving to calculated tax amount (Number)

**Logic Flow:**
1. Determines tax rate based on shipping location
2. Calculates tax amount (subtotal × rate)
3. Logs calculation details
4. Returns rounded tax value

**Error Handling:**
- Throws "Tax calculation service unavailable" on failure
- Logs detailed error information

---

### `calculateShipping(shippingMethod)`
Determines shipping costs based on selected method.

**Parameters:**
- `shippingMethod` (String): One of `standard`/`express`/`overnight`

**Returns:**  
Promise resolving to shipping cost (Number)

**Rate Table:**
| Method | Cost |
|--------|------|
| standard | $5.99 |
| express | $15.99 |
| overnight | $25.99 |

**Fallback Behavior:**
- Uses standard rate for unknown methods
- Logs warnings for invalid methods

---

### `calculateDeliveryDate(orderDate, shippingMethod)`
Estimates delivery date accounting for business days.

**Parameters:**
- `orderDate` (Date|String): When order was placed
- `shippingMethod` (String): Selected shipping method

**Returns:**  
ISO string of estimated delivery date

**Processing Rules:**
1. Validates input date format
2. Skips weekends (Sat/Sun) in calculation
3. Applies method-specific lead times:
   - Standard: 5 business days
   - Express: 3 business days
   - Overnight: 1 business day

**Error Handling:**
- Throws "Invalid order date provided" for bad inputs

---

## Promotion Services

### `validateAndApplyPromotion(promotionCode, userId, cartItems, subtotal)`
Validates and applies promotion codes to orders.

**Validation Checks:**
1. **Code Validity**:
   - Active status
   - Within date range
   - Matches case-insensitive code

2. **Customer Eligibility**:
   - Specific customer lists
   - Single-use restrictions
   - Usage limits

3. **Order Requirements**:
   - Minimum purchase amounts
   - Applicable product categories
   - Excluded products

**Discount Calculation:**
| Promotion Type | Calculation |
|---------------|-------------|
| Fixed Amount | Direct deduction |
| Percentage | Subtotal × percentage |
| Free Shipping | Zero shipping cost |

**Returns:**  
Object containing:
- `discount` (Number): Calculated discount amount
- `promotionDetails` (Object): Full promotion metadata

**Error Handling:**
- Throws descriptive errors for all validation failures

---

### `updatePromotionUsage(promotionId)`
Records promotion code usage statistics.

**Updates:**
- Increments usage count
- Tracks customer usage
- Maintains real-time analytics

**Parameters:**
- `promotionId` (ObjectId): MongoDB promotion ID

---

## Integration Patterns

### With Order Controller
```mermaid
sequenceDiagram
    Controller->>Service: calculateTax()
    Service-->>Controller: taxAmount
    Controller->>Service: calculateShipping()
    Service-->>Controller: shippingCost
    Controller->>Service: validateAndApplyPromotion()
    Service-->>Controller: discountDetails
    Controller->>Service: calculateDeliveryDate()
    Service-->>Controller: deliveryEstimate