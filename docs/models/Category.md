# Category Module Documentation

## Model Schema

### Core Fields
| Field           | Type     | Required | Validation                          | Description |
|-----------------|----------|----------|-------------------------------------|-------------|
| name            | String   | Yes      | 2-50 chars, trimmed, unique        | Category display name |
| description     | String   | Yes      | 8-500 chars, trimmed               | Category description |
| slug            | String   | Auto     | Auto-generated from name           | URL-friendly identifier |
| parentCategory  | ObjectId | No       | Valid category reference           | Parent category (null for root) |
| isActive        | Boolean  | Yes      | Default: true                      | Visibility status |
| displayOrder    | Number   | Yes      | Min 0                              | Sorting position |

### Enhanced Fields
| Field               | Type           | Description |
|---------------------|----------------|-------------|
| image               | String         | Category image URL (JPG/PNG/WEBP/SVG) |
| seo.metaTitle       | String         | SEO meta title (max 60 chars) |
| seo.metaDescription | String         | SEO meta description (max 160 chars) |
| seo.keywords        | String[]       | SEO keywords array |
| attributes          | ObjectId[]     | Linked product attributes |
| createdAt           | Date           | Auto-created timestamp |
| updatedAt           | Date           | Auto-updated timestamp |

## Virtual Fields
- `subcategories`: Array of child categories
- `productCount`: Number of products in category
- `links`: Object with self/products URLs

## Static Methods

### `addCategory(data, user, ip, userAgent)`
Creates new category with validation:
1. Checks for duplicate names (case-insensitive)
2. Validates parent category exists
3. Generates SEO-friendly slug
4. Returns category + audit log data

### `updateCategory(categoryId, data, user, ip, userAgent)`
Updates category with validation:
1. Prevents self-parenting
2. Validates new parent exists
3. Updates slug if name changes
4. Returns updated category + audit log

### `fetchCategory(categoryId, options)`
Retrieves category with:
- Parent category details
- Optional children inclusion
- Admin-only fields when requested
- Formatted links

### `fetchCategories(params)`
Paginated listing with:
- Status/parent filters
- Full-text search
- Custom sorting
- Pagination metadata
- Optional children/products flags

### `deleteCategory(categoryId, user, ip, userAgent)`
Safe deletion with checks:
1. Verifies no linked products
2. Confirms no child categories
3. Returns deletion confirmation + audit log

### `getHierarchy()`
Returns full category tree using:
- MongoDB $graphLookup
- Depth tracking
- Root categories first

### `initializeRootCategory()`
Creates default root category if:
- No categories exist
- With sensible defaults
- Logs creation event

### `getActiveCategories()`
Returns all active categories:
- Sorted by displayOrder/name
- Minimal fields for display

## Indexes
1. `name` (case-insensitive search)
2. `slug` (unique for URLs)
3. `parentCategory` (tree navigation)
4. `isActive` + `displayOrder` (filtering/sorting)

## Middleware
- Auto-generates slug on name change
- Validates image URLs
- Timestamps all changes

## Example Usage
```javascript
// Create root category
const { category } = await Category.addCategory({
  name: "Electronics",
  description: "All electronic devices",
  isActive: true
}, adminUser, ip, userAgent);

// Get category tree
const hierarchy = await Category.getHierarchy();

// Update category
const { category: updated } = await Category.updateCategory(
  categoryId, 
  { displayOrder: 5 },
  adminUser,
  ip,
  userAgent
);

// Fetch paginated list
const { categories } = await Category.fetchCategories({
  page: 1,
  limit: 10,
  isActive: true,
  includeChildren: true
});