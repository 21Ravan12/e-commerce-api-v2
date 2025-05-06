const Joi = require('joi');
const zxcvbn = require('zxcvbn');

const passwordSchema = Joi.string()
  .min(12)
  .pattern(/[A-Z]/)
  .pattern(/[0-9]/)
  .pattern(/[^A-Za-z0-9]/)
  .required();

const validatePassword = (password) => {
  const { error } = passwordSchema.validate(password);
  if (error) {
    return {
      valid: false,
      message: 'Password must be 12+ chars with uppercase, number, and special char'
    };
  }

  const { score } = zxcvbn(password);
  if (score < 3) {
    return {
      valid: false,
      message: 'Password is too weak (avoid common patterns)'
    };
  }

  return { valid: true };
};

module.exports = {
  validatePassword,
  passwordSchema
};