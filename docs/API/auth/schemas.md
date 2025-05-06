# Authentication Schemas Documentation

## Reusable Field Schemas

### Email
- **Schema**: `Joi.string().email().required()`
- **Validation**:
  - Must be a valid email format
  - Required field
- **Error Messages**:
  - `string.email`: "Please provide a valid email address"
  - `any.required`: "Email is required"

### Name
- **Schema**: `Joi.string().min(2).max(30).required()`
- **Validation**:
  - 2-30 characters
  - Required field
- **Error Messages**:
  - `string.min`: "Must have at least {#limit} characters"
  - `string.max`: "Cannot exceed {#limit} characters"
  - `any.required`: "This field is required"

### Phone
- **Schema**: `Joi.string().pattern(/^[0-9]+$/).min(10).max(15).required()`
- **Validation**:
  - Only digits allowed
  - 10-15 characters
  - Required field
- **Error Messages**:
  - `string.pattern.base`: "Phone number can only contain digits"
  - `string.min`: "Phone number must be at least {#limit} digits"
  - `string.max`: "Phone number cannot exceed {#limit} digits"
  - `any.required`: "Phone number is required"

### Address (Optional)
- **Schema**: `Joi.string().min(5).max(100)`
- **Validation**:
  - 5-100 characters (optional)
- **Error Messages**:
  - `string.min`: "Address must be at least {#limit} characters"
  - `string.max`: "Address cannot exceed {#limit} characters"

### Location
- **Schema**: `Joi.string().min(2).max(50)`
- **Validation**:
  - 2-50 characters
- **Error Messages**:
  - `string.min`: "Must be at least {#limit} characters"
  - `string.max`: "Cannot exceed {#limit} characters"

## Main Schemas

### Register
- **Fields**:
  - email (emailSchema)
  - password (passwordSchema from utilities)
  - firstName (nameSchema)
  - lastName (nameSchema)
  - phone (phoneSchema)
  - dateOfBirth (ISO date string)
- **Options**: `abortEarly: false` (returns all validation errors)

### Login
- **Fields**:
  - email (emailSchema)
  - password (required string)
- **Options**: `abortEarly: false`

### Verification Code
- **Schema**: `Joi.string().required()`
- **Error Message**: "Verification code is required"

### Complete Registration
- **Fields**:
  - code (codeSchema)

### Reset Password
- **Fields**:
  - email (emailSchema)

### Verify Code
- **Fields**:
  - code (codeSchema)

### Resend Code
- **Fields**:
  - challenge (codeSchema)

### New Password
- **Fields**:
  - newPassword (passwordSchema)
  - resetToken (codeSchema)

## Model Mapping
- Maps authentication types to profile models:
  - `admin` → "Admin"
  - `customer` → "CustomerProfile"
  - `seller` → "SellerProfile"

## Validation Behavior
All schemas:
- Return human-readable error messages
- Validate both presence and format
- Support internationalization through message customization
- Handle edge cases (empty strings, null values, etc.)

## Usage Example
```javascript
const { registerSchema } = require('./schemas');

const validationResult = registerSchema.validate(userInput, {
  allowUnknown: false,  // Rejects unknown fields
  stripUnknown: false  // Keeps unknown fields
});

if (validationResult.error) {
  // Handle validation errors
  const errors = validationResult.error.details.map(d => d.message);
} else {
  // Proceed with valid data
  const validData = validationResult.value;
}