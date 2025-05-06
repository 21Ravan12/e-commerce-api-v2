# Order Endpoints

## Order Management

### `POST /api/orders/add`
## [Controller route](controllers/controller/createOrder.md)
Creates a new customer order  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `shippingAddress` (Object, required):
  - `street` (String, required)
  - `city` (String, required)
  - `state` (String, required)
  - `postalCode` (String, required)
  - `country` (String, required)
- `paymentMethod` (String, required): `credit_card`/`paypal`/`stripe`/`cod`/`bank_transfer`/`cash_on_delivery`
- `shippingMethod` (String): `standard`/`express`/`next_day` (default: standard)
- `promotionCode` (String, optional): 3-20 characters  
**Success Response:**
- `order`: Full order details
- `payment`: Payment processing data

### `GET /api/orders/get`
## [Controller route](controllers/controller/getOrders.md)
Retrieves paginated order list for authenticated user  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Query Params:**
- `page` (Number): Default 1
- `limit` (Number): Default 10 (max 100)
- `status` (String): Filter by status (`pending`/`processing`/`shipped`/`delivered`/`cancelled`/`refunded`)
**Success Response:**
- `orders`: Array of order summaries
- `pagination`: Page metadata

### `GET /api/orders/get/:orderId`
## [Controller route](controllers/controller/getOrderDetails.md)
Retrieves specific order details  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `orderId`: Valid Order ID  
**Success Response:**
- Full order document with:
  - Line items
  - Shipping details
  - Payment status
  - Timeline history

### `GET /api/orders/admin-get`
## [Controller route](controllers/controller/getAdminOrders.md)
Admin-only order listing with advanced filters  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Query Params:**
- `page` (Number): Default 1
- `limit` (Number): Default 10 (max 100)
- `status` (String): Order status filter
- `idCustomer` (String): Filter by customer ID
- `dateFrom`/`dateTo` (ISO Date): Date range filter
- `minTotal`/`maxTotal` (Number): Price range filter
- `sortBy` (String): `createdAt`/`updatedAt`/`total`/`estimatedDelivery`
- `sortOrder` (String): `asc`/`desc`  
**Success Response:**
- `orders`: Array of complete order records
- `analytics`: Summary statistics

### `PUT /api/orders/cancel/:id`
## [Controller route](controllers/controller/cancelOrder.md)
Cancels a customer order  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `id`: Order ID  
**Request Body:**
- `cancellationReason` (String, optional): Max 500 chars  
**Success Response:**
- `updatedOrder`: Status change confirmation
- `refund`: Refund processing details (if applicable)

### `PUT /api/orders/admin-update/:id`
## [Controller route](controllers/controller/updateAdminOrders.md)
Admin order modification  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Path Params:**
- `id`: Order ID  
**Request Body:**
- `status` (String): New order status
- `paymentStatus` (String): New payment status
- `shippingAddress` (Object): Updated address
- `shippingMethod` (String): Updated method
- `adminNotes` (String): Internal notes (max 1000 chars)
- `forceUpdate` (Boolean): Override restrictions  
**Success Response:**
- `order`: Updated order document
- `auditLog`: Change history record

## Security Requirements
- All endpoints require JWT authentication
- Admin endpoints enforce role verification
- Rate limited to 200 requests/10 minutes
- Sensitive data encryption in transit/at rest

## Response Schema
```json
{
  "success": true,
  "data": {},
  "metadata": {
    "requestId": "uuidv4",
    "timestamp": "ISO8601",
    "rateLimit": {
      "remaining": 195,
      "reset": "timestamp" 
    }
  }
}