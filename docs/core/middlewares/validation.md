# Validation Middleware Documentation

## Core Validation Functions

### `validateRequest(schema)`
Validates request body against Joi schema with strict rules.

**Parameters:**
- `schema` (Joi.object): Validation schema definition

**Behavior:**
- Validates `req.body` against provided schema
- Returns 422 Unprocessable Entity with detailed errors if invalid
- Aborts validation after first error (`abortEarly: false`)
- Rejects unknown fields (`allowUnknown: false`)
- Formats errors as array of objects with:
  - `field`: Dot-notation path to invalid field
  - `message`: Human-readable error message

**Example Usage:**
```javascript
const { validateRequest } = require('./validation');
const Joi = require('joi');

router.post('/users', 
  validateRequest(Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  })),
  userController.create
);