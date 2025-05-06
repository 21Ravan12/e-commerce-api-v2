// services/payment/providers/PayPalProvider.js
const paypal = require('@paypal/checkout-server-sdk');

class PayPalProvider {
  constructor() {
    this.environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_SECRET
    );
    this.client = new paypal.core.PayPalHttpClient(this.environment);
  }

  async process(order) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody(this.createOrderRequestBody(order));

    const response = await this.client.execute(request);
    const captureResponse = await this.captureOrder(response.result.id);

    return {
      transactionId: captureResponse.result.id,
      rawResponse: captureResponse.result
    };
  }

  createOrderRequestBody(order) {
    return {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: order.total.toFixed(2),
          breakdown: {
            item_total: { value: order.subtotal.toFixed(2), currency_code: 'USD' },
            shipping: { value: order.shippingCost.toFixed(2), currency_code: 'USD' },
            tax_total: { value: order.tax.toFixed(2), currency_code: 'USD' }
          }
        },
        items: order.items.map(item => ({
          name: `Product ${item.idProduct}`,
          unit_amount: { value: item.priceAtPurchase.toFixed(2), currency_code: 'USD' },
          quantity: item.quantity
        }))
      }]
    };
  }

  async captureOrder(orderId) {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    return await this.client.execute(request);
  }

  async fakeProcess(order) {
    // Simulate a successful PayPal payment
    const fakeTransactionId = `fake_paypal_${Date.now()}`;
    return {
      transactionId: fakeTransactionId,
      rawResponse: {
        id: fakeTransactionId,
        status: 'COMPLETED',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: order.total.toFixed(2),
            breakdown: {
              item_total: { value: order.subtotal.toFixed(2), currency_code: 'USD' },
              shipping: { value: order.shippingCost.toFixed(2), currency_code: 'USD' },
              tax_total: { value: order.tax.toFixed(2), currency_code: 'USD' }
            }
          },
          items: order.items.map(item => ({
            name: `Product ${item.idProduct}`,
            unit_amount: { value: item.priceAtPurchase.toFixed(2), currency_code: 'USD' },
            quantity: item.quantity
          }))
        }]
      }
    };
  }

  async fakeRefund(order) {
    // Simulate a successful PayPal refund
    return {
      id: `fake_refund_${Date.now()}`,
      status: 'COMPLETED',
      amount: {
        value: order.total.toFixed(2),
        currency_code: 'USD'
      },
      links: [{
        href: 'https://api.sandbox.paypal.com/fake-refund',
        rel: 'self',
        method: 'GET'
      }]
    };
  }
}

module.exports = PayPalProvider;