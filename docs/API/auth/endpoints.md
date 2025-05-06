# Authentication Endpoints

## User Authentication

### `POST /api/auth/login`
## [Controller route](controllers/controller/log-in-out/login.md)
Authenticates a user and returns JWT tokens  
**Request Body:**
- `email` (String, required): User's email address
- `password` (String, required): User's password  
**Success Response:**
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `user`: Basic user profile data

### `POST /api/auth/logout` 
## [Controller route](controllers/controller/log-in-out/logout.md)
Invalidates the user's current session  
**Headers:**
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
**Success Response:**
- `message`: "Successfully logged out"

## User Registration

### `POST /api/auth/register`
## [Controller route](controllers/controller/registiration/register.md)
Initiates new user registration  
**Request Body:**
- `email` (String, required)
- `number` (Number, required)
- `password` (String, required, min 8 chars)
- `firstName` (String, required)
- `lastName` (String, required)  
- `dateOfBirth` (Date, required) 
**Success Response:**
- `challenge`: Unique challenge for verification process
- `expiresAt`: Verification code expiry timestamp

### `POST /api/auth/resend-verification-code`
## [Controller route](controllers/controller/registiration/resendVerificationCode.md)
Resends email verification code  
**Request Body:**
- `challenge` (String, required): From registration  
**Success Response:**
- `challenge`: Unique challenge for verification process
- `newExpiresAt`: Updated expiry timestamp

### `POST /api/auth/complete-registration`
## [Controller route](controllers/controller/registiration/completeRegistration.md)
Finalizes registration with verification code  
**Request Body:**
- `challenge` (String, required): From registration  
- `code` (String, required): 6-digit verification code  
**Success Response:**
- Same as login response (tokens + user data)

## Password Recovery

### `POST /api/auth/request-password-reset`
## [Controller route](controllers/controller/resetPassword/requestPasswordReset.md)
Initiates password reset flow  
**Request Body:**
- `email` (String, required)  
**Success Response:**
- `challenge`: Unique challenge for verification process
- `expiresAt`: Reset code expiry time

### `POST /api/auth/verify-reset-code`
## [Controller route](controllers/controller/resetPassword/verifyResetCode.md)
Validates password reset code  
**Request Body:**
- `challenge`: Unique challenge for verification process
- `code` (String, required): 6-digit reset code  
**Success Response:**
- `resetToken` (String, required)

### `POST /api/auth/reset-password`
## [Controller route](controllers/controller/resetPassword/resetPassword.md)
Sets new password after verification    
**Request Body:**
- `newPassword` (String, required, min 8 chars)  
- `resetToken` (String, required)
**Success Response:**
- `message`: "Password updated successfully"

## OAuth Authentication

### `GET /api/auth/oauth/:provider`
## [Controller route](controllers/controller/oAuth/oAuthRedirect.md)
Redirects to provider's authentication page  
**Path Params:**
- `provider`: Supported OAuth provider (google/facebook/github)  
**Behavior:**
- Redirects to provider's auth page
- Sets session state parameter

### `GET /api/auth/oauth/:provider/callback`
## [Controller route](controllers/controller/oAuth/oAuthCallback.md)
Handles OAuth provider callback  
**Query Params:**
- `code`: Authorization code from provider
- `state`: Session verification parameter  
**Success Response:**
- Redirects to frontend with JWT tokens in URL hash