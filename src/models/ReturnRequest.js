const mongoose = require('mongoose');
const { Schema } = mongoose;

const returnRequestSchema = new Schema({
  // Core Fields (from your Joi validation)
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    validate: {
      validator: async function(v) {
        const order = await mongoose.model('Order').findById(v);
        return !!order;
      },
      message: 'Order ID must reference a valid order',
    },
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Return reason is required'],
    maxlength: [255, 'Reason cannot exceed 255 characters'],
    trim: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true,
    default: '',
  },

  // Return Status & Workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'refunded', 'completed', 'archived'],
    default: 'pending',
    index: true,
  },
  returnType: {
    type: String,
    enum: ['refund', 'exchange', 'store_credit'],
    required: [true, 'Return type is required'],
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    validate: {
      validator: function(v) {
        if (this.returnType === 'refund' || this.returnType === 'store_credit') {
          return v > 0;
        }
        return true;
      },
      message: 'Refund amount must be positive for refund/store credit requests',
    },
  },
  exchangeProductId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    validate: {
      validator: async function(v) {
        if (this.returnType !== 'exchange') return true;
        const product = await mongoose.model('Product').findById(v);
        return !!product;
      },
      message: 'Exchange product must exist',
    },
  },

  // Logistics & Tracking
  trackingNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return this.status === 'processing' ? !!v : true;
      },
      message: 'Tracking number is required when status is "processing"',
    },
  },
  returnShippingMethod: {
    type: String,
    enum: ['customer', 'merchant', 'pickup'],
    default: 'customer',
  },
  returnLabelProvided: {
    type: Boolean,
    default: false,
  },

  // Timestamps & Audit
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
    validate: {
      validator: function(v) {
        return this.status === 'completed' || this.status === 'refunded' ? !!v : true;
      },
      message: 'Resolved date is required for completed/refunded returns',
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// **Indexes for Performance**
returnRequestSchema.index({ customerId: 1, status: 1 });
returnRequestSchema.index({ orderId: 1, status: 1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });

// **Middleware (Auto-updates)**
returnRequestSchema.pre('save', function(next) {
  if (this.isModified('status') && ['completed', 'refunded'].includes(this.status)) {
    this.resolvedAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

// **Virtual Fields**
returnRequestSchema.virtual('customer', {
  ref: 'User',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true,
});

returnRequestSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true,
});

returnRequestSchema.statics = {
  /**
   * Create a new return request with validation
   * @param {Object} returnRequestData - Data for the new return request
   * @returns {Promise<ReturnRequest>} The created return request
   */
  createReturnRequest: async function(returnRequestData) {
    const returnRequest = new this(returnRequestData);
    return await returnRequest.save();
  },

  /**
   * Find return request by ID with authorization check
   * @param {String} id - Return request ID
   * @param {String} userId - User ID making the request
   * @param {String} userRole - User role making the request
   * @returns {Promise<ReturnRequest>} The found return request
   */
  getReturnRequest: async function(id, userId, userRole) {
    const returnRequest = await this.findById(id)
      .populate('customerId', 'username email')
      .populate('orderId', 'totalAmount status')
      .populate('exchangeProductId', 'name price');
    
    if (!returnRequest) {
      throw new Error('Return request not found');
    }

    if (userRole !== 'admin' && !returnRequest.customerId._id.equals(userId)) {
      throw new Error('Unauthorized to view this return request');
    }

    return returnRequest;
  },

  /**
 * Get paginated list of return requests with filters
 * @param {Object} options - Query options
 * @param {String} [options.userId] - Customer ID for non-admin requests
 * @param {String} [options.userRole] - User role making the request
 * @param {String} [options.status] - Filter by status
 * @param {String} [options.returnType] - Filter by return type
 * @param {String} [options.orderId] - Filter by order ID
 * @param {Object} [options.sort] - Sorting criteria
 * @param {Number} [options.page=1] - Page number
 * @param {Number} [options.limit=10] - Items per page
 * @returns {Promise<Object>} Paginated result with return requests and metadata
 */
  getReturnRequests: async function({
  userId,
  userRole,
  status,
  returnType,
  orderId,
  sort = { createdAt: -1 },
  page = 1,
  limit = 10
}) {
  const query = {};
  if (userRole !== 'admin') {
    query.customerId = userId;
  }
  if (status) query.status = status;
  if (returnType) query.returnType = returnType;
  if (orderId) query.orderId = orderId;

  const skip = (page - 1) * limit;

  const [returnRequests, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'username email')
      .populate('orderId', 'totalAmount status')
      .populate('exchangeProductId', 'name price'),
    this.countDocuments(query)
  ]);

  return {
    returnRequests,
    total
  };
  },

  /**
   * Update return request by customer
   * @param {String} id - Return request ID
   * @param {String} userId - Customer ID making the update
   * @param {Object} updateData - Fields to update
   * @returns {Promise<ReturnRequest>} The updated return request
   */
  updateCustomerReturnRequest: async function(id, userId, updateData) {
    const returnRequest = await this.findById(id);
    if (!returnRequest) {
      throw new Error('Return request not found');
    }
  
    if (!returnRequest.customerId.equals(userId)) {
      throw new Error('Unauthorized to update this return request');
    }
  
    if (returnRequest.status !== 'pending') {
      throw new Error('Only pending return requests can be updated by customers');
    }
  
    // Only allow updating specific fields
    const allowedFields = ['description', 'returnShippingMethod'];
    const filteredUpdate = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredUpdate[field] = updateData[field];
      }
    }
  
    // Save old values for audit log
    const oldValues = {
      description: returnRequest.description,
      returnShippingMethod: returnRequest.returnShippingMethod
    };
  
    Object.assign(returnRequest, filteredUpdate);
    const updatedReturnRequest = await returnRequest.save();
    
    return {
      returnRequest: updatedReturnRequest,
      oldValues
    };
  },

  /**
   * Update return request by admin
   * @param {String} id - Return request ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<ReturnRequest>} The updated return request
   */
  updateAdminReturnRequest: async function(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid return request ID format');
    }
  
    const returnRequest = await this.findById(id);
    if (!returnRequest) {
      const err = new Error('Return request not found');
      err.statusCode = 404;
      throw err;
    }
  
    // Validate status transitions
    const validTransitions = {
      pending: ['approved', 'rejected'],
      approved: ['processing'],
      processing: ['refunded', 'completed'],
      rejected: [],
      refunded: [],
      completed: []
    };
  
    if (updateData.status) {
      if (!validTransitions[returnRequest.status]?.includes(updateData.status)) {
        const err = new Error(`Invalid status transition from ${returnRequest.status} to ${updateData.status}`);
        err.statusCode = 400;
        throw err;
      }
    }
  
    // Validate exchange product if needed
    if (updateData.exchangeProductId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.exchangeProductId)) {
        const err = new Error('Invalid exchange product ID format');
        err.statusCode = 400;
        throw err;
      }
      
      const productExists = await mongoose.model('Product').exists({ _id: updateData.exchangeProductId });
      if (!productExists) {
        const err = new Error('Exchange product not found');
        err.statusCode = 404;
        throw err;
      }
    }
  
    const oldValues = {
      status: returnRequest.status,
      refundAmount: returnRequest.refundAmount,
      description: returnRequest.description,
      returnShippingMethod: returnRequest.returnShippingMethod,
      adminNotes: returnRequest.adminNotes
    };
  
    Object.assign(returnRequest, updateData);
    const updatedReturnRequest = await returnRequest.save();
    
    return updatedReturnRequest;
  },

  /**
   * Delete a return request
   * @param {String} id - Return request ID
   * @param {String} userId - User ID making the deletion
   * @returns {Promise<Object>} Deletion result with deleted ID
   */
  deleteReturnRequest: async function(id, user) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { 
        message: 'Invalid return request ID format', 
        statusCode: 400 
      };
    }
  
    const returnRequest = await this.findById(id);
    
    // Check if return request exists
    if (!returnRequest) {
      throw { 
        message: 'Return request not found', 
        statusCode: 404 
      };
    }
  
    // Check if already soft-deleted
    if (returnRequest.status === 'archived') {
      throw { 
        message: 'Return request already archived', 
        statusCode: 410 
      };
    }
  
    // Check ownership or admin role
    if (String(returnRequest.customerId) !== String(user._id) && user.role !== 'admin') {
      throw { 
        message: 'Not authorized to update this return request', 
        statusCode: 403 
      };
    }
  
    // Additional business rule - only pending requests can be deleted
    if (returnRequest.status !== 'pending' && user.role !== 'admin') {
      throw { 
        message: 'Only pending return requests can be archived', 
        statusCode: 403 
      };
    }
  
    // Soft delete implementation
    returnRequest.status = 'archived';
  
    // Save the changes
    const archivedRequest = await returnRequest.save();
  
    return {
      success: true,
      message: 'Return request archived successfully',
      data: {
        id: archivedRequest._id,
        status: archivedRequest.status,
        archivedAt: archivedRequest.archivedAt
      }
    };
  },

  /**
   * Find return requests by customer ID with pagination
   * @param {String} customerId - Customer ID
   * @param {Number} [limit=10] - Items per page
   * @param {Number} [page=1] - Page number
   * @returns {Promise<Array>} List of return requests
   */
  findByCustomer: function(customerId, limit = 10, page = 1) {
    return this.find({ customerId })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('order', 'totalAmount status');
  },

  /**
   * Approve a return request (admin action)
   * @param {String} requestId - Return request ID
   * @param {String} adminId - Admin ID approving the request
   * @returns {Promise<ReturnRequest>} The approved return request
   */
  approveRequest: async function(requestId, adminId) {
    return this.findByIdAndUpdate(
      requestId,
      { 
        status: 'approved',
        updatedBy: adminId,
      },
      { new: true }
    );
  }
};


module.exports = mongoose.model('ReturnRequest', returnRequestSchema);