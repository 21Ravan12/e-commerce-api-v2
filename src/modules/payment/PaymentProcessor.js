// services/payment/PaymentProcessor.js

// This section requires special configuration. I added fake and real process methods.
// For real usage, you must replace the fakeProcess and fakeRefund methods with actual implementations.
const StripeProvider = require('./providers/StripeProvider');
const PayPalProvider = require('./providers/PayPalProvider');
const CODProvider = require('./providers/CODProvider');
const PaymentError = require('./PaymentError');
const Payment = require('../../models/Payments');
const logger = require('../../services/logger');

class PaymentProcessor {
  constructor() {
    this.providers = {
      stripe: new StripeProvider(),
      paypal: new PayPalProvider(),
      cod: new CODProvider()
    };
  }

  async process(order, additionalData = {}) {
    try {
      logger.info('Processing payment for order:', { orderId: order._id, paymentMethod: order.paymentMethod });

      // Validate required fields
      if (!order._id) throw new Error('Order ID is required');
      if (!order.idCustomer) throw new Error('Customer ID is required');
      if (!order.paymentMethod) throw new Error('Payment method is required');
      if (!order.total || order.total <= 0) throw new Error('Invalid order total');

      const provider = this.getProvider(order.paymentMethod);
      const result = await provider.fakeProcess(order);
      
      // Create payment record in database
      const paymentRecord = new Payment({
        order_id: order._id,
        customer_id: order.idCustomer,
        payment_id: result.transactionId,
        payment_status: 'approved',
        payment_method: order.paymentMethod,
        total_amount: order.total,
        currency: order.currency || 'USD',
        description: `Payment for order #${order.orderNumber || order._id}`,
        processor_response: result.rawResponse,
        billing_address: additionalData.billingAddress || null,
        metadata: {
          ip_address: additionalData.ipAddress,
          device_fingerprint: additionalData.deviceFingerprint,
          user_agent: additionalData.userAgent
        }
      });

      await paymentRecord.save();
      logger.info('Payment successfully processed', { paymentId: paymentRecord._id });

      return {
        success: true,
        transactionId: result.transactionId,
        rawResponse: result.rawResponse,
        paymentId: paymentRecord._id,
        paymentRecord
      };
    } catch (error) {
      logger.error('Payment processing failed:', error);

      // Log failed payment attempt
      if (order && order._id && order.customerId) {
        try {
          await Payment.create({
            order_id: order._id,
            customer_id: order.idCustomer,
            payment_status: 'failed',
            payment_method: order.paymentMethod,
            total_amount: order.total,
            currency: order.currency || 'USD',
            description: `Failed payment attempt for order #${order.orderNumber || order._id}`,
            processor_response: { error: error.message }
          });
        } catch (dbError) {
          logger.error('Failed to save failed payment record:', dbError);
        }
      }

      throw PaymentError.fromError(
        error,
        order.paymentMethod,
        order.total
      );
    }
  }

  async refund(order, refundData = {}) {
    try {
      logger.info('Processing refund for order:', { orderId: order._id, paymentId: order.paymentId });

      if (!order.paymentId) throw new Error('Payment ID is required');

      const provider = this.getProvider(order.paymentMethod);
      const result = await provider.fakeRefund(order);

      // Update payment record with refund information
      const payment = await Payment.findOne({ _id: order.paymentId });
      if (!payment) {
        throw new Error('Original payment record not found');
      }

      // Add refund details
      const refundAmount = refundData.amount || order.total;
      payment.refunds.push({
        amount: refundAmount,
        currency: 'USD',
        reason: refundData.reason || 'Customer request',
        processed_at: new Date(),
        processor_refund_id: result.id
      });

      // Update payment status based on refund amount
      payment.payment_status = refundAmount === order.total ? 'refunded' : 'partially_refunded';

      await payment.save();
      logger.info('Refund successfully processed', { paymentId: payment._id, refundAmount });

      return {
        ...result,
        paymentRecord: payment
      };
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw PaymentError.fromError(
        error,
        order.paymentMethod,
        order.total
      );
    }
  }

  getProvider(method) {
    const provider = this.providers[method];
    if (!provider) {
      throw new PaymentError(`Unsupported payment method: ${method}`);
    }
    return provider;
  }
}

module.exports = new PaymentProcessor();