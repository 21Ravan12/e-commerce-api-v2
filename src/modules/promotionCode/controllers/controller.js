const PromotionCode = require('../../../models/PromotionCode');
const AuditLog = require('../../../models/AuditLog');
const logger = require('../../../services/logger');
const mongoose = require('mongoose');
const RedisClient = require('../../../lib/redis');
const { promotionCodeSchema, promotionCodeUpdateSchema, promotionCodeGetSchema } = require('../schemas');

class PromotionCodeController {
  constructor() {
    this.redis = RedisClient;
  }

  async addPromotionCode(req, res) {
    try {
      logger.info(`Promotion code creation request from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      // Content type validation
      if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }

      // Validate input against Joi schema
      const { error, value } = promotionCodeSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: `Validation error: ${errorMessages}`, details: error.details });
      }

      // Validate maxDiscountAmount for percentage discounts
      if (value.promotionType === 'percentage' && !value.maxDiscountAmount) {
        return res.status(400).json({ error: 'Percentage discounts require a maxDiscountAmount' });
      }

      // Create the promotion code using static method
      const newPromotionCode = await PromotionCode.createPromotionCode(value, req.user._id);

      // Create audit log
      await AuditLog.logAsync({
        event: 'PROMOTION_CODE_CREATED',
        action: 'create',
        entityType: 'promotion_code',
        entityId: newPromotionCode._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          code: newPromotionCode.promotionCode,
          type: newPromotionCode.promotionType,
          status: newPromotionCode.status
        }
      });

      // Prepare response
      const response = {
        message: "Promotion code created successfully",
        promotionCode: {
          id: newPromotionCode._id,
          code: newPromotionCode.promotionCode,
          type: newPromotionCode.promotionType,
          status: newPromotionCode.status,
          startDate: newPromotionCode.startDate,
          endDate: newPromotionCode.endDate,
          usageLimit: newPromotionCode.usageLimit,
          usageCount: newPromotionCode.usageCount,
          remainingUses: newPromotionCode.remainingUses,
          promotionAmount: newPromotionCode.promotionAmount,
          minPurchaseAmount: newPromotionCode.minPurchaseAmount,
          maxDiscountAmount: newPromotionCode.maxDiscountAmount
        },
        links: {
          view: `/promotion-codes/${newPromotionCode._id}`,
          edit: `/admin/promotion-codes/${newPromotionCode._id}/edit`
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(201)
        .json(response);

    } catch (error) {
      logger.error(`Promotion code creation error: ${error.message}`, { stack: error.stack });
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors
        });
      }

      // Handle duplicate key error
      if (error.message === 'Promotion code already exists') {
        return res.status(409).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getPromotionCode(req, res) {
    try {
      logger.info(`Get promotion code request for ID: ${req.params.id} from IP: ${req.ip}`);
  
      const promotionCode = await PromotionCode.findPromotionCodeById(req.params.id);
  
      if (!promotionCode) {
        return res.status(404).json({ error: 'Promotion code not found' });
      }
  
      // Add virtual properties
      const now = new Date();
      const isActive = promotionCode.status === 'active' && 
                      now >= new Date(promotionCode.startDate) && 
                      now <= new Date(promotionCode.endDate);
  
      const response = {
        promotionCode: {
          ...promotionCode,
          isActive,
          remainingUses: promotionCode.usageLimit ? promotionCode.usageLimit - promotionCode.usageCount : null
        },
        links: {
          list: '/promotion-codes',
          edit: `/admin/promotion-codes/${promotionCode._id}/edit`
        }
      };
  
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);
  
    } catch (error) {
      logger.error(`Get promotion code error: ${error.message}`, { 
        stack: error.stack,
        promotionCodeId: req.params.id 
      });
      
      if (error.message === 'Invalid promotion code ID format') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async getPromotionCodes(req, res) {
    try {
      logger.info(`Get promotion codes request from IP: ${req.ip}`);
  
      const { error, value } = promotionCodeGetSchema.validate(req.query);
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: `Validation error: ${errorMessages}` });
      }
  
      // Build filter
      const filter = {};
      if (value.status) filter.status = value.status;
      if (value.type) filter.promotionType = value.type;
      
      // Active codes filter
      if (value.active === true) {
        const now = new Date();
        filter.startDate = { $lte: now };
        filter.endDate = { $gte: now };
        filter.status = 'active';
      }
  
      // Search filter
      if (value.search) {
        filter.$or = [
          { promotionCode: { $regex: value.search, $options: 'i' } },
          { description: { $regex: value.search, $options: 'i' } }
        ];
      }
  
      // Get promotion codes using static method
      const { promotionCodes, total, page, pages } = await PromotionCode.findPromotionCodes(
        filter, 
        value.page, 
        value.limit
      );
  
      // Enhance codes with virtual properties
      const now = new Date();
      const enhancedCodes = promotionCodes.map(code => ({
        ...code,
        isActive: code.status === 'active' && now >= new Date(code.startDate) && now <= new Date(code.endDate),
        remainingUses: code.usageLimit ? code.usageLimit - code.usageCount : null,
        links: {
          self: `/promotion-codes/${code._id}`,
          admin: `/admin/promotion-codes/${code._id}`
        }
      }));
  
      const response = {
        success: true,
        count: enhancedCodes.length,
        total,
        page,
        pages,
        promotionCodes: enhancedCodes,
        links: {
          first: `/promotion-codes?page=1&limit=${value.limit}`,
          last: `/promotion-codes?page=${pages}&limit=${value.limit}`,
          prev: page > 1 ? `/promotion-codes?page=${page - 1}&limit=${value.limit}` : null,
          next: page < pages ? `/promotion-codes?page=${page + 1}&limit=${value.limit}` : null
        }
      };
  
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);
  
    } catch (error) {
      logger.error(`Get promotion codes error: ${error.message}`, { 
        stack: error.stack,
        queryParams: req.query 
      });
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async updatePromotionCode(req, res) {
    try {
      logger.info(`Promotion code update request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Content type validation
      if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }

      // Validate input against Joi schema
      const { error, value } = promotionCodeUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ 
          error: `Validation error: ${errorMessages}`,
          details: error.details 
        });
      }

      // Validate maxDiscountAmount for percentage discounts
      if (value.promotionType === 'percentage' && value.promotionAmount && !value.maxDiscountAmount) {
        return res.status(400).json({ 
          error: 'Percentage discounts require a maxDiscountAmount' 
        });
      }

      // Update promotion code using static method
      const updatedPromotionCode = await PromotionCode.updatePromotionCode(req.params.id, value);

      // Create audit log
      await AuditLog.logAsync({
        event: 'PROMOTION_CODE_UPDATED',
        action: 'update',
        entityType: 'promotion_code',
        entityId: updatedPromotionCode._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          code: updatedPromotionCode.promotionCode,
          type: updatedPromotionCode.promotionType,
          status: updatedPromotionCode.status,
          amount: updatedPromotionCode.promotionAmount
        }
      });

      // Prepare response
      const response = {
        message: "Promotion code updated successfully",
        promotionCode: {
          id: updatedPromotionCode._id,
          code: updatedPromotionCode.promotionCode,
          type: updatedPromotionCode.promotionType,
          status: updatedPromotionCode.status,
          startDate: updatedPromotionCode.startDate,
          endDate: updatedPromotionCode.endDate,
          usageLimit: updatedPromotionCode.usageLimit,
          usageCount: updatedPromotionCode.usageCount,
          remainingUses: updatedPromotionCode.remainingUses,
          promotionAmount: updatedPromotionCode.promotionAmount,
          minPurchaseAmount: updatedPromotionCode.minPurchaseAmount,
          maxDiscountAmount: updatedPromotionCode.maxDiscountAmount
        },
        links: {
          view: `/promotion-codes/${updatedPromotionCode._id}`,
          edit: `/admin/promotion-codes/${updatedPromotionCode._id}/edit`
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);

    } catch (error) {
      logger.error(`Promotion code update error: ${error.message}`, { stack: error.stack });
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors
        });
      }

      // Handle specific error messages
      if (error.message === 'Invalid promotion code ID format' || 
          error.message === 'Promotion code not found') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async deletePromotionCode(req, res) {
    try {
      logger.info(`Promotion code deletion request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Delete promotion code using static method
      const deletedCode = await PromotionCode.deletePromotionCode(req.params.id);

      // Create audit log
      await AuditLog.logAsync({
        event: 'PROMOTION_CODE_DELETED',
        action: 'delete',
        entityType: 'promotion_code',
        entityId: deletedCode.id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          code: deletedCode.code,
          type: deletedCode.type
        }
      });

      const response = {
        message: "Promotion code deleted successfully",
        deletedCode,
        timestamp: new Date().toISOString(),
        links: {
          list: '/promotion-codes',
          create: '/promotion-codes'
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);

    } catch (error) {
      logger.error(`Promotion code deletion error: ${error.message}`, { stack: error.stack });
      
      // Handle specific error messages
      if (error.message === 'Invalid promotion code ID format') {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'Promotion code not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot delete promotion code that has been used') {
        return res.status(409).json({ 
          error: error.message,
          usageCount: error.usageCount
        });
      }

      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = new PromotionCodeController();