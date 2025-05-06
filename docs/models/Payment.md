# Payment Module Documentation

## Model Schema

### Core Fields
| Field            | Type      | Required | Validation                          | Description |
|------------------|-----------|----------|-------------------------------------|-------------|
| order_id         | ObjectId  | Yes      | Valid Order reference               | Associated order |
| customer_id      | ObjectId  | Yes      | Valid User reference                | Paying customer |
| payment_id       | String    | Yes      | Unique                              | Processor transaction ID |
| payment_status   | String    | Yes      | Enum: created/approved/failed/pending/refunded/partially_refunded | Current state |
| payment_method   | String    | Yes      | Enum: paypal/credit_card/bank_transfer/stripe/apple_pay/google_pay | Payment type |
| total_amount     | Number    | Yes      | Min 0.01                           | Payment value |
| currency         | String    | Yes      | ISO 4217 codes (USD/EUR/GBP/etc.)  | Currency type |
| payment_date     | Date      | Yes      | Default: now                        | Transaction timestamp |

### Enhanced Fields
| Field                  | Type           | Description |
|------------------------|----------------|-------------|
| processor_response     | Mixed          | Raw processor data |
| refunds[]              | Object Array   | Refund details |
| billing_address        | Object         | Customer billing info |
| fraud_checks           | Object         | Risk assessment data |
| metadata               | Object         | Transaction context |

## Virtual Fields
- `formatted_amount`: Currency-formatted total (e.g., "$49.99")
- `is_refundable`: Boolean if payment can be refunded
- `age_days`: Days since payment date

## Static Methods

### `findByOrder(orderId)`
Retrieves payments for an order:
- Sorted by most recent
- Includes full payment details
- Populates customer reference

### `getTotalRevenue(startDate, endDate)`
Calculates approved payments:
- Date-range filtered
- Returns {total, count}
- Groups by currency optionally

### `initiateRefund(paymentId, data)`
Processes refunds with:
1. Amount validation
2. Reason requirement
3. Processor integration
4. Status updates

### `findFailedPayments(params)`
Lists failed transactions:
- Paginated results
- Filterable by date/method
- Includes retry links

## Indexes
1. `order_id` (order lookup)
2. `customer_id + payment_date` (customer history)
3. `payment_status` (reporting)
4. `payment_method` (analytics)

## Middleware
- Auto-logs status changes
- Validates refund amounts
- Formats processor responses
- Encrypts sensitive data pre-save

## Example Usage
```javascript
// Get order payments
const payments = await Payment.findByOrder(orderId);

// Calculate monthly revenue
const [revenue] = await Payment.getTotalRevenue(
  new Date('2023-01-01'), 
  new Date('2023-01-31')
);

// Process refund
const refund = await Payment.initiateRefund(
  paymentId,
  { amount: 25.99, reason: 'Customer return' }
);

// Check payment status
if (payment.payment_status === 'approved') {
  await fulfillOrder(payment.order_id);
}