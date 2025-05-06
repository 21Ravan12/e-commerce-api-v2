const Joi = require('joi');
const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

// Corrected ObjectId validator
const objectIdValidator = (value, helpers) => {
  if (!ObjectId.isValid(value)) {
    return helpers.error('any.invalid', {
      message: 'must be a valid MongoDB ObjectId'
    });
  }
  return value;
};

// Renamed to avoid confusion with mongoose.ObjectId
const joiObjectId = Joi.string().custom(objectIdValidator, 'ObjectId validation')
  .message('{{#label}} must be a valid MongoDB ObjectId');

  const returnRequestSchema = Joi.object({
    orderId: joiObjectId.required().messages({
      'any.required': 'Order ID is required',
      'string.objectId': 'Order ID must be a valid MongoDB ID'
    }),
    reason: Joi.string().required().max(255).messages({
      'any.required': 'Return reason is required',
      'string.max': 'Reason cannot exceed 255 characters'
    }),
    description: Joi.string().max(500).allow('').default('').messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    returnType: Joi.string().valid('refund', 'exchange', 'store_credit').required().messages({
      'any.required': 'Return type is required',
      'string.valid': 'Return type must be one of refund, exchange, or store_credit'
    }),
    returnShippingMethod: Joi.string().valid('customer', 'merchant', 'pickup').default('customer').messages({
      'string.valid': 'Shipping method must be one of customer, merchant, or pickup'
    }),
    returnLabelProvided: Joi.boolean().default(false),
    exchangeProductId: Joi.when('returnType', {
      is: 'exchange',
      then: joiObjectId.required().messages({
        'any.required': 'Exchange product ID is required for exchanges',
        'string.objectId': 'Exchange product ID must be a valid MongoDB ID'
      }),
      otherwise: Joi.forbidden().messages({
        'any.unknown': 'Exchange product ID should not be provided for non-exchange returns'
      })
    }),
    refundAmount: Joi.when('returnType', {
      is: Joi.valid('refund', 'store_credit'),
      then: Joi.number().positive().precision(2).optional().messages({
        'number.positive': 'Refund amount must be positive',
        'number.precision': 'Refund amount must have up to 2 decimal places'
      }),
      otherwise: Joi.number().precision(2).valid(0).optional().messages({
        'number.base': 'Refund amount must be a number',
        'number.precision': 'Refund amount must have up to 2 decimal places',
        'any.only': 'Refund amount must be 0 for exchange returns'
      })
    })
  }).options({
    abortEarly: false,
    allowUnknown: false
  });

  const returnRequestCustomerUpdateSchema = Joi.object({
    description: Joi.string()
      .max(500)
      .messages({
        'string.max': 'Description must be less than 500 characters',
        'string.empty': 'Description cannot be empty'
      }),
      
    returnShippingMethod: Joi.string()
      .valid('customer', 'merchant', "pickup")
      .messages({
        'any.only': 'Shipping method must be either "customer", "merchant" or "pickup"'
      }),
      
    // Customers cannot update these fields, so we explicitly deny them
    status: Joi.forbidden()
      .messages({
        'any.unknown': 'Status cannot be updated by customers'
      }),
      
    refundAmount: Joi.forbidden()
      .messages({
        'any.unknown': 'Refund amount cannot be updated by customers'
      }),
      
    adminNotes: Joi.forbidden()
      .messages({
        'any.unknown': 'Admin notes cannot be updated by customers'
      }),
      
    exchangeProductId: Joi.forbidden()
      .messages({
        'any.unknown': 'Exchange product cannot be changed after submission'
      })
  })
    .min(1) // At least one field must be provided
    .messages({
      'object.min': 'At least one field must be provided for update'
    });

  const returnRequestAdminUpdateSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'approved', 'rejected', 'processing', 'completed', 'refunded')
    .messages({
      'any.only': 'Status must be one of: pending, approved, rejected, processing, completed, refunded'
    }),
    
  adminNotes: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Admin notes must be less than 1000 characters'
    }),
    
  returnShippingMethod: Joi.string()
    .valid('customer', 'merchant', "pickup")
    .messages({
      'any.only': 'Shipping method must be either "customer", "merchant" or "pickup"'
    }),
    
  exchangeProductId: Joi.string()
    .when('status', {
      is: 'approved',
      then: Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid product ID format'),
      otherwise: Joi.forbidden().messages({
        'any.unknown': 'Exchange product can only be changed when status is approved'
      })
    }),
    
  // Additional admin-only fields
  refundMethod: Joi.string()
    .valid('original_payment', 'store_credit', 'bank_transfer')
    .messages({
      'any.only': 'Refund method must be one of: original_payment, store_credit, bank_transfer'
    }),
    
  restockingFee: Joi.number()
    .precision(2)
    .min(0)
    .max(100)
    .messages({
      'number.base': 'Restocking fee must be a number',
      'number.min': 'Restocking fee cannot be negative',
      'number.max': 'Restocking fee cannot exceed 100'
    })
  })
  .min(1) // At least one field must be provided
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

module.exports = {
  returnRequestSchema,
  returnRequestCustomerUpdateSchema,
  returnRequestAdminUpdateSchema
};
