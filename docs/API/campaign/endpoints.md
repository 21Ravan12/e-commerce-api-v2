# Campaign Endpoints

## Campaign Management

### `POST /api/campaign/add`
## [Controller route](controllers/controller/addCampaign.md)
Creates a new marketing campaign  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `campaignName` (String, required): 1-100 characters
- `startDate` (Date, required): ISO 8601 format
- `endDate` (Date, required): Must be after startDate
- `campaignType` (String, required): `fixed`/`percentage`/`free_shipping`/`bundle`/`buy_x_get_y`
- `campaignAmount` (Number, required): Value based on type (1-100% or fixed amount)
- `maxDiscountAmount` (Number, conditional): Required for percentage campaigns
- `validCategories` (Array[ObjectId], optional): Applicable categories
- `excludedProducts` (Array[ObjectId], optional): Excluded products
- `minPurchaseAmount` (Number, optional): Minimum order value
- `customerSegments` (String, optional): `all`/`new`/`returning`/`vip`/`custom`
- `customCustomers` (Array[ObjectId], conditional): Required when segment=`custom`  
**Success Response:**
- `campaign`: Full campaign details
- `auditLog`: Creation metadata

### `GET /api/campaign/get`
## [Controller route](controllers/controller/getCampaigns.md)
Retrieves filtered and paginated campaign list  
**Query Params:**
- `page` (Number): Default 1 - Pagination page number
- `limit` (Number): Default 25 - Items per page
- `status` (String): Filter by status (draft/active/paused/completed/archived)
- `type` (String): Filter by campaign type (fixed/percentage/free_shipping/bundle/buy_x_get_y)
- `active` (Boolean): Return only currently active campaigns
- `upcoming` (Boolean): Return only upcoming campaigns
- `expired` (Boolean): Return only expired campaigns
- `search` (String): Search term for campaign names
- `sort` (String): Sort field and direction (format: "field" or "-field" for descending)
**Success Response:**
- `campaigns`: Array of campaign objects
- `pagination`: Page metadata

### `GET /api/campaign/get/:id`
## [Controller route](controllers/controller/getCampaign.md)
Retrieves specific campaign details  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Campaign ID  
**Success Response:**
- Full campaign document with populated references

### `PUT /api/campaign/update/:id`
## [Controller route](controllers/controller/updateCampaign.md)
Modifies existing campaign  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Campaign ID  
**Request Body:**
- Any updatable campaign fields  
**Success Response:**
- `updatedCampaign`: Modified document
- `changes`: Array of modified fields

### `DELETE /api/campaign/delete/:id`
## [Controller route](controllers/controller/deleteCampaign.md)
Removes a campaign  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Campaign ID  
**Success Response:**
- `deletedId`: Confirmation of removed ID
- `auditLog`: Deletion metadata

## Security Requirements
- All routes except `GET /get` require JWT authentication
- Rate limited to 100 requests/15 minutes
- CSRF protection via double-submit cookie

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