const Joi = require('joi');

const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    street: Joi.string().required().messages({
      'string.empty': 'Street is required',
      'any.required': 'Street is required'
    }),
    city: Joi.string().required().messages({
      'string.empty': 'City is required',
      'any.required': 'City is required'
    }),
    state: Joi.string().required().messages({
      'string.empty': 'State is required',
      'any.required': 'State is required'
    }),
    postalCode: Joi.string().required().messages({
      'string.empty': 'Postal code is required',
      'any.required': 'Postal code is required'
    }),
    country: Joi.string().required().messages({
      'string.empty': 'Country is required',
      'any.required': 'Country is required'
    })
  }).required().messages({
    'object.base': 'Shipping address must be an object',
    'any.required': 'Shipping address is required'
  }),

  promotionCode: Joi.string()
  .min(3)
  .max(20)
  .optional()
  .messages({
    'string.min': 'Promotion code must be at least 3 characters long',
    'string.max': 'Promotion code must be no more than 20 characters long',
  }),

  paymentMethod: Joi.string()
    .valid('credit_card', 'paypal', 'stripe', 'cod', 'bank_transfer', 'cash_on_delivery')
    .required()
    .messages({
      'string.empty': 'Payment method is required',
      'any.only': 'Payment method must be one of: credit_card, paypal, bank_transfer, cash_on_delivery',
      'any.required': 'Payment method is required'
    }),

  // Add shippingMethod validation
  shippingMethod: Joi.string()
    .valid('standard', 'express', 'next_day')
    .default('standard')
    .messages({
      'any.only': 'Shipping method must be one of: standard, express, next_day'
    })
}).options({ abortEarly: false });

const getOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  status: Joi.string()
    .valid(
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled, refunded'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'total', 'estimatedDelivery')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, total, estimatedDelivery'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
}).options({ abortEarly: false });

const getAdminOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
  }),
  status: Joi.string()
      .valid(
          'pending',
          'processing',
          'shipped',
          'delivered',
          'cancelled',
          'refunded'
      )
      .optional()
      .messages({
          'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled, refunded'
      }),
  idCustomer: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
          'string.pattern.base': 'Customer ID must be a valid ObjectId'
      }),
  dateFrom: Joi.date().iso().optional().messages({
      'date.base': 'From date must be a valid date',
      'date.format': 'From date must be in ISO format (YYYY-MM-DD)'
  }),
  dateTo: Joi.date().iso().optional().messages({
      'date.base': 'To date must be a valid date',
      'date.format': 'To date must be in ISO format (YYYY-MM-DD)'
  }),
  sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'total', 'estimatedDelivery')
      .default('createdAt')
      .messages({
          'any.only': 'Sort by must be one of: createdAt, updatedAt, total, estimatedDelivery'
      }),
  sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
          'any.only': 'Sort order must be either asc or desc'
      }),
  minTotal: Joi.number().min(0).optional().messages({
      'number.base': 'Minimum total must be a number',
      'number.min': 'Minimum total cannot be negative'
  }),
  maxTotal: Joi.number().min(0).optional().messages({
      'number.base': 'Maximum total must be a number',
      'number.min': 'Maximum total cannot be negative'
  })
}).options({ abortEarly: false });

const updateOrderSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled, refunded'
    }),
  paymentStatus: Joi.string()
    .valid('pending', 'completed', 'failed', 'refunded')
    .messages({
      'any.only': 'Payment status must be one of: pending, completed, failed, refunded'
    }),
  shippingAddress: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string()
  }).messages({
    'object.base': 'Shipping address must be an object'
  }),
  shippingMethod: Joi.string()
    .valid('standard', 'express', 'next_day')
    .messages({
      'any.only': 'Shipping method must be one of: standard, express, next_day'
    })
}).min(1).options({ abortEarly: false });

const cancelOrderSchema = Joi.object({
  status: Joi.string()
  .valid('cancelled')
  .messages({
    'any.only': 'Status must be one of: cancelled'
  }),
  cancellationReason: Joi.string().max(500).optional().messages({
    'string.max': 'cancellationReason cannot exceed 500 characters'
  })
}).options({ abortEarly: false });

const updateAdminOrderSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
    .messages({
      'any.only': 'Status must be one of: pending, processing, shipped, delivered, cancelled, refunded'
    }),
  paymentStatus: Joi.string()
    .valid('pending', 'completed', 'failed', 'refunded')
    .messages({
      'any.only': 'Payment status must be one of: pending, completed, failed, refunded'
    }),
  shippingAddress: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    postalCode: Joi.string(),
    country: Joi.string()
  }).messages({
    'object.base': 'Shipping address must be an object'
  }),
  shippingMethod: Joi.string()
    .valid('standard', 'express', 'next_day')
    .messages({
      'any.only': 'Shipping method must be one of: standard, express, next_day'
    }),
  adminNotes: Joi.string().max(1000).optional().messages({
    'string.max': 'Admin notes cannot exceed 1000 characters'
  }),
  forceUpdate: Joi.boolean().default(false).messages({
    'boolean.base': 'Force update must be a boolean'
  })
}).min(1).options({ abortEarly: false });

module.exports = { createOrderSchema, getOrdersSchema, getAdminOrdersSchema, updateOrderSchema,
   cancelOrderSchema, updateAdminOrderSchema };