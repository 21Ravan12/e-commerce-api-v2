# Product Schema Documentation

## Validation Rules

### Product Creation Schema (`productSchema`)

**Core Product Information:**
| Field | Type | Required | Validation | Error Messages |
|-------|------|----------|------------|----------------|
| `name` | String | Yes | 3-100 chars, alphanumeric+punctuation | "Name must be 3-100 valid characters" |
| `description` | String | Yes | 20-2000 chars | "Description must be 20-2000 characters" |
| `price` | Number | Yes | Positive, max 2 decimals, ≤10M | "Price must be positive with ≤2 decimals" |
| `discountedPrice` | Number | No | Must be < price if provided | "Discount must be less than price" |
| `currency` | String | No | Valid ISO code (default: USD) | "Invalid currency code" |

**Inventory & Availability:**
| Field | Validation | Notes |
|-------|------------|-------|
| `stockQuantity` | Integer, 0-1M | Required field |
| `isAvailable` | Boolean | Default: true |
| `isFeatured` | Boolean | Default: false |

**Media Assets:**
| Field | Type | Limit | Validation |
|-------|------|-------|------------|
| `images` | Array[Object] | 10 max | Valid URL + alt text |
| `videos` | Array[Object] | 3 max | Platform-specific URL validation |

**Categorization:**
| Field | Validation | Notes |
|-------|------------|-------|
| `categories` | Array[ObjectId] | Min 1 required |
| `tags` | Array[String] | 20 max, lowercase |

**Physical Attributes:**
| Field | Validation |
|-------|------------|
| `weight` | Non-negative number |
| `dimensions` | {length,width,height,unit} |
| `shippingInfo` | Complex object with handling rules |

**Status & SEO:**
| Field | Values | Notes |
|-------|--------|-------|
| `status` | draft/published/unpublished/archived/banned | Default: draft |
| `seoTitle` | ≤70 chars | Optional |
| `seoDescription` | ≤160 chars | Optional |

### Product Update Schema (`productUpdateSchema`)

**Partial Update Rules:**
- Requires at least one field
- Maintains all creation validations
- Additional constraints:
  - `version` must increment
  - Status transitions enforced

## Validation Features

1. **Strict Typing**:
   - Rejects invalid ObjectIds
   - Enforces number precision
   - Validates URL formats

2. **Business Logic**:
   - Discounts cannot exceed price
   - Stock cannot be negative
   - Required categories

3. **Security**:
   - HTML/JS injection prevention
   - Media URL whitelisting
   - Size limitations

4. **Localization**:
   - Multi-currency support
   - Unit conversion
   - Translated error messages

## Example Payloads

**Valid Creation Request:**
```json
{
  "name": "Premium Wireless Headphones",
  "description": "Noise-cancelling over-ear headphones with 30hr battery",
  "price": 299.99,
  "stockQuantity": 150,
  "categories": ["507f1f77bcf86cd799439011"],
  "images": [{
    "url": "https://example.com/headphones.jpg",
    "altText": "Black wireless headphones"
  }]
}