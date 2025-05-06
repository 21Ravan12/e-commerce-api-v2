# Payment Providers Documentation

## Provider Implementations

### 1. CODProvider (Cash on Delivery)
**Location:** `services/payment/providers/CODProvider.js`  
**Methods:**
- `fakeProcess()`: Simulates successful COD payment
  - Returns: 
    ```javascript
    {
      transactionId: `COD-${timestamp}`,
      rawResponse: { status: 'success' }
    }
    ```
- `fakeRefund()`: Always returns `{ status: 'not_supported' }`

### 2. PayPalProvider
**Location:** `services/payment/providers/PayPalProvider.js`  
**Dependencies:** `@paypal/checkout-server-sdk`  
**Configuration:**
- Uses SandboxEnvironment with `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET`
- Creates PayPalHttpClient instance

**Methods:**
- `process(order)`: 
  - Creates PayPal order with detailed breakdown
  - Captures payment
  - Returns:
    ```javascript
    {
      transactionId: captureId,
      rawResponse: captureDetails
    }
    ```
- `createOrderRequestBody(order)`:
  - Builds structured payload with:
    - Currency amounts (total, subtotal, shipping, tax)
    - Itemized product list
- `captureOrder(orderId)`: Executes PayPal capture request
- `fakeProcess(order)`: Simulates successful payment with detailed mock response
- `fakeRefund(order)`: Simulates refund with mock PayPal response format

### 3. StripeProvider  
**Location:** `services/payment/providers/StripeProvider.js`  
**Dependencies:** `stripe` package  
**Configuration:**
- Initialized with `STRIPE_SECRET_KEY`

**Methods:**
- `process(order)`:
  - Creates payment intent (amount converted to cents)
  - Auto-confirms payment
  - Returns:
    ```javascript
    {
      transactionId: paymentIntentId,
      rawResponse: confirmedIntent
    }
    ```
- `refund(order)`:
  - Creates refund for full order amount
  - References original payment intent
- `fakeProcess(order)`: Simulates payment with Stripe-like response
- `fakeRefund(order)`: Simulates refund with Stripe-like response

## Common Interface
All providers implement:
- `process(order)`: Main payment processing
- `refund(order)` (except COD): Payment reversal
- `fakeProcess(order)`: Sandbox/testing implementation
- `fakeRefund(order)`: Sandbox/testing implementation

## Response Structures
**Successful Payment:**
```javascript
{
  transactionId: String,
  rawResponse: ProviderSpecificDetails
}