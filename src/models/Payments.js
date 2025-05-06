const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  // Core Payment Data (from your receipt object)
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required'],
    index: true
  },
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer reference is required'],
    index: true
  },
  payment_id: {
    type: String,
    required: [true, 'Payment processor ID is required'],
    unique: true,
    index: true
  },
  payment_status: {
    type: String,
    required: true,
    enum: ['created', 'approved', 'failed', 'pending', 'refunded', 'partially_refunded'],
    index: true
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['paypal', 'credit_card', 'bank_transfer', 'stripe', 'apple_pay', 'google_pay']
  },
  total_amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] // ISO 4217 codes
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  payment_date: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Enhanced Fields
  processor_response: {
    type: Schema.Types.Mixed,
    required: false
  },
  refunds: [{
    amount: Number,
    currency: String,
    reason: String,
    processed_at: Date,
    processor_refund_id: String
  }],
  billing_address: {
    recipient_name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country_code: String
  },
  fraud_checks: {
    risk_score: Number,
    verification_status: {
      type: String,
      enum: ['passed', 'failed', 'pending', 'not_verified']
    },
    avs_response: String, // Address Verification System
    cvv_response: String // Card Verification Value
  },
  metadata: {
    ip_address: String,
    device_fingerprint: String,
    user_agent: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for query optimization
paymentSchema.index({ customer_id: 1, payment_date: -1 });
paymentSchema.index({ payment_status: 1, payment_date: 1 });
paymentSchema.index({ payment_method: 1 });

// Virtuals
paymentSchema.virtual('formatted_amount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.total_amount);
});

// Middleware to log payment status changes
paymentSchema.pre('save', function(next) {
  if (this.isModified('payment_status')) {
    console.log(`Payment ${this.payment_id} status changed to ${this.payment_status}`);
  }
  next();
});

// Static Methods
paymentSchema.statics.findByOrder = function(orderId) {
  return this.find({ order_id: orderId }).sort('-payment_date');
};

paymentSchema.statics.getTotalRevenue = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        payment_date: { $gte: startDate, $lte: endDate },
        payment_status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total_amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Payment', paymentSchema);