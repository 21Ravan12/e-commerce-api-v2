const bcrypt = require('bcryptjs');
const RedisClient = require('../../../lib/redis');
const logger = require('../../../services/logger');
const { categorySchema, updateSchema } = require('../schemas');
const { calculateRiskScore } = require('../../../services/riskCalculator');
const mongoose = require('mongoose');
const Category = require('../../../models/Category');
const Product = require('../../../models/Products');
const AuditLog = require('../../../models/AuditLog');

class CategoryController {
  constructor() {
    this.redis = RedisClient;
  }

  async addCategory(req, res) {
    try {
      logger.info(`Category creation request from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        throw new Error('Not authorized', 403);
      }

      // Content type validation
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }

      const { error, value } = categorySchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }

      // Use static method to add category
      const { category, auditLogData } = await Category.addCategory(
        value,
        req.user,
        req.ip,
        req.get('User-Agent')
      );

      // Log the creation
      await AuditLog.logAsync(auditLogData);

      // Prepare response
      const response = {
        message: 'Category created successfully',
        category: {
          id: category._id,
          name: category.name,
          slug: category.slug,
          parentCategory: category.parentCategory,
          isActive: category.isActive
        },
        links: {
          view: `/categories/${category.slug}`,
          edit: `/admin/categories/${category._id}/edit`
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(201)
        .json(response);

    } catch (error) {
      logger.error(`Category creation error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Validation error') ? 400 :
                       error.message.includes('already exists') ? 409 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('invalid') ? 400 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        ...(statusCode === 400 && { details: error.details })
      });
    }
  }

  async updateCategory(req, res) {
    try {
      logger.info(`Category update request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        throw new Error('Not authorized', 403);
      }

      // Content type validation
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }

      const { error, value } = updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }

      // Use static method to update category
      const { category: updatedCategory, auditLogData } = await Category.updateCategory(
        req.params.id,
        value,
        req.user,
        req.ip,
        req.get('User-Agent')
      );

      // Log the update
      await AuditLog.logAsync(auditLogData);

      res.status(200).json({
        message: 'Category updated successfully',
        category: {
          id: updatedCategory._id,
          name: updatedCategory.name,
          slug: updatedCategory.slug,
          isActive: updatedCategory.isActive
        }
      });

    } catch (error) {
      logger.error(`Category update error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Validation error') ? 400 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('already exists') ? 409 :
                       error.message.includes('invalid') ? 400 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        ...(statusCode === 400 && { details: error.details })
      });
    }
  }

  async fetchCategory(req, res) {
    try {
      logger.info(`Fetch category request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check if ID is valid
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid category ID');
      }

      // Use static method to fetch category
      const categoryData = await Category.fetchCategory(req.params.id, {
        admin: req.query.admin === 'true',
        includeChildren: req.query.include === 'children'
      });

      res.status(200).json(categoryData);

    } catch (error) {
      logger.error(`Fetch category error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Invalid') ? 400 :
                       error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({ error: error.message });
    }
  }

  async fetchCategories(req, res) {
    try {
      logger.info(`Fetch all categories request from IP: ${req.ip}`);

      // Use static method to fetch categories
      const categoriesData = await Category.fetchCategories({
        admin: req.query.admin === 'true',
        includeChildren: req.query.include === 'children',
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

      res.status(200).json(categoriesData);

    } catch (error) {
      logger.error(`Fetch all categories error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({ error: error.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      logger.info(`Delete category request for ID: ${req.params.id} from IP: ${req.ip}`);

      // Check admin role
      if (req.user.role !== 'admin') {
        throw new Error('Not authorized', 403);
      }

      // Check if ID is valid
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new Error('Invalid category ID');
      }

      // Use static method to delete category
      const { deletedId, auditLogData } = await Category.deleteCategory(
        req.params.id,
        req.user,
        req.ip,
        req.get('User-Agent')
      );

      // Log the deletion
      await AuditLog.logAsync(auditLogData);

      res.status(200).json({
        message: 'Category deleted successfully',
        deletedId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error(`Delete category error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Invalid') ? 400 :
                       error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot delete') ? 409 : 500;
      
      res.status(statusCode).json({ error: error.message });
    }
  }
}

module.exports = new CategoryController();