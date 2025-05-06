const mongoose = require('mongoose');
const Category = require('./Category');
const Product = require('./Products');
const User = require('./User');
const { Schema } = mongoose;

const campaignSchema = new Schema({
  // Core Fields (from your Joi validation)
  campaignName: {
    type: String,
    required: [true, 'Campaign name is required'],
    minlength: [1, 'Campaign name must be at least 1 character'],
    maxlength: [100, 'Campaign name cannot exceed 100 characters'],
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
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  campaignType: {
    type: String,
    required: [true, 'Campaign type is required'],
    enum: ['fixed', 'percentage', 'free_shipping', 'bundle', 'buy_x_get_y'],
    index: true
  },
  campaignAmount: {
    type: Number,
    required: [true, 'Campaign amount is required'],
    validate: {
      validator: function(v) {
        if (this.campaignType === 'percentage') {
          return v <= 100 && v > 0;
        }
        return v > 0;
      },
      message: 'Percentage campaigns must be 1-100, fixed amounts must be positive'
    }
  },

  // Enhanced Fields
  validCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
  excludedProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
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
        return this.campaignType === 'percentage' ? true : !v;
      },
      message: 'Max discount only applies to percentage campaigns'
    }
  },
  customerSegments: {
    type: String,
    enum: ['all', 'new', 'returning', 'vip', 'custom'],
    default: 'all'
  },
  customCustomers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  promotionCodes: [{
    type: Schema.Types.ObjectId,
    ref: 'PromotionCode'
  }],
  landingPageURL: {
    type: String,
    validate: {
      validator: v => /^(http|https):\/\/[^ "]+$/.test(v),
      message: 'Invalid URL format'
    }
  },
  bannerImage: {
    type: String,
    validate: {
      validator: v => /\.(jpg|jpeg|png|webp|svg)$/i.test(v),
      message: 'Image must be JPG, PNG, WEBP, or SVG'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ status: 1, campaignType: 1 });
campaignSchema.index({ validCategories: 1 });

// Middleware to update status based on dates
campaignSchema.pre('save', function(next) {
  const now = new Date();
  if (this.endDate < now) {
    this.status = 'completed';
  } else if (this.startDate <= now && this.endDate >= now && this.status === 'draft') {
    this.status = 'active';
  }
  next();
});

// Virtual for remaining uses
campaignSchema.virtual('remainingUses').get(function() {
  return this.usageLimit ? this.usageLimit - this.usageCount : null;
});

// Virtual for active status
campaignSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
});

