const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./Products');
const logger = require('../services/logger');
const crypto = require('crypto');
const { encrypt, decrypt, createSecureHash } = require('../core/utilities/crypto');

const userSchema = new mongoose.Schema({

  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    index: true
  },

  avatar: {
    type: String,
    default: 'default-avatar.jpg'
  },

  encryptedData: {
    email: {
      type: {
        salt: String,
        iv: String,
        content: String,
        authTag: String,
        algorithm: String
      },
      required: [true, 'Email is required'],
      unique: true
    },
    firstName: {
      type: {
        salt: String,
        iv: String,
        content: String,
        authTag: String,
        algorithm: String
      },
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: {
        salt: String,
        iv: String,
        content: String,
        authTag: String,
        algorithm: String
      },
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: {
        salt: String,
        iv: String,
        content: String,
        authTag: String,
        algorithm: String
      },
      validate: {
        validator: function(v) {
          if (!this.decryptedPhone) return true;
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/.test(this.decryptedPhone);
        },
        message: 'Please provide a valid phone number'
      }
    },
    dateOfBirth: {
      type: {
        salt: String,
        iv: String,
        content: String,
        authTag: String,
        algorithm: String
      },
      validate: {
        validator: function(v) {
          if (!this.decryptedDOB) return true;
          return new Date(this.decryptedDOB) < new Date();
        },
        message: 'Date of birth must be in the past'
      }
    }
  },

  emailHash: {
    type: String,
    required: true,
    unique: true,
    select: false,
    index: true,
  },

  phoneHash: {
    type: String,
    select: false,
    index: true,
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [12, 'Password must be at least 12 characters'],
  },

auth: {
  // Password-related fields
  passwordChangedAt: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Email verification
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  // Login history
  loginHistory: {
    type: [{
      ip: {
        type: String,
        required: true
      },
      userAgent: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  
  // Social auth integrations
  github: {
    type: {
      id: {
        type: String,
        default: null
      },
      profile: {
        type: Object,
        default: () => ({})
      }
    },
    default: () => ({})
  },
  
  facebook: {
    type: {
      id: {
        type: String,
        default: null
      },
      profile: {
        type: Object,
        default: () => ({})
      }
    },
    default: () => ({})
  },
  
  // MFA Configuration
  mfa: {
    type: {
      enabled: {
        type: Boolean,
        default: false,
        select: false
      },
      enabledAt: {
        type: Date,
        select: false
      },
      secret: {
        type: {
          salt: {
            type: String,
            required: true
          },
          iv: {
            type: String,
            required: true
          },
          content: {
            type: String,
            required: true
          },
          authTag: {
            type: String,
            required: true
          },
          algorithm: {
            type: String,
            required: true
          }
        },
        select: false
      },
      methods: {
        type: [String],
        enum: ['totp', 'sms', 'email', 'authenticator', 'backup'],
        default: [],
        select: false
      },
      backupCodes: {
        type: [{
          code: {
            type: String,
            required: true,
            select: false
          },
          used: {
            type: Boolean,
            default: false,
            select: false
          },
          usedAt: {
            type: Date,
            select: false
          }
        }],
        select: false
      },
      devices: {
        type: [{
          id: {
            type: String,
            required: true,
            select: false
          },
          name: {
            type: String,
            required: true,
            select: false
          },
          ip: {
            type: String,
            select: false
          },
          userAgent: {
            type: String,
            select: false
          },
          lastUsed: {
            type: Date,
            select: false
          },
          trusted: {
            type: Boolean,
            default: false,
            select: false
          },
          createdAt: {
            type: Date,
            default: Date.now,
            select: false
          }
        }],
        select: false
      },
      recoveryOptions: {
        type: {
          email: {
            type: Boolean,
            default: true,
            select: false
          },
          sms: {
            type: Boolean,
            default: false,
            select: false
          },
          backupCodes: {
            type: Boolean,
            default: true,
            select: false
          }
        },
        default: () => ({}),
        select: false
      },
      failedAttempts: {
        type: Number,
        default: 0,
        select: false
      },
      lockUntil: {
        type: Date,
        select: false
      }
    },
    default: () => ({})
  }
},

  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deleted'],
    default: 'pending'
  },

  roles: {
    type: [String],
    enum: ['customer', 'seller', 'vendor', 'moderator', 'admin'],
    default: ['customer']
  },

  social: {
    googleId: String,
    facebookId: String,
    twitterId: String,
    githubId: String
  },

  preferences: {
    language: {
      type: String,
      enum: ['en', 'es', 'fr', 'de', 'tr'],
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: false
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },

  commerce: {
    wishlist: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product' 
    }],
    cart: {
      type: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        product: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'Product', 
          required: true 
        },
        quantity: { 
          type: Number, 
          default: 1, 
          min: 1 
        },
        size: String,
        color: String,
        addedAt: { 
          type: Date, 
          default: Date.now 
        }
      }],
      default: [] // Ensure cart defaults to empty array
    }
  },

  meta: {
    loginCount: {
      type: Number,
      default: 0
    },
    lastLogin: Date,
    lastIp: String
  },

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive data from output
      delete ret.password;
      delete ret.auth;
      delete ret.encryptedData;
      delete ret.social;
      delete ret.meta;
      return ret;
    }
  }
});

