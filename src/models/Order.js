const mongoose = require('mongoose');
const Product = require('./Products');
const Promotion = require('./PromotionCode');
const PaymentProcessor = require('../modules/payment/PaymentProcessor');

const User = require('./User');
const logger = require('../services/logger');
const Campaign = require('./Campaign');

const { Schema } = mongoose;
const { calculateTax } = require('../modules/orders/service');

const orderItemSchema = new Schema({
  idProduct: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    validate: {
      validator: async function(v) {
        const product = await Product.findById(v);
        return !!product;
      },
      message: 'Product ID must reference a valid product'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    validate: {
      validator: async function(v) {
        const product = await Product.findById(this.idProduct);
        return product && v <= product.stockQuantity;
      },
      message: 'Quantity exceeds available stock'
    }
  },
  priceAtPurchase: {
    type: Number,
    required: [true, 'Purchase price must be recorded']
  },
}, { _id: false });

const orderSchema = new Schema({
  // Core Fields
  idCustomer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: v => v.length > 0,
      message: 'Order must contain at least one item'
    }
  },

  // Order Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },

  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['credit_card','paypal', 'stripe', 'cod', 'bank_transfer', 'cash_on_delivery'],
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  cancellationReason: {
    type: String,
    default: null
  },
  // Shipping Information
  shippingAddress: {
    type: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    required: [true, 'Shipping address is required']
  },
  trackingNumber: String,
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight'],
    default: 'standard'
  },

  // Financials
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0.01, 'Subtotal must be positive']
  },
  tax: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax cannot be negative']
  },
  shippingCost: {
    type: Number,
    required: [true, 'Shipping cost is required'],
    min: [0, 'Shipping cost cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0.01, 'Total must be positive']
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ idCustomer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });

