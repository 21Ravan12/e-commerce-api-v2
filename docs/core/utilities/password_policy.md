# password_policy.md

## Password Requirements

### Complexity Rules
- **Minimum length**: 12 characters
- **Required character types**:
  - At least 1 uppercase letter (A-Z)
  - At least 1 number (0-9)
  - At least 1 special character (non-alphanumeric)

### Strength Validation
- Passwords are checked against:
  - Common password patterns
  - Dictionary words
  - Predictable sequences
- Minimum zxcvbn score of 3/4 required

### Error Messages
| Validation Failure | Message |
|--------------------|---------|
| Length/Complexity | "Password must be 12+ chars with uppercase, number, and special char" |
| Weak Password | "Password is too weak (avoid common patterns)" |

## Implementation
```javascript
const { validatePassword } = require('./passwordValidator');

// Example usage:
const result = validatePassword('User@Password123');
if (!result.valid) {
  console.error(result.message);
}