// jwtUtils.js
const jwt = require('jsonwebtoken');
const logger = require('../../services/logger');

// Enhanced token creation with login-specific claims
function createAccessToken(user) {
    validateEnvVariables(['JWT_SECRET', 'ACCESS_TOKEN_EXPIRY']);
    
    if (!user._id || !user.role) {
        throw new Error('User object must contain _id and role', 400);
    }

    return jwt.sign(
        {
            userId: user._id.toString(),  // Consistent with login
            role: user.role,
            authLevel: user.role === 'admin' ? 'full' : 'standard'  // From login
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            algorithm: 'HS256'
        }
    );
}

function createRefreshToken(user) {
    validateEnvVariables(['JWT_SECRET', 'REFRESH_TOKEN_EXPIRY']);
    
    return jwt.sign(
        {
            userId: user._id.toString()  // Consistent with login
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
            algorithm: 'HS256'
        }
    );
}

// Enhanced authentication middleware
async function authenticate(req, res, next) {
    try {

        // Try cookies first, then Authorization header
        const token = req.cookies.accessToken || extractTokenFromHeader(req);
        
        if (!token) {
            throw new Error('Authentication required', 401);
        }

        const decoded = await verifyToken(token);
        
        // Verify the token contains all required claims from login
        if (!decoded.userId || !decoded.role) {
            throw new Error('Invalid token claims', 401);
        }

        // Standardized user object matching login response
        req.user = {
            _id: decoded.userId,
            role: decoded.role,
            authLevel: decoded.authLevel || 'standard'
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Token expired', 401));
        }
        // Include the original error message
        next(new Error(`Authentication failed: ${error.message}`, 401));
    }
}

// Helper to extract token from Authorization header
function extractTokenFromHeader(req) {
    const authHeader = req.headers['authorization'];
    return authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
}

function validateEnvVariables(requiredVars) {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(', ')}`,
            500
        );
    }
}

function validateTokenPayload(decoded) {
    if (!decoded || typeof decoded !== 'object') {
        throw new Error('Invalid token payload');
    }
    return decoded;
}

// Update verifyToken function
async function verifyToken(token) {
    validateEnvVariables(['JWT_SECRET']);
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info('Decoded token: ',JSON.stringify(decoded)+'  '+decoded);  // Add this line
        return validateTokenPayload(decoded);
    } catch (error) {
        throw new Error('Invalid or expired token', 401);
    }
}

module.exports = {
    createAccessToken,
    createRefreshToken,
    authenticate,
    extractTokenFromHeader
};