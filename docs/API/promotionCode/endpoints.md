# Promotion Code Endpoints

## Promotion Code Management

### `POST /api/promotionCode/add`
## [Controller route](controllers/controller/addPromotionCode.md)
Creates a new promotion code  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Request Body:**
- `promotionCode` (String, required): 1-50 characters
- `startDate` (ISO Date, required): Activation date
- `endDate` (ISO Date, required): Must be after startDate
- `promotionType` (String, required): `fixed`/`percentage`/`free_shipping`/`bundle`
- `promotionAmount` (Number, required): Value based on type
- `usageLimit` (Number, optional): Max redemption count
- `minPurchaseAmount` (Number, optional): Minimum order value
- `maxDiscountAmount` (Number, conditional): Required for percentage discounts
- `applicableCategories` (Array[ObjectId], optional): Valid categories
- `excludedProducts` (Array[ObjectId], optional): Excluded products
- `customerEligibility` (String): `all`/`new_customers`/`returning_customers`/`specific_customers`
- `eligibleCustomers` (Array[ObjectId], conditional): Required when eligibility=`specific_customers`  
**Success Response:**
- `promotion`: Full promotion details
- `auditLog`: Creation metadata

### `GET /api/promotionCode/get`
## [Controller route](controllers/controller/getPromotionCodes.md)
Retrieves filtered promotion code list  
**Query Params:**
- `page` (Number): Default 1
- `limit` (Number): Default 10 (max 100)
- `status` (String): Filter by status (`active`/`inactive`/`expired`/`upcoming`)
- `type` (String): Filter by type (`percentage`/`fixed`)
- `active` (Boolean): Return only currently active codes
- `search` (String): Search term for code names  
**Success Response:**
- `promotions`: Array of promotion objects
- `pagination`: Page metadata

### `GET /api/promotionCode/get/:id`
## [Controller route](controllers/controller/getPromotionCode.md)
Retrieves specific promotion code details  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Promotion Code ID  
**Success Response:**
- Full promotion document with:
  - Usage statistics
  - Applicable categories
  - Eligibility rules

### `PUT /api/promotionCode/update/:id`
## [Controller route](controllers/controller/updatePromotionCode.md)
Modifies existing promotion code  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Promotion Code ID  
**Request Body:**
- Any updatable promotion fields  
**Success Response:**
- `updatedPromotion`: Modified document
- `changes`: Array of modified fields

### `DELETE /api/promotionCode/delete/:id`
## [Controller route](controllers/controller/deletePromotionCode.md)
Deactivates a promotion code  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Promotion Code ID  
**Success Response:**
- `deactivatedId`: Confirmation of deactivated code
- `remainingActive`: Count of still-active promotions

## Validation Rules
| Field | Requirements |
|-------|-------------|
| `promotionCode` | Unique, alphanumeric with optional hyphens |
| `startDate` | Future date |
| `endDate` | Must be after startDate |
| `promotionAmount` | >0 for fixed, 1-100 for percentage |
| `eligibleCustomers` | Required when customerEligibility=specific_customers |

## Security Requirements
- All endpoints require JWT authentication
- Modification endpoints require admin role
- Rate limited to 300 requests/10 minutes
- Sensitive operations logged to audit trail

## Response Schema
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "requestId": "uuidv4",
    "timestamp": "ISO8601",
    "rateLimit": {
      "remaining": 285,
      "reset": "timestamp" 
    }
  }
}