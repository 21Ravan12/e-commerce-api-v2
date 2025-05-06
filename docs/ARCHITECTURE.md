# E-Commerce API Architecture

## Overview

Modular Node.js API built with Express.js following clean architecture principles.

## Core Layers

1. **Presentation Layer**:
   - Routes (in each module)
   - Controllers (handle HTTP requests/responses)
   - Middlewares (auth, validation, error handling)

2. **Application Layer**:
   - Services (business logic)
   - Models (data access)
   - Utilities (shared functions)

3. **Infrastructure Layer**:
   - Database (MongoDB)
   - Cache (Redis)
   - External services (Payment providers, Email)

## Key Modules

### Authentication
- JWT-based authentication
- Multiple strategies (Local, OAuth)
- Role-based access control

### Products
- CRUD operations
- Inventory management
- Search and filtering

### Orders
- Order lifecycle management
- Payment processing
- Webhook integrations

### Payment
- Provider-agnostic interface
- Supports Stripe, PayPal, COD
- Transaction logging

## Security Features

- CSRF protection
- Rate limiting
- Helmet for secure headers
- Input validation
- Audit logging

## Data Flow

1. Request → Middlewares → Route → Controller
2. Controller → Service → Model → Database
3. Response ← Controller

## Dependencies

- Express.js (Web framework)
- Mongoose (MongoDB ODM)
- Redis (Caching)
- JWT (Authentication)
- Jest (Testing)

## Directory Structure

