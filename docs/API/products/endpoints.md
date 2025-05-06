# Product Endpoints

## Product Management

### `POST /api/products/add`
## [Controller route](controllers/controller/createProduct.md)
Creates a new product listing  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Request Body:**
- `name` (String, required): 3-100 characters
- `description` (String, required): 20-2000 characters
- `price` (Number, required): Positive with 2 decimal places
- `stockQuantity` (Number, required): Integer ≥0
- `categories` (Array[ObjectId], required): At least 1 valid category
- `images` (Array[Object], optional): Max 10 images
  - `url` (String, required): Valid HTTP/HTTPS URL
  - `altText` (String, optional): Max 100 chars
  - `isPrimary` (Boolean, optional)
- `specifications` (Array[Object], optional): Max 20 items
  - `key` (String, required): Max 50 chars
  - `value` (String, required): Max 200 chars  
**Success Response:**
- `product`: Full product details
- `inventory`: Initial stock record

### `GET /api/products/fetch/product/:id`
## [Controller route](controllers/controller/getProduct.md)
Retrieves specific product details  
**Path Params:**
- `id`: Valid Product ID  
**Success Response:**
- Complete product document with:
  - Media assets
  - Specifications
  - Inventory status
  - SEO metadata

### `GET /api/products/fetch/products`
## [Controller route](controllers/controller/getProducts.md)
Retrieves paginated product catalog  
**Query Params:**
- `page` (Number): Default 1
- `limit` (Number): Default 25 (max 100)
- `category` (String): Filter by category ID
- `minPrice`/`maxPrice` (Number): Price range filter
- `inStock` (Boolean): Filter by availability
- `sort` (String): `price`/`-price`/`newest`/`popular`  
**Success Response:**
- `products`: Array of product summaries
- `filters`: Available filter options
- `pagination`: Page metadata

### `PUT /api/products/update/:id`
## [Controller route](controllers/controller/updateProduct.md)
Modifies product details  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Product ID  
**Request Body:**
- Any updatable product fields  
**Success Response:**
- `updatedProduct`: Modified document
- `changes`: Array of updated fields

### `PUT /api/products/archive/:id`
## [Controller route](controllers/controller/archiveProduct.md)
Archives a product (soft delete)  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Product ID  
**Success Response:**
- `archivedAt`: Timestamp of archival
- `status`: Updated product status

## Security Requirements
- Write endpoints require admin privileges
- Rate limited to 300 requests/10 minutes
- Image URLs validated for secure protocols
- Input sanitization against XSS

## Response Schema
```json
{
  "success": true,
  "data": {
    "product": {},
    "metadata": {}
  },
  "error": null,
  "rateLimit": {
    "remaining": 287,
    "reset": "2023-11-15T12:00:00Z"
  }
}