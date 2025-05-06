const Campaign = require('../../../models/Campaign');
const PromotionCode = require('../../../models/PromotionCode');
const AuditLog = require('../../../models/AuditLog');
const logger = require('../../../services/logger');
const mongoose = require('mongoose');
const { campaignSchema, campaignUpdateSchema } = require('../schemas');

class CampaignController {
  
  async addCampaign(req, res) {
    try {
      logger.info(`Campaign creation request from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Content type validation
      if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }

      // Validate input against schema
      const { error, value } = campaignSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: `Validation error: ${errorMessages}` });
      }

      // Create the campaign using static method
      const newCampaign = await Campaign.createCampaign(value, req.user._id);

      // Create audit log
      await AuditLog.logAsync({
        event: 'CAMPAIGN_CREATED',
        action: 'create',
        entityType: 'campaign',
        entityId: newCampaign._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          campaignName: newCampaign.campaignName,
          campaignType: newCampaign.campaignType,
          status: newCampaign.status
        }
      });

      // Prepare response
      const response = {
        message: 'Campaign created successfully',
        campaign: {
          id: newCampaign._id,
          name: newCampaign.campaignName,
          type: newCampaign.campaignType,
          status: newCampaign.status,
          startDate: newCampaign.startDate,
          endDate: newCampaign.endDate,
          remainingUses: newCampaign.remainingUses,
          minPurchaseAmount: newCampaign.minPurchaseAmount,
          maxDiscountAmount: newCampaign.maxDiscountAmount,
          customerSegments: newCampaign.customerSegments
        },
        links: {
          view: `/campaigns/${newCampaign._id}`,
          edit: `/admin/campaigns/${newCampaign._id}/edit`
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(201)
        .json(response);

    } catch (error) {
      logger.error(`Campaign creation error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('categories are invalid') ? 400 :
                       error.message.includes('products are invalid') ? 400 :
                       error.message.includes('customers are invalid') ? 400 :
                       error.message.includes('customer segment requires') ? 400 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        ...(statusCode === 400 && { details: error.stack })
      });
    }
  }

  async getCampaign(req, res) {
    try {
      logger.info(`Get campaign request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Get campaign using static method
      const campaign = await Campaign.getCampaignById(req.params.id);

      // Prepare response data
      const responseData = {
        id: campaign._id,
        campaignName: campaign.campaignName,
        campaignType: campaign.campaignType,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive,
        campaignAmount: campaign.campaignAmount,
        usageLimit: campaign.usageLimit,
        usageCount: campaign.usageCount,
        minPurchaseAmount: campaign.minPurchaseAmount,
        maxDiscountAmount: campaign.maxDiscountAmount,
        customerSegments: campaign.customerSegments,
        landingPageURL: campaign.landingPageURL,
        bannerImage: campaign.bannerImage,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        validCategories: campaign.validCategories,
        excludedProducts: campaign.excludedProducts,
        customCustomers: campaign.customCustomers,
        promotionCodes: campaign.promotionCodes,
        createdBy: campaign.createdBy,
        updatedBy: campaign.updatedBy
      };

      // Add conditional fields
      if (campaign.campaignType === 'percentage') {
        responseData.maxDiscountAmount = campaign.maxDiscountAmount;
      }

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(responseData);

    } catch (error) {
      const errorMessage = error.message || 'Failed to retrieve campaign';
      const errorDetails = process.env.NODE_ENV === 'development' ? 
          { stack: error.stack, fullError: error } : undefined;

      logger.error(`Get campaign error: ${errorMessage}`, {
        campaignId: req.params.id,
        error: errorDetails
      });

      const statusCode = error.message.includes('Invalid campaign ID') ? 400 :
                       error.message.includes('not found') ? 404 : 500;

      res.status(statusCode).json({
        error: errorMessage,
        ...(errorDetails && { debug: errorDetails })
      });
    }
  }

  async getCampaigns(req, res) {
    try {
      // Log the request with user context
      logger.info('Campaign list request', {
        user: req.user?.id,
        query: req.query,
        ip: req.ip
      });

      // Get campaigns using static method
      const { campaigns, total, page, pages } = await Campaign.getCampaignsList({
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        type: req.query.type,
        active: req.query.active,
        upcoming: req.query.upcoming,
        expired: req.query.expired,
        search: req.query.search,
        sort: req.query.sort
      });

      // Prepare response
      const response = {
        meta: {
          success: true,
          count: campaigns.length,
          total,
          page,
          pages,
          filters: Object.keys(req.query).length > 0 ? req.query : undefined
        },
        data: campaigns.map(campaign => ({
          id: campaign._id,
          name: campaign.campaignName,
          type: campaign.campaignType,
          status: campaign.status,
          isActive: campaign.isActive,
          dates: {
            start: campaign.startDate,
            end: campaign.endDate
          },
          usage: {
            limit: campaign.usageLimit,
            remaining: campaign.remainingUses,
            count: campaign.usageCount
          },
          restrictions: {
            minPurchase: campaign.minPurchaseAmount,
            maxDiscount: campaign.maxDiscountAmount,
            categories: campaign.validCategories,
            excludedProducts: campaign.excludedProducts?.length || 0
          },
          audience: {
            segment: campaign.customerSegments,
            customCustomers: campaign.customCustomers?.length || 0
          },
          assets: {
            banner: campaign.bannerImage,
            landingPage: campaign.landingPageURL
          },
          createdBy: campaign.createdBy,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        }))
      };

      // Send response
      res.status(200)
        .set('X-Total-Count', total)
        .json(response);

    } catch (error) {
      // Enhanced error handling
      const errorResponse = {
        meta: {
          success: false,
          error: 'campaign_fetch_failed',
          message: 'Failed to retrieve campaigns'
        },
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack
        } : undefined
      };

      logger.error('Campaign fetch error', {
        error: error.message,
        query: req.query,
        user: req.user?.id
      });

      res.status(500).json(errorResponse);
    }
  }

  async updateCampaign(req, res) {
    try {
      logger.info(`Update campaign request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Content type validation
      if (!req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }

      // Validate input
      const { error, value } = campaignUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ error: `Validation error: ${errorMessages}` });
      }

      // Update campaign using static method
      const updatedCampaign = await Campaign.updateCampaign(
        req.params.id, 
        value, 
        req.user._id
      );

      // Create audit log
      await AuditLog.logAsync({
        event: 'CAMPAIGN_UPDATED',
        action: 'update',
        entityType: 'campaign',
        entityId: req.params.id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          newValues: {
            campaignName: updatedCampaign.campaignName,
            status: updatedCampaign.status,
            campaignType: updatedCampaign.campaignType,
            campaignAmount: updatedCampaign.campaignAmount,
            startDate: updatedCampaign.startDate,
            endDate: updatedCampaign.endDate
          },
          changedFields: Object.keys(value)
        }
      });

      // Prepare response
      const response = {
        message: 'Campaign updated successfully',
        campaign: {
          id: updatedCampaign._id,
          name: updatedCampaign.campaignName,
          type: updatedCampaign.campaignType,
          status: updatedCampaign.status,
          startDate: updatedCampaign.startDate,
          endDate: updatedCampaign.endDate,
          remainingUses: updatedCampaign.remainingUses
        },
        links: {
          view: `/campaigns/${updatedCampaign._id}`,
          edit: `/admin/campaigns/${updatedCampaign._id}/edit`
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);

    } catch (error) {
      logger.error(`Campaign update error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Validation') ? 400 :
                       error.message.includes('Invalid') ? 400 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('categories are invalid') ? 400 :
                       error.message.includes('products are invalid') ? 400 :
                       error.message.includes('customers are invalid') ? 400 :
                       error.message.includes('customer segment requires') ? 400 :
                       error.message.includes('End date must be after') ? 400 :
                       error.message.includes('Max discount amount must be') ? 400 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        ...(statusCode === 400 && { details: error.stack })
      });
    }
  }

  async deleteCampaign(req, res) {
    try {
      logger.info(`Delete campaign request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Delete campaign using static method
      const deletedCampaign = await Campaign.deleteCampaign(req.params.id);

      // Create audit log
      await AuditLog.logAsync({
        event: 'CAMPAIGN_DELETED',
        action: 'delete',
        entityType: 'campaign',
        entityId: deletedCampaign._id,
        user: req.user._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          campaignName: deletedCampaign.campaignName,
          campaignType: deletedCampaign.campaignType,
          status: deletedCampaign.status,
          startDate: deletedCampaign.startDate,
          endDate: deletedCampaign.endDate
        }
      });

      // Prepare response
      const response = {
        message: 'Campaign deleted successfully',
        deletedCampaign: {
          id: deletedCampaign._id,
          name: deletedCampaign.campaignName,
          type: deletedCampaign.campaignType
        },
        timestamp: new Date().toISOString(),
        links: {
          list: '/campaigns',
          create: '/campaigns'
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);

    } catch (error) {
      logger.error(`Delete campaign error: ${error.message}`, { 
        stack: error.stack,
        campaignId: req.params.id,
        userId: req.user?._id 
      });
      
      const statusCode = error.message.includes('Invalid campaign ID') ? 400 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('associated promotion codes') ? 409 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        details: statusCode === 409 ? {
          associatedPromoCodes: await PromotionCode.countDocuments({ campaign: req.params.id }),
          solution: 'Delete or reassign promotion codes first'
        } : undefined
      });
    }
  }
}

module.exports = new CampaignController();