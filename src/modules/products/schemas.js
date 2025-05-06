const Joi = require('joi');
const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

// Enhanced ObjectId validator with descriptive messages
const objectId = Joi.string().custom((value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid', {
      message: 'must be a valid MongoDB ObjectId'
    });
  }
  return value;
}).message('{{#label}} must be a valid MongoDB ObjectId');

// Common validation messages
const messages = {
  string: {
    base: '{{#label}} must be a string',
    empty: '{{#label}} cannot be empty',
    min: '{{#label}} must be at least {#limit} characters',
    max: '{{#label}} cannot exceed {#limit} characters',
    pattern: '{{#label}} contains invalid characters'
  },
  number: {
    base: '{{#label}} must be a number',
    positive: '{{#label}} must be a positive number',
    integer: '{{#label}} must be an integer',
    min: '{{#label}} must be at least {#limit}',
    max: '{{#label}} cannot exceed {#limit}',
    precision: '{{#label}} must have at most {#limit} decimal places'
  },
  array: {
    base: '{{#label}} must be an array',
    min: '{{#label}} must contain at least {#limit} item',
    max: '{{#label}} cannot contain more than {#limit} items'
  },
  object: {
    base: '{{#label}} must be an object'
  },
  boolean: {
    base: '{{#label}} must be a boolean'
  }
};

// Common field validations
const nameValidation = Joi.string()
  .trim()
  .min(3)
  .max(100)
  .pattern(/^[\w\s\-&.,()]+$/)
  .messages({
    ...messages.string,
    pattern: '{{#label}} can only contain letters, numbers, spaces, hyphens, ampersands, and basic punctuation'
  });

const descriptionValidation = Joi.string()
  .trim()
  .min(20)
  .max(2000)
  .messages(messages.string);

const priceValidation = Joi.number()
  .positive()
  .precision(2)
  .max(10000000)
  .messages({
    ...messages.number,
    precision: '{{#label}} must have at most 2 decimal places'
  });

const stockValidation = Joi.number()
  .integer()
  .min(0)
  .max(1000000)
  .messages(messages.number);

const imageValidation = Joi.object({
  url: Joi.string()
    .uri({
      scheme: ['http', 'https'],
      domain: { tlds: { allow: true } }
    })
    .max(500)
    .required()
    .messages({
      ...messages.string,
      'string.uri': '{{#label}} must be a valid HTTP/HTTPS URL',
      'any.required': 'Image URL is required'
    }),
  altText: Joi.string()
    .max(100)
    .allow('')
    .messages(messages.string),
  isPrimary: Joi.boolean()
    .messages(messages.boolean)
}).messages(messages.object);

const dimensionValidation = Joi.object({
  length: Joi.number().positive().messages(messages.number),
  width: Joi.number().positive().messages(messages.number),
  height: Joi.number().positive().messages(messages.number),
  unit: Joi.string().valid('cm', 'in', 'm', 'mm').default('cm')
}).messages(messages.object);

const specificationValidation = Joi.object({
  key: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages(messages.string),
  value: Joi.string()
    .trim()
    .max(200)
    .required()
    .messages(messages.string)
}).messages(messages.object);

const shippingInfoValidation = Joi.object({
  isFreeShipping: Joi.boolean()
    .default(false)
    .messages(messages.boolean),
  weight: Joi.number()
    .positive()
    .messages(messages.number),
  dimensions: Joi.object({
    type: Joi.string()
      .valid('parcel', 'envelope', 'package', 'pallet')
      .default('parcel')
  }),
  handlingTime: Joi.number()
    .integer()
    .min(0)
    .max(30)
    .default(1)
    .messages(messages.number)
}).messages(messages.object);

// Product Status values
const PRODUCT_STATUSES = [
  'draft',
  'published',
  'unpublished',
  'archived',
  'banned'
];

// Currency options
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];

