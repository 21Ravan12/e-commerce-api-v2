const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const validator = require('validator');
const logger = require('../../services/logger');
const User = require('../../models/User');

function initializeSerializers() {
    passport.serializeUser((user, done) => {
        try {
            if (!user || !user._id) {
                throw new Error('Invalid user object for serialization');
            }
            done(null, user._id);
        } catch (err) {
            logger.error('Serialization error:', err);
            done(err);
        }
    });

    passport.deserializeUser(async (id, done) => {
        try {
            if (!id || !validator.isMongoId(id.toString())) {
                throw new Error('Invalid user ID format');
            }

            const user = await User.findById(id).select('+auth');
            if (!user) {
                throw new Error('User not found');
            }
            done(null, user);
        } catch (err) {
            logger.error('Deserialization error:', err);
            done(err);
        }
    });
}

function configureOAuthStrategies() {
    // Common OAuth configuration options
    const commonStrategyOptions = {
        passReqToCallback: true,
        state: true,
        proxy: process.env.NODE_ENV === 'production' // Enable proxy in production if behind load balancer
    };

    // GitHub Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use('github', new GitHubStrategy({
            ...commonStrategyOptions,
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
            scope: ['user:email']
        }, createOAuthHandler('github')));
    } else {
        logger.warn('GitHub OAuth credentials not configured - skipping strategy');
    }

    // Facebook Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        passport.use('facebook', new FacebookStrategy({
            ...commonStrategyOptions,
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL,
            profileFields: ['id', 'emails', 'name', 'displayName'],
            enableProof: true // Adds appsecret_proof for additional security
        }, createOAuthHandler('facebook')));
    } else {
        logger.warn('Facebook OAuth credentials not configured - skipping strategy');
    }
}

function createOAuthHandler(provider) {
    return async (req, accessToken, refreshToken, profile, done) => {
        try {
            // Validate profile
            if (!profile || !profile.id) {
                throw new Error(`Invalid ${provider} profile`);
            }

            // Extract and validate email
            const email = profile.emails?.[0]?.value;
            if (!email || !validator.isEmail(email)) {
                throw new Error('Valid email required');
            }

            // Normalize email
            const normalizedEmail = validator.normalizeEmail(email);

            // Create consistent user data structure
            const userData = {
                provider,
                providerId: profile.id,
                email: normalizedEmail,
                name: getProfileName(profile, provider),
                accessToken,
                refreshToken,
                profile
            };

            done(null, userData);
        } catch (error) {
            logger.error(`${provider} OAuth processing error:`, error);
            done(error);
        }
    };
}

function getProfileName(profile, provider) {
    switch (provider) {
        case 'github':
            return profile.displayName || profile.username || '';
        case 'facebook':
            return profile.displayName || 
                   `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || 
                   '';
        default:
            return '';
    }
}

function isValidRedirectUri(uri) {
    try {
        if (!uri || typeof uri !== 'string') return false;

        const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',')
            .map(domain => domain.trim())
            .filter(domain => domain.length > 0) || [];

        if (allowedDomains.length === 0) {
            logger.warn('No allowed redirect domains configured');
            return false;
        }

        const { hostname, protocol } = new URL(uri);
        
        // Only allow HTTPS in production
        if (process.env.NODE_ENV === 'production' && protocol !== 'https:') {
            return false;
        }

        // Check exact domain or subdomains
        return allowedDomains.some(domain => 
            hostname === domain || 
            hostname.endsWith(`.${domain}`)
        );
    } catch (error) {
        logger.error('Redirect URI validation error:', error);
        return false;
    }
}

module.exports = {
    initializeSerializers,
    configureOAuthStrategies,
    isValidRedirectUri,
    createOAuthHandler,
    getProfileName
};