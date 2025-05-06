const express = require('express');
const router = express.Router();
const AccountController = require('./controllers/accountController');
const CommerceController = require('./controllers/commerceController');
const { authenticate } = require('../../core/security/jwt');

// Profile Routes
router.get('/profile/get', authenticate, AccountController.getProfile);
router.patch('/profile/update', authenticate, AccountController.updateProfile);

// Personal Data Routes
router.get('/personalData/get', authenticate, AccountController.getPersonalData);
router.patch('/personalData/update/attempt', authenticate, AccountController.initiateUpdatePersonalData);
router.patch('/personalData/update/complete', authenticate, AccountController.completeUpdatePersonalData);

// Account Status Routes
router.patch('/deactivate', authenticate, AccountController.deactivateAccount);
router.delete('/delete', authenticate, AccountController.deleteAccount);

// Account Role Routes
router.patch('/role/change', authenticate, AccountController.changeRole);

// Two-Factor Authentication Routes
router.post('/2fa/enable', authenticate, AccountController.setupTwoFactor);
router.post('/2fa/disable', authenticate, AccountController.disableTwoFactor);

// Social Account Routes
router.post('/social/link', authenticate, AccountController.linkSocialAccount);
router.post('/social/unlink', authenticate, AccountController.unlinkSocialAccount);

// Preference Routes
router.get('/preferences/get', authenticate, AccountController.getPreferences);
router.patch('/preferences/update', authenticate, AccountController.updatePreferences);

// Mfa Routes
router.post('/enable-mfa', authenticate, AccountController.enableMfa);
router.post('/disable-mfa', authenticate, AccountController.disableMfa);
router.post('/verify-mfa', authenticate, AccountController.verifyMfa);

// ==================== COMMERCE ROUTES ====================

// Wishlist Routes
router.post('/commerce/wishlist/add', authenticate, CommerceController.addToWishlist);
router.delete('/commerce/wishlist/remove/:productId', authenticate, CommerceController.removeFromWishlist);
router.get('/commerce/wishlist/get', authenticate, CommerceController.getWishlist);

// Cart Routes
router.post('/commerce/cart/add', authenticate, CommerceController.addToCart);
router.patch('/commerce/cart/update/:itemId', authenticate, CommerceController.updateCartItem);
router.delete('/commerce/cart/remove/:itemId', authenticate, CommerceController.removeFromCart);
router.delete('/commerce/cart/clear', authenticate, CommerceController.clearCart);
router.get('/commerce/cart/get', authenticate, CommerceController.getCart);


module.exports = router;