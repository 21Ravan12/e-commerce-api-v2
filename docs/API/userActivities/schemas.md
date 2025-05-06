# User Activities Schema Documentation

## Validation Rules

### Account Activity Schema (`accountActivitySchema`)

**Core Fields:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `activityType` | String | Yes | `login`/`logout`/`password_change`/`profile_update` | "Invalid activity type" |
| `ipAddress` | String | Yes | Valid IP format | "Invalid IP address" |
| `deviceId` | String | No | 6-64 chars if provided | "Device ID must be 6-64 characters" |
| `userAgent` | String | Yes | - | "User agent is required" |
| `locationData` | Object | No | Valid geo coordinates if provided | "Invalid location data" |

### Commerce Activity Schema (`commerceActivitySchema`)

**Core Fields:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `activityType` | String | Yes | `product_view`/`cart_add`/`wishlist`/`purchase`/`review` | "Invalid commerce activity" |
| `productId` | ObjectId | Conditional | Required for product-related activities | "Product ID required" |
| `value` | Number | No | Positive if provided | "Value must be positive" |
| `metadata` | Object | No | - | "Invalid metadata format" |

### Search Activity Schema (`searchActivitySchema`)

**Query Parameters:**
| Param | Type | Required | Validation | Error Messages |
|-------|------|---------|------------|----------------|
| `query` | String | Yes | 2-100 chars | "Query must be 2-100 characters" |
| `filters` | Object | No | Valid filter structure | "Invalid filters" |
| `resultCount` | Number | No | Integer >=0 | "Result count must be positive" |

## Activity Tracking Schemas

### Page View Schema (`pageViewSchema`)
```javascript
Joi.object({
  path: Joi.string().uri().required(),
  referrer: Joi.string().uri().allow(''),
  duration: Joi.number().min(0),
  scrollDepth: Joi.number().min(0).max(100)
})