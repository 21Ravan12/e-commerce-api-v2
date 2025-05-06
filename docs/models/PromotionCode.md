# PromotionCode Module Documentation

## Model Schema

### Core Fields
| Field            | Type      | Required | Validation                          | Description |
|------------------|-----------|----------|-------------------------------------|-------------|
| promotionCode    | String    | Yes      | 1+ chars, uppercase, unique        | The actual code users enter |
| startDate       | Date      | Yes      | Valid date                         | When code becomes active |
| endDate         | Date      | Yes      | Must be after startDate            | When code expires |
| usageLimit      | Number    | No       | Min 1 if provided                  | Max total uses (null = unlimited) |
| status          | String    | Yes      | Enum: active/inactive/expired      | Current state (auto-updated) |
| promotionType   | String    | Yes      | Enum: fixed/percentage/free_shipping/bundle | Discount type |
| promotionAmount | Number    | Yes      | 0-100 for percentage, >=0 for fixed | Discount value |

### Enhanced Fields
| Field                 | Type           | Description |
|-----------------------|----------------|-------------|
| minPurchaseAmount    | Number         | Minimum order amount to qualify |
| maxDiscountAmount    | Number         | Cap on discount (percentage only) |
| applicableCategories | ObjectId[]     | Categories this applies to |
| excludedProducts     | ObjectId[]     | Products excluded from promotion |
| singleUsePerCustomer | Boolean        | Whether code can be reused by same customer |
| customerEligibility  | String         | all/new_customers/returning_customers/specific_customers |
| eligibleCustomers    | ObjectId[]     | Specific eligible customers |
| usageCount           | Number         | Times code has been used |
| createdBy            | ObjectId       | Admin who created the code |

## Virtual Fields
- `remainingUses`: Calculates `usageLimit - usageCount` (null if no limit)
- `isActive`: Boolean indicating if code is currently valid (date check)

## Static Methods

### `createPromotionCode(codeData, createdBy)`
Creates new promotion code with validation:
1. Converts code to uppercase
2. Checks for duplicate codes
3. Validates date ranges
4. Sets createdBy reference

### `findPromotionCodeById(id)`
Retrieves promotion code with full population:
- Applicable categories (name, slug)
- Excluded products (name, sku)
- Eligible customers (username, email)
- Creator details

### `findPromotionCodes(filter, page, limit)`
Paginated listing with:
- Custom filtering
- Sorting by startDate (newest first)
- Pagination metadata
- Lean results for performance

### `updatePromotionCode(id, updateData)`
Updates promotion code with protections:
1. Prevents direct status manipulation
2. Maintains data integrity
3. Auto-updates status based on new dates

### `deletePromotionCode(id)`
Safe deletion with checks:
1. Verifies code exists
2. Prevents deletion of used codes
3. Returns deletion confirmation

### `validateCategories(categoryIds)`
Validates all category IDs exist

### `validateProducts(productIds)`
Validates all product IDs exist

### `validateCustomers(customerIds)`
Validates all customer IDs exist and have customer role

## Indexes
1. `promotionCode` (unique, for quick lookups)
2. `startDate/endDate` (date range queries)
3. `status` + `promotionType` (filtering)
4. `applicableCategories` (category-based promotions)

## Middleware
- Auto-updates status based on current date:
  - Active → Expired when endDate passed
  - Inactive → Active when startDate reached
- Converts codes to uppercase before saving

## Example Usage
```javascript
// Create a percentage discount code
const code = await PromotionCode.createPromotionCode({
  promotionCode: "SUMMER20",
  startDate: new Date("2023-06-01"),
  endDate: new Date("2023-08-31"),
  promotionType: "percentage",
  promotionAmount: 20,
  maxDiscountAmount: 50,
  usageLimit: 1000
}, adminUserId);

// Find active codes for a category
const { promotionCodes } = await PromotionCode.findPromotionCodes({
  status: "active",
  applicableCategories: categoryId
}, 1, 10);

// Apply code validation
const isValid = await PromotionCode.validateCategories(categoryIds);
if (!isValid) throw new Error("Invalid categories");

// Update code
const updated = await PromotionCode.updatePromotionCode(codeId, {
  endDate: new Date("2023-09-15")
});