// Virtuals
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.statics = {
  /**
   * Process cart items, apply campaigns, and calculate order details
   * @param {Array} cartItems - Array of cart items
   * @returns {Promise<Object>} Object containing orderItems, subtotal, and outOfStockItems
  */
  async processCartItems(cartItems) {
    if (!cartItems || cartItems.length === 0) {
        throw new Error('Cannot process empty cart');
    }

    let subtotal = 0;
    const orderItems = [];
    const outOfStockItems = [];
    
    try {
        // 1. Load required data in parallel
        const [activeCampaigns, products] = await Promise.all([
            Campaign.getActiveCampaigns(),
            this.getCartProductsById(cartItems.map(item => item.product))
        ]);

        logger.info(`Processing ${cartItems.length} cart items with ${activeCampaigns.length} active campaigns`);

        // 2. Create product map for efficient lookups
        const productMap = new Map();
        products.forEach(product => {
            productMap.set(product._id.toString(), product);
        });

        // 3. Process each cart item
        for (const cartItem of cartItems) {
            const productId = cartItem.product.toString();
            const product = productMap.get(productId);
            
            // 3.1 Validate product availability
            if (!product) {
                outOfStockItems.push({
                    productId: cartItem.product,
                    reason: 'Product no longer available'
                });
                continue;
            }

            if (product.stockQuantity < cartItem.quantity) {
                outOfStockItems.push({
                    productId: product._id,
                    name: product.name,
                    requested: cartItem.quantity,
                    available: product.stockQuantity,
                    reason: 'Insufficient stock'
                });
                continue;
            }

            // 3.2 Initialize pricing variables
            let finalPrice = product.price;
            let finalQuantity = cartItem.quantity;
            const appliedCampaigns = [];

            // 3.3 Apply relevant campaign discounts
            for (const campaign of activeCampaigns) {
                try {
                    // Check if product qualifies for this campaign
                    const isCategoryMatch = campaign.validCategories?.some(catId => 
                        product.categories?.includes(catId.toString())
                    ) || false;
                    
                    if (isCategoryMatch && !campaign.excludedProducts?.includes(product._id.toString())) {
                        logger.debug(`Applying campaign ${campaign.campaignName} to product ${product.name}`);
                        
                        const originalPrice = finalPrice;
                        
                        // Apply campaign logic
                        switch (campaign.campaignType) {
                            case 'fixed':
                                finalPrice = Math.max(0, finalPrice - campaign.campaignAmount);
                                break;
                            case 'percentage':
                                finalPrice = finalPrice * (1 - campaign.campaignAmount / 100);
                                break;
                            case 'buy_x_get_y':
                                if (finalQuantity >= campaign.buyX) {
                                    const freeItems = Math.floor(finalQuantity / campaign.buyX) * campaign.getY;
                                    finalQuantity = finalQuantity - freeItems;
                                }
                                break;
                            default:
                                logger.warn(`Unknown campaign type: ${campaign.campaignType}`);
                        }

                        // Track campaigns that affected price or quantity
                        if (originalPrice !== finalPrice || campaign.campaignType === 'buy_x_get_y') {
                            appliedCampaigns.push({
                                campaignId: campaign._id,
                                campaignName: campaign.campaignName,
                                discountType: campaign.campaignType,
                                discountValue: campaign.campaignAmount
                            });
                        }
                    }
                } catch (campaignError) {
                    logger.error(`Error applying campaign ${campaign._id} to product ${product._id}:`, campaignError);
                }
            }

            // 3.4 Validate final price
            if (isNaN(finalPrice)) {
                finalPrice = product.price; // Fallback to original price
            }

            // 3.5 Calculate item subtotal and build order item
            const itemSubtotal = finalPrice * finalQuantity;
            subtotal += itemSubtotal;

            orderItems.push({
                idProduct: product._id,
                productName: product.name,
                quantity: cartItem.quantity,
                effectiveQuantity: finalQuantity,
                originalPrice: product.price,
                priceAtPurchase: finalPrice,
                subtotal: itemSubtotal,
                appliedCampaigns,
                discountPercentage: ((product.price - finalPrice) / product.price * 100).toFixed(2)
            });
        }

        // 4. Validate campaign minimum purchase requirements
        const minPurchaseCampaigns = activeCampaigns.filter(c => c.minPurchaseAmount);
        for (const campaign of minPurchaseCampaigns) {
            if (subtotal < campaign.minPurchaseAmount) {
                logger.info(`Subtotal ${subtotal} < minimum ${campaign.minPurchaseAmount} for campaign ${campaign.campaignName}`);
                // TODO: Implement logic to remove discounts if minimum not met
            }
        }

        return {
            orderItems,
            subtotal,
            outOfStockItems
        };

    } catch (error) {
        logger.error('Error processing cart items:', error);
        throw new Error('Failed to process cart items');
    }
  },

  async getCartProductsById(productIds) {
    try {
      // Convert to plain array of strings if needed
      const ids = productIds.map(id => id.toString ? id.toString() : id);
      
      // Fetch products with all necessary fields for order processing
      const products = await Product.find({ 
        _id: { $in: ids } 
      })
      .select('_id name price stockQuantity categories seller')
      .populate('categories', '_id')
      .populate('seller', '_id username')
      .lean();
  
      if (!products || products.length === 0) {
        throw new Error('No products found for the given IDs');
      }
  
      return products; // Return array of products instead of map
    } catch (error) {
      console.error('Error fetching cart products:', error);
      throw error;
    }
  },

  /**
   * Apply promotion code to order
   * @param {string} promotionCode - Promotion code to apply
   * @param {ObjectId} userId - User ID
   * @param {Array} items - Order items
   * @param {number} subtotal - Order subtotal
   * @param {number} shippingCost - Calculated shipping cost
   * @returns {Promise<Object>} Object containing discount, promotionDetails, and finalShippingCost
   */
  async applyPromotionCode(promotionCode, userId, items, subtotal, shippingCost) {
    if (!promotionCode) {
      return {
        discount: 0,
        promotionDetails: null,
        finalShippingCost: shippingCost,
        error: null
      };
    }

    // Validate promotion code
    const promotion = await Promotion.findOne({
      code: promotionCode,
      active: true,
      $or: [
        { validFrom: { $lte: new Date() } },
        { validFrom: { $exists: false } }
      ],
      $or: [
        { validUntil: { $gte: new Date() } },
        { validUntil: { $exists: false } }
      ]
    });

    if (!promotion) {
      return {
        error: 'Invalid or expired promotion code'
      };
    }

    // Check if user has already used this promotion
    const hasUsed = await this.exists({
      idCustomer: userId,
      'promotion.code': promotionCode,
      status: { $nin: ['cancelled', 'failed'] }
    });

    if (hasUsed && promotion.oneTimeUse) {
      return {
        error: 'This promotion code has already been used'
      };
    }

    // Calculate discount based on promotion type
    let discount = 0;
    let finalShippingCost = shippingCost;
    const applicableItems = items.filter(item => 
      !promotion.applicableProducts || 
      promotion.applicableProducts.includes(item.product._id)
    );

    if (promotion.discountType === 'percentage') {
      const applicableSubtotal = applicableItems.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0
      );
      discount = applicableSubtotal * (promotion.discountValue / 100);
    } else if (promotion.discountType === 'fixed') {
      discount = Math.min(promotion.discountValue, subtotal);
    } else if (promotion.discountType === 'freeShipping') {
      finalShippingCost = 0;
    }

    return {
      discount,
      promotionDetails: {
        code: promotion.code,
        name: promotion.name,
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        applicableProducts: promotion.applicableProducts
      },
      finalShippingCost,
      error: null
    };
  },

  /**
   * Calculate final order totals including tax
   * @param {number} subtotal - Order subtotal
   * @param {number} discount - Applied discount amount
   * @param {Object} shippingAddress - Shipping address for tax calculation
   * @param {number} shippingCost - Shipping cost
   * @returns {Promise<Object>} Object containing tax and total amounts
   */
  async calculateFinalTotals(subtotal, discount, shippingAddress, shippingCost) {
    // Calculate tax based on shipping address
    const taxRate = await calculateTax(shippingAddress);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * taxRate;

    const total = taxableAmount + tax + shippingCost;

    return { tax, total };
  },

  /**
   * Create and process an order including payment
   * @param {Object} orderData - Complete order data
   * @param {string} paymentMethod - Payment method
   * @param {Object} paymentContext - Additional payment context (ip, userAgent, etc.)
   * @returns {Promise<Object>} Object containing the order and payment result
  */
  async createAndProcessOrder(orderData, paymentMethod, paymentContext = {}) {
    // Create the order document first
    const order = await this.createCompleteOrder(orderData);

    try {
        // Prepare payment data
        const paymentData = {
            ipAddress: paymentContext.ip,
            userAgent: paymentContext.userAgent,
            billingAddress: orderData.shippingAddress, // Using shipping as billing if not specified
            ...paymentContext
        };

        // Process payment through PaymentProcessor
        const paymentResult = await PaymentProcessor.process(order, paymentData);

        if (!paymentResult.success) {
            throw new PaymentError('Payment processing failed', {
                paymentMethod,
                amount: order.total,
                originalError: paymentResult.error
            });
        }

        // Update order with payment status
        order.paymentStatus = 'completed';
        order.paymentId = paymentResult.paymentId;
        order.transactionId = paymentResult.transactionId;
        order.status = 'processing';
        order.paymentDetails = {
            method: paymentMethod,
            processor: paymentMethod === 'credit_card' ? 'stripe' : paymentMethod,
            transactionId: paymentResult.transactionId,
            processedAt: new Date()
        };

        await order.save();

        // Return both order and detailed payment result
        return {
            order,
            paymentResult: {
                success: true,
                transactionId: paymentResult.transactionId,
                paymentId: paymentResult.paymentId,
                paymentRecord: paymentResult.paymentRecord,
                amount: order.total,
                currency: order.currency || 'USD'
            }
        };

    } catch (error) {
        // Handle payment failure
        order.status = 'failed';
        order.paymentStatus = 'failed';
        order.failureReason = error.message;
        order.paymentDetails = order.paymentDetails || {};
        order.paymentDetails.error = error.message;
        
        if (error.originalError) {
            order.paymentDetails.processorError = error.originalError.message;
        }

        await order.save();

        // Log the payment failure
        logger.error('Order payment failed', {
            orderId: order._id,
            error: error.message,
            paymentMethod,
            amount: order.total,
            stack: error.stack
        });

        // Re-throw as PaymentError if it isn't already
        if (!(error instanceof PaymentError)) {
            throw new PaymentError(
                error.message, 
                paymentMethod, 
                order.total, 
                error
            );
        }

        throw error;
    }
  },

  /**
   * Finalize order by updating user and inventory
   * @param {ObjectId} orderId - The order ID
   * @param {ObjectId} userId - The user ID
   * @param {Array} orderItems - Order items
   * @param {Object} paymentResult - Payment result
   * @param {string} paymentMethod - Payment method
   * @param {string} promotionCode - Applied promotion code
   * @returns {Promise<void>}
   */
  async finalizeOrder(orderId, userId, orderItems, paymentResult, paymentMethod, promotionCode) {
    // Update user's orders and clear cart
    await User.clearCart(userId);
    await this.updateUserWithNewOrder(userId, orderId);

    // Update product stock
    await this.updateProductStock(orderItems);

    // Record transaction if payment was successful
    if (paymentResult.success) {
        const paymentData = {
            order_id: orderId,
            customer_id: userId,
            payment_id: paymentResult.paymentId || paymentResult.transactionId,
            payment_status: 'approved', // Maps to 'completed' in your schema enum
            payment_method: paymentMethod,
            total_amount: paymentResult.amount,
            currency: paymentResult.currency || 'USD',
            description: `Payment for order ${orderId}`,
            processor_response: {
                transaction_id: paymentResult.transactionId,
                status: paymentResult.status || 'approved'
            },
            metadata: {
                ip_address: paymentResult.ipAddress,
                user_agent: paymentResult.userAgent
            }
        };

        // Add promotion code if available
        if (promotionCode) {
            paymentData.metadata.promotion_code = promotionCode;
        }

        // Add billing address if available in paymentResult
        if (paymentResult.billingAddress) {
            paymentData.billing_address = {
                recipient_name: paymentResult.billingAddress.recipientName || 
                               paymentResult.billingAddress.name || 
                               `${paymentResult.billingAddress.firstName} ${paymentResult.billingAddress.lastName}`,
                line1: paymentResult.billingAddress.line1 || paymentResult.billingAddress.street,
                line2: paymentResult.billingAddress.line2 || '',
                city: paymentResult.billingAddress.city,
                state: paymentResult.billingAddress.state,
                postal_code: paymentResult.billingAddress.postalCode || paymentResult.billingAddress.zip,
                country_code: paymentResult.billingAddress.countryCode || paymentResult.billingAddress.country
            };
        }

    }
  },

  /**
   * Creates a new order with validation, logging, and proper calculations
   * @param {Object} orderData - Order data including customer, items, payment, etc.
   * @returns {Promise<Order>} The created order
  */
  async createCompleteOrder(orderData) {
    // Required fields validation
    const requiredFields = ['idCustomer', 'items', 'paymentMethod', 'shippingAddress'];
    const missingFields = requiredFields.filter(field => !orderData[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Calculate totals if not provided
    const discountedSubtotal = orderData.subtotal - (orderData.discount || 0);
    const tax = orderData.tax || 0; // In real app, this would be calculated
    const finalShippingCost = orderData.shippingCost || 0;
    const total = orderData.total || (discountedSubtotal + tax + finalShippingCost);

    // DEBUG LOGS - VERIFY ALL VALUES
    logger.info('Order Calculation Breakdown:'+ JSON.stringify({
        originalSubtotal: orderData.subtotal,
        discountApplied: orderData.discount || 0,
        discountedSubtotal: discountedSubtotal,
        taxAmount: tax,
        shippingCost: finalShippingCost,
        calculatedTotal: total
    }));

    // Create order with ALL values
    const order = new this({
        idCustomer: orderData.idCustomer,
        items: orderData.items.map(item => ({
            idProduct: item.idProduct,
            productName: item.productName,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
            appliedCampaigns: item.appliedCampaigns || []
        })),
        status: orderData.status || 'pending',
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus || 'pending',
        shippingAddress: {
            street: orderData.shippingAddress.street,
            city: orderData.shippingAddress.city,
            state: orderData.shippingAddress.state,
            postalCode: orderData.shippingAddress.postalCode,
            country: orderData.shippingAddress.country
        },
        shippingMethod: orderData.shippingMethod || 'standard',
        subtotal: orderData.subtotal,
        tax: tax,
        shippingCost: finalShippingCost,
        discount: orderData.discount || 0,
        promotion: orderData.promotion || null,
        total: total,
        estimatedDelivery: orderData.estimatedDelivery || null,
        appliedCampaigns: orderData.appliedCampaigns || orderData.items.reduce((acc, item) => {
            return [...acc, ...(item.appliedCampaigns || [])];
        }, [])
    });

    await order.save();
    return order;
  },

  /**
   * Update user's orders with minimal required data
   * @param {ObjectId} userId - The user ID
   * @param {ObjectId} orderId - The order ID to add
   * @returns {Promise<Object>} Update result
   */
  async updateUserWithNewOrder(userId, orderId) {
    return User.updateOne(
      { _id: userId },
      {
        $push: { 'commerce.orders': orderId },
        $set: { 'commerce.cart.items': [] }
      }
    );
  },

  /**
   * Update product stock quantities with essential data
   * @param {Array} items - Array of order items with required: idProduct, quantity
   * @returns {Promise<Object>} Bulk write result
   */
  async updateProductStock(items) {
    if (!items.every(item => item.idProduct && item.quantity)) {
      throw new Error('Items must contain idProduct and quantity');
    }

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { 
          _id: item.idProduct,
          stockQuantity: { $gte: item.quantity }
        },
        update: { $inc: { stockQuantity: -item.quantity } }
      }
    }));

    return Product.bulkWrite(bulkOps);
  },

  /**
   * Verify product stock with essential data only
   * @param {Array} items - Array of items with required: idProduct, quantity
   * @returns {Promise<{available: boolean, outOfStockItems: Array}>}
   */
  async verifyStockAvailability(items) {
    const outOfStockItems = [];
    const productIds = items.map(item => item.idProduct);
    
    const products = await Product.find({ 
      _id: { $in: productIds } 
    }).select('_id stockQuantity name');

    for (const item of items) {
      const product = products.find(p => p._id.equals(item.idProduct));
      if (!product) {
        outOfStockItems.push({
          productId: item.idProduct,
          reason: 'Product no longer available'
        });
        continue;
      }

      if (product.stockQuantity < item.quantity) {
        outOfStockItems.push({
          productId: product._id,
          productName: product.name,
          requested: item.quantity,
          available: product.stockQuantity
        });
      }
    }

    return {
      available: outOfStockItems.length === 0,
      outOfStockItems
    };
  },

  async getCustomerOrders(customerId, page = 1, limit = 10, status = null) {
    // Validate inputs
    if (!customerId) {
      throw new Error('Customer ID is required');
    } 
    
    page = Math.max(1, parseInt(page));
    limit = Math.max(1, Math.min(parseInt(limit), 100)); // Cap limit at 100
    
    // Create base query
    const query = { idCustomer: customerId };
    if (status) query.status = status;
    
    // Get total count of matching orders
    const total = await this.countDocuments(query);
    
    // Get paginated orders with essential fields
    const orders = await this.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id items status total paymentMethod shippingAddress createdAt estimatedDelivery paymentStatus trackingNumber')
      .populate({
        path: 'items.idProduct',
        select: 'name mainImage slug' // Only get essential product info
      })
      .lean();
    
    return {
      orders,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  },

  /**
   * Get essential order details
   * @param {ObjectId} orderId - The order ID
   * @param {ObjectId} customerId - The customer ID
   * @returns {Promise<Object>} Minimal order data
   */
  async getOrderDetails(orderId, customerId) {
    return this.findOne({
      _id: orderId,
      idCustomer: customerId
    })
    .select('items status total paymentMethod shippingAddress createdAt estimatedDelivery promotion appliedCampaigns')
    .lean();
  },

  /**
   * Get admin orders with filtering and pagination
   * @param {ObjectId} customerId - Optional customer ID filter
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} query - Additional query filters
   * @param {string} sortBy - Field to sort by
   * @param {string} sortOrder - Sort order ('asc' or 'desc')
   * @returns {Promise<Object>} Orders with pagination info
  */
  async fetchAdminOrders(customerId, page = 1, limit = 10, query = {}, sortBy = 'createdAt', sortOrder = 'desc') {
    // If customerId is provided, add to query
    if (customerId) {
        query.idCustomer = customerId;
    }

    const [orders, total] = await Promise.all([
        this.find(query)
            .populate({
                path: 'idCustomer',
                select: 'firstName lastName email'
            })
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        orders,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
    };
  },

  /**
   * Cancel an order with required data only
   * @param {ObjectId} orderId - The order ID
   * @param {ObjectId} customerId - The customer ID
   * @param {string} cancellationReason - Required reason
   * @returns {Promise<Order>} Updated order
   */
  async cancelOrder(orderId, customerId, cancellationReason) {
    if (!cancellationReason) {
      throw new Error('Cancellation reason is required');
    }

    const order = await this.findOne({
      _id: orderId,
      idCustomer: customerId,
      status: { $in: ['pending', 'processing'] }
    });

    if (!order) {
      throw new Error('Order not found or not eligible for cancellation');
    }
    
    order.status = 'cancelled';
    order.cancellationReason = cancellationReason;
    order.cancelledAt = new Date();
    return order.save();
  },

  /**
   * Update essential order status (admin)
   * @param {ObjectId} orderId - The order ID
   * @param {string} status - New status
   * @returns {Promise<Order>} Updated order
   */
  async updateOrderStatus(orderId, status) {
    if (!status) {
      throw new Error('Status is required');
    }

    const validStatuses = ['processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await this.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Update status and set timestamps for certain status changes
    order.status = status;
    if (status === 'shipped') {
      order.shippedAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
    } else if (status === 'completed') {
      order.completedAt = new Date();
    }

    return order.save();
  }
};

module.exports = mongoose.model('Order', orderSchema);