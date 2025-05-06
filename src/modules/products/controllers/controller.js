const Product = require('../../../models/Products');
const Category = require('../../../models/Category');
const User = require('../../../models/User');
const AuditLog = require('../../../models/AuditLog');
const { createAuditLog } = require('../../../models/AuditLog');
const { productSchema, productUpdateSchema } = require('../schemas');
const RedisClient = require('../../../lib/redis');
const logger = require('../../../services/logger');

class ProductController {
  constructor() {
    this.redis = RedisClient;
    this.cacheKeyPrefix = 'product:';
    this.cacheTtl = 3600; 

    this.getProduct = this.getProduct.bind(this);
    this.getProducts = this.getProducts.bind(this);
    this.updateProduct = this.updateProduct.bind(this);
    this.archiveProduct = this.archiveProduct.bind(this);
  }

  async createProduct(req, res) {
    const transactionId = req.headers['x-request-id'] || crypto.randomUUID();
    const startTime = Date.now();

    try {
        logger.info({
            message: 'Add product request received',
            ip: req.ip,
            method: req.method,
            transactionId,
            userId: req.user._id
        });

        // Content-Type validation
        if (!req.is('application/json')) {
            throw new Error('Content-Type must be application/json');
        }

        // Validate seller exists and has correct role
        if (req.user.role !== 'seller') {
          throw { message: 'Invalid seller account', statusCode: 403 };
        }
        // Validate request body
        const { error, value: productData } = productSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/['"]/g, '')
            }));
            throw { message: 'Validation failed', statusCode: 400, details: errorDetails };
        }

        // Business validations
        if (productData.price <= 0) {
            throw { message: 'Price must be greater than 0', statusCode: 400 };
        }

        if (productData.stockQuantity < 0) {
            throw { message: 'Stock quantity cannot be negative', statusCode: 400 };
        }

        // Save to database
        const savedProduct = await Product.createProduct(productData, req.user);

        // Create audit log (await this to ensure it's recorded)
        await AuditLog.logAsync({
            event: 'PRODUCT_CREATED',
            action: 'create',
            entityType: 'product',
            entityId: savedProduct._id,
            user: req.user._id,
            source: req.headers['x-source'] || 'web',
            ip: req.ip,
            userAgent: req.get('User-Agent') || '',
            metadata: {
                productName: savedProduct.name,
                price: savedProduct.price,
                categories: savedProduct.categories,
                sku: savedProduct.sku,
                status: savedProduct.status
            },
            transactionId
        });

        logger.info('Product created successfully', {
            productId: savedProduct._id,
            duration: Date.now() - startTime,
            transactionId
        });

        // Success response
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                product: {
                    id: savedProduct._id,
                    name: savedProduct.name,
                    description: savedProduct.description,
                    price: savedProduct.price,
                    discountedPrice: savedProduct.discountedPrice,
                    categories: savedProduct.categories,
                    stockQuantity: savedProduct.stockQuantity,
                    status: savedProduct.status,
                    isAvailable: savedProduct.isAvailable,
                    sku: savedProduct.sku,
                    slug: savedProduct.slug,
                    createdAt: savedProduct.createdAt
                },
                links: {
                    self: `/products/${savedProduct._id}`,
                    collection: '/products',
                    publish: `/products/${savedProduct._id}/publish`
                }
            },
            metadata: {
                transactionId,
                processedIn: `${Date.now() - startTime}ms`
            }
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode = error.statusCode || 500;
        
        // Log failed attempt
        await AuditLog.logAsync({
            event: 'PRODUCT_CREATE_FAILED',
            action: 'create',
            entityType: 'product',
            status: 'failure',
            user: req.user?._id,
            source: req.headers['x-source'] || 'web',
            ip: req.ip,
            userAgent: req.get('User-Agent') || '',
            error: error.message,
            transactionId,
            metadata: {
                validationErrors: error.details || null
            }
        }).catch(logErr => {
            logger.error('Failed to create audit log', { error: logErr.message });
        });

        logger.error({
            message: 'Product creation failed',
            error: error.message,
            stack: error.stack,
            statusCode,
            duration,
            transactionId
        });

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Product creation failed',
            ...(error.details && { errors: error.details }),
            metadata: {
                transactionId,
                processedIn: `${duration}ms`,
                timestamp: new Date().toISOString()
            }
        });
    }
  }

  async getProduct(req, res) {
    const transactionId = req.headers['x-request-id'] || crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Verify Redis connection is available
      if (!RedisClient || !RedisClient.connect) {
        logger.warn('Redis client not available, skipping cache');
      }
      
      const cacheKey = `${this.cacheKeyPrefix}${req.params.id}`;

      logger.info({
        message: 'Get product request received',
        productId: req.params.id,
        transactionId,
        userId: req.user?._id
      });

      // Try cache first only if Redis is available
      let cachedProduct;
      if (RedisClient.connect) {
        try {
          cachedProduct = await RedisClient.get(cacheKey);

          if (cachedProduct) {
            logger.info('Serving product from cache', { 
              productId: req.params.id,
              transactionId
            });
            return res.status(200).json({
              success: true,
              data: JSON.parse(cachedProduct),
              metadata: {
                cache: true,
                transactionId,
                processedIn: `${Date.now() - startTime}ms`
              }
            });
          }
        } catch (cacheError) {
          logger.error('Cache read failed', {
            error: cacheError.message,
            productId: req.params.id,
            transactionId
          });
        }
      }

      // Database query
      const product = await Product.getProductById(req.params.id);

      if (!product) {
        throw { message: 'Product not found', statusCode: 404 };
      }

      // Prepare response
      const responseData = {
        product: {
          id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          discountedPrice: product.discountedPrice,
          currency: product.currency,
          categories: product.categories,
          stockQuantity: product.stockQuantity,
          sku: product.sku,
          slug: product.slug,
          images: product.images,
          specifications: product.specifications,
          status: product.status,
          isAvailable: product.isAvailable,
          seller: product.seller,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        },
        links: {
          self: `/products/${product._id}`,
          collection: '/products'
        }
      };
      
      // Cache the response if Redis is available
      if (RedisClient?.connect) {
        await RedisClient.set(cacheKey, JSON.stringify(responseData), {
            EX: this.cacheTtl 
        }).catch(err => {
          logger.error('Cache set failed', {
            error: err.message,
            productId: req.params.id,
            transactionId
          });
        });
      }

      // Audit log
      await AuditLog.logAsync({
        event: 'PRODUCT_VIEWED',
        action: 'read',
        entityType: 'product',
        entityId: product._id,
        user: req.user?._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        status: 'success',
        transactionId,
        metadata: {
          productName: product.name,
          price: product.price,
          status: product.status
        }
      });

      return res.status(200).json({
        success: true,
        data: responseData,
        metadata: {
          cache: false,
          transactionId,
          processedIn: `${Date.now() - startTime}ms`
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.statusCode || 500;
      
      // Error audit log
      await AuditLog.logAsync({
        event: 'PRODUCT_VIEW_FAILED',
        action: 'read',
        entityType: 'product',
        entityId: req.params.id,
        status: 'failed',
        user: req.user?._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        error: error.message,
        transactionId
      }).catch(logErr => {
        logger.error('Audit log failure', {
          error: logErr.message,
          transactionId
        });
      });

      logger.error({
        message: 'Get product failed',
        error: error.message,
        stack: error.stack,
        productId: req.params.id,
        statusCode,
        duration,
        transactionId
      });

      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get product',
        metadata: {
          transactionId,
          processedIn: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async getProducts(req, res) {
    const transactionId = req.headers['x-request-id'] || crypto.randomUUID();
    const startTime = Date.now();
  
    try {
      // Verify Redis connection is available
      if (!RedisClient || !RedisClient.connect) {
        logger.warn('Redis client not available, skipping cache');
      }
      
      // Build a comprehensive cache key including all query parameters
      const cacheKey = `${this.cacheKeyPrefix}${JSON.stringify(req.query)}`;
  
      logger.info({
        message: 'Get products request received',
        query: req.query,
        transactionId,
        userId: req.user?._id
      });
  
      // Try cache first
      const cachedProducts = await RedisClient.get(cacheKey);
      if (cachedProducts) {
        logger.debug('Serving products list from cache');
        return res.status(200).json(JSON.parse(cachedProducts));
      }
  
      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 25, 100); // Max limit 100
      const skip = (page - 1) * limit;
  
      // Filtering
      const filter = { status: 'active' }; // Changed from 'draft' to 'active' as it's more common for product listings
  
      // Add category filter if provided
      if (req.query.category) {
        filter.category = req.query.category;
      }
  
      // Add price range filter if provided
      if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {};
        if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
      }
  
      // Add stock availability filter if provided
      if (req.query.inStock) {
        if (req.query.inStock === 'true') {
          filter.stockQuantity = { $gt: 0 };
        } else if (req.query.inStock === 'false') {
          filter.stockQuantity = { $lte: 0 };
        }
      }
  
      // Sorting
      const sort = {};
      if (req.query.sort) {
        switch (req.query.sort) {
          case 'price':
            sort.price = 1;
            break;
          case '-price':
            sort.price = -1;
            break;
          case 'newest':
            sort.createdAt = -1;
            break;
          case 'popular':
            sort.popularityScore = -1; // Assuming you have a popularityScore field
            break;
          default:
            sort.createdAt = -1;
        }
      } else {
        sort.createdAt = -1; // Default sort
      }
  
      const { products, total } = await Product.getProducts({
        filter,
        sort,
        page,
        limit,
        skip
      });
  
      const responseData = {
        success: true,
        data: {
          count: products.length,
          total,
          page,
          pages: Math.ceil(total / limit),
          products: products.map(p => ({
            id: p._id,
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            stockQuantity: p.stockQuantity,
            status: p.status,
            createdAt: p.createdAt,
            links: {
              self: `/products/${p._id}`
            }
          }))
        },
        links: {
          self: `/products?page=${page}&limit=${limit}`,
          ...(page > 1 && { prev: `/products?page=${page - 1}&limit=${limit}` }),
          ...(page < Math.ceil(total / limit) && { next: `/products?page=${page + 1}&limit=${limit}` })
        },
        metadata: {
          transactionId,
          processedIn: `${Date.now() - startTime}ms`
        }
      };
  
      // Cache the response
      await RedisClient.set(cacheKey, JSON.stringify(responseData), {
        EX: this.cacheTtl / 2 
      });
  
      // Audit log
      await AuditLog.logAsync({
        event: 'PRODUCTS_LIST_VIEWED',
        action: 'read',
        entityType: 'product',
        user: req.user?._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        status: 'success',
        transactionId,
        metadata: {
          page: page,
          limit: limit,
          filter: filter,
          sort: sort,
          totalProducts: total
        }
      });
  
      res.status(200).json(responseData);
  
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error({
        message: 'Get products failed',
        error: error.message,
        transactionId,
        duration
      });
  
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get products',
        metadata: {
          transactionId,
          processedIn: `${duration}ms`
        }
      });
  
      // Error audit log
      await AuditLog.logAsync({
        event: 'PRODUCTS_LIST_VIEW_FAILED',
        action: 'read',
        entityType: 'product',
        status: 'failed',
        user: req.user?._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        error: error.message,
        transactionId,
        metadata: {
          attemptedPage: req.query.page,
          attemptedLimit: req.query.limit,
          query: req.query
        }
      }).catch(logErr => {
        logger.error('Audit log failure', {
          error: logErr.message,
          transactionId
        });
      });
    }
  }
  
  async updateProduct(req, res) {
    const transactionId = req.headers['x-request-id'] || crypto.randomUUID();
    const startTime = Date.now();
  
    try {
      logger.info({
        message: 'Update product request received',
        productId: req.params.id,
        transactionId,
        userId: req.user._id
      });
  
      if (!req.is('application/json')) {
        const err = new Error('Content-Type must be application/json');
        err.statusCode = 415;
        throw err;
      }
  
      const { error, value: updateData } = productUpdateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
  
      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/['"]/g, ''),
          type: detail.type
        }));
        const err = new Error('Validation failed');
        err.statusCode = 400;
        err.details = { errors: errorDetails };
        throw err;
      }
  
      const { product: updatedProduct, changes } = await Product.updateProduct(
        req.params.id,
        updateData,
        req.user
      );
  
      // Cache invalidation
      await Promise.all([
        RedisClient.del(`${this.cacheKeyPrefix}${req.params.id}`),
        RedisClient.del(`${this.cacheKeyPrefix}list*`),
        ...(updateData.category ? [RedisClient.del(`${this.cacheKeyPrefix}category:${updateData.category}`)] : [])
      ]).catch(err => {
        logger.error('Cache invalidation failed', { error: err.message });
      });
  
      // Audit log
      await AuditLog.logAsync({
        event: 'PRODUCT_UPDATED',
        action: 'update',
        entityType: 'product',
        entityId: req.params.id,
        user: req.user._id,
        source: req.headers['x-source'] || 'api',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        status: 'success',
        transactionId,
        metadata: {
          changes,
          oldStock: changes.stockQuantity?.old || updatedProduct.stockQuantity,
          newStock: changes.stockQuantity?.new || updatedProduct.stockQuantity,
          productName: updatedProduct.name,
          price: updatedProduct.price,
          status: updatedProduct.status
        }
      }).catch(logErr => {
        logger.error('Audit log failure', {
          error: logErr.message,
          transactionId
        });
      });
  
      res.status(200).json({
        success: true,
        data: {
          product: {
            id: req.params.id,
            name: updatedProduct.name,
            description: updatedProduct.description,
            price: updatedProduct.price,
            category: updatedProduct.category,
            stockQuantity: updatedProduct.stockQuantity,
            status: updatedProduct.status,
            createdAt: updatedProduct.createdAt,
            updatedAt: updatedProduct.updatedAt,
            links: {
              self: `/products/${req.params.id}`
            }
          }
        },
        links: {
          self: `/products/${req.params.id}`,
          collection: '/products'
        },
        metadata: {
          transactionId,
          processedIn: `${Date.now() - startTime}ms`
        }
      });
  
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.statusCode || 500;
      
      logger.error({
        message: 'Update product failed',
        error: error.message,
        productId: req.params.id,
        statusCode,
        duration,
        transactionId
      });
  
      // Error audit log
      await AuditLog.logAsync({
        event: 'PRODUCT_UPDATE_FAILED',
        action: 'update',
        entityType: 'product',
        entityId: req.params.id,
        status: 'failed',
        user: req.user?._id,
        source: req.headers['x-source'] || 'api',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        error: error.message,
        transactionId,
        metadata: {
          attemptedUpdate: req.body
        }
      }).catch(logErr => {
        logger.error('Audit log failure', {
          error: logErr.message,
          transactionId
        });
      });
  
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update product',
        ...(error.details && { errors: error.details }),
        metadata: {
          transactionId,
          processedIn: `${duration}ms`
        }
      });
    }
  }

  async archiveProduct(req, res) {
    const transactionId = req.headers['x-request-id'] || crypto.randomUUID();
    const startTime = Date.now();
  
    try {
      logger.info({
        message: 'Delete product request received',
        productId: req.params.id,
        transactionId,
        userId: req.user?._id
      });
  
      // Get the product first so we have its data for audit logs
      const product = await Product.archiveProduct(req.params.id, req.user);
  
      // Async operations - now properly awaited
      await Promise.all([
        // Audit log
        AuditLog.logAsync({
          event: 'PRODUCT_DELETED',
          action: 'delete',
          entityType: 'product',
          entityId: product._id,
          user: req.user?._id,
          source: req.headers['x-source'] || 'web',
          ip: req.ip,
          userAgent: req.get('User-Agent') || '',
          status: 'success',
          transactionId,
          metadata: {
            productName: product.name,
            deletionMethod: 'soft',
            category: product.category,
            previousStatus: product.status
          }
        }),
        
        // Cache invalidation
        RedisClient.del(`${this.cacheKeyPrefix}${req.params.id}`),
        RedisClient.del(`${this.cacheKeyPrefix}list*`),
        RedisClient.del(`${this.cacheKeyPrefix}category:${product.category}`)
      ]).catch(err => {
        logger.error('Background operations failed', {
          error: err.message,
          transactionId
        });
      });
  
      res.status(200).json({
        success: true,
        message: 'Product archived successfully',
        metadata: {
          transactionId,
          processedIn: `${Date.now() - startTime}ms`
        }
      });
  
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = error.statusCode || 500;
      
      logger.error({
        message: 'Delete product failed',
        error: error.message,
        productId: req.params.id,
        statusCode,
        duration,
        transactionId
      });
  
      // Error audit log
      await AuditLog.logAsync({
        event: 'PRODUCT_DELETE_FAILED',
        action: 'delete',
        entityType: 'product',
        entityId: req.params.id,
        status: 'failed',
        user: req.user?._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        error: error.message,
        transactionId
      }).catch(logErr => {
        logger.error('Audit log failure', {
          error: logErr.message,
          transactionId
        });
      });
  
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete product',
        metadata: {
          transactionId,
          processedIn: `${duration}ms`
        }
      });
    }
  }
}

module.exports = new ProductController();
