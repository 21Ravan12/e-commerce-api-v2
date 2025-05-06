const mongoose = require('mongoose');
const User = require('./User');
const Category = require('./Category');
const { Schema } = mongoose;

const productSchema = new Schema({
  // Core Product Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    minlength: [3, 'Product name must be at least 3 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    minlength: [20, 'Description must be at least 20 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
    set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places
  },
  discountedPrice: {
    type: Number,
    min: [0, 'Discounted price cannot be negative'],
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v < this.price;
      },
      message: 'Discounted price must be less than regular price'
    },
    set: v => v === null ? null : parseFloat(v.toFixed(2))
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'],
    uppercase: true,
    trim: true
  },

  // Inventory & Availability
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [50, 'SKU cannot exceed 50 characters'],
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },

  // Media
  images: [{
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: props => `${props.value} is not a valid URL`
      }
    },
    altText: {
      type: String,
      maxlength: [100, 'Alt text cannot exceed 100 characters'],
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: {
      type: String,
      validate: {
        validator: function(v) {
          return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
        },
        message: props => `${props.value} is not a valid URL`
      }
    },
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'dailymotion', 'other'],
      default: 'other'
    }
  }],

  // Categorization
  categories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'At least one category is required'],
    validate: {
      validator: async function(v) {
        if (!mongoose.Types.ObjectId.isValid(v)) return false;
        return await Category.exists({ _id: v });
      },
      message: props => `${props.value} is not a valid category ID`
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],

  // Seller Information
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required'],
    index: true
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },

  // Product Specifications
  specifications: [{
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Spec key cannot exceed 50 characters']
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Spec value cannot exceed 200 characters']
    }
  }],
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
    default: 0
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    },
    unit: {
      type: String,
      enum: ['cm', 'in', 'm', 'mm'],
      default: 'cm'
    }
  },

  // Shipping Information
  shippingInfo: {
    isFreeShipping: {
      type: Boolean,
      default: false
    },
    weight: {
      type: Number,
      min: [0, 'Shipping weight cannot be negative']
    },
    dimensions: {
      type: {
        type: String,
        enum: ['parcel', 'envelope', 'package', 'pallet'],
        default: 'parcel'
      }
    },
    handlingTime: {
      type: Number,
      min: [0, 'Handling time cannot be negative'],
      default: 1,
      max: [30, 'Handling time cannot exceed 30 days']
    }
  },

  // Ratings & Reviews
  averageRating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0,
    set: v => parseFloat(v.toFixed(1))
  },
  ratingCount: {
    type: Number,
    min: [0, 'Rating count cannot be negative'],
    default: 0
  },
  reviewCount: {
    type: Number,
    min: [0, 'Review count cannot be negative'],
    default: 0
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return v > this.publishedAt;
      },
      message: 'Expiry date must be after publish date'
    }
  },

  // Moderation & Status
  status: {
    type: String,
    enum: ['draft', 'active', 'published', 'unpublished', 'archived', 'banned'],
    default: 'draft'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },

  // SEO
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [70, 'SEO title cannot exceed 70 characters']
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain letters, numbers and hyphens']
  },

  // Analytics
  viewCount: {
    type: Number,
    min: [0, 'View count cannot be negative'],
    default: 0
  },
  purchaseCount: {
    type: Number,
    min: [0, 'Purchase count cannot be negative'],
    default: 0
  },
  wishlistCount: {
    type: Number,
    min: [0, 'Wishlist count cannot be negative'],
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  }
});

// ======================
// INDEXES
// ======================
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ price: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ categories: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ updatedAt: -1 });
productSchema.index({ isAvailable: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ status: 1 });

