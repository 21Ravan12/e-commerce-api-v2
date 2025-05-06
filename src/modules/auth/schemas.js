const Joi = require('joi');
const { passwordSchema } = require('../../core/utilities/passwordValidator');

// Reusable schemas for common fields
const emailSchema = Joi.string().email().required().messages({
  'string.email': 'Please provide a valid email address',
  'any.required': 'Email is required'
});

const nameSchema = Joi.string().min(2).max(30).required().messages({
  'string.min': 'Must have at least {#limit} characters',
  'string.max': 'Cannot exceed {#limit} characters',
  'any.required': 'This field is required'
});

const phoneSchema = Joi.string()
  .pattern(/^[0-9]+$/)
  .min(10)
  .max(15)
  .required()
  .messages({
    'string.pattern.base': 'Phone number can only contain digits',
    'string.min': 'Phone number must be at least {#limit} digits',
    'string.max': 'Phone number cannot exceed {#limit} digits',
    'any.required': 'Phone number is required'
  });

const optionalAddressSchema = Joi.string().min(5).max(100).messages({
  'string.min': 'Address must be at least {#limit} characters',
  'string.max': 'Address cannot exceed {#limit} characters'
});

const locationSchema = Joi.string().min(2).max(50).messages({
  'string.min': 'Must be at least {#limit} characters',
  'string.max': 'Cannot exceed {#limit} characters'
});

// Main schemas
const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.label('First name'),
  lastName: nameSchema.label('Last name'),
  phone: phoneSchema,
  address: optionalAddressSchema,
  dateOfBirth: Joi.string().required().isoDate().messages({
    'string.isoDate': 'Date of birth must be a valid ISO date'
  }),
  city: locationSchema,
  country: locationSchema
}).options({ abortEarly: false });

const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
}).options({ abortEarly: false });

const codeSchema = Joi.string().required().messages({
  'any.required': 'Verification code is required'
});

const completeRegistrationSchema = Joi.object({
  code: codeSchema
});

const resetPasswordSchema = Joi.object({
  email: emailSchema
});

const verifyCodeSchema = Joi.object({
  code: codeSchema
});

const resendCodeSchema = Joi.object({
  challenge: codeSchema
});

const newPasswordSchema = Joi.object({
  newPassword: passwordSchema,
  resetToken: codeSchema
});

const MODEL_MAPPING = {
  'admin': "Admin",
  'customer': "CustomerProfile",
  'seller': "SellerProfile",
};

module.exports = {
  MODEL_MAPPING,
  registerSchema,
  loginSchema,
  completeRegistrationSchema,
  resendCodeSchema,
  resetPasswordSchema,
  verifyCodeSchema,
  newPasswordSchema
};