# User Module Documentation

## Model Schema

### Core Fields
| Field           | Type     | Required | Validation                          | Description |
|-----------------|----------|----------|-------------------------------------|-------------|
| username        | String   | Yes      | 3-30 chars, alphanumeric+underscore | Unique identifier |
| password        | String   | Yes      | Min 12 chars                        | Encrypted password |
| status          | String   | Yes      | Enum: pending/active/suspended/deleted | Account state |
| roles           | String[] | Yes      | Enum: customer/seller/vendor/moderator/admin | User permissions |

### Enhanced Fields
| Field               | Type           | Description |
|---------------------|----------------|-------------|
| encryptedData.email | Encrypted      | AES-256 encrypted email |
| encryptedData.firstName | Encrypted  | Encrypted first name |
| encryptedData.lastName | Encrypted   | Encrypted last name |
| encryptedData.phone | Encrypted      | Encrypted phone number |
| encryptedData.dateOfBirth | Encrypted | Encrypted DOB |
| emailHash           | String         | SHA-256 hash for email lookup |
| phoneHash           | String         | SHA-256 hash for phone lookup |
| avatar              | String         | Profile image URL |
| preferences         | Object         | UI/notification settings |
| commerce.wishlist   | ObjectId[]     | Product wishlist references |
| commerce.cart       | Object[]       | Shopping cart items with metadata |
| auth                | Object         | Security/authentication data |
| social              | Object         | Linked social accounts |
| meta                | Object         | Activity/usage statistics |

## Virtual Fields
- `fullName`: Combined first + last name
- `decryptedEmail`: Temporary field for validation
- `decryptedPhone`: Temporary field for validation
- `decryptedDOB`: Temporary field for validation

## Static Methods

### `findUser(criteria, selectedFields)`
Retrieves user with field selection:
- Accepts emailHash, phoneHash, id, or username
- Returns lean user object
- Defaults to security-sensitive fields

### `register(userData)`
Creates new user with:
1. Encrypted PII data
2. Hashed email/phone
3. Default preferences
4. Registration metadata
5. Initial 'active' status

### `changePassword({ userId, newPassword, ip, userAgent })`
Secure password update:
1. 12+ character validation
2. BCrypt hashing
3. Password change timestamp
4. Login history record
5. Session invalidation

### `updateUser(userId, updateData)`
General profile updates:
- Handles nested preferences/commerce
- Protects sensitive fields
- Validates role/status changes
- Maintains audit trails

### `updateSensitiveUser(userId, updateData)`
Encrypted data updates:
- Re-encrypts PII fields
- Updates search hashes
- Handles MFA configuration
- Atomic operations

### `deleteAccount(userId, reason, reqData)`
Safe account deletion:
1. Anonymizes username
2. Removes PII data
3. Invalidates sessions
4. Preserves audit trail
5. Returns deletion metadata

### Social Account Management
- `linkSocialAccount()`: OAuth provider integration
- `unlinkSocialAccount()`: Provider disconnection

### Commerce Methods
| Method               | Description |
|----------------------|-------------|
| `addToWishlist()`    | Product wishlisting with duplicate prevention |
| `removeFromWishlist()` | Wishlist item removal |
| `addToCart()`        | Cart management with quantity accumulation |
| `updateCartItem()`   | Cart item modification |
| `removeFromCart()`   | Specific item removal |
| `clearCart()`        | Full cart reset |

## Security Features

### Authentication
- Encrypted session tokens
- Password history tracking
- Login attempt throttling
- Device fingerprinting

### Multi-Factor Auth
- TOTP (Google Authenticator)
- SMS verification
- Backup codes
- Trusted device management
- Recovery options

### Data Protection
- AES-256 encrypted PII
- SHA-256 search hashes
- Field-level encryption
- Automatic data sanitization

## Indexes
1. `username` (text search)
2. `emailHash` (unique lookup)
3. `phoneHash` (unique lookup)
4. `status` (filtering)
5. `auth.mfa.enabled` (security)
6. `commerce.wishlist` (product relations)
7. `roles` (permission checks)

## Example Usage
```javascript
// User registration
const newUser = await User.register({
  username: 'tech_user',
  encryptedData: {
    email: encryptedEmailObj,
    firstName: encryptedFirstName,
    lastName: encryptedLastName
  },
  emailHash: hashedEmail
});

// Password change
await User.changePassword({
  userId: '123',
  newPassword: 'SecurePass123!',
  ip: '192.168.1.1',
  userAgent: 'Chrome/Windows'
});

// Cart management
const result = await User.addToCart(userId, productId, 2, {
  size: 'XL',
  color: 'blue'
});

// Admin user update
await User.updateUser(adminId, {
  roles: ['customer', 'admin'],
  status: 'active'
});