// ======================
// MIDDLEWARE
// ======================
productSchema.pre('save', async function(next) {
  try {
    // 1. Primary Image Validation
    if (this.isModified('images')) {
      const primaryCount = this.images.filter(img => img.isPrimary).length;
      
      if (primaryCount > 1) {
        throw new Error('Only one image can be marked as primary');
      }
      
      if (primaryCount === 0 && this.images.length > 0) {
        this.images[0].isPrimary = true;
      }
    }

    // 2. SKU Generation/Validation
    if (!this.sku) {
      // Auto-generate SKU if not provided
      const prefix = this.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      this.sku = `${prefix}-${randomSuffix}`;
    } else {
      // Validate existing SKU format
      const skuRegex = /^[A-Z0-9]{3,}-[A-Z0-9]{3,}$/;
      if (!skuRegex.test(this.sku)) {
        throw new Error('SKU must be in format ABC-1234 (letters-numbers separated by hyphen)');
      }
      
      // Check for SKU uniqueness
      const existingProduct = await this.constructor.findOne({ 
        sku: this.sku, 
        _id: { $ne: this._id } // Exclude current product for updates
      });
      
      if (existingProduct) {
        throw new Error('SKU must be unique - this SKU already exists');
      }
    }

    // 3. Slug Generation with ID fallback
    if (!this.slug || this.isModified('name')) {
      let baseSlug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (this.isNew || this.isModified('name')) {
        const slugRegex = new RegExp(`^${baseSlug}(-[0-9]*)?$`, 'i');
        const productsWithSlug = await this.constructor.find({ slug: slugRegex });
        
        if (productsWithSlug.length > 0) {
          if (this.isNew) {
            baseSlug = `${baseSlug}-${this._id.toString().slice(-4)}`;
          } else {
            const existingNumbers = productsWithSlug
              .map(p => parseInt(p.slug.match(/-(\d+)$/)?.[1] || 0))
              .filter(n => !isNaN(n));
            
            const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
            baseSlug = `${baseSlug}-${maxNumber + 1}`;
          }
        }
      }
      
      this.slug = baseSlug;
    }

    // 4. PublishedAt Update
    if (this.isModified('status') && this.status === 'published') {
      this.publishedAt = new Date();
    }

    // 5. Availability Update
    if (this.isModified('stockQuantity')) {
      this.isAvailable = this.stockQuantity > 0;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ======================
// VIRTUALS
// ======================
productSchema.virtual('discountPercentage').get(function() {
  if (!this.discountedPrice || this.discountedPrice >= this.price) return 0;
  return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
});

productSchema.virtual('isInStock').get(function() {
  return this.stockQuantity > 0;
});

productSchema.virtual('sellerInfo', {
  ref: 'User',
  localField: 'seller',
  foreignField: '_id',
  justOne: true
});

productSchema.virtual('categoryDetails', {
  ref: 'Category',
  localField: 'categories',
  foreignField: '_id'
});

productSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'idProduct'
});

// Add to the statics section of the Product model
productSchema.statics = {
  /**
   * Creates a new product with validation and business logic
   * @param {Object} productData - Product data to create
   * @param {Object} user - User creating the product
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData, user) {
    // Validate categories exist
    if (productData.categories && productData.categories.length > 0) {
        const categoriesExist = await Category.countDocuments({ 
            _id: { $in: productData.categories } 
        }) === productData.categories.length;
            
        if (!categoriesExist) {
            throw { message: 'One or more specified categories do not exist', statusCode: 400 };
        }
    }

    // Create new product
    const newProduct = new this({
      ...productData,
      seller: user._id,
      status: 'active',
      isAvailable: productData.stockQuantity > 0
    });

    return newProduct.save();
  },

  /**
   * Gets a product by ID with caching support
   * @param {String} productId - ID of the product to retrieve
   * @returns {Promise<Object>} Product data
   */
  async getProductById(productId) {
    const product = await this.findById(productId)
      .populate('seller', 'username email avatar')
      .populate('categories', 'name slug')
      .lean();

    if (!product) {
      throw { message: 'Product not found', statusCode: 404 };
    }

    return product;
  },

  /**
   * Gets a paginated list of products with filtering
   * @param {Object} options - Query options
   * @param {Object} options.filter - MongoDB filter object
   * @param {Object} options.sort - MongoDB sort object
   * @param {Number} [options.page=1] - Page number
   * @param {Number} [options.limit=25] - Items per page
   * @param {Number} [options.skip] - Items to skip
   * @returns {Promise<Object>} Paginated products data
   */
  async getProducts({
    filter,
    sort,
    page = 1,
    limit = 25,
    skip
  }) {

    if (!skip) {
      skip = (page - 1) * limit;
    }

    const [products, total] = await Promise.all([
      this.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(filter)
    ]);

    return {
      products,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  },

  /**
   * Updates a product with validation
   * @param {String} productId - ID of product to update
   * @param {Object} updateData - Data to update
   * @param {Object} user - User performing the update
   * @returns {Promise<Object>} Updated product and change details
   */ 
  async updateProduct(productId, updateData, user) {
    const product = await this.findById(productId);
    if (!product) {
      throw { message: 'Product not found', statusCode: 404 };
    }
  
    // Check ownership or admin role
    if (String(product.seller) !== String(user._id) && user.role !== 'admin') {
      throw { message: 'Not authorized to update this product', statusCode: 403 };
    }
  
    // Validate category if being updated
    if (updateData.category && updateData.category !== product.category) {
      const categoryExists = await Category.exists({ _id: updateData.category });
      if (!categoryExists) {
        throw { message: 'New category does not exist', statusCode: 400 };
      }
    }
  
    // Track changes for audit log
    const changes = {};
    Object.keys(updateData).forEach(key => {
      if (JSON.stringify(product[key]) !== JSON.stringify(updateData[key])) {
        changes[key] = {
          old: product[key],
          new: updateData[key]
        };
      }
    });
  
    // Update fields
    Object.assign(product, updateData);
    const updatedProduct = await product.save();
  
    return {
      product: updatedProduct,
      changes
    };
  },

  /**
   * Archives a product (soft delete)
   * @param {String} productId - ID of product to archive
   * @param {Object} user - User performing the archive
   * @returns {Promise<Object>} Archived product
   */
  async archiveProduct(productId, user) {
    const product = await this.findById(productId);
    if (!product) {
      throw { message: 'Product not found', statusCode: 404 };
    }

    // Check ownership or admin role
    if (String(product.seller) !== user._id && user.role !== 'admin') {
      throw { message: 'Not authorized to update this product', statusCode: 403 };
    }

    // Soft delete
    product.status = 'archived';
    return product.save();
  },

  /**
   * Invalidates cache for a product and related queries
   * @param {String} productId - ID of product to invalidate
   * @param {String} [categoryId] - Optional category ID to invalidate
   * @returns {Promise<void>}
   */
  async invalidateCache(productId, categoryId) {
    const cacheKeyPrefix = 'product:';
    await Promise.all([
      RedisClient.del(`${cacheKeyPrefix}${productId}`),
      RedisClient.del(`${cacheKeyPrefix}list*`),
      ...(categoryId ? [RedisClient.del(`${cacheKeyPrefix}category:${categoryId}`)] : [])
    ]).catch(err => {
      logger.error('Cache invalidation failed', { error: err.message });
    });
  }
};

module.exports = mongoose.model('Product', productSchema);