// filepath: c:\Users\User\.AAAP\Vs-projects\ecommerce-api-ko-fi\src\modules\auth\routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../core/security/jwt');
const { login, register, resendVerificationCode, completeRegistration , logout 
    , requestPasswordReset , verifyResetCode , resetPassword , oAuthRedirect , oAuthCallback } = require('./controllers/controller'); 


router.post('/login', login);

router.post('/logout', logout);


router.post('/register', register);

router.post('/resend-verification-code', resendVerificationCode);

router.post('/complete-registration', completeRegistration);


router.get('/oauth/:provider', oAuthRedirect);

router.get('/oauth/:provider/callback', oAuthCallback);


router.post('/request-password-reset', requestPasswordReset);

router.post('/verify-reset-code', verifyResetCode);

router.post('/reset-password', resetPassword);


module.exports = router;