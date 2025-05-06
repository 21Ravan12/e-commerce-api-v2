# User Activities Endpoints

## Account Management

### Profile Endpoints

#### `GET /api/userActivities/profile/get`
## [Controller route](controllers/accountController/profile/getProfile.md)
Retrieves authenticated user's profile  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `profile`: Complete profile data
- `metadata`: Last updated timestamp

#### `PATCH /api/userActivities/profile/update`
## [Controller route](controllers/accountController/profile/updateProfile.md)
Updates user profile information  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `firstName` (String, optional): Max 100 chars
- `lastName` (String, optional): Max 100 chars
- `avatar` (String, optional): URL to profile image  
**Success Response:**
- `updatedFields`: Array of modified fields
- `profile`: Updated profile snapshot

### Personal Data Endpoints

#### `GET /api/userActivities/personalData/get`
## [Controller route](controllers/accountController/personalData/getPersonalData.md)
Retrieves sensitive personal data  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `data`: Encrypted personal data (email/phone/DOB)
- `accessLog`: Recent access history

#### `PATCH /api/userActivities/personalData/update/attempt`
## [Controller route](controllers/accountController/personalData/initiateUpdatePersonalData.md)
Initiates personal data change  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `data` (Object): Fields to update (email/phone/firstName/lastName/dateOfBirth)  
**Success Response:**
- `challenge`: Verification challenge string
- `verificationMethod`: `email` or `sms`

#### `PATCH /api/userActivities/personalData/update/complete`
## [Controller route](controllers/accountController/personalData/completeUpdatePersonalData.md)
Completes personal data update  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `challenge` (String, required): 64-char hex string
- `verificationCode` (String, required): 6-digit code  
**Success Response:**
- `updatedData`: List of changed fields
- `confirmation`: Receipt of changes

### Account Status Endpoints

#### `PATCH /api/userActivities/deactivate`
## [Controller route](controllers/accountController/accountStatus/deactivateAccount.md)
Temporarily deactivates account  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `deactivationDate`: Effective timestamp
- `reactivationWindow`: Days until permanent deletion

#### `DELETE /api/userActivities/delete`
## [Controller route](controllers/accountController/accountStatus/deleteAccount.md)
Permanently deletes account  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `confirmationPhrase` (String, required): "DELETE MY ACCOUNT"  
**Success Response:**
- `deletionTimestamp`: Confirmation of removal

#### `PATCH /api/userActivities/role/change`
## [Controller route](controllers/accountController/accountStatus/changeRole.md)
Modifies user role (admin only)  
**Headers:**
- `Authorization`: Bearer token (JWT, admin role)  
**Request Body:**
- `newRole` (String, required): Valid role enum  
**Success Response:**
- `previousRole`: Original role
- `newRole`: Updated role
- `effectiveDate`: When change occurs

## Security Features

### Two-Factor Authentication

#### `POST /api/userActivities/2fa/enable`
## [Controller route](controllers/accountController/twoFactor/setupTwoFactor.md)
Enables 2FA for account  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `qrCode`: Setup QR code
- `backupCodes`: Array of recovery codes

#### `POST /api/userActivities/2fa/disable`
## [Controller route](controllers/accountController/twoFactor/disableTwoFactor.md)
Disables 2FA protection  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `backupCode` (String, required): Valid unused code  
**Success Response:**
- `confirmation`: 2FA removal timestamp

### Social Account Integration

#### `POST /api/userActivities/social/link`
## [Controller route](controllers/accountController/socialAccount/linkSocialAccount.md)
Connects social media account  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `provider` (String, required): `google`/`facebook`/`apple`
- `accessToken` (String, required): OAuth token  
**Success Response:**
- `linkedAccount`: Provider profile data

#### `POST /api/userActivities/social/unlink`
## [Controller route](controllers/accountController/socialAccount/unlinkSocialAccount.md)
Disconnects social account  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `provider` (String, required): Provider to remove  
**Success Response:**
- `removedProvider`: Confirmation of removal

### Multi-Factor Authentication (MFA)

#### `POST /api/userActivities/enable-mfa`
## [Controller route](controllers/accountController/mfa/enableMfa.md)
Enables MFA protection  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `qrUrl`: QR code URL for authenticator apps
- `backupCodes`: Array of 10 one-time use codes (development only)
- `expiresAt`: QR code expiration time

