# Category Schema Documentation

## Validation Rules

### Core Category Fields

| Field | Type | Required | Validation Rules | Error Messages |
|-------|------|----------|------------------|----------------|
| `name` | String | Yes | 2-50 chars, trimmed, unique | "Name must be 2-50 characters"<br>"Name already exists" |
| `description` | String | Yes | 8-500 chars, trimmed | "Description must be 8-500 characters" |
| `parentCategory` | ObjectId | No | Valid MongoDB ID or null | "Invalid parent category reference" |
| `isActive` | Boolean | No | Default: true | "Must be true or false" |

### SEO Fields

| Field | Type | Max Length | Validation | Error Message |
|-------|------|-----------|------------|---------------|
| `seo.metaTitle` | String | 60 | Optional | "Max 60 characters" |
| `seo.metaDescription` | String | 160 | Optional | "Max 160 characters" |
| `seo.keywords` | String[] | - | Array of strings | "Keywords must be strings" |

### Complex Validations

| Field | Validation Rules | Special Cases |
|-------|------------------|---------------|
| `image` | Must match regex: `\.(jpg\|jpeg\|png\|webp\|svg)$` | Case insensitive |
| `displayOrder` | Minimum value: 0 | Default: 0 |
| `attributes` | Array of valid ObjectIds | Only in updates |

## Schema Types

### 1. Create Category Schema (`categorySchema`)
Full validation for new categories:
- Requires name and description
- Validates parent category reference
- Enforces image URL format
- Sets default values for optional fields
- Validates SEO object structure

```javascript
Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().min(8).max(500).required(),
  parentCategory: Joi.string().hex().length(24).allow(null),
  image: Joi.string().regex(/\.(jpg|jpeg|png|webp|svg)$/i),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().min(0).default(0),
  seo: Joi.object({
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    keywords: Joi.array().items(Joi.string())
  })
})