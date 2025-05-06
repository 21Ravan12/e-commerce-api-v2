# Campaign Module Documentation

## Model Schema

### Core Fields
| Field           | Type     | Required | Validation                          | Description |
|-----------------|----------|----------|-------------------------------------|-------------|
| campaignName    | String   | Yes      | 1-100 chars, trimmed               | Campaign display name |
| startDate      | Date     | Yes      | Must be valid date                 | When campaign becomes active |
| endDate        | Date     | Yes      | Must be after startDate            | When campaign expires |
| usageLimit     | Number   | No       | Min 1 if provided                  | Max total uses (null = unlimited) |
| status         | String   | Yes      | Enum: draft/active/paused/completed/archived | Current state |
| campaignType   | String   | Yes      | Enum: fixed/percentage/free_shipping/bundle/buy_x_get_y | Discount type |
| campaignAmount | Number   | Yes      | 1-100 for percentage, >0 for fixed | Discount value |

### Enhanced Fields
| Field               | Type           | Description |
|---------------------|----------------|-------------|
| validCategories     | ObjectId[]     | Categories this applies to |
| excludedProducts    | ObjectId[]     | Products excluded from campaign |
| minPurchaseAmount  | Number         | Minimum order amount to qualify |
| maxDiscountAmount  | Number         | Cap on discount (percentage only) |
| customerSegments   | String         | all/new/returning/vip/custom |
| customCustomers    | ObjectId[]     | Specific eligible customers |
| usageCount         | Number         | Times campaign has been used |
| promotionCodes     | ObjectId[]     | Associated promo codes |
| landingPageURL     | String         | URL for campaign landing page |
| bannerImage        | String         | Campaign banner image |
| createdBy          | ObjectId       | Admin who created campaign |
| updatedBy          | ObjectId       | Admin who last updated |

## Virtual Fields
- `remainingUses`: Calculates `usageLimit - usageCount` (null if no limit)
- `isActive`: Boolean indicating if campaign is currently active

## Static Methods

### `createCampaign(data, userId)`
Creates new campaign with validation:
1. Verifies valid categories
2. Checks excluded products exist
3. Validates custom customers
4. Sets createdBy and default status

### `getCampaignById(id)`
Retrieves campaign with full population:
- Valid categories (name, slug, image)
- Excluded products (name, sku, price)
- Created/updated by user details
- Custom customers
- Promotion codes

### `getCampaignsList(params)`
Paginated listing with filters:
- Status/type filters
- Date-based filters (active/upcoming/expired)
- Search by name
- Custom sorting
- Returns pagination metadata

### `updateCampaign(id, data, userId)`
Updates campaign with same validations as create:
1. Checks category/product/customer validity
2. Validates date ranges
3. Enforces percentage discount rules
4. Sets updatedBy timestamp

### `getActiveCampaigns()`
Returns all currently active campaigns with:
- Valid category references
- Excluded product references

### `deleteCampaign(id)`
Removes campaign after checking for:
- Valid campaign ID
- Existence of record

## Indexes
1. `campaignName` (for search)
2. `startDate/endDate` (date range queries)
3. `status` + `campaignType` (filtering)
4. `validCategories` (category-based lookups)

## Middleware
- Auto-updates status based on current date:
  - Draft → Active when startDate reached
  → Completed when endDate passed

## Example Usage
```javascript
// Create campaign
const campaign = await Campaign.createCampaign({
  campaignName: "Summer Sale",
  startDate: new Date("2023-06-01"),
  endDate: new Date("2023-08-31"),
  campaignType: "percentage",
  campaignAmount: 20,
  maxDiscountAmount: 50
}, adminUserId);

// Get active campaigns
const { campaigns } = await Campaign.getCampaignsList({
  status: "active",
  page: 1,
  limit: 10
});