// Virtual fields for validation (not stored in DB)
userSchema.virtual('decryptedEmail');
userSchema.virtual('decryptedPhone');
userSchema.virtual('decryptedDOB');

// Static Methods
userSchema.statics = {

  findUser: async function(criteria, selectedFields = {}) {
    // Default selected fields (if none provided)
    const defaultSelect = {
      roles: 1,
      status: 1,
      _id: 1,
      username: 1,
      auth: 1
    };

    // Merge default with provided selected fields
    const finalSelect = Object.assign({}, defaultSelect, selectedFields);

    // Build the query
    const query = {};
    
    if (criteria.emailHash) query.emailHash = criteria.emailHash;
    if (criteria.phoneHash) query.phoneHash = criteria.phoneHash;
    if (criteria.id) query._id = criteria.id;
    if (criteria.username) query.username = criteria.username;
    // Add more criteria as needed
    
    // Find the user with the selected fields
    const user = await this.findOne(query)
      .select(finalSelect)
      .lean();
    
    return user;
  },

  register: async function(userData) {
    try {
      const newUser = new this({
        username: userData.userData.username,
        password: userData.userData.password,
        encryptedData: {
            email: userData.userData.encryptedData.email,
            firstName: userData.userData.encryptedData.firstName,
            lastName: userData.userData.encryptedData.lastName,
            phone: userData.userData.encryptedData.phone,
            dateOfBirth: userData.userData.encryptedData.dateOfBirth
        },
        emailHash: userData.emailHash,
        phoneHash: userData.phoneHash,
        status: 'active',
        preferences: {
            language: userData.userData.preferences?.language || 'en'
        },
        meta: {
            lastLogin: new Date(),
            registration: {
                date: new Date(),
                source: userData.registrationSource || 'web', // Could be 'web', 'mobile', 'api', etc.
                ip: userData.ip,
                userAgent: userData.userAgent
            }
        }
      });

      const savedUser = await newUser.save();

      return savedUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  changePassword: async function({ userId, newPassword, ip, userAgent }) {
    // Input validation
    if (!userId || !newPassword) {
      throw new Error('userId and newPassword are required');
    }
  
    // Find the user with all necessary fields
    const user = await this.findById(userId)
      .select('+password +auth +status +encryptedData +emailHash');
    
    if (!user) {
      throw new Error('User not found');
    }
  
    // Verify encryptedData structure
    if (!user.encryptedData) {
      user.encryptedData = {};
    }
  
    // Rest of your existing validation
    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }
  
    if (newPassword.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }
  
    // Password update logic
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.auth.passwordChangedAt = new Date();
    
    if (ip) {
      user.auth.loginHistory.push({
        ip,
        userAgent: userAgent || 'Unknown',
        timestamp: new Date(),
        action: 'password_change'
      });
      
      if (user.auth.loginHistory.length > 20) {
        user.auth.loginHistory = user.auth.loginHistory.slice(-20);
      }
    }
  
    try {
      await user.save();
    } catch (saveError) {
      logger.error('Failed to save user during password change'+userId+user, {
        error: saveError,
        userId,
        hasEmail: !!user.encryptedData?.email
      });
      throw new Error('Failed to update password due to system error'+saveError);
    }
  
    return {
      success: true,
      changedAt: user.auth.passwordChangedAt,
      userId: user._id
    };
  },

  updateUser: async function(userId, updateData) {
    // Input validation
    if (!userId) {
      throw new Error('userId is required');
    }

    // Find the user
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    // Fields that should never be updated through this method
    const protectedFields = [
      'password',
      'encryptedData',
      'emailHash',
      'phoneHash',
      'auth.passwordChangedAt',
      'auth.passwordResetToken',
      'auth.passwordResetExpires',
      'auth.mfa.secret',
      'auth.mfa.backupCodes'
    ];
  
    // Remove protected fields from updateData
    protectedFields.forEach(field => {
      const fieldParts = field.split('.');
      let current = updateData;
      
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (current[fieldParts[i]]) {
          current = current[fieldParts[i]];
        } else {
          current = null;
          break;
        }
      }
      
      if (current && current[fieldParts[fieldParts.length - 1]]) {
        delete current[fieldParts[fieldParts.length - 1]];
      }
    });
  
    // Handle nested updates (like preferences)
    if (updateData.preferences) {
      user.preferences = {
        ...user.preferences,
        ...updateData.preferences
      };
      delete updateData.preferences;
    }
  
    // Handle commerce updates
    if (updateData.commerce) {
      user.commerce = {
        ...user.commerce,
        ...updateData.commerce
      };
      delete updateData.commerce;
    }

    // Handle meta updates
    if (updateData.meta) {
      user.meta = {
        ...user.meta,
        ...updateData.meta
      };
      delete updateData.meta;
    }

    // Handle status updates
    if (updateData.status) {
      user.status = updateData.status;
      delete updateData.status;
    }

    // Handle role updates
    if (updateData.role) {
      console.log('Updating role:', updateData.role);
      user.roles = updateData.role;
      delete updateData.role;
    }

    // Handle auth updates (including MFA)
    if (updateData.auth) {
      // Clone auth updates to avoid modifying the original
      const authUpdates = { ...updateData.auth };
      
      // Clean undefined values from auth updates
      Object.keys(authUpdates).forEach(key => {
        if (authUpdates[key] === undefined) {
          delete authUpdates[key];
        }
      });
      
      // Handle MFA updates if present
      if (authUpdates.mfa) {
        // Clean undefined values from MFA updates
        Object.keys(authUpdates.mfa).forEach(key => {
          if (authUpdates.mfa[key] === undefined) {
            delete authUpdates.mfa[key];
          }
        });

        user.auth.mfa = {
          ...(user.auth.mfa || {}), // Ensure mfa exists
          ...authUpdates.mfa
        };

        // Special handling for enabling MFA
        if (authUpdates.mfa.enabled && !user.auth.mfa.enabled) {
          user.auth.mfa.enabledAt = new Date();
        }
        
        delete authUpdates.mfa; // Remove since we handled it
      }

      // Handle login history (append, don't overwrite)
      if (authUpdates.loginHistory) {
        user.auth.loginHistory = [
          ...(user.auth.loginHistory || []),
          ...authUpdates.loginHistory
        ];
        delete authUpdates.loginHistory;
      }

      // Ensure auth exists before spreading updates
      user.auth = {
        ...(user.auth || {}), // Ensure auth exists
        ...authUpdates
      };

      delete updateData.auth;
    }
  
    // Update all remaining top-level fields
    for (const [key, value] of Object.entries(updateData)) {
      if (user[key] !== undefined && value !== undefined && !protectedFields.includes(key)) {
        user[key] = value;
      }
    }
  
    try {
      const updatedUser = await user.save();
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user: ' + error.message, {
        error: error.stack,
        userId,
        updateData
      });
      throw new Error('Failed to update user information: ' + error.message);
    }
  },

  updateSensitiveUser: async function(userId, updateData) {
    // Input validation
    if (!userId) {
      throw new Error('userId is required');
    }
  
    // Find the user
    const user = await this.findById(userId)
      .select('+encryptedData +emailHash +phoneHash +auth.mfa');
    if (!user) {
      throw new Error('User not found');
    }
  
    // Handle email updates
    if (updateData.email) {
      if (!user.encryptedData) user.encryptedData = {};
      user.encryptedData.email = updateData.email;
      user.emailHash = updateData.emailHash;
    }
  
    // Handle firstName updates
    if (updateData.firstName) {
      if (!user.encryptedData) user.encryptedData = {};
      user.encryptedData.firstName = await encrypt(updateData.firstName);
    }
  
    // Handle lastName updates
    if (updateData.lastName) {
      if (!user.encryptedData) user.encryptedData = {};
      user.encryptedData.lastName = await encrypt(updateData.lastName);
    }
  
    // Handle phone updates
    if (updateData.phone) {
      if (!user.encryptedData) user.encryptedData = {};
      user.encryptedData.phone = updateData.phone;
      user.phoneHash = updateData.phoneHash;
    }
  
    // Handle dateOfBirth updates
    if (updateData.dateOfBirth) {
      if (!user.encryptedData) user.encryptedData = {};
      user.encryptedData.dateOfBirth = await encrypt(updateData.dateOfBirth);
    }
  
    // Handle auth.mfa updates
    if (updateData.auth?.mfa) {
      if (!user.auth) user.auth = {};
      user.auth.mfa = updateData.auth.mfa;
    }
  
    try {
      const updatedUser = await user.save();
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update sensitive user data', {
        error,
        userId,
        updateData
      });
      throw new Error('Failed to update sensitive user information');
    }
  },

  deleteAccount: async function(userId, reason, reqData = {}) {
    // Input validation
    if (!userId) {
        throw new Error('userId is required');
    }

    try {
        // Perform the deletion/update
        const updatedUser = await this.findByIdAndUpdate(userId, {
            status: 'deleted',
            username: `deleted-${crypto.randomBytes(4).toString('hex')}`,
            'auth.passwordChangedAt': new Date(), // Invalidate all sessions
            $unset: {
                'encryptedData': 1,
                'emailHash': 1,
                'phoneHash': 1
            }
        }, { new: true });

        if (!updatedUser) {
            throw new Error('User not found');
        }

        // Return data for audit logging
        return {
            success: true,
            userId: updatedUser._id,
            previousStatus: updatedUser.status, // Will be 'active' if successful
            anonymizedFields: ['encryptedData', 'emailHash', 'phoneHash'],
            metadata: {
                reason,
                statusChange: 'active → deleted',
                anonymized: true,
                ip: reqData.ip,
                userAgent: reqData.userAgent,
                deviceFingerprint: reqData.deviceFingerprint,
                location: reqData.geoLocation
            }
        };
    } catch (error) {
        logger.error(`Error in static deleteAccount method: ${error.message}`);
        throw error;
    }
  },

  linkSocialAccount: async function(userId, provider, providerId, reqData = {}) {
    // Input validation
    if (!userId || !provider || !providerId) {
      throw new Error('userId, provider, and providerId are required');
    }

    const validProviders = ['google', 'facebook', 'twitter', 'github'];
    if (!validProviders.includes(provider)) {
      throw new Error('Invalid provider');
    }

    // Check if this social account is already linked to another user
    const existingUser = await this.findOne({ [`social.${provider}Id`]: providerId });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new Error('This social account is already linked to another user');
    }

    // Update the user
    const updatedUser = await this.findByIdAndUpdate(
      userId,
      { [`social.${provider}Id`]: providerId },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return {
      success: true,
      userId: updatedUser._id,
      provider,
      metadata: {
        statusChange: 'unlinked → linked',
        ip: reqData.ip,
        userAgent: reqData.userAgent,
        deviceFingerprint: reqData.deviceFingerprint,
        location: reqData.geoLocation
      }
    };
  },

  unlinkSocialAccount: async function(userId, provider, reqData = {}) {
    // Input validation
    if (!userId || !provider) {
      throw new Error('userId and provider are required');
    }

    const validProviders = ['google', 'facebook', 'twitter', 'github'];
    if (!validProviders.includes(provider)) {
      throw new Error('Invalid provider');
    }

    // Update the user
    const updatedUser = await this.findByIdAndUpdate(
      userId,
      { [`social.${provider}Id`]: null },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return {
      success: true,
      userId: updatedUser._id,
      provider,
      metadata: {
        statusChange: 'linked → unlinked',
        ip: reqData.ip,
        userAgent: reqData.userAgent,
        deviceFingerprint: reqData.deviceFingerprint,
        location: reqData.geoLocation
      }
    };
  },

  addToWishlist: async function(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.commerce.wishlist.includes(productId)) {
      return { message: 'Product already in wishlist' };
    }

    await this.findByIdAndUpdate(
      userId,
      { $addToSet: { 'commerce.wishlist': productId } },
      { new: true }
    );

    return { 
      message: 'Product added to wishlist',
      productDetails: {
        id: productId,
        name: product.name,
        price: product.price
      }
    };
  },

  removeFromWishlist: async function(userId, productId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.commerce.wishlist.includes(productId)) {
      return { message: 'Product not in wishlist' };
    }

    await this.findByIdAndUpdate(
      userId,
      { $pull: { 'commerce.wishlist': productId } },
      { new: true }
    );

    const product = await Product.findById(productId);

    return { 
      message: 'Product removed from wishlist',
      productDetails: {
        id: productId,
        name: product?.name || 'Unknown',
        price: product?.price || 0
      }
    };
  },

  addToCart: async function(userId, productId, quantity = 1, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Initialize cart if it doesn't exist or isn't an array
    if (!user.commerce) user.commerce = {};
    if (!Array.isArray(user.commerce.cart)) {
      user.commerce.cart = [];
    }

    // Check if product already exists in cart
    const existingItemIndex = user.commerce.cart.findIndex(
      item => item.product === productId
    );

    let updatedCart;
    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      updatedCart = [...user.commerce.cart];
      updatedCart[existingItemIndex].quantity += quantity;
      
      if (options.size) {
        updatedCart[existingItemIndex].size = options.size;
      }
      if (options.color) {
        updatedCart[existingItemIndex].color = options.color;
      }
    } else {
      // Add new item to cart
      const newItem = {
        _id: new mongoose.Types.ObjectId(), // Add unique ID for each cart item
        product: productId,
        quantity,
        addedAt: new Date(),
        ...options
      };
      updatedCart = [...user.commerce.cart, newItem];
    }

    await this.findByIdAndUpdate(
      userId,
      { $set: { 'commerce.cart': updatedCart } },
      { new: true }
    );

    return { 
      message: 'Product added to cart',
      productDetails: {
        id: productId,
        name: product.name,
        price: product.price,
        quantity: existingItemIndex >= 0 ? updatedCart[existingItemIndex].quantity : quantity
      }
    };
  },

  updateCartItem: async function(userId, itemId, updates) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid item ID');
    }

    console.log(itemId);

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
 
    // Ensure cart exists and is an array
    if (!user.commerce?.cart || !Array.isArray(user.commerce.cart)) {
      throw new Error('Cart not properly initialized');
    }

    console.log(user.commerce.cart);

    const itemIndex = user.commerce.cart.findIndex(
      item => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    // Create a copy of the cart array
    const updatedCart = [...user.commerce.cart];
    const currentItem = updatedCart[itemIndex];

    // Validate quantity
    if (updates.quantity !== undefined) {
      if (updates.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      currentItem.quantity = updates.quantity;
    }

    // Update other fields if provided
    if (updates.size) {
      currentItem.size = updates.size;
    }
    if (updates.color) {
      currentItem.color = updates.color;
    }

    await this.findByIdAndUpdate(
      userId,
      { $set: { 'commerce.cart': updatedCart } },
      { new: true }
    );

    const product = await Product.findById(currentItem.product);

    return { 
      message: 'Cart item updated',
      itemDetails: {
        id: itemId,
        productId: currentItem.product,
        productName: product?.name || 'Unknown',
        quantity: currentItem.quantity,
        size: currentItem.size,
        color: currentItem.color
      }
    };
  },

  getCartItems: async function(userId, options = {}) {
    // Build base query
    const query = this.findById(userId);
    
    // Always include basic cart structure
    query.select('commerce.cart updatedAt');
    
    // Add population if requested
    if (options.populate) {
      query.populate({
        path: 'commerce.cart.product',
        select: options.productFields || 'name price images stock', // Default fields
        ...(options.populateOptions || {}) // Additional populate options
      });
    }
  
    const user = await query.lean();
    
    if (!user) {
      throw new Error('User not found');
    }
  
    // Ensure cart exists and is an array
    if (!user.commerce?.cart || !Array.isArray(user.commerce.cart)) {
      return {
        items: [],
        total: 0,
        itemsCount: 0,
        updatedAt: user.updatedAt
      };
    }
  
    // Calculate totals if we have product data
    let total = 0;
    let itemsCount = 0;
    
    const items = user.commerce.cart.map(item => {
      const itemTotal = item.product?.price ? item.product.price * item.quantity : 0;
      total += itemTotal;
      itemsCount += item.quantity;
      
      return {
        ...item,
        itemTotal,
        product: item.product || { _id: item.product } // Ensure product reference exists
      };
    });
  
    return {
      items,
      total,
      itemsCount,
      updatedAt: user.updatedAt
    };
  },

  removeFromCart: async function(userId, itemId) {
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid item ID');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure cart exists and is an array
    if (!user.commerce?.cart || !Array.isArray(user.commerce.cart)) {
      throw new Error('Cart not properly initialized');
    }

    const itemIndex = user.commerce.cart.findIndex(
      item => item._id && item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    const removedItem = user.commerce.cart[itemIndex];
    const updatedCart = user.commerce.cart.filter(
      item => item._id.toString() !== itemId
    );

    await this.findByIdAndUpdate(
      userId,
      { $set: { 'commerce.cart': updatedCart } },
      { new: true }
    );

    const product = await Product.findById(removedItem.product);

    return { 
      message: 'Item removed from cart',
      itemDetails: {
        id: itemId,
        productId: removedItem.product,
        productName: product?.name || 'Unknown',
        quantity: removedItem.quantity
      }
    };
  },

  clearCart: async function(userId) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Initialize empty cart if it doesn't exist
    if (!user.commerce) user.commerce = {};
    
    await this.findByIdAndUpdate(
      userId,
      { $set: { 'commerce.cart': [] } },
      { new: true }
    );

    return { 
      message: 'Cart cleared',
      itemsRemoved: user.commerce.cart?.length || 0
    };
  }
};

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.encryptedData.firstName} ${this.encryptedData.lastName}`;
});

// Indexes
userSchema.index({ username: 'text' });
userSchema.index({ status: 1 });
userSchema.index({ 'commerce.orders': 1 });
userSchema.index({ mfaEnabled: 1 });
userSchema.index({ 'mfaDevices.id': 1 });
userSchema.index({ mfaLockUntil: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);