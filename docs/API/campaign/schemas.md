# Campaign Schema Documentation

## Validation Rules

### Core Campaign Fields

| Field | Type | Required | Validation Rules | Error Messages |
|-------|------|----------|------------------|----------------|
| `campaignName` | String | Yes | 1-100 chars, trimmed | "Campaign name is required"<br>"Must be 1-100 characters" |
| `startDate` | Date | Yes | Valid ISO date | "Invalid date format" |
| `endDate` | Date | Yes | After startDate | "Must be after start date" |
| `campaignType` | String | Yes | Enum: fixed/percentage/free_shipping/bundle/buy_x_get_y | "Invalid campaign type" |

### Conditional Validations

| Field | Condition | Rules |
|-------|-----------|-------|
| `campaignAmount` | Percentage type | 1-100 value |
| `maxDiscountAmount` | Percentage type | Required, positive number |
| `customCustomers` | Segment = 'custom' | Minimum 1 customer ID required |

### Complex Fields

**Array Validations:**
- `validCategories`: Array of valid MongoDB ObjectIds
- `excludedProducts`: Array of valid product ObjectIds
- `customCustomers`: Valid customer IDs (when segment=custom)

**URL/Image Validations:**
- `landingPageURL`: Must be valid HTTP/HTTPS URL
- `bannerImage`: Must match image file extension pattern

## Schema Types

### 1. Create Campaign Schema (`campaignSchema`)
Full validation for new campaigns including:
- Required field checks
- Date comparisons
- Conditional amount validation
- Array content validation
- Automatic server-field restrictions

### 2. Update Campaign Schema (`campaignUpdateSchema`)
Partial validation for updates:
- Requires at least one field
- Maintains all conditional rules
- Preserves relational integrity
- Forbids modifying server-managed fields

## Custom Validators

| Validator | Purpose |
|-----------|---------|
| `objectId` | MongoDB ID format verification |
| `validateCampaignAmount` | Type-specific amount validation |
| URI scheme | URL protocol enforcement |
| Image pattern | File extension validation |

## Error Handling

**Validation Error Structure:**
```json
{
  "error": "ValidationError",
  "details": [
    {
      "field": "endDate",
      "message": "Must be after start date"
    }
  ]
}