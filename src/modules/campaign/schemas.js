const Joi = require('joi');
const mongoose = require('mongoose');

// Custom validator for MongoDB ObjectId
const objectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Conditional validation for campaignAmount based on campaignType
const validateCampaignAmount = (value, helpers) => {
  const { campaignType } = helpers.state.ancestors[0];
  if (campaignType === 'percentage' && (value > 100 || value <= 0)) {
    return helpers.error('any.invalid', {
      message: 'Percentage must be between 1 and 100'
    });
  }
  return value;
};

const campaignSchema = Joi.object({
  campaignName: Joi.string()
    .required()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'string.empty': 'Campaign name is required',
      'string.min': 'Campaign name must be at least 1 character',
      'string.max': 'Campaign name cannot exceed 100 characters'
    }),

  startDate: Joi.date()
    .required()
    .iso()
    .messages({
      'date.base': 'Start date is required',
      'date.format': 'Start date must be a valid ISO date'
    }),

  endDate: Joi.date()
    .required()
    .iso()
    .greater(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date is required',
      'date.format': 'End date must be a valid ISO date',
      'date.greater': 'End date must be after start date'
    }),

  usageLimit: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(null)
    .messages({
      'number.min': 'Usage limit must be at least 1',
      'number.base': 'Usage limit must be a number'
    }),

  status: Joi.string()
    .valid('draft', 'active', 'paused', 'completed', 'archived')
    .default('draft'),

  campaignType: Joi.string()
    .required()
    .valid('fixed', 'percentage', 'free_shipping', 'bundle', 'buy_x_get_y')
    .messages({
      'any.only': 'Invalid campaign type',
      'string.empty': 'Campaign type is required'
    }),

  campaignAmount: Joi.number()
    .required()
    .custom(validateCampaignAmount)
    .messages({
      'number.base': 'Campaign amount must be a number',
      'number.positive': 'Campaign amount must be positive',
      'any.invalid': 'Percentage campaigns must be between 1-100'
    }),

  validCategories: Joi.array()
    .items(Joi.custom(objectId, 'valid ObjectId').message('Invalid category ID'))
    .default([]),

  excludedProducts: Joi.array()
    .items(Joi.custom(objectId, 'valid ObjectId').message('Invalid product ID'))
    .default([]),

  minPurchaseAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.min': 'Minimum purchase cannot be negative',
      'number.base': 'Minimum purchase must be a number'
    }),

  maxDiscountAmount: Joi.number()
    .min(0)
    .allow(null)
    .default(null)
    .when('campaignType', {
      is: 'percentage',
      then: Joi.required(),
      otherwise: Joi.forbidden().messages({
        'any.unknown': 'Max discount only applies to percentage campaigns'
      })
    }),

  customerSegments: Joi.string()
    .valid('all', 'new', 'returning', 'vip', 'custom')
    .default('all'),

  customCustomers: Joi.when('customerSegments', {
    is: 'custom',
    then: Joi.array()
      .items(Joi.custom(objectId, 'valid ObjectId').message('Invalid customer ID'))
      .min(1)
      .required()
      .messages({
        'array.min': 'Custom customer segment requires at least one customer',
        'any.required': 'Custom customers are required when segment is custom'
      }),
    otherwise: Joi.array()
      .items(Joi.custom(objectId))
      .default([])
  }),

  landingPageURL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .allow('')
    .default('')
    .messages({
      'string.uri': 'Invalid URL format'
    }),

  bannerImage: Joi.string()
    .pattern(/\.(jpg|jpeg|png|webp|svg)$/i)
    .allow('')
    .default('')
    .messages({
      'string.pattern.base': 'Image must be JPG, PNG, WEBP, or SVG'
    }),

  createdBy: Joi.forbidden(), // Automatically set by the server
  updatedBy: Joi.forbidden(), // Automatically set by the server
  usageCount: Joi.forbidden() // Managed by the server
})
  .with('maxDiscountAmount', 'campaignType')
  .with('customCustomers', ['customerSegments']);

const campaignUpdateSchema = Joi.object({
  campaignName: Joi.string()
    .min(1)
    .max(100)
    .trim(),

  startDate: Joi.date().iso(),

  endDate: Joi.date()
    .iso()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('startDate'))
    }),

  status: Joi.string()
    .valid('draft', 'active', 'paused', 'completed', 'archived'),

  campaignType: Joi.string()
    .valid('fixed', 'percentage', 'free_shipping', 'bundle', 'buy_x_get_y'),

  campaignAmount: Joi.number()
    .positive()
    .when('campaignType', {
      is: 'percentage',
      then: Joi.number().max(100)
    }),

  maxDiscountAmount: Joi.number()
    .min(0)
    .when('campaignType', {
      is: 'percentage',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),

  validCategories: Joi.array()
    .items(Joi.custom(objectId, 'valid ObjectId')),

  excludedProducts: Joi.array()
    .items(Joi.custom(objectId, 'valid ObjectId')),

  minPurchaseAmount: Joi.number()
    .min(0),

  customerSegments: Joi.string()
    .valid('all', 'new', 'returning', 'vip', 'custom'),

  customCustomers: Joi.array()
    .items(Joi.custom(objectId, 'valid ObjectId'))
    .when('customerSegments', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
})
.min(1)
.messages({
  'object.min': 'At least one field must be provided for update',
  'any.required': '{{#label}} is required when using {{#peer}}',
  'any.unknown': '{{#label}} is not allowed for this campaign type'
});

module.exports = {
  campaignSchema,
  campaignUpdateSchema
};