const ReturnRequest = require('../../../models/ReturnRequest');
const Order = require('../../../models/Order');
const Product = require('../../../models/Products');
const User = require('../../../models/User');
const AuditLog = require('../../../models/AuditLog');
const logger = require('../../../services/logger');
const mongoose = require('mongoose');
const { returnRequestSchema, returnRequestCustomerUpdateSchema, returnRequestAdminUpdateSchema } = require('../schemas');

class ReturnRequestController {

  async createReturnRequest(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Return request creation initiated from IP: ${req.ip}`);
      
      // Content type validation
      if (!req.is('application/json')) {
        const err = new Error('Content-Type must be application/json');
        err.statusCode = 415;
        throw err;
      }
  
      // Validate input with enhanced error messages
      const { error, value } = returnRequestSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
        errors: {
          wrap: {
            label: false
          }
        }
      });
  
      if (error) {
        const errorDetails = error.details.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});
        const validationError = new Error('Validation failed');
        validationError.details = errorDetails;
        validationError.statusCode = 422;
        throw validationError;
      }

      // Verify customer exists and is authorized
      const customer = await User.findById(req.user._id);
      if (!customer || (req.user.role !== 'customer' && req.user.role !== 'admin')) {
        const authError = new Error('Unauthorized to create return request');
        authError.statusCode = 403;
        throw authError;
      }

      const returnRequestExists = await ReturnRequest.findOne({
        customerId: req.user._id,
        orderId: value.orderId,
      });
      
      if (returnRequestExists) {
        const existsError = new Error('Return request already exists for this order');
        existsError.statusCode = 409;
        throw existsError;
      }
      // Verify order exists, belongs to customer, and is eligible for return
      const order = await Order.findOne({
        _id: value.orderId
      }).select('totalAmount items orderDate status');
  
      if (!order) {
        const orderError = new Error('Order not found, not owned by customer, or not eligible for return');
        orderError.statusCode = 404;
        throw orderError;
      }

      // Check if return window is still open (e.g., 30 days)
      const returnWindowDays = 30;
      const returnDeadline = new Date(order.orderDate);
      returnDeadline.setDate(returnDeadline.getDate() + returnWindowDays);
  
      if (new Date() > returnDeadline) {
        const windowError = new Error(`Return window has expired (${returnWindowDays} days from delivery)`);
        windowError.statusCode = 400;
        throw windowError;
      }

      // Verify exchange product if needed
      if (value.returnType === 'exchange') {
        if (!value.exchangeProductId) {
          const productError = new Error('Exchange product ID is required for exchange requests');
          productError.statusCode = 400;
          throw productError;
        }
        
        const exchangeProduct = await Product.findById(value.exchangeProductId).select('price stock');
        if (!exchangeProduct) {
          const productError = new Error('Exchange product not found');
          productError.statusCode = 404;
          throw productError;
        }
        if (exchangeProduct.stock <= 0) {
          const stockError = new Error('Exchange product is out of stock');
          stockError.statusCode = 400;
          throw stockError;
        }
      }
  
      // Calculate refund amount if not provided and needed
      let refundAmount = value.refundAmount;
      if ((value.returnType === 'refund' || value.returnType === 'store_credit') && !refundAmount) {
        // Calculate based on returnable items (simplified example)
        refundAmount = order.items.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);
        
        // Ensure refund doesn't exceed order total
        refundAmount = Math.min(refundAmount, order.totalAmount);
      }

      // Create the return request with schema-compatible data
      const returnRequestData = {
        customerId: req.user._id,
        orderId: value.orderId,
        reason: value.reason,
        description: value.description || '',
        returnType: value.returnType,
        returnShippingMethod: value.returnShippingMethod || 'customer',
        returnLabelProvided: value.returnLabelProvided || false,
        status: 'pending',
        ...(value.returnType === 'exchange' && { 
          exchangeProductId: value.exchangeProductId,
          refundAmount: 0 // Explicitly set to 0 for exchanges
        }),
        ...((value.returnType === 'refund' || value.returnType === 'store_credit') && { 
          refundAmount: parseFloat(refundAmount.toFixed(2)) 
        })
      };
  
      const newReturnRequest = await ReturnRequest.createReturnRequest(returnRequestData);

      // Create audit log
      await AuditLog.logAsync({
        event: 'RETURN_REQUEST_CREATED',
        action: 'create',
        entityType: 'return_request',
        entityId: newReturnRequest._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          orderId: newReturnRequest.orderId,
          returnType: newReturnRequest.returnType,
          refundAmount: newReturnRequest.refundAmount,
          transactionId
        }
      });
    
      // Prepare response with HATEOAS links
      const response = {
        success: true,
        message: "Return request created successfully",
        data: {
          returnRequest: {
            id: newReturnRequest._id,
            status: newReturnRequest.status,
            returnType: newReturnRequest.returnType,
            refundAmount: newReturnRequest.refundAmount,
            createdAt: newReturnRequest.createdAt
          },
          _links: {
            self: { href: `/api/v1/returns/${newReturnRequest._id}` },
            track: { href: `/api/v1/returns/${newReturnRequest._id}/track` },
            cancel: { href: `/api/v1/returns/${newReturnRequest._id}/cancel`, method: 'DELETE' }
          }
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(201)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Return request created in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        returnRequestId: newReturnRequest._id,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Return request creation failed`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        inputData: req.body
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/returns#create-return-request' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  async getReturnRequest(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Get return request initiated from IP: ${req.ip}`);
  
      // Validate return request ID
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        const err = new Error('Invalid return request ID format');
        err.statusCode = 400;
        throw err;
      }
      
