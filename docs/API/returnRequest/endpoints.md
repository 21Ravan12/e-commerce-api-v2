# Return Request Endpoints

## Return Request Management

### `POST /api/returnRequest/add`
## [Controller route](controllers/controller/createReturnRequest.md)
Creates a new return request  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `orderId` (ObjectId, required): Original order reference
- `reason` (String, required, max 255 chars): Return reason
- `description` (String, optional, max 500 chars): Additional details
- `returnType` (String, required): `refund`/`exchange`/`store_credit`
- `returnShippingMethod` (String): `customer`/`merchant`/`pickup` (default: customer)
- `exchangeProductId` (ObjectId, conditional): Required when returnType=exchange
- `refundAmount` (Number, conditional): Required for refund/store_credit types  
**Success Response:**
- `returnRequest`: Full return details
- `nextSteps`: Required actions for completion

### `GET /api/returnRequest/get`
## [Controller route](controllers/controller/getReturnRequests.md)
Retrieves user's return request history  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Query Params:**
- `status` (String): Filter by status (`pending`/`approved`/`rejected`/etc.)
- `returnType` (String): Filter by return type
- `sort` (String): Sort field/direction (default: `-createdAt`)  
**Success Response:**
- `returns`: Array of return summaries
- `stats`: Status distribution counts

### `GET /api/returnRequest/get/:id`
## [Controller route](controllers/controller/getReturnRequest.md)
Retrieves specific return details  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Return Request ID  
**Success Response:**
- Full return document with:
  - Original order details
  - Processing timeline
  - Communication history
  - Attachments

### `PUT /api/returnRequest/update/:id`
## [Controller route](controllers/controller/updateReturnRequest.md)
Customer updates to return request  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Return Request ID  
**Request Body:**
- `description` (String): Updated details (max 500 chars)
- `returnShippingMethod` (String): Updated shipping preference  
**Success Response:**
- `updatedRequest`: Modified fields
- `status`: Current processing state

### `PUT /api/returnRequest/update-admin/:id`
## [Controller route](controllers/controller/returnRequestAdminUpdateSchema.md)
Admin processing of returns  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Return Request ID  
**Request Body:**
- `status` (String): New processing state
- `adminNotes` (String): Internal notes (max 1000 chars)
- `refundMethod` (String): `original_payment`/`store_credit`/`bank_transfer`
- `restockingFee` (Number): 0-100 with 2 decimal places  
**Success Response:**
- `return`: Updated document
- `notifications`: List of triggered alerts

### `PUT /api/returnRequest/archive/:id`
## [Controller route](controllers/controller/archiveReturnRequest.md)
Archives completed returns  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Return Request ID  
**Success Response:**
- `archivedId`: Confirmation of archived request
- `storageLocation`: Reference for future retrieval

## Validation Rules

### Core Return Schema
| Field | Rules | Conditional Logic |
|-------|-------|-------------------|
| `orderId` | Valid ObjectId | - |
| `returnType` | Specific enum values | Determines required fields |
| `exchangeProductId` | Valid ObjectId | Required when returnType=exchange |
| `refundAmount` | Positive number (2 dec) | Required for refund/store_credit |

### Status Transitions
| Current | Allowed New States |
|---------|--------------------|
| pending | approved/rejected |
| approved | processing |
| processing | completed/refunded |
| * | (archived) |

## Security Requirements
- All endpoints require authentication
- Admin endpoints enforce role checks
- Rate limited to 50 requests/5 minutes
- Sensitive data redaction in logs

## Webhook Events
- `return_created`
- `return_status_changed`
- `return_requires_action`

## Example Payloads

**Valid Creation Request:**
```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "reason": "Wrong item received",
  "returnType": "exchange",
  "exchangeProductId": "512f1f77bcf86cd799439022"
}