// Static methods
campaignSchema.statics = {
  /**
   * Create a new campaign with validation checks
   */
  async createCampaign(data, userId) {
    // Verify valid categories if provided
    if (data.validCategories && data.validCategories.length > 0) {
      const validCategories = await Category.countDocuments({ 
        _id: { $in: data.validCategories } 
      });
      if (validCategories !== data.validCategories.length) {
        throw new Error('One or more categories are invalid');
      }
    }

    // Verify excluded products if provided
    if (data.excludedProducts && data.excludedProducts.length > 0) {
      const validProducts = await Product.countDocuments({ 
        _id: { $in: data.excludedProducts } 
      });
      if (validProducts !== data.excludedProducts.length) {
        throw new Error('One or more excluded products are invalid');
      }
    }

    // Verify custom customers if provided
    if (data.customerSegments === 'custom') {
      if (!data.customCustomers || data.customCustomers.length === 0) {
        throw new Error('Custom customer segment requires at least one customer');
      }
      
      const validCustomers = await User.countDocuments({ 
        _id: { $in: data.customCustomers },
        role: 'customer'
      });
      if (validCustomers !== data.customCustomers.length) {
        throw new Error('One or more customers are invalid');
      }
    }

    const campaign = new this({
      ...data,
      createdBy: userId,
      status: 'draft'
    });

    return await campaign.save();
  },

  /**
   * Get campaign by ID with populated fields
   */
  async getCampaignById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid campaign ID');
    }

    const campaign = await this.findById(id)
      .populate({
        path: 'validCategories',
        select: 'name slug image',
        match: { isActive: true }
      })
      .populate({
        path: 'excludedProducts',
        select: 'name sku price mainImage',
        match: { status: 'active' }
      })
      .populate({
        path: 'createdBy',
        select: 'username email firstName lastName avatar'
      })
      .populate({
        path: 'updatedBy',
        select: 'username email firstName lastName avatar'
      })
      .populate({
        path: 'customCustomers',
        select: 'email firstName lastName phone',
        match: { status: 'active' }
      })
      .populate({
        path: 'promotionCodes',
        select: 'code usageLimit usageCount validFrom validTo isActive',
        match: { isActive: true }
      });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return campaign;
  },

  /**
   * Get paginated list of campaigns with filters
   */
  async getCampaignsList({
    page = 1,
    limit = 25,
    status,
    type,
    active,
    upcoming,
    expired,
    search,
    sort = 'startDate:desc'
  }) {
    // Setup pagination
    const skip = (page - 1) * limit;
    
    // Build filter criteria
    const filter = {};
    const now = new Date();
    
    // Status Filter
    const validStatuses = ['draft', 'active', 'paused', 'completed', 'archived'];
    if (validStatuses.includes(status)) {
      filter.status = status;
    }

    // Type Filter
    const validTypes = ['fixed', 'percentage', 'free_shipping', 'bundle', 'buy_x_get_y'];
    if (validTypes.includes(type)) {
      filter.campaignType = type;
    }

    // Date-Based Filters
    if (active === 'true') {
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
      filter.status = 'active';
    } else if (upcoming === 'true') {
      filter.startDate = { $gt: now };
      filter.status = 'draft';
    } else if (expired === 'true') {
      filter.endDate = { $lt: now };
      filter.status = { $ne: 'archived' };
    }

    // Search Filter
    if (search) {
      filter.campaignName = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i'
      };
    }

    // Configure Sorting
    const sortOptions = {};
    const [sortField, direction] = sort.split(':');
    
    const validSortFields = ['startDate', 'endDate', 'createdAt', 'campaignName'];
    if (validSortFields.includes(sortField)) {
      sortOptions[sortField] = direction === 'asc' ? 1 : -1;
    }

    // Execute queries
    const [campaigns, total] = await Promise.all([
      this.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('validCategories', 'name slug')
        .populate('createdBy', 'username email')
        .lean({ virtuals: true }),
      
      this.countDocuments(filter)
    ]);

    return {
      campaigns,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  /**
   * Update campaign with validation checks
   */
  async updateCampaign(id, data, userId) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid campaign ID');
    }

    // Find existing campaign
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Verify valid categories if provided
    if (data.validCategories && data.validCategories.length > 0) {
      const validCategories = await Category.countDocuments({ 
        _id: { $in: data.validCategories } 
      });
      if (validCategories !== data.validCategories.length) {
        throw new Error('One or more categories are invalid');
      }
    }

    // Verify excluded products if provided
    if (data.excludedProducts && data.excludedProducts.length > 0) {
      const validProducts = await Product.countDocuments({ 
        _id: { $in: data.excludedProducts } 
      });
      if (validProducts !== data.excludedProducts.length) {
        throw new Error('One or more excluded products are invalid');
      }
    }

    // Verify custom customers if provided
    if (data.customerSegments === 'custom' || 
        (data.customerSegments === undefined && campaign.customerSegments === 'custom' && data.customCustomers)) {
      const customersToCheck = data.customCustomers || campaign.customCustomers;
      if (!customersToCheck || customersToCheck.length === 0) {
        throw new Error('Custom customer segment requires at least one customer');
      }
      
      const validCustomers = await User.countDocuments({ 
        _id: { $in: customersToCheck },
        role: 'customer'
      });
      if (validCustomers !== customersToCheck.length) {
        throw new Error('One or more customers are invalid');
      }
    }

    // Validate dates if being updated
    if (data.startDate || data.endDate) {
      const startDate = data.startDate || campaign.startDate;
      const endDate = data.endDate || campaign.endDate;
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate maxDiscountAmount for percentage campaigns
    if (data.campaignType === 'percentage' || 
        (data.campaignType === undefined && campaign.campaignType === 'percentage')) {
      if (data.maxDiscountAmount !== undefined && data.maxDiscountAmount <= 0) {
        throw new Error('Max discount amount must be positive for percentage campaigns');
      }
    }

    // Update campaign
    Object.assign(campaign, data);
    campaign.updatedBy = userId;
    return await campaign.save();
  },

  async getActiveCampaigns() {
    const now = new Date();
    return this.find({
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
    .populate('validCategories', 'name slug')
    .populate('excludedProducts', 'name sku')
    .lean();
  },
  
  /**
   * Delete a campaign after checking for associated promotion codes
   */
  async deleteCampaign(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid campaign ID');
    }

    // Find the campaign
    const campaign = await this.findById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.deleteOne({ _id: campaign._id });
    return campaign;
  }
};

module.exports = mongoose.model('Campaign', campaignSchema);