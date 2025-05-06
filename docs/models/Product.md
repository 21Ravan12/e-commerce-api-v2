# Product Module Documentation

## Model Schema

### Core Fields
| Field            | Type      | Required | Validation                          | Description |
|------------------|-----------|----------|-------------------------------------|-------------|
| name             | String    | Yes      | 3-100 chars                        | Product display name |
| description      | String    | Yes      | 20-2000 chars                      | Detailed description |
| price            | Number    | Yes      | Min 0, 2 decimals                  | Base price |
| discountedPrice  | Number    | No       | Must be < price if set             | Discounted price |
| stockQuantity    | Number    | Yes      | Min 0                              | Available inventory |
| sku              | String    | Yes      | Unique, format: ABC-1234           | Stock keeping unit |
| isAvailable      | Boolean   | Yes      | Auto-calculated                    | In stock status |

### Media Fields
| Field       | Type       | Description |
|-------------|------------|-------------|
| images      | Object[]   | Array of image objects (URL + alt text) |
| videos      | Object[]   | Array of video objects (URL + platform) |

### Categorization
| Field        | Type       | Description |
|--------------|------------|-------------|
| categories   | ObjectId[] | Linked categories |
| tags         | String[]   | Searchable tags |

### Specifications
| Field          | Type       | Description |
|----------------|------------|-------------|
| specifications | Object[]   | Key-value pairs of product specs |
| weight         | Number     | Product weight |
| dimensions     | Object     | LxWxH with unit |

### Analytics
| Field          | Type       | Description |
|----------------|------------|-------------|
| averageRating  | Number     | 0-5 star rating |
| viewCount      | Number     | Total views |
| purchaseCount  | Number     | Total purchases |

## Virtual Fields
- `discountPercentage`: Calculated discount %
- `isInStock`: Derived from stockQuantity
- `sellerInfo`: Populated seller details
- `categoryDetails`: Full category objects
- `comments`: Product reviews

## Static Methods

### `createProduct(data, user)`
Creates new product with:
1. Category validation
2. Auto SKU generation
3. Availability calculation
4. Seller assignment

### `getProductById(id)`
Retrieves product with:
- Seller profile data
- Full category details
- Cache support

### `getProducts(params)`
Paginated listing with:
- Status/search filters
- Custom sorting
- Text search index
- Pagination metadata

### `updateProduct(id, data, user)`
Updates product with:
1. Ownership verification
2. Category validation
3. Change tracking
4. Cache invalidation

### `archiveProduct(id, user)`
Soft deletion with:
- Permission checks
- Status transition
- Preserved data

### `invalidateCache(id, categoryId)`
Clears cached:
- Product details
- Product lists
- Category-based queries

## Indexes
1. `name/description/tags` (text search)
2. `price` (asc/desc sorting)
3. `categories` (category filtering)
4. `status` (moderation)
5. `createdAt/updatedAt` (recency)

## Middleware
- **Pre-save Hooks**:
  1. Primary image validation
  2. SKU generation/validation
  3. Slug creation
  4. PublishedAt tracking
  5. Availability updates

## Example Usage
```javascript
// Create product
const newProduct = await Product.createProduct({
  name: "Premium Headphones",
  description: "Noise-cancelling wireless headphones",
  price: 299.99,
  categories: [audioCategoryId]
}, sellerUser);

// Get paginated list
const { products } = await Product.getProducts({
  page: 1,
  limit: 10,
  status: 'published',
  sortBy: 'price:asc'
});

// Update product
const { product: updated } = await Product.updateProduct(
  productId,
  { price: 279.99 },
  adminUser
);

// Archive product
await Product.archiveProduct(productId, sellerUser);