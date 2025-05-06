// services/payment/providers/StripeProvider.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeProvider {
  async process(order) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'usd',
      metadata: { orderId: order._id.toString() },
      description: `Order #${order.orderNumber}`,
      capture_method: 'automatic' // Auto-capture payments
    });

    const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntent.id);
    
    if (confirmedIntent.status !== 'succeeded') {
      throw new Error(`Stripe payment failed: ${confirmedIntent.last_payment_error?.message || 'Unknown error'}`);
    }

    return {
      transactionId: confirmedIntent.id,
      rawResponse: confirmedIntent
    };
  }

  async refund(order) {
    return await stripe.refunds.create({
      payment_intent: order.transactionId,
      amount: Math.round(order.total * 100)
    });
  }

  async fakeProcess(order) {
    // Simulate a successful payment with a fake transaction ID
    return {
      transactionId: `fake_stripe_${Date.now()}`,
      rawResponse: {
        status: 'succeeded',
        amount: Math.round(order.total * 100),
        currency: 'usd',
        metadata: { orderId: order._id.toString() }
      }
    };
  }

  async fakeRefund(order) {
    // Simulate a successful refund
    return {
      id: `fake_refund_${Date.now()}`,
      payment_intent: order.transactionId,
      amount: Math.round(order.total * 100),
      status: 'succeeded'
    };
  }
}

module.exports = StripeProvider;