#### `POST /api/userActivities/disable-mfa`
## [Controller route](controllers/accountController/mfa/disableMfa.md)
Disables MFA protection  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `verificationCode` (String, required): Valid MFA code  
**Success Response:**
- `disabledAt`: Timestamp of deactivation

#### `POST /api/userActivities/verify-mfa`
## [Controller route](controllers/accountController/mfa/verifyMfa.md)
Verifies MFA code  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `code` (String, required): 6-digit MFA code
- `deviceId` (String, optional): Trusted device ID
- `deviceName` (String, optional): New device name  
**Success Response:**
- Sets secure HTTP-only cookies
- `backupCodesRemaining`: Count of unused backup codes
- `trustedDevice`: Boolean indicating device trust status

### Preference Management

#### `GET /api/userActivities/preferences/get`
## [Controller route](controllers/accountController/preference/getPreferences.md)
Retrieves user preferences  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `language`: Current language preference
- `theme`: UI theme preference
- `notifications`: Notification settings object

#### `PATCH /api/userActivities/preferences/update`
## [Controller route](controllers/accountController/preference/updatePreferences.md)
Updates user preferences  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `language` (String, optional): `en`/`es`/`fr`/`de`/`tr`
- `theme` (String, optional): `light`/`dark`/`system`
- `notifications` (Object, optional): 
  - `email` (Boolean)
  - `push` (Boolean)
  - `sms` (Boolean)  
**Success Response:**
- `message`: Update confirmation
- `preferences`: Updated preferences object

## Commerce Activities

### Wishlist Management

#### `POST /api/userActivities/commerce/wishlist/add`
## [Controller route](controllers/commerceController/wishlist/addToWishlist.md)
Adds item to wishlist  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `productId` (String, required): Valid product ID  
**Success Response:**
- `wishlist`: Updated wishlist array
- `count`: Total items

#### `DELETE /api/userActivities/commerce/wishlist/remove/:productId`
## [Controller route](controllers/commerceController/wishlist/removeFromWishlist.md)
Removes wishlist item  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `productId`: Item to remove  
**Success Response:**
- `removedId`: Confirmation of removal

#### `GET /api/userActivities/commerce/wishlist/get`
## [Controller route](controllers/commerceController/wishlist/getWishlist.md)
Retrieves wishlist  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `items`: Array of wishlist products
- `lastUpdated`: Timestamp

### Shopping Cart Operations

#### `POST /api/userActivities/commerce/cart/add`
## [Controller route](controllers/commerceController/cart/addToCart.md)
Adds product to cart  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Request Body:**
- `productId` (String, required)
- `quantity` (Number, default: 1)  
**Success Response:**
- `cart`: Updated cart contents
- `subtotal`: Current cart value

#### `PATCH /api/userActivities/commerce/cart/update/:itemId`
## [Controller route](controllers/commerceController/cart/updateCartItem.md)
Modifies cart item quantity  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `itemId`: Cart item ID  
**Request Body:**
- `newQuantity` (Number, required)  
**Success Response:**
- `updatedItem`: Modified cart entry
- `cartSummary`: Totals

#### `DELETE /api/userActivities/commerce/cart/remove/:itemId`
## [Controller route](controllers/commerceController/cart/removeFromCart.md)
Removes cart item  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Path Params:**
- `itemId`: Item to remove  
**Success Response:**
- `remainingItems`: Updated cart

#### `DELETE /api/userActivities/commerce/cart/clear`
## [Controller route](controllers/commerceController/cart/clearCart.md)
Empties shopping cart  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `emptyCart`: Confirmation

#### `GET /api/userActivities/commerce/cart/get`
## [Controller route](controllers/commerceController/cart/getCart.md)
Retrieves current cart  
**Headers:**
- `Authorization`: Bearer token (JWT)  
**Success Response:**
- `items`: Detailed cart contents
- `meta`: Pricing breakdown

## Security Specifications
- JWT authentication required for all endpoints
- Rate limiting (100 requests/5 minutes)
- Sensitive operations require re-authentication
- MFA enforcement for high-risk actions
- Audit logging for all mutations