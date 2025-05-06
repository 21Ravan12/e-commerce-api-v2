const Order = require('../../../models/Order');
const Product = require('../../../models/Products');
const User = require('../../../models/User');
const PaymentProcessor = require('../../payment/PaymentProcessor');
const AuditLog = require('../../../models/AuditLog');
const logger = require('../../../services/logger');
const mongoose = require('mongoose');
const { createOrderSchema, getOrdersSchema, getAdminOrdersSchema, updateOrderSchema, cancelOrderSchema, updateAdminOrderSchema } = require('../schemas');
const { calculateDeliveryDate, calculateShipping, calculateTax, validateAndApplyPromotion, updatePromotionUsage } = require('../service');

class OrderController {//total number problem in createOrder


  async createOrder(req, res) {
    try {
        const userId = req.user._id;
        const { shippingAddress, paymentMethod, shippingMethod, promotionCode } = req.body;

        // Validate request body against schema
        const { error } = createOrderSchema.validate(req.body);
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Get user with populated cart
        const cart = await User.getCartItems(userId, { commerce: 1 });

        // Validate cart not empty
        if (!cart?.items || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cannot create order with empty cart' });
        }

        // Process cart items and calculate order details
        const { orderItems, subtotal, outOfStockItems } = await Order.processCartItems(cart.items);
        
        if (outOfStockItems.length > 0) {
            await AuditLog.logAsync({
                event: 'ORDER_CREATE',
                user: userId,
                action: 'create',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: 'Out of stock items',
                    outOfStockItems,
                    cartItems: cart.items.map(item => ({
                        productId: item.product?._id,
                        name: item.product?.name,
                        requestedQuantity: item.quantity
                    }))
                }
            });

            return res.status(400).json({
                error: 'Some items are out of stock',
                outOfStockItems
            });
        }

        // Calculate shipping cost
        const shippingCost = await calculateShipping(shippingMethod);
        const deliveryDate = calculateDeliveryDate(new Date(), shippingMethod);

        // Handle promotion code
        const promotionResult = await Order.applyPromotionCode(
            promotionCode,
            userId,
            orderItems,
            subtotal,
            shippingCost
        );

        if (promotionResult.error) {
            return res.status(400).json({ error: promotionResult.error });
        }

        const { discount, promotionDetails, finalShippingCost } = promotionResult;

        // Calculate final totals including tax
        const { tax, total } = await Order.calculateFinalTotals(
            subtotal,
            discount,
            shippingAddress,
            finalShippingCost
        );
        
        console.log(1);

        // Create and process the order
        const { order, paymentResult } = await Order.createAndProcessOrder({
            idCustomer: userId,
            items: orderItems,
            paymentMethod,
            shippingAddress,
            shippingMethod,
            discount,
            promotion: promotionDetails,
            estimatedDelivery: deliveryDate,
            subtotal,
            tax,
            shippingCost: finalShippingCost,
            total
        }, paymentMethod);

        console.log(1);

        // Finalize the order (update user, inventory, etc.)
        await Order.finalizeOrder(
            order._id,
            userId,
            orderItems,
            paymentResult,
            paymentMethod,
            promotionCode
        );

        // Create audit log
        await AuditLog.logAsync({
            event: 'ORDER_CREATE',
            user: userId,
            action: 'create',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                orderId: order._id,
                totalAmount: order.total,
                itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
                paymentMethod: order.paymentMethod,
                transactionId: order.transactionId,
                products: order.items.map(item => ({
                    productId: item.idProduct,
                    quantity: item.quantity,
                    price: item.priceAtPurchase
                })),
                campaigns: order.appliedCampaigns
            }
        });
        
