// schemas/personalDataSchemas.js
const Joi = require('joi');

// Supported fields - EXACTLY 5 as requested
const SUPPORTED_FIELDS = ['email', 'phone', 'firstName', 'lastName', 'dateOfBirth'];
const SENSITIVE_FIELDS = ['email', 'phone'];

// Schema for initiateUpdatePersonalData
const updatePersonalDataSchema = Joi.object({
  data: Joi.object()
    .required()
    .min(1)
    .pattern(
      Joi.string().valid(...SUPPORTED_FIELDS),
      Joi.alternatives().try(
        Joi.string().allow('').allow(null),
        Joi.date()
      )
    )
    .messages({
      'object.base': 'Data must be an object',
      'object.min': 'At least one field must be provided',
      'any.required': 'Data is required'
    })
    .custom((value, helpers) => {
      // Field-specific validation for EXACTLY 5 fields
      if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
        return helpers.error('any.invalid', { message: 'Invalid email format' });
      }
      if (value.phone && !/^\+?[\d\s\-()]{10,20}$/.test(value.phone)) {
        return helpers.error('any.invalid', { message: 'Invalid phone format' });
      }
      if (value.firstName && value.firstName.length > 100) {
        return helpers.error('any.invalid', { message: 'First name too long' });
      }
      if (value.lastName && value.lastName.length > 100) {
        return helpers.error('any.invalid', { message: 'Last name too long' });
      }
      if (value.dateOfBirth && new Date(value.dateOfBirth) >= new Date()) {
        return helpers.error('any.invalid', { message: 'Birth date must be in past' });
      }
      return value;
    })
});

// Schema for completeUpdatePersonalData
const completeUpdateSchema = Joi.object({
  challenge: Joi.string()
    .required()
    .length(64)
    .hex()
    .messages({
      'string.base': 'Challenge must be a string',
      'string.empty': 'Challenge is required',
      'string.length': 'Challenge must be exactly 64 characters',
      'string.hex': 'Challenge must be hexadecimal',
      'any.required': 'Challenge is required'
    }),
  
  verificationCode: Joi.string()
    .required()
    .messages({
      'string.base': 'Code must be a string',
      'string.empty': 'Code is required',
      'string.length': 'Code must be exactly 6 characters',
      'string.pattern.base': 'Code must be alphanumeric',
      'any.required': 'Code is required'
    })
});

module.exports = {
  updatePersonalDataSchema,
  completeUpdateSchema,
  SUPPORTED_FIELDS,
  SENSITIVE_FIELDS
};