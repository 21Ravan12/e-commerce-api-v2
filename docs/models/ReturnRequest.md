# Return Request Module Documentation

## Model Schema

### Core Fields
| Field           | Type       | Required | Validation                          | Description |
|-----------------|------------|----------|-------------------------------------|-------------|
| customerId      | ObjectId   | Yes      | Valid user reference                | Requesting customer |
| orderId        | ObjectId   | Yes      | Valid order reference               | Original order |
| reason         | String     | Yes      | Max 255 chars                      | Return reason |
| status         | String     | Yes      | Enum: pending/approved/rejected/processing/refunded/completed/archived | Request state |
| returnType     | String     | Yes      | Enum: refund/exchange/store_credit | Return method |

### Enhanced Fields
| Field               | Type           | Description |
|---------------------|----------------|-------------|
| refundAmount       | Number         | Amount to refund (if applicable) |
| exchangeProductId  | ObjectId       | Product for exchange |
| trackingNumber     | String         | Return shipment tracking |
| returnShippingMethod | String       | customer/merchant/pickup |
| returnLabelProvided | Boolean      | Whether label was provided |
| resolvedAt        | Date           | When request was completed |
| adminNotes        | String         | Internal staff notes |

## Virtual Fields
- `customer`: Populated customer details
- `order`: Populated order details
- `exchangeProduct`: Populated product details (for exchanges)

## Static Methods

### `createReturnRequest(returnRequestData)`
Creates new return with:
1. Customer/order validation
2. Type-specific validations:
   - Refund amount for refunds/store credit
   - Product reference for exchanges

### `getReturnRequest(id, userId, userRole)`
Retrieves return request with:
- Customer/order/product population
- Authorization check (admin or owner)
- Error handling for missing requests

### `getReturnRequests(params)`
Paginated listing with:
- Role-based filtering (admin sees all)
- Status/type/order filters
- Sorting options
- Population of related data

### `updateCustomerReturnRequest(id, userId, updateData)`
Customer updates with restrictions:
1. Only pending requests can be modified
2. Limited field updates (description/shipping method)
3. Ownership verification

### `updateAdminReturnRequest(id, updateData)`
Admin updates with:
1. Status transition validation
2. Exchange product verification
3. Full field access
4. Automatic resolvedAt for completions

### `deleteReturnRequest(id, user)`
Safe archival with:
1. Ownership/admin check
2. Status validation
3. Soft-delete implementation (status=archived)

### `findByCustomer(customerId, limit, page)`
Customer-specific listing:
- Sorted by creation date
- With order summary data
- Pagination support

### `approveRequest(requestId, adminId)`
Admin approval shortcut:
- Status update to approved
- Admin reference tracking

## Indexes
1. `customerId` + `status` (customer dashboards)
2. `orderId` + `status` (order context lookups)
3. `status` + `createdAt` (admin reporting)

## Middleware
- Auto-sets `resolvedAt` when completed/refunded
- Updates `updatedAt` on all changes
- Validates required fields based on status

## Example Usage
```javascript
// Customer creates return
const request = await ReturnRequest.createReturnRequest({
  customerId: user._id,
  orderId: order._id,
  reason: "Wrong size",
  returnType: "exchange",
  exchangeProductId: newProduct._id
});

// Admin processes return
const approved = await ReturnRequest.approveRequest(requestId, admin._id);

// Customer views their returns
const { returnRequests } = await ReturnRequest.getReturnRequests({
  userId: customer._id,
  page: 1,
  limit: 5
});

// Admin updates tracking
const updated = await ReturnRequest.updateAdminReturnRequest(requestId, {
  status: "processing",
  trackingNumber: "TRK123456"
});