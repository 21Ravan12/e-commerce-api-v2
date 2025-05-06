# Category Endpoints

## Category Management

### `POST /api/category/add`
## [Controller route](controllers/controller/addCategory.md)
Creates a new product category  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `name` (String, required): 2-50 characters
- `description` (String, required): 8-500 characters
- `parentCategory` (ObjectId, optional): Parent category reference
- `image` (String, optional): Valid image URL (JPG/PNG/WEBP/SVG)
- `isActive` (Boolean, optional): Default true
- `displayOrder` (Number, optional): Default 0
- `seo.metaTitle` (String, optional): Max 60 chars
- `seo.metaDescription` (String, optional): Max 160 chars
- `seo.keywords` (Array[String], optional): SEO keywords  
**Success Response:**
- `category`: Created category details
- `auditLog`: Creation metadata

### `GET /api/category/fetch`
## [Controller route](controllers/controller/fetchCategories.md)
Retrieves filtered and paginated category list  
**Query Params:**
- `page` (Number): Default 1
- `limit` (Number): Default 25
- `isActive` (Boolean): Filter by active status
- `parentCategory` (ObjectId): Filter by parent category
- `hasProducts` (Boolean): Only categories with products
- `search` (String): Search term for names/descriptions
- `includeChildren` (Boolean): Include subcategories
- `sort` (String): Sort field and direction (format: "field" or "-field")  
**Success Response:**
- `categories`: Array of category objects
- `pagination`: Page metadata

### `GET /api/category/fetch/:id`
## [Controller route](controllers/controller/fetchCategory.md)
Retrieves specific category details  
**Path Params:**
- `id`: Category ID  
**Query Params:**
- `includeChildren` (Boolean): Include subcategories  
**Success Response:**
- Full category document with populated references

### `PUT /api/category/update/:id`
## [Controller route](controllers/controller/updateCategory.md)
Modifies existing category  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Category ID  
**Request Body:**
- Any updatable category fields (minimum 1 field required)  
**Success Response:**
- `category`: Updated document
- `auditLog`: Modification metadata

### `DELETE /api/category/delete/:id`
## [Controller route](controllers/controller/deleteCategory.md)
Removes a category  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Category ID  
**Success Response:**
- `deletedId`: Confirmation of removed ID
- `auditLog`: Deletion metadata

## Security Requirements
- All modifying routes require JWT authentication
- Rate limited to 200 requests/15 minutes
- Input sanitization for all string fields

## Response Schema
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "requestId": "uuidv4",
    "timestamp": "ISO8601"
  }
}