// Main Product Schema
const productSchema = Joi.object({
  // Core Product Information
  name: nameValidation.required(),
  description: descriptionValidation.required(),
  price: priceValidation.required(),
  discountedPrice: Joi.alternatives()
    .try(
      Joi.number()
        .positive()
        .precision(2)
        .less(Joi.ref('price'))
        .messages({
          ...messages.number,
          'number.less': 'Discounted price must be less than regular price'
        }),
      Joi.valid(null)
    )
    .messages({
      'alternatives.types': 'Discounted price must be a positive number less than regular price or null'
    }),
  currency: Joi.string()
    .valid(...CURRENCIES)
    .default('USD')
    .uppercase()
    .messages({
      'any.only': `Currency must be one of: ${CURRENCIES.join(', ')}`
    }),

  // Inventory & Availability
  stockQuantity: stockValidation.required(),
  isAvailable: Joi.boolean()
    .default(true)
    .messages(messages.boolean),
  isFeatured: Joi.boolean()
    .default(false)
    .messages(messages.boolean),

  // Media
  images: Joi.array()
    .items(imageValidation)
    .max(10)
    .messages({
      ...messages.array,
      'array.max': 'Cannot upload more than 10 images'
    }),
  videos: Joi.array()
    .items(Joi.object({
      url: Joi.string()
        .uri()
        .required()
        .messages({
          ...messages.string,
          'any.required': 'Video URL is required'
        }),
      platform: Joi.string()
        .valid('youtube', 'vimeo', 'dailymotion', 'other')
        .default('other')
    }))
    .max(3)
    .messages({
      ...messages.array,
      'array.max': 'Cannot upload more than 3 videos'
    }),

  // Categorization
  categories: Joi.array()
    .items(objectId)
    .min(1)
    .required()
    .messages({
      ...messages.array,
      'any.required': 'At least one category is required',
      'array.min': 'At least one category is required'
    }),
  tags: Joi.array()
    .items(Joi.string()
      .trim()
      .lowercase()
      .max(30)
      .messages(messages.string))
    .max(20)
    .messages({
      ...messages.array,
      'array.max': 'Cannot have more than 20 tags'
    }),

  // Product Specifications
  specifications: Joi.array()
    .items(specificationValidation)
    .max(20)
    .messages({
      ...messages.array,
      'array.max': 'Cannot have more than 20 specifications'
    }),
  weight: Joi.number()
    .min(0)
    .default(0)
    .messages(messages.number),
  dimensions: dimensionValidation,

  // Shipping Information
  shippingInfo: shippingInfoValidation,

  // Moderation & Status
  status: Joi.string()
    .valid(...PRODUCT_STATUSES)
    .default('draft')
    .messages({
      'any.only': `Status must be one of: ${PRODUCT_STATUSES.join(', ')}`
    }),

  // SEO
  seoTitle: Joi.string()
    .trim()
    .max(70)
    .messages(messages.string),
  seoDescription: Joi.string()
    .trim()
    .max(160)
    .messages(messages.string)
}).options({
  abortEarly: false,
  stripUnknown: true,
  allowUnknown: false,
  errors: {
    wrap: {
      label: false
    }
  }
});

const productUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().min(10).max(2000),
  price: Joi.number().min(0).precision(2),
  stockQuantity: Joi.number().integer().min(0),
  category: Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // Assuming MongoDB ObjectId
  status: Joi.string().valid('draft', 'published', 'archived'),
  specifications: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.string().required(),
    })
  ),
  version: Joi.number().integer().min(0)
})
.min(1) // Require at least one field to be updated
.options({
  abortEarly: false,
  stripUnknown: true
});

// Export with additional utilities
module.exports = {
  productSchema,
  productUpdateSchema,
  objectIdValidator: objectId,
  productStatuses: PRODUCT_STATUSES,
  currencies: CURRENCIES,
  validateProduct: (data) => productSchema.validate(data, { abortEarly: false }),
  validateProductUpdate: (data) => productUpdateSchema.validate(data, { abortEarly: false })
};