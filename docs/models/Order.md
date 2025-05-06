# Order Module Documentation

## Model Schema

### Core Fields
| Field           | Type       | Required | Validation                          | Description |
|-----------------|------------|----------|-------------------------------------|-------------|
| idCustomer      | ObjectId   | Yes      | Valid user reference                | Customer who placed order |
| items           | Object[]   | Yes      | Min 1 item, valid products         | Ordered products |
| status          | String     | Yes      | Enum: pending/processing/shipped/delivered/cancelled/refunded | Order lifecycle state |
| paymentMethod   | String     | Yes      | Enum: credit_card/paypal/stripe/cod/bank_transfer/cash_on_delivery | How customer paid |
| paymentStatus   | String     | Yes      | Enum: pending/completed/failed/refunded | Payment processing state |

### Financial Fields
| Field           | Type       | Description |
|-----------------|------------|-------------|
| subtotal        | Number     | Sum of item prices before adjustments |
| tax             | Number     | Calculated tax amount |
| shippingCost    | Number     | Delivery charges |
| discount        | Number     | Promotion/campaign discounts |
| total           | Number     | Final charged amount |

### Shipping Fields
| Field           | Type       | Description |
|-----------------|------------|-------------|
| shippingAddress | Object     | {street, city, state, postalCode, country} |
| trackingNumber  | String     | Carrier tracking ID |
| shippingMethod  | String     | Enum: standard/express/overnight |

## Virtual Fields
- `itemCount`: Total quantity of all items
- `discountPercentage`: Calculated discount rate
- `deliveryStatus`: Estimated delivery timeline

## Static Methods

### `processCartItems(cartItems)`
Processes cart into order-ready items:
1. Validates product availability
2. Applies active campaigns
3. Calculates discounts
4. Returns:
   - `orderItems`: Validated items with prices
   - `subtotal`: Pre-tax total
   - `outOfStockItems`: Unavailable products

### `applyPromotionCode(code, userId, items, subtotal, shippingCost)`
Applies promo code with checks for:
- Code validity dates
- User eligibility
- Product restrictions
- Usage limits
Returns discount amount and adjusted shipping

### `calculateFinalTotals(subtotal, discount, shippingAddress, shippingCost)`
Computes:
- Location-based tax
- Final total after all adjustments
- Validates minimum order amounts

### `createAndProcessOrder(orderData, paymentMethod, paymentContext)`
End-to-end order processing:
1. Creates order record
2. Processes payment
3. Updates inventory
4. Handles success/failure states
5. Returns:
   - `order`: Created order document
   - `paymentResult`: Gateway response

### `finalizeOrder(orderId, userId, items, paymentResult)`
Completes order by:
1. Clearing user's cart
2. Updating product stock
3. Recording payment
4. Sending confirmation

## Order Lifecycle Methods

### `cancelOrder(orderId, customerId, reason)`
Cancels eligible orders:
- Validates user ownership
- Requires reason
- Restocks items if not shipped

### `updateOrderStatus(orderId, status)`
Admin status updates:
- Adds timestamps for key transitions
- Enforces valid status flow
- Triggers notifications

## Query Methods

### `getCustomerOrders(customerId, page, limit)`
Paginated order history:
- Sorts by recency
- Minimal fields for listing
- Includes pagination metadata

### `getOrderDetails(orderId, customerId)`
Detailed order view:
- Full item details
- Payment/shipping info
- Promotion data

### `fetchAdminOrders(filters)`
Admin order management:
- Advanced filtering
- Customer population
- Custom sorting/pagination

## Example Usage
```javascript
// Process cart to order
const { orderItems, subtotal } = await Order.processCartItems(cart);

// Apply promotion
const { discount } = await Order.applyPromotionCode('SUMMER20', userId, orderItems, subtotal);

// Create order
const order = await Order.createAndProcessOrder({
  idCustomer: userId,
  items: orderItems,
  subtotal,
  discount,
  paymentMethod: 'stripe'
}, paymentDetails);

// Customer view
const { orders } = await Order.getCustomerOrders(userId, 1, 5);