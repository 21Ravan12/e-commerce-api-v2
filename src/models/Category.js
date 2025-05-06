const mongoose = require('mongoose');
const { Schema } = mongoose;
const slugify = require('slugify');
const logger = require('../../src/services/logger'); // assuming you have a logger module

const categorySchema = new Schema({
  // Core Fields (from your Joi validation)
  name: {
    type: String,
    required: [true, 'Category name is required'],
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [8, 'Description must be at least 8 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },

  // Enhanced Fields
  slug: {
    type: String,
    unique: true,
    index: true
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    validate: {
      validator: async function(v) {
        if (!v) return true;
        const category = await mongoose.model('Category').findById(v);
        return !!category;
      },
      message: 'Parent category must reference a valid category'
    }
  },
  image: {
    type: String,
    validate: {
      validator: v => /\.(jpg|jpeg|png|webp|svg)$/i.test(v),
      message: 'Image must be JPG, PNG, WEBP, or SVG'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters'],
      trim: true
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
      trim: true
    },
    keywords: [String]
  },
  attributes: [{
    type: Schema.Types.ObjectId,
    ref: 'Attribute'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware to generate slug before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Virtual for product count
categorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Indexes for performance
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });

categorySchema.statics = {
  // Static method for adding a new category
  async addCategory(data, user, ip, userAgent) {
    // Check for duplicate category name
    const existingCategory = await this.findOne({ 
      name: { $regex: new RegExp(`^${data.name}$`, 'i') } 
    });
    
    if (existingCategory) {
      throw new Error('Category with this name already exists');
    }

    // Validate parent category if provided
    if (data.parentCategory) {
      const parentExists = await this.exists({ _id: data.parentCategory });
      if (!parentExists) {
        throw new Error('Parent category not found');
      }
    }

    // Create the category
    const newCategory = new this({
      name: data.name,
      description: data.description,
      parentCategory: data.parentCategory || null,
      image: data.image || undefined,
      isActive: data.isActive,
      displayOrder: data.displayOrder,
      seo: data.seo || undefined,
      attributes: data.attributes || []
    });

    await newCategory.save();

    return {
      category: newCategory,
      auditLogData: {
        event: 'CATEGORY_CREATED',
        action: 'create',
        entityType: 'category',
        entityId: newCategory._id,
        user: user?._id,
        source: 'web',
        ip,
        userAgent,
        metadata: {
          categoryName: newCategory.name,
          parentCategory: newCategory.parentCategory
        }
      }
    };
  },

  // Static method for updating a category
  async updateCategory(categoryId, data, user, ip, userAgent) {
    // Check if category exists
    const category = await this.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check for duplicate name if name is being updated
    if (data.name) {
      const existingCategory = await this.findOne({
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        _id: { $ne: categoryId }
      });
      if (existingCategory) {
        throw new Error('Category with this name already exists');
      }
    }

    // Validate parent category if provided
    if (data.parentCategory !== undefined) {
      if (data.parentCategory && data.parentCategory === categoryId) {
        throw new Error('Category cannot be its own parent');
      }
      if (data.parentCategory) {
        const parentExists = await this.exists({ _id: data.parentCategory });
        if (!parentExists) {
          throw new Error('Parent category not found');
        }
      }
    }

    // Save old values for audit log
    const oldValues = {
      name: category.name,
      isActive: category.isActive,
      parentCategory: category.parentCategory
    };

    // Update category
    Object.assign(category, data);
    const updatedCategory = await category.save();

    return {
      category: updatedCategory,
      auditLogData: {
        event: 'CATEGORY_UPDATED',
        action: 'update',
        entityType: 'category',
        entityId: category._id,
        user: user?._id,
        source: 'web',
        ip,
        userAgent,
        metadata: {
          oldValues,
          newValues: {
            name: updatedCategory.name,
            isActive: updatedCategory.isActive,
            parentCategory: updatedCategory.parentCategory
          },
          changedFields: Object.keys(data)
        }
      }
    };
  },

  // Static method for fetching a single category
  async fetchCategory(categoryId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error('Invalid category ID');
    }

    // Build query based on options
    const query = this.findById(categoryId)
      .populate('parentCategory', 'name slug');

    // For admin requests, include all fields
    if (options.admin === true) {
      query.select('+seo +isActive +displayOrder');
    }

    const category = await query;

    if (!category) {
      throw new Error('Category not found');
    }

    // Add virtuals to response
    const categoryData = category.toObject();
    categoryData.links = {
      self: `/categories/${category.slug}`,
      products: `/products?category=${category.slug}`
    };

    if (options.includeChildren) {
      const children = await this.find({ parentCategory: category._id })
        .select('name slug image');
      categoryData.children = children;
    }

    return categoryData;
  },

  async fetchCategories({
    page = 1,
    limit = 25,
    isActive,
    parentCategory,
    hasProducts,
    search,
    includeChildren = false,
    admin = false,
    sort = 'displayOrder:asc'
  }) {
    // Setup pagination
    const skip = (page - 1) * limit;
    
    // Build filter criteria
    const filter = {};
    
    // Active status filter
    if (isActive === 'true' || isActive === true) {
      filter.isActive = true;
    } else if (isActive === 'false' || isActive === false) {
      filter.isActive = false;
    }
  
    // Parent category filter
    if (parentCategory) {
      if (parentCategory === 'null' || parentCategory === null) {
        filter.parentCategory = null;
      } else if (mongoose.Types.ObjectId.isValid(parentCategory)) {
        filter.parentCategory = parentCategory;
      }
    }
  
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
  
    // Configure sorting
    const sortOptions = {};
    const [sortField, direction] = sort.split(':');
    
    const validSortFields = ['name', 'displayOrder', 'createdAt', 'updatedAt'];
    if (validSortFields.includes(sortField)) {
      sortOptions[sortField] = direction === 'asc' ? 1 : -1;
    }
  
    // Build base query
    const query = this.find(filter)
      .populate('parentCategory', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);
  
    // For admin requests, include all fields
    if (admin) {
      query.select('+seo +isActive +displayOrder');
    }
  
    // Execute queries in parallel
    const [categories, total] = await Promise.all([
      query.lean({ virtuals: true }),
      this.countDocuments(filter)
    ]);
  
    if (!categories || categories.length === 0) {
      throw new Error('No categories found');
    }
  
    // Process categories to add links and virtuals
    const categoriesData = categories.map(category => {
      const categoryData = {
        ...category,
        links: {
          self: `/categories/${category.slug}`,
          products: `/products?category=${category.slug}`
        }
      };
      return categoryData;
    });
  
    // Optionally include children if requested
    if (includeChildren) {
      await Promise.all(categoriesData.map(async category => {
        const children = await this.find({ parentCategory: category._id })
          .select('name slug image isActive')
          .lean();
        category.children = children;
      }));
    }
  
    // Optionally check for products if requested
    if (hasProducts === 'true' || hasProducts === true) {
      await Promise.all(categoriesData.map(async category => {
        const productCount = await mongoose.model('Product').countDocuments({ 
          category: category._id 
        });
        category.hasProducts = productCount > 0;
      }));
    }
  
    return {
      categories: categoriesData,
      total,
      page,
      pages: Math.ceil(total / limit),
      filters: {
        isActive,
        parentCategory,
        search,
        includeChildren
      }
    };
  },

  // Static method for deleting a category
  async deleteCategory(categoryId, user, ip, userAgent) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error('Invalid category ID');
    }

    const category = await this.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has products
    const productCount = await mongoose.model('Product').countDocuments({ category: category._id });
    if (productCount > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    // Check if category has children
    const childCount = await this.countDocuments({ parentCategory: category._id });
    if (childCount > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    // Perform deletion
    await this.deleteOne({ _id: category._id });

    return {
      deletedId: category._id,
      auditLogData: {
        event: 'CATEGORY_DELETED',
        action: 'delete',
        entityType: 'category',
        entityId: category._id,
        user: user?._id,
        source: 'web',
        ip,
        userAgent,
        metadata: {
          categoryName: category.name,
          parentCategory: category.parentCategory
        }
      }
    };
  }
};
// Static Methods
categorySchema.statics.getHierarchy = async function() {
  return this.aggregate([
    {
      $graphLookup: {
        from: 'categories',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentCategory',
        as: 'children',
        depthField: 'depth'
      }
    },
    { $match: { parentCategory: null } }
  ]);
};
// NEW: Create first main category if none exists
categorySchema.statics.initializeRootCategory = async function() {
  try {
    // Check if any categories exist
    const count = await this.countDocuments();
    
    if (count === 0) {
      const rootCategory = new this({
        name: 'Main Category',
        description: 'The primary root category for all products',
        isActive: true,
        displayOrder: 0,
        seo: {
          metaTitle: 'Main Product Category',
          metaDescription: 'Browse all products in our main category'
        }
      });

      await rootCategory.save();
      logger.info('Created initial root category');
      return rootCategory;
    }

    return null; // Already has categories
  } catch (error) {
    logger.error('Failed to initialize root category', error);
    throw error;
  }
};

categorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .select('name slug image');
};



module.exports = mongoose.model('Category', categorySchema);