        res.status(201).json({
            message: 'Order created successfully',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                status: order.status,
                total: order.total,
                estimatedDelivery: order.estimatedDelivery,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                appliedDiscounts: {
                    campaigns: order.appliedCampaigns,
                    promotion: order.promotion
                }
            }
        });
    } catch (error) {
        await AuditLog.logAsync({
            event: 'ORDER_CREATE',
            user: req.user?._id,
            action: 'create',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                shippingAddress: req.body.shippingAddress,
                paymentMethod: req.body.paymentMethod
            }
        });

        logger.error(`Error creating order: ${error.message}`, { error });
        res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async getOrders(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;
  
      // Validate query parameters
      const { error } = getOrdersSchema.validate({ page, limit, status });
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        return res.status(400).json({ errors });
      }

      // Get orders with status filtering at the database level for efficiency
      const ordersData = await Order.getCustomerOrders(userId, page, limit, status);
  
      // Format the orders response
      const formattedOrders = ordersData.orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
        status: order.status,
        total: order.total,
        estimatedDelivery: order.estimatedDelivery,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        // Include first product image if available
        previewImage: order.items[0]?.idProduct?.mainImage || null
      }));
  
      await AuditLog.logAsync({
        event: 'ORDERS_ACCESS',
        user: userId,
        action: 'read',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          orderCount: formattedOrders.length,
          totalOrders: ordersData.total,
          page,
          limit,
          statusFilter: status || 'all'
        }
      });
  
      res.status(200).json({
        orders: formattedOrders,
        count: formattedOrders.length,
        total: ordersData.total,
        page: ordersData.page,
        pages: ordersData.pages,
        limit: ordersData.limit
      });
  
    } catch (error) {
      await AuditLog.logAsync({
        event: 'ORDERS_ACCESS',
        user: req.user?._id,
        action: 'read',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          queryParams: req.query
        }
      });
  
      console.error(`Error fetching orders: ${error.message}`);
      res.status(500).json({
        error: 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user._id;
  
      // Use static method for DB access
      const order = await Order.getOrderDetails(orderId, userId);
  
      if (!order) {
        return res.status(404).json({ 
          error: 'Order not found',
          details: 'No order found with the provided ID for this user'
        });
      }
  
      // Format the response
      const formattedOrder = {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedDelivery: order.estimatedDelivery,
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shippingCost,
        total: order.total,
        shippingAddress: order.shippingAddress,
        shippingMethod: order.shippingMethod,
        items: order.items.map(item => ({
          productId: item.idProduct?._id,
          product: item.idProduct ? {
            name: item.idProduct.name,
            description: item.idProduct.description,
            images: item.idProduct.images,
            slug: item.idProduct.slug,
            stock: item.idProduct.stock
          } : null,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
          subtotal: item.subtotal
        })),
        history: order.history || []
      };
  
      // Audit log
      await AuditLog.logAsync({
        event: 'ORDER_DETAILS_ACCESS',
        user: userId,
        action: 'read',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.total,
          itemCount: order.items.length,
          paymentMethod: order.paymentMethod
        }
      });
  
      res.status(200).json({
        order: formattedOrder,
        message: 'Order details retrieved successfully'
      });
  
    } catch (error) {
      await AuditLog.logAsync({
        event: 'ORDER_DETAILS_ACCESS',
        user: req.user?._id,
        action: 'read',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          orderId: req.params.orderId,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
  
      console.error(`Error fetching order details: ${error.message}`);
      res.status(500).json({ 
        error: 'Failed to fetch order details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getAdminOrders(req, res) {
    try {
        // Check ownership or admin role
        if (req.user.role !== 'admin') {
            throw new Error('Not authorized to get all orders', 403);
        }

        const { 
            page = 1, 
            limit = 10, 
            status, 
            customerId,
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            minTotal,
            maxTotal
        } = req.query;

        // Validate query parameters
        const { error } = getAdminOrdersSchema.validate(req.query);
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Build query
        const query = {};
        
        // Status filter
        if (status) {
            query.status = status;
        }
        
        // Customer filter
        if (customerId) {
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                return res.status(400).json({ error: 'Invalid customer ID' });
            }
            query.idCustomer = customerId;
        }
        
        // Date range filter
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }
        
        // Total amount range filter
        if (minTotal || maxTotal) {
            query.total = {};
            if (minTotal) query.total.$gte = Number(minTotal);
            if (maxTotal) query.total.$lte = Number(maxTotal);
        }

        // Use fetchAdminOrders for database operations
        const { orders, total, page: currentPage, pages } = await Order.fetchAdminOrders(
            query.idCustomer, 
            page, 
            limit,
            query,
            sortBy,
            sortOrder
        );

        // Format response with additional admin fields
        const formattedOrders = orders.map(order => ({
            _id: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
            estimatedDelivery: order.estimatedDelivery,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            customer: order.idCustomer ? {
                _id: order.idCustomer._id,
                name: `${order.idCustomer.firstName} ${order.idCustomer.lastName}`,
                email: order.idCustomer.email
            } : null,
            items: order.items.map(item => ({
                productId: item.idProduct,
                quantity: item.quantity,
                priceAtPurchase: item.priceAtPurchase,
                subtotal: item.subtotal
            })),
            shippingAddress: order.shippingAddress,
            shippingMethod: order.shippingMethod,
            shippingCost: order.shippingCost,
            tax: order.tax,
            notes: order.notes || null,  // Admin-only field
            internalFlags: order.internalFlags || []  // Admin-only field
        }));

        // Create admin audit log
        await AuditLog.logAsync({
            event: 'ADMIN_ORDERS_ACCESS',
            user: req.user._id,
            action: 'read',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                orderCount: orders.length,
                totalOrders: total,
                page,
                limit,
                filters: {
                    status,
                    customerId,
                    dateFrom,
                    dateTo,
                    minTotal,
                    maxTotal
                },
                sort: {
                    by: sortBy,
                    order: sortOrder
                }
            }
        });

        res.status(200).json({
            orders: formattedOrders,
            count: orders.length,
            total: total,
            page: currentPage,
            pages: pages,
            filters: {
                status,
                customerId,
                dateFrom,
                dateTo,
                minTotal,
                maxTotal
            }
        });
    } catch (error) {
        // Error audit log
        await AuditLog.logAsync({
            event: 'ADMIN_ORDERS_ACCESS',
            user: req.user?._id,
            action: 'read',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                queryParams: req.query,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        console.error(`[Admin] Error fetching orders: ${error.message}`);
        res.status(500).json({ 
            error: 'Failed to fetch orders',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
  }

  async cancelOrder(req, res) {
    try {
        const userId = req.user._id;
        const orderId = req.params.id;

        // Validate order ID
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const { error } = cancelOrderSchema.validate(req.body);
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        // Find order and verify ownership (done in cancelOrderinstatic)
        let order;
        try {
            order = await Order.cancelOrder(
                orderId,
                userId,
                req.body.cancellationReason
            );
        } catch (dbError) {
            await AuditLog.logAsync({
                event: 'USER_ORDER_UPDATE',
                user: userId,
                action: 'cancel',
                source: 'web',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: dbError.message,
                    orderId: orderId
                }
            });
            
            return res.status(404).json({ 
                error: dbError.message 
            });
        }

        // Process refund if order was paid
        let refundResult = null;
        if (order.paymentStatus === 'completed') {
            try {
                refundResult = await PaymentProcessor.refund(order);

                // Log successful refund
                await AuditLog.logAsync({
                    event: 'PAYMENT_REFUND',
                    user: userId,
                    action: 'refund',
                    source: 'web',
                    status: 'success',
                    ip: req.ip,
                    userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                    metadata: {
                        orderId: order._id,
                        paymentId: order.paymentId,
                        amount: order.total,
                        refundId: refundResult.paymentRecord.refunds[0].processor_refund_id
                    }
                });
            } catch (refundError) {
                // Log failed refund attempt
                await AuditLog.logAsync({
                    event: 'PAYMENT_REFUND',
                    user: userId,
                    action: 'refund',
                    source: 'web',
                    status: 'failure',
                    ip: req.ip,
                    userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                    metadata: {
                        orderId: order._id,
                        paymentId: order.paymentId,
                        error: refundError.message
                    }
                });

                console.error('Refund failed:', refundError);
            }
        }

        // Enhanced audit log
        await AuditLog.logAsync({
            event: 'USER_ORDER_UPDATE',
            user: userId,
            action: 'cancel',
            source: 'web',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                orderId: order._id,
                newValues: {
                    status: order.status,
                    cancellationReason: order.cancellationReason,
                    cancelledAt: order.cancelledAt
                },
                refundProcessed: !!refundResult,
                refundId: refundResult?.paymentRecord?.refunds[0]?.processor_refund_id
            }
        });

        // Formatted response
        res.status(200).json({
            message: 'Order cancelled successfully',
            refundProcessed: !!refundResult,
            refundId: refundResult?.paymentRecord?.refunds[0]?.processor_refund_id,
            order: {
                _id: order._id,
                status: order.status,
                cancellationReason: order.cancellationReason,
                cancelledAt: order.cancelledAt,
                updatedAt: order.updatedAt
            }
        });

    } catch (error) {
        await AuditLog.logAsync({
            event: 'USER_ORDER_UPDATE',
            user: req.user?._id,
            action: 'cancel',
            source: 'web',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                orderId: req.params.id,
                updateData: req.body
            }
        });

        console.error(`[User] Error cancelling order: ${error.message}`);
        res.status(500).json({ 
            error: 'Failed to cancel order',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
  }

  async updateAdminOrders(req, res) {
    try {
        const orderId = req.params.id;
        const adminId = req.user._id;
        
        // Check ownership or admin role
        if (req.user.role !== 'admin') {
            throw new Error('Not authorized to get all orders', 403);
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }

        const { error } = updateAdminOrderSchema.validate(req.body);
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({ errors });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Store old values for audit log
        const oldValues = {
            status: order.status,
            paymentStatus: order.paymentStatus,
            shippingAddress: JSON.parse(JSON.stringify(order.shippingAddress)),
            shippingMethod: order.shippingMethod
        };

        // Validate status transitions unless forceUpdate is true
        if (req.body.status && !req.body.forceUpdate) {
            const validTransitions = {
                pending: ['processing', 'cancelled'],
                processing: ['shipped', 'cancelled'],
                shipped: ['delivered'],
                delivered: ['refunded'],
                cancelled: [],
                refunded: []
            };

            if (!validTransitions[order.status].includes(req.body.status)) {
                return res.status(400).json({ 
                    error: `Invalid status transition from ${order.status} to ${req.body.status}`,
                    solution: 'Set forceUpdate=true to override'
                });
            }
        }

        // Process refund if status changed to refunded
        if (req.body.status === 'refunded') {
            const refundResult = await PaymentService.processRefund({
                orderId: order._id,
                amount: order.total,
                adminId: adminId
            });

            if (!refundResult.success) {
                return res.status(402).json({
                    error: 'Refund processing failed',
                    details: refundResult.message
                });
            }
            req.body.paymentStatus = 'refunded';
        }

        // Update order
        Object.assign(order, req.body);
        
        // Track admin who made the change
        order.updatedBy = adminId;
        order.adminNotes = req.body.adminNotes || order.adminNotes;
        
        const updatedOrder = await order.save();

        // Create admin-specific audit log
        await AuditLog.logAsync({
            event: 'ADMIN_ORDER_UPDATE',
            user: adminId,
            action: 'update',
            source: 'web',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                orderId: order._id,
                oldValues,
                newValues: {
                    status: updatedOrder.status,
                    paymentStatus: updatedOrder.paymentStatus,
                    shippingAddress: updatedOrder.shippingAddress,
                    shippingMethod: updatedOrder.shippingMethod,
                    adminNotes: updatedOrder.adminNotes
                },
                forceUpdateUsed: req.body.forceUpdate || false
            }
        });

        // Format response
        const formattedOrder = {
            _id: updatedOrder._id,
            orderNumber: updatedOrder.orderNumber,
            status: updatedOrder.status,
            paymentStatus: updatedOrder.paymentStatus,
            total: updatedOrder.total,
            estimatedDelivery: updatedOrder.estimatedDelivery,
            paymentMethod: updatedOrder.paymentMethod,
            createdAt: updatedOrder.createdAt,
            updatedAt: updatedOrder.updatedAt,
            updatedBy: updatedOrder.updatedBy,
            adminNotes: updatedOrder.adminNotes,
            items: updatedOrder.items.map(item => ({
                productId: item.idProduct,
                quantity: item.quantity,
                price: item.priceAtPurchase,
                subtotal: item.subtotal
            })),
            shippingAddress: updatedOrder.shippingAddress,
            shippingMethod: updatedOrder.shippingMethod,
            shippingCost: updatedOrder.shippingCost,
            tax: updatedOrder.tax
        };

        res.status(200).json({
            message: 'Order updated successfully by admin',
            order: formattedOrder,
            refundProcessed: req.body.status === 'refunded'
        });

    } catch (error) {
        await AuditLog.logAsync({
            event: 'ADMIN_ORDER_UPDATE',
            user: req.user?._id,
            action: 'update',
            source: 'web',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                orderId: req.params.id,
                updateData: req.body
            }
        });

        console.error(`[Admin] Error updating order: ${error.message}`);
        res.status(500).json({ 
            error: 'Failed to update order',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
  }
}

module.exports = new OrderController();