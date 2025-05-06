const mongoose = require('mongoose');
const { Schema } = mongoose;

const promotionCodeSchema = new Schema({
  // Core Fields (from your Joi validation)
  promotionCode: {
    type: String,
    required: [true, 'Promotion code is required'],
    minlength: [1, 'Promotion code must be at least 1 character'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1'],
    default: null
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
    index: true
  },
  promotionType: {
    type: String,
    required: [true, 'Promotion type is required'],
    enum: ['fixed', 'percentage', 'free_shipping', 'bundle'],
    index: true
  },
  promotionAmount: {
    type: Number,
    required: [true, 'Promotion amount is required'],
    min: [0, 'Promotion amount cannot be negative'],
    validate: {
      validator: function(v) {
        if (this.promotionType === 'percentage') {
          return v <= 100;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },

  // Enhanced Fields
  minPurchaseAmount: {
    type: Number,
    min: [0, 'Minimum purchase cannot be negative'],
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Max discount cannot be negative'],
    validate: {
      validator: function(v) {
        return this.promotionType === 'percentage' ? true : !v;
      },
      message: 'Max discount only applies to percentage discounts'
    }
  },
  applicableCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  excludedProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  singleUsePerCustomer: {
    type: Boolean,
    default: false
  },
  customerEligibility: {
    type: String,
    enum: ['all', 'new_customers', 'returning_customers', 'specific_customers'],
    default: 'all'
  },
  eligibleCustomers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
promotionCodeSchema.index({ startDate: 1, endDate: 1 });
promotionCodeSchema.index({ status: 1, promotionType: 1 });

// Middleware to update status based on dates
promotionCodeSchema.pre('save', function(next) {
  const now = new Date();
  if (this.endDate < now) {
    this.status = 'expired';
  } else if (this.startDate > now) {
    this.status = 'inactive';
  }
  next();
});

// Virtual for remaining uses
promotionCodeSchema.virtual('remainingUses').get(function() {
  return this.usageLimit ? this.usageLimit - this.usageCount : null;
});

// In your PromotionCode model file (after the schema definition)

promotionCodeSchema.statics = {
  /**
   * Create a new promotion code with validation
   * @param {Object} codeData - Promotion code data
   * @param {ObjectId} createdBy - User ID who created the code
   * @returns {Promise<PromotionCode>}
   */
  async createPromotionCode(codeData, createdBy) {
    // Convert code to uppercase
    const uppercaseCode = codeData.promotionCode.toUpperCase();
    
    // Check for duplicate code
    const existingCode = await this.findOne({ promotionCode: uppercaseCode });
    if (existingCode) {
      throw new Error('Promotion code already exists');
    }

    // Create the promotion code
    const newPromotionCode = new this({
      ...codeData,
      promotionCode: uppercaseCode,
      createdBy
    });

    return newPromotionCode.save();
  },

  /**
   * Find promotion code by ID with full details
   * @param {ObjectId} id - Promotion code ID
   * @returns {Promise<Object|null>}
   */
  async findPromotionCodeById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid promotion code ID format');
    }

    return this.findById(id)
      .populate('applicableCategories', 'name slug')
      .populate('excludedProducts', 'name sku')
      .populate('eligibleCustomers', 'username email')
      .populate('createdBy', 'username')
      .lean();
  },

  /**
   * Find promotion codes with pagination and filtering
   * @param {Object} filter - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise<Object>}
   */
  async findPromotionCodes(filter = {}, page = 1, limit = 10) {
    const [promotionCodes, total] = await Promise.all([
      this.find(filter)
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.countDocuments(filter)
    ]);

    return {
      promotionCodes,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  /**
   * Update promotion code by ID
   * @param {ObjectId} id - Promotion code ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<PromotionCode>}
   */
  async updatePromotionCode(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid promotion code ID format');
    }

    // Prevent direct status updates
    if (updateData.status) {
      delete updateData.status;
    }

    // Find and update the code
    const promotionCode = await this.findById(id);
    if (!promotionCode) {
      throw new Error('Promotion code not found');
    }

    Object.assign(promotionCode, updateData);
    return promotionCode.save();
  },

  /**
   * Delete promotion code by ID
   * @param {ObjectId} id - Promotion code ID
   * @returns {Promise<Object>}
   */
  async deletePromotionCode(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid promotion code ID format');
    }

    const promotionCode = await this.findById(id);
    if (!promotionCode) {
      throw new Error('Promotion code not found');
    }

    if (promotionCode.usageCount > 0) {
      throw new Error('Cannot delete promotion code that has been used');
    }

    await this.deleteOne({ _id: id });
    return {
      id: promotionCode._id,
      code: promotionCode.promotionCode,
      type: promotionCode.promotionType
    };
  },

  /**
   * Validate categories for promotion code
   * @param {Array<ObjectId>} categoryIds - Category IDs to validate
   * @returns {Promise<boolean>}
   */
  async validateCategories(categoryIds) {
    if (!categoryIds || categoryIds.length === 0) return true;
    const validCount = await Category.countDocuments({ _id: { $in: categoryIds } });
    return validCount === categoryIds.length;
  },

  /**
   * Validate products for promotion code
   * @param {Array<ObjectId>} productIds - Product IDs to validate
   * @returns {Promise<boolean>}
   */
  async validateProducts(productIds) {
    if (!productIds || productIds.length === 0) return true;
    const validCount = await Product.countDocuments({ _id: { $in: productIds } });
    return validCount === productIds.length;
  },

  /**
   * Validate customers for promotion code
   * @param {Array<ObjectId>} customerIds - Customer IDs to validate
   * @returns {Promise<boolean>}
   */
  async validateCustomers(customerIds) {
    if (!customerIds || customerIds.length === 0) return true;
    const validCount = await User.countDocuments({ 
      _id: { $in: customerIds },
      role: 'customer'
    });
    return validCount === customerIds.length;
  }
};

module.exports = mongoose.model('PromotionCode', promotionCodeSchema);