      const returnRequest = await ReturnRequest.getReturnRequest(req.params.id, req.user._id, req.user.role);
  
      if (!returnRequest) {
        const err = new Error('Return request not found');
        err.statusCode = 404;
        throw err;
      }
  
      // Verify requester is owner or admin
      if (req.user.role !== 'admin' && !returnRequest.customerId._id.equals(req.user._id)) {
        const authError = new Error('Unauthorized to view this return request');
        authError.statusCode = 403;
        throw authError;
      }
  
      // Prepare response with HATEOAS links
      const response = {
        success: true,
        data: {
          returnRequest: {
            id: returnRequest._id,
            status: returnRequest.status,
            reason: returnRequest.reason,
            returnType: returnRequest.returnType,
            refundAmount: returnRequest.refundAmount,
            createdAt: returnRequest.createdAt,
            customer: {
              id: returnRequest.customerId._id,
              username: returnRequest.customerId.username,
              email: returnRequest.customerId.email
            },
            order: {
              id: returnRequest.orderId._id,
              totalAmount: returnRequest.orderId.totalAmount,
              status: returnRequest.orderId.status
            },
            ...(returnRequest.exchangeProductId && {
              exchangeProduct: {
                id: returnRequest.exchangeProductId._id,
                name: returnRequest.exchangeProductId.name,
                price: returnRequest.exchangeProductId.price
              }
            })
          },
          _links: {
            self: { href: `/api/v1/returns/${returnRequest._id}` },
            update: { href: `/api/v1/returns/${returnRequest._id}`, method: 'PATCH' },
            cancel: { href: `/api/v1/returns/${returnRequest._id}/cancel`, method: 'DELETE' }
          }
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(200)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Return request retrieved in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        returnRequestId: returnRequest._id,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Get return request failed`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        returnRequestId: req.params.id
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/returns#get-return-request' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  async getReturnRequests(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Get return requests initiated from IP: ${req.ip}`);
  
      // Pagination and filtering
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
  
      // Build query based on user role
      const query = {};
      if (req.user.role !== 'admin') {
        query.customerId = req.user._id;
      }
  
      // Filtering options
      if (req.query.status) {
        if (!['pending', 'approved', 'rejected', 'processing', 'completed', 'refunded'].includes(req.query.status)) {
          const err = new Error('Invalid status filter value');
          err.statusCode = 400;
          throw err;
        }
        query.status = req.query.status;
      }
      
      if (req.query.returnType) {
        if (!['refund', 'exchange', 'store_credit'].includes(req.query.returnType)) {
          const err = new Error('Invalid returnType filter value');
          err.statusCode = 400;
          throw err;
        }
        query.returnType = req.query.returnType;
      }
      
      if (req.query.orderId) {
        if (!mongoose.Types.ObjectId.isValid(req.query.orderId)) {
          const err = new Error('Invalid orderId filter value');
          err.statusCode = 400;
          throw err;
        }
        query.orderId = req.query.orderId;
      }
  
      // Sorting
      const sort = {};
      if (req.query.sort) {
        const sortFields = req.query.sort.split(',');
        for (const field of sortFields) {
          if (field.startsWith('-')) {
            sort[field.substring(1)] = -1;
          } else {
            sort[field] = 1;
          }
        }
      } else {
        sort.createdAt = -1; // Default sorting
      }
  
      const { returnRequests, total } = await ReturnRequest.getReturnRequests({
        userId: req.user._id,
        userRole: req.user.role,
        status: query.status,
        returnType: query.returnType,
        orderId: query.orderId,
        sort,
        page,
        limit
      });
  
      // Prepare response with pagination and HATEOAS links
      const response = {
        success: true,
        data: {
          returnRequests: returnRequests.map(rr => ({
            id: rr._id,
            reason: rr.reason,
            description: rr.description,
            status: rr.status,
            returnType: rr.returnType,
            refundAmount: rr.refundAmount,
            returnShippingMethod: rr.returnShippingMethod,
            returnLabelProvided: rr.returnLabelProvided,
            createdAt: rr.createdAt,
            updatedAt: rr.updatedAt,
            customer: {
              id: rr.customerId?._id || rr.customerId
            },
            order: {
              id: rr.orderId?._id || rr.orderId
            },
            ...(rr.exchangeProductId && {
              exchangeProduct: {
                id: rr.exchangeProductId?._id || rr.exchangeProductId,
                ...(rr.exchangeProductId?.name && { name: rr.exchangeProductId.name }),
                ...(rr.exchangeProductId?.price && { price: rr.exchangeProductId.price })
              }
            })
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          },
          _links: {
            self: { href: `/api/v1/returns?page=${page}&limit=${limit}` },
            first: { href: `/api/v1/returns?page=1&limit=${limit}` },
            last: { 
              href: `/api/v1/returns?page=${Math.ceil(total / limit)}&limit=${limit}` 
            },
            ...(page > 1 && {
              prev: { href: `/api/v1/returns?page=${page - 1}&limit=${limit}` }
            }),
            ...(page < Math.ceil(total / limit) && {
              next: { href: `/api/v1/returns?page=${page + 1}&limit=${limit}` }
            })
          }
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(200)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Return requests retrieved in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        count: returnRequests.length,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Get return requests failed`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        queryParams: req.query
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/returns#list-return-requests' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }
  
  async updateReturnRequest(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Customer update return request initiated from IP: ${req.ip}`);
  
      // Content type validation
      if (!req.is('application/json')) {
        const err = new Error('Content-Type must be application/json');
        err.statusCode = 415;
        throw err;
      }
  
      // Validate return request ID
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        const err = new Error('Invalid return request ID format');
        err.statusCode = 400;
        throw err;
      }
  
      // Customer can only update certain fields
      const { error, value } = returnRequestCustomerUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
        errors: {
          wrap: {
            label: false
          }
        }
      });
  
      if (error) {
        const errorDetails = error.details.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});
        const validationError = new Error('Validation failed');
        validationError.details = errorDetails;
        validationError.statusCode = 422;
        throw validationError;
      }
  
      const { returnRequest: updatedReturnRequest, oldValues } = await ReturnRequest.updateCustomerReturnRequest(req.params.id, req.user._id, value);
  
      // Create audit log
      await AuditLog.logAsync({
        event: 'RETURN_REQUEST_UPDATED',
        action: 'update',
        entityType: 'return_request',
        entityId: updatedReturnRequest._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          oldValues,
          newValues: value,
          changedFields: Object.keys(value),
          transactionId,
          updateType: 'customer'
        }
      });
  
      // Prepare response with HATEOAS links
      const response = {
        success: true,
        message: "Return request updated successfully",
        data: {
          returnRequest: {
            id: updatedReturnRequest._id,
            status: updatedReturnRequest.status,
            description: updatedReturnRequest.description,
            returnShippingMethod: updatedReturnRequest.returnShippingMethod
          },
          _links: {
            self: { href: `/api/v1/returns/${updatedReturnRequest._id}` },
            track: { href: `/api/v1/returns/${updatedReturnRequest._id}/track` }
          }
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(200)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Customer return request updated in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        returnRequestId: updatedReturnRequest._id,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Customer return request update failed`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        returnRequestId: req.params.id,
        inputData: req.body
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/returns#update-customer-return-request' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  } 

  async reviewAndUpdateReturnRequest(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Admin update return request initiated from IP: ${req.ip}`);
  
      // Content type validation
      if (!req.is('application/json')) {
        const err = new Error('Content-Type must be application/json');
        err.statusCode = 415;
        throw err;
      }
  
      // Validate return request ID
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        const err = new Error('Invalid return request ID format');
        err.statusCode = 400;
        throw err;
      }
  
      // Admin can update more fields
      const { error, value } = returnRequestAdminUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
        errors: {
          wrap: {
            label: false
          }
        }
      });
  
      if (error) {
        const errorDetails = error.details.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});
        const validationError = new Error('Validation failed');
        validationError.details = errorDetails;
        validationError.statusCode = 422;
        throw validationError;
      }
  
      // Authorization check - must be admin
      if (req.user.role !== 'admin') {
        const authError = new Error('Admin privileges required');
        authError.statusCode = 403;
        throw authError;
      }
  
      // Get current return request before update for audit log
      const currentReturnRequest = await ReturnRequest.findById(req.params.id);
      if (!currentReturnRequest) {
        const err = new Error('Return request not found');
        err.statusCode = 404;
        throw err;
      }
  
      // Update return request
      const updatedReturnRequest = await ReturnRequest.updateAdminReturnRequest(req.params.id, value);
  
      // Create audit log
      await AuditLog.logAsync({
        event: 'RETURN_REQUEST_ADMIN_UPDATE',
        action: 'update',
        entityType: 'return_request',
        entityId: updatedReturnRequest._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          oldValues: {
            status: currentReturnRequest.status,
            refundAmount: currentReturnRequest.refundAmount,
            description: currentReturnRequest.description,
            returnShippingMethod: currentReturnRequest.returnShippingMethod,
            adminNotes: currentReturnRequest.adminNotes
          },
          newValues: {
            status: updatedReturnRequest.status,
            refundAmount: updatedReturnRequest.refundAmount,
            description: updatedReturnRequest.description,
            returnShippingMethod: updatedReturnRequest.returnShippingMethod,
            adminNotes: updatedReturnRequest.adminNotes
          },
          changedFields: Object.keys(value),
          transactionId,
          updateType: 'admin'
        }
      });
  
      // Prepare response with HATEOAS links
      const response = {
        success: true,
        message: "Return request updated successfully by admin",
        data: {
          returnRequest: {
            id: updatedReturnRequest._id,
            status: updatedReturnRequest.status,
            returnType: updatedReturnRequest.returnType,
            refundAmount: updatedReturnRequest.refundAmount,
            adminNotes: updatedReturnRequest.adminNotes
          },
          _links: {
            self: { href: `/api/v1/admin/returns/${updatedReturnRequest._id}` },
            customer: { href: `/api/v1/returns/${updatedReturnRequest._id}` }
          }
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(200)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Admin return request updated in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        returnRequestId: updatedReturnRequest._id,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`,
        adminId: req.user._id
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Admin return request update failed`, {
        error: error.message,
        stack: error.stack,
        adminId: req.user?._id,
        returnRequestId: req.params.id,
        inputData: req.body
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/admin/returns#update-return-request' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }

  async archiveReturnRequest(req, res) {
    const transactionId = req.headers['x-request-id'] || require('crypto').randomBytes(16).toString('hex');
    const startTime = process.hrtime();
  
    try {
      logger.info(`[${transactionId}] Delete return request initiated from IP: ${req.ip}`);
  
      // Call static method to perform soft delete
      const { archivedRequest, data } = await ReturnRequest.deleteReturnRequest(
        req.params.id,
        req.user,
      );
     
      // Create audit log
      await AuditLog.logAsync({
        event: 'RETURN_REQUEST_ARCHIVED',
        action: 'archive',
        entityType: 'return_request',
        entityId: data.id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          transactionId,
          returnType: data.returnType,
          newStatus: data.status,
        }
      });
  
      // Prepare response with HATEOAS links
      const response = {
        success: true,
        message: 'Return request archived successfully',
        data: {
          id: data.id,
          status: data.status,
          archivedAt: data.archivedAt
        }
      };
  
      // Security headers
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .set('Content-Security-Policy', "default-src 'self'")
        .set('X-Request-ID', transactionId)
        .status(200)
        .json(response);
  
      // Log successful completion
      const elapsedTime = process.hrtime(startTime);
      logger.info(`[${transactionId}] Return request archived in ${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`, {
        returnRequestId: data.id,
        processingTime: `${elapsedTime[0] * 1000 + elapsedTime[1] / 1e6}ms`,
        userId: req.user._id
      });
  
    } catch (error) {
      // Enhanced error logging
      logger.error(`[${transactionId}] Return request archive failed`, {
        error: error.message,
        stack: error.stack,
        userId: req.user?._id,
        returnRequestId: req.params.id
      });
  
      // Standardized error response
      const statusCode = error.statusCode || 500;
      const errorResponse = {
        success: false,
        error: error.message,
        ...(error.details && { details: error.details }),
        transactionId,
        _links: {
          documentation: { href: '/api-docs/returns#delete-return-request' }
        }
      };
      
      res.status(statusCode).json(errorResponse);
    }
  }
}

module.exports = new ReturnRequestController();