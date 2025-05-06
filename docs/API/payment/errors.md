# Payment Error Handling Documentation

## PaymentError Class

**Location:** `services/payment/PaymentError.js`  
**Extends:** Native JavaScript `Error` class

### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | String | Always set to `'PaymentError'` |
| `paymentMethod` | String | Payment processor used (e.g. 'stripe', 'paypal') |
| `amount` | Number | Transaction amount in base currency |
| `originalError` | Error | Underlying error object from payment processor |
| `isOperational` | Boolean | Always `true` to distinguish expected errors |
| `success` | Boolean | Always `false` for error state |
| `stack` | String | Generated stack trace |

### Methods

#### Constructor
```javascript
new PaymentError(message, paymentMethod, amount, originalError)