const Joi = require('joi');

// Input validation schema (adjust according to your needs)
 const categorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().min(8).max(500).required(),
  parentCategory: Joi.string().hex().length(24).allow(null),
  image: Joi.string().regex(/\.(jpg|jpeg|png|webp|svg)$/i),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().min(0).default(0),
  seo: Joi.object({
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    keywords: Joi.array().items(Joi.string())
  }),
});
  
// Input validation schema
const updateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  description: Joi.string().min(8).max(500),
  parentCategory: Joi.string().hex().length(24).allow(null),
  image: Joi.string().uri().regex(/\.(jpg|jpeg|png|webp|svg)$/i),
  isActive: Joi.boolean(),
  displayOrder: Joi.number().min(0),
  seo: Joi.object({
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    keywords: Joi.array().items(Joi.string())
  }),
  attributes: Joi.array().items(Joi.string().hex().length(24))
}).min(1); // At least one field to update

module.exports = { categorySchema, updateSchema };