- e-commerce-api/
  ├── .env
  ├── LICENSE
  ├── package.json
  ├── package-lock.json
  ├── README.md
  ├── logs/
  ├── node_modules/
  ├── src/
  │   ├── app.js
  │   ├── server.js
  │   ├── core/
  │   │   ├── middlewares/
  │   │   │   ├── auth.js
  │   │   │   └── errorHandler.js
  │   │   ├── security/
  │   │   │   ├── csrf.js
  │   │   │   ├── jwt.js
  │   │   │   └── rateLimiter.js
  │   │   └── utilities/
  │   │       ├── crypto.js
  │   │       └── passwordValidator.js
  │   ├── lib/
  │   │   └── redis.js
  │   ├── models/
  │   │   ├── AuditLog.js
  │   │   ├── Campaign.js
  │   │   ├── Category.js
  │   │   ├── Order.js
  │   │   ├── Payments.js
  │   │   ├── Products.js
  │   │   ├── PromotionCode.js
  │   │   ├── ReturnRequest.js
  │   │   └── User.js
  │   ├── modules/
  │   │   ├── auth/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── authStrategies.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   ├── campaign/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   ├── category/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   ├── orders/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   ├── schemas.js
  │   │   │   ├── service.js
  │   │   │   └── webhooks.js
  │   │   ├── payment/
  │   │   │   ├── providers/
  │   │   │   │   ├── CODProvider.js
  │   │   │   │   ├── PayPalProvider.js
  │   │   │   │   └── StripeProvider.js
  │   │   │   ├── PaymentError.js
  │   │   │   └── PaymentProcessor.js
  │   │   ├── products/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   ├── promotionCode/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   ├── returnRequest/
  │   │   │   ├── controllers/
  │   │   │   │   └── controller.js
  │   │   │   ├── routes.js
  │   │   │   └── schemas.js
  │   │   └── userActivities/
  │   │       ├── controllers/
  │   │       │   ├── accountController.js
  │   │       │   └── commerceController.js
  │   │       ├── routes.js
  │   │       └── schemas.js
  │   └── services/
  │       ├── logger.js
  │       ├── mailService.js
  │       └── riskCalculator.js
  └── docs/
      ├── API/
      │   ├── auth/
      │   │   ├── endpoints.md
      │   │   └── schemas.md
      │   ├── auth/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── log-in-out/
      │   │       │   ├── login.md
      │   │       │   └── logout.md
      │   │       ├── oAuth/
      │   │       │   ├── oAuthCallback.md
      │   │       │   └── oAuthRedirect.md
      │   │       ├── registiration/
      │   │       │   ├── completeRegistration.md
      │   │       │   ├── register.md
      │   │       │   └── resendVerificationCode.md
      │   │       └── resetPassword/
      │   │           ├── requestPasswordReset.md
      │   │           ├── resetPassword.md
      │   │           └── verifyResetCode.md
      │   ├── campaign/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── addCampaign.md
      │   │       ├── deleteCampaign.md
      │   │       ├── getCampaign.md
      │   │       ├── getCampaigns.md
      │   │       └── updateCampaign.md
      │   ├── category/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── addCategory.md
      │   │       ├── deleteCategory.md
      │   │       ├── fetchCategories.md
      │   │       ├── fetchCategory.md
      │   │       └── updateCategory.md
      │   ├── orders/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── cancelOrder.md
      │   │       ├── createOrder.md
      │   │       ├── getAdminOrders.md
      │   │       ├── getOrderDetails.md
      │   │       ├── getOrders.md
      │   │       └── updateAdminOrders.md
      │   ├── payment/
      │   │   ├── providers.md
      │   │   ├── processor.md 
      │   │   └── errors.md
      │   ├── products/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── archiveProduct.md   
      │   │       ├── createProduct.md    
      │   │       ├── getProduct.md       
      │   │       ├── getProducts.md     
      │   │       └── updateProduct.md   
      │   ├── promotionCode/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── addPromotionCode.md      
      │   │       ├── deletePromotionCode.md   
      │   │       ├── getPromotionCode.md     
      │   │       ├── getPromotionCodes.md    
      │   │       └── updatePromotionCode.md   
      │   ├── returnRequest/
      │   │   ├── endpoints.md
      │   │   ├── schemas.md
      │   │   └── controllers/controller/
      │   │       ├── archiveReturnRequest.md
      │   │       ├── createReturnRequest.md
      │   │       ├── getReturnRequest.md
      │   │       ├── getReturnRequests.md
      │   │       ├── updateAdminReturnRequest.md
      │   │       └── updateReturnRequest.md
      │   └── userActivities/
      │       ├── endpoints.md
      │       ├── schemas.md
      │       └── controllers/
      │           ├── accountController/
      │           │   ├── accountStatus/
      │           │   │   ├── changeRole.md
      │           │   │   ├── deactivateAccount.md
      │           │   │   └── deleteAccount.md
      │           │   ├── mfa/
      │           │   │   ├── disableMfa.md
      │           │   │   ├── enableMfa.md
      │           │   │   └── verifyMfa.md
      │           │   ├── personalData/
      │           │   │   ├── completeUpdatePersonalData.md
      │           │   │   ├── getPersonalData.md
      │           │   │   └── initiateUpdatePersonalData.md
      │           │   ├── preference/
      │           │   │   ├── getPreferences.md
      │           │   │   └── updatePreferences.md
      │           │   ├── profile/
      │           │   │   ├── getProfile.md
      │           │   │   └── updateProfile.md
      │           │   ├── socialAccount/
      │           │   │   ├── linkSocialAccount.md
      │           │   │   └── unlinkSocialAccount.md
      │           │   └── twoFactor/
      │           │       ├── disableTwoFactor.md
      │           │       └── setupTwoFactor.md
      │           └── commerceController/
      │               ├── cart/
      │               │   ├── addToCart.md
      │               │   ├── clearCart.md
      │               │   ├── getCart.md
      │               │   ├── removeFromCart.md
      │               │   └── updateCartItem.md
      │               └── wishlist/
      │                   ├── addToWishlist.md
      │                   ├── getWishlist.md
      │                   └── removeFromWishlist.md
      ├── core/
      │   ├── middlewares/
      │   │   └── validation.md
      │   ├── security/
      │   │   ├── csrf.md
      │   │   ├── jwt.md
      │   │   └── rate_limiting.md
      │   └── utilities/
      │       ├── cryptography.md
      │       └── password_policy.md
      ├── lib/
      │   └── redis.js
      ├── services/
      │   ├── logging.md
      │   ├── email.md
      │   └── risk_assessment.md
      ├── models/
      │   ├── AuditLog.md
      │   ├── Campaign.md
      │   ├── Category.md
      │   ├── Order.md
      │   ├── Payment.md
      │   ├── Product.md
      │   ├── PromotionCode.md
      │   ├── ReturnRequest.md
      │   └── User.md
      ├── setup/
      │   ├── installation.md
      │   └── configuration.md
      ├── CONTRIBUTING.md
      └── ARCHITECTURE.md