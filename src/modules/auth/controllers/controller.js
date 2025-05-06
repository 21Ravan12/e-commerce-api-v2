const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const xss = require('xss');
const passport = require('passport');
const { initializeSerializers, configureOAuthStrategies, isValidRedirectUri } = require('../authStrategies');
const RedisClient = require('../../../lib/redis');
const logger = require('../../../services/logger');
const { sendVerificationEmail, createVerificationToken, createChallenge } = require('../../../services/mailService');
const { createAccessToken, createRefreshToken } = require('../../../core/security/jwt');
const { registerSchema, loginSchema, completeRegistrationSchema, resetPasswordSchema, resendCodeSchema, verifyCodeSchema, newPasswordSchema } = require('../schemas');
const { encrypt, decrypt, createSecureHash } = require('../../../core/utilities/crypto');
const { calculateRiskScore } = require('../../../services/riskCalculator');
const User = require('../../../models/User');
const AuditLog = require('../../../models/AuditLog');

class AuthController {
  constructor() {
    this.redis = RedisClient;
    initializeSerializers();
    configureOAuthStrategies();
  }

  async register(req, res) {
    try {
        logger.info(`Registration attempt from IP: ${req.ip}`);

        // Validate input using Joi schema
        const { error, value } = registerSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        // Use validated and sanitized values
        const { email, password, firstName, lastName, dateOfBirth, phone } = value;

        const normalizedEmail = email.toLowerCase().trim();
        const emailHash = await createSecureHash(email);
        logger.info(`Normalized email: ${normalizedEmail} | Hash: ${emailHash}`);
 
        const phoneHash = await createSecureHash(phone);
        logger.info(`Phone hash: ${phoneHash}`);
        
        // Check if email exists using findUser
        const emailExists = await User.findUser({ 
            emailHash 
        }, { 
            _id: 1 
        });
        
        if (emailExists) {
            logger.warn(`Duplicate registration attempt detected for email hash`);
            return res.status(409).json({
                error: 'Email already registered',
                suggestion: 'Try forgot password instead'
            });
        }
                  
        // Check if phone exists using findUser
        const phoneExists = await User.findUser({
            phoneHash
        }, {
            _id: 1
        });
        
        if (phoneExists) {
            logger.warn(`Duplicate registration attempt detected for phone hash`);
            return res.status(409).json({
                error: 'Phone number already registered',
                suggestion: 'This number is already associated with an account'
            });
        }

        // Rate limiting by email
        const regAttemptKey = `reg_attempt:${normalizedEmail}`;
        const attemptCount = await RedisClient.incr(regAttemptKey);
        if (attemptCount > 200) {
            await RedisClient.expire(regAttemptKey, 3600); // 1 hour lockout
            throw new Error('Too many registration attempts. Please try again later.');
        }
        await RedisClient.expire(regAttemptKey, 300); // 5 minute window

        // Generate verification code and challenge using our new functions
        const verificationCode = createChallenge({ size: 16 }); // Verification code
        const challenge = createChallenge(); // Default 32-byte hex challenge

        // Generate username according to schema requirements
        const username = `${firstName.toLowerCase().charAt(0)}${lastName.toLowerCase().replace(/[^a-z0-9_]/g, '')}${Math.floor(1000 + Math.random() * 9000)}`
            .slice(0, 30)
            .replace(/[^a-zA-Z0-9_]/g, '');

        // Hash password
        const trimmedPassword = password.trim();
        const passwordHash = await bcrypt.hash(trimmedPassword, 10);

        // Prepare encrypted registration data according to schema
        const encryptedData = {
            email: await encrypt(normalizedEmail),
            firstName: await encrypt(firstName.trim()),
            lastName: await encrypt(lastName.trim()),
            phone: phone ? await encrypt(phone) : null,
            dateOfBirth: await encrypt(new Date(dateOfBirth).toISOString())
        };

        // Prepare user document using createEmailVerificationToken
        const userData = {
            username,
            encryptedData,
            emailHash,
            phoneHash,
            password: passwordHash,
            status: 'pending',
            roles: ['customer'],
            preferences: {
                language: req.acceptsLanguages(['en', 'es', 'fr', 'de']) || 'en',
                theme: 'system',
                notifications: {
                    email: true,
                    push: false,
                    sms: false
                }
            },
            auth: {}
        };

        // Generate and set verification token using our function
        const verificationToken = createVerificationToken();
        
        // Prepare Redis storage data
        const redisPayload = {
            userData,
            code: verificationCode,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            createdAt: new Date().toISOString(),
            attempts: 0,
            deviceFingerprint: req.headers['x-device-fingerprint'] || '',
            metadata: {
                source: 'web',
                securityLevel: 'high'
            }
        };

        const encryptedRedisPayload = await encrypt(JSON.stringify(redisPayload));
        
        // Store in Redis with TTL using the challenge as key
        await RedisClient.set(challenge, encryptedRedisPayload, {
            EX: 900 // 15 minutes expiration
        });

        // Send verification email
        try {
            await sendVerificationEmail(normalizedEmail, verificationCode);
            logger.info(`Verification code sent to ${normalizedEmail}`);
        } catch (emailError) {
            await RedisClient.del(challenge);
            logger.error(`Email sending failed: ${emailError.message}`);
            throw new Error('Failed to send verification code');
        }

        // Create audit log
        try {
            await AuditLog.logAsync({
                event: 'REGISTER_ATTEMPT',
                action: 'register',
                source: 'web',
                user: null,
                userEmail: normalizedEmail,
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                status: 'info',
                metadata: {
                    riskScore: calculateRiskScore(req),
                    headers: {
                        'user-agent': req.get('User-Agent'),
                        'accept-language': req.get('Accept-Language')
                    },
                    tokens: {
                        verificationToken: verificationToken.substring(0, 8) + '...', // Log partial token
                        challenge: challenge.substring(0, 8) + '...'
                    }
                }
            });
        } catch (auditError) {
            logger.error(`Audit log creation failed: ${auditError.message}`);
        }

        // Send success response
        res
            .set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Content-Security-Policy': "default-src 'self'"
            })
            .status(200)
            .json({
                message: "Verification code sent to your email",
                cooldown: 180,
                challenge,
                security: {
                    level: "high",
                    features: ["csrf_protection", "rate_limiting", "encrypted_storage"]
                }
            });

    } catch (error) {
        logger.error(`Registration error: ${error.message}`, { stack: error.stack });
        const statusCode = error.message.includes('already registered') ? 409 :
                         error.message.includes('Too many') ? 429 :
                         error.message.includes('Validation error') ? 400 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
  }

  async resendVerificationCode(req, res) {
    try {
        logger.info(`Resend verification code attempt from IP: ${req.ip}`);
        
        // 1. Enhanced Content-Type validation
        if (!req.headers['content-type']?.includes('application/json')) {
            throw new Error('Content-Type must be application/json');
        }

        // 2. Validate request body exists and is an object
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            throw new Error('Invalid request body format');
        }

        // 3. Debug log the raw incoming request body
        logger.debug('Incoming request body:', { 
            body: req.body,
            headers: req.headers 
        });

        // 4. Validate request body with schema
        const { error, value } = resendCodeSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            logger.error('Request validation failed:', errorMessages);
            throw new Error(`Validation error: ${errorMessages}`);
        }

        // 5. Extract and validate values
        const { challenge: redisKey } = req.body;

        if (typeof redisKey !== 'string') {
            throw new Error('Challenge must be a string');
        }

        const trimmedKey = redisKey.trim();
        if (trimmedKey === '') {
            throw new Error('Challenge cannot be empty');
        }

        logger.info(`Processing verification code resend for challenge: ${trimmedKey.substring(0, 8)}...`);

        // Get and validate session data from Redis
        const encryptedData = await RedisClient.get(trimmedKey);
        if (!encryptedData) {
            throw new Error('Invalid or expired registration session');
        }

        let decryptedData;
        try {
            logger.debug('Attempting to decrypt Redis data...');
            
            const encryptedObject = JSON.parse(encryptedData);
            
            // Then decrypt the actual content
            decryptedData = await decrypt(encryptedObject);
            
            if (!decryptedData || typeof decryptedData !== 'string') {
                throw new Error('Decrypted data is not a string');
            }
            
            logger.debug('Decrypted data sample:', decryptedData.substring(0, 100) + '...');
        } catch (decryptError) {
            logger.error('Decryption failed:', {
                error: decryptError.message,
                stack: decryptError.stack,
                encryptedData: encryptedData?.substring(0, 100) + '...'
            });
            throw new Error('Security validation failed - could not decrypt session data');
        }

        // Parse decrypted data with validation
        let sessionData;
        try {
            // 1. Log the raw data type and sample
            logger.info('Raw data type:', typeof decryptedData);
            logger.debug('Data sample (first/last 50 chars):', {
                first50: decryptedData?.substring(0, 50),
                last50: decryptedData?.substring(Math.max(0, decryptedData.length - 50))
            });
        
            // 2. Clean the data
            const cleanData = decryptedData.trim();
            
            // 3. Check for double-encoded JSON
            let parseTarget = cleanData;
            if (cleanData.startsWith('"') && cleanData.endsWith('"')) {
                logger.debug('Data appears to be double-quoted, attempting to unescape');
                parseTarget = cleanData.slice(1, -1).replace(/\\"/g, '"');
            }
        
            // 4. Parse with detailed error position
            const parsedData = JSON.parse(parseTarget);
            
            // 5. Validate structure
            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Invalid session data format');
            }
            
            if (!parsedData.userData || typeof parsedData.userData !== 'object') {
                throw new Error('Missing required userData in session');
            }
        
            
            sessionData = parsedData;
            
        } catch (parseError) {
            // Enhanced error logging with position analysis
            const errorPosition = parseError.message.match(/position (\d+)/)?.[1] || 'unknown';
            const contextStart = Math.max(0, errorPosition - 20);
            const errorContext = decryptedData?.substring(contextStart, errorPosition + 20);
            
            logger.error('JSON Parse Failure:', {
                error: parseError.message,
                errorPosition: errorPosition,
                context: errorContext,
                dataSample: {
                    start: decryptedData?.substring(0, 50),
                    end: decryptedData?.substring(Math.max(0, decryptedData.length - 50))
                },
                stack: parseError.stack
            });
            
            throw new Error(`Invalid user data format: ${parseError.message}`);
        }

        // Generate new verification code
        const newVerificationCode = createChallenge({ size: 16 });
        const newRedisKey = createChallenge();

        // Update session data with new code
        sessionData.code = newVerificationCode;
        sessionData.auth = sessionData.auth || {};
        sessionData.auth.emailVerificationToken = crypto.createHash('sha256').update(newVerificationCode).digest('hex');
        sessionData.auth.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        // Prepare Redis storage data
        const redisPayload = {
            ...sessionData,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            updatedAt: new Date().toISOString(),
            attempts: 0 // Reset attempts
        };

        const encryptedRedisPayload = await encrypt(JSON.stringify(redisPayload));
        
        // Store in Redis with TTL
        await RedisClient.set(newRedisKey, encryptedRedisPayload, {
            EX: 900 // 15 minutes expiration
        });

        // Delete old key
        await RedisClient.del(trimmedKey);
        

        // Send verification email
        try {
            logger.info(`New verification code sent to ${await decrypt(sessionData.userData.encryptedData.email)}`);
            await sendVerificationEmail(await decrypt(sessionData.userData.encryptedData.email), newVerificationCode);
            logger.info(`New verification code sent to ${sessionData.userData.email}`);
        } catch (emailError) {
            await RedisClient.del(newRedisKey);
            logger.error(`Email sending failed: ${emailError.message}`);
            throw new Error('Failed to send verification code');
        }

        // Create audit log
        try {
            await AuditLog.logAsync({
                event: 'VERIFICATION_CODE_RESEND',
                action: 'resend_code',
                source: 'web',
                user: null,
                userEmail: sessionData.userData.email,
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                status: 'info',
                metadata: {
                    riskScore: calculateRiskScore(req),
                    headers: {
                        'user-agent': req.get('User-Agent'),
                        'accept-language': req.get('Accept-Language')
                    }
                }
            });
        } catch (auditError) {
            logger.error(`Audit log creation failed: ${auditError.message}`);
        }

        // Send success response
        res
            .set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Content-Security-Policy': "default-src 'self'"
            })
            .status(200)
            .json({
                message: "New verification code sent to your email",
                cooldown: 180,
                challenge: newRedisKey,
                security: {
                    level: "high",
                    features: ["csrf_protection", "rate_limiting", "encrypted_storage"]
                }
            });

    } catch (error) {
        logger.error(`Verification code resend error: ${error.message}`, { stack: error.stack });
        const statusCode = error.message.includes('already registered') ? 409 :
                         error.message.includes('Too many') ? 429 :
                         error.message.includes('Validation error') ? 400 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
  }

  async completeRegistration(req, res) {
    try {
        logger.info(`Complete registration attempt from IP: ${req.ip}`);
        
        // 1. Enhanced Content-Type validation
        if (!req.headers['content-type']?.includes('application/json')) {
            throw new Error('Content-Type must be application/json');
        }

        // 2. Validate request body exists and is an object
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            throw new Error('Invalid request body format');
        }

        // 3. Debug log the raw incoming request body
        logger.debug('Incoming request body:', { 
            body: req.body,
            headers: req.headers 
        });

        // 4. Validate request body with schema
        const { error, value } = completeRegistrationSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            logger.error('Request validation failed:', errorMessages);
            throw new Error(`Validation error: ${errorMessages}`);
        }

        // 5. Extract and validate values
        const { challenge: redisKey, code: verificationCode } = req.body;

        if (typeof redisKey !== 'string') {
            throw new Error('Challenge must be a string');
        }

        const trimmedKey = redisKey.trim();
        if (trimmedKey === '') {
            throw new Error('Challenge cannot be empty');
        }

        // 6. Hex format validation
        if (!/^[a-f0-9]{64}$/i.test(trimmedKey)) {
            logger.warn(`Invalid challenge format: ${trimmedKey}`);
            throw new Error('Challenge must be a 64-character hex string');
        }

        logger.info(`Processing registration with challenge: ${trimmedKey.substring(0, 8)}...`);

        // Get and validate session data from Redis
        const encryptedData = await RedisClient.get(trimmedKey);
        if (!encryptedData) {
            throw new Error('Invalid or expired registration session');
        }

        // Enhanced decryption with validation
        let decryptedData;
        try {
            logger.debug('Attempting to decrypt Redis data...');
            
            const encryptedObject = JSON.parse(encryptedData);
            
            // Then decrypt the actual content
            decryptedData = await decrypt(encryptedObject);
            
            if (!decryptedData || typeof decryptedData !== 'string') {
                throw new Error('Decrypted data is not a string');
            }
            
            logger.debug('Decrypted data sample:', decryptedData.substring(0, 100) + '...');
        } catch (decryptError) {
            logger.error('Decryption failed:', {
                error: decryptError.message,
                stack: decryptError.stack,
                encryptedData: encryptedData?.substring(0, 100) + '...'
            });
            throw new Error('Security validation failed - could not decrypt session data');
        }

        // Parse decrypted data with validation
        let userData;
        try {
          // 1. Log the raw data type and sample
          logger.info('Raw data type:', typeof decryptedData);
          logger.debug('Data sample (first/last 50 chars):', {
              first50: decryptedData?.substring(0, 50),
              last50: decryptedData?.substring(Math.max(0, decryptedData.length - 50))
          });
      
          // 2. Clean the data
          const cleanData = decryptedData.trim();
          
          // 3. Check for double-encoded JSON
          let parseTarget = cleanData;
          if (cleanData.startsWith('"') && cleanData.endsWith('"')) {
              logger.debug('Data appears to be double-quoted, attempting to unescape');
              parseTarget = cleanData.slice(1, -1).replace(/\\"/g, '"');
          }
      
          // 4. Parse with detailed error position
          userData = JSON.parse(parseTarget);
          
          // 5. Validate structure
          if (!userData?.userData) {
              throw new Error('Parsed data missing required userData field');
          }
      
      } catch (parseError) {
          // Enhanced error logging with position analysis
          const errorPosition = parseError.message.match(/position (\d+)/)?.[1] || 'unknown';
          const contextStart = Math.max(0, errorPosition - 20);
          const errorContext = decryptedData?.substring(contextStart, errorPosition + 20);
          
          logger.error('JSON Parse Failure:', {
              error: parseError.message,
              errorPosition: errorPosition,
              context: errorContext,
              dataSample: {
                  start: decryptedData?.substring(0, 50),
                  end: decryptedData?.substring(Math.max(0, decryptedData.length - 50))
              },
              stack: parseError.stack
          });
          
          throw new Error(`Invalid user data format: ${parseError.message}`);
      }

        // IP validation
        const clientIp = req.ip;
        if (userData.ip !== clientIp) {
            logger.warn(`IP mismatch: session=${userData.ip} vs request=${clientIp}`);
            throw new Error('Session validation failed - IP mismatch');
        }

        // Verify code (timing-safe comparison)
        const storedCode = userData.code || '';
        if (!crypto.timingSafeEqual(
            Buffer.from(storedCode),
            Buffer.from(verificationCode.toString())
        )) {
            logger.warn(`Code mismatch for session ${trimmedKey.substring(0, 8)}...`);
            
            // Increment attempt counter
            userData.attempts = (userData.attempts || 0) + 1;
            
            // Re-encrypt the updated userData
            const reEncryptedData = await encrypt(JSON.stringify(userData));
            await RedisClient.set(trimmedKey, JSON.stringify(reEncryptedData), {
                EX: 900 // Refresh TTL
            });

            await AuditLog.create({
                event: 'INVALID_VERIFICATION_ATTEMPT',
                action: 'verify',
                source: 'web',
                status: 'failure',
                user: null,
                userEmail: userData.userData.encryptedData.email ? await decrypt(userData.userData.encryptedData.email) : null,
                ip: clientIp,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    attempts: userData.userData.attempts,
                    riskScore: calculateRiskScore(req)
                }
            });
            
            throw new Error('Invalid verification code');
        }
        await logger.info(JSON.stringify(userData.userData.encryptedData.email + userData.userData.encryptedData.phone));
        
        const decryptedEmail = await decrypt(userData.userData.encryptedData.email);
        if (typeof decryptedEmail !== 'string') {
            throw new Error('Decrypted email is not a string');
        }
        const emailHash = await createSecureHash(decryptedEmail.slice(1, -1));
        logger.info(`Normalized email: ${decryptedEmail} `+emailHash);
    
        // Decrypt and hash phone
        const decryptedPhone = await decrypt(userData.userData.encryptedData.phone);
        if (typeof decryptedPhone !== 'string') {
            throw new Error('Decrypted phone is not a string');
        }
        const phoneHash = await createSecureHash(decryptedPhone.slice(1, -1));
        logger.info(`Decrypted phone: ${decryptedPhone}`);
        
        // Check if email exists using findUser
        const emailExists = await User.findUser({ 
            emailHash 
        }, { 
            _id: 1 
        });
        
        if (emailExists) {
            logger.warn(`Duplicate registration attempt detected for email hash`);
            return res.status(409).json({
                error: 'Email already registered',
                suggestion: 'Try forgot password instead'
            });
        }
                  
        // Check if phone exists using findUser
        const phoneExists = await User.findUser({
            phoneHash
        }, {
            _id: 1
        });
        
        if (phoneExists) {
            logger.warn(`Duplicate registration attempt detected for phone hash`);
            return res.status(409).json({
                error: 'Phone number already registered',
                suggestion: 'This number is already associated with an account'
            });
        }
  
        userData.emailHash = emailHash;
        userData.phoneHash = phoneHash;

        const newUser = User.register(userData);

        // Log successful registration
        await AuditLog.logAsync({
            event: 'REGISTRATION_COMPLETED',
            action: 'register',
            source: 'web',
            status: 'success',
            user: newUser._id,
            userEmail: await decrypt(userData.userData.encryptedData.email),
            ip: clientIp,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                registrationMethod: 'email',
                deviceFingerprint: req.headers['x-device-fingerprint'],
                riskScore: calculateRiskScore(req)
            }
        });

        // Prepare response
        const response = {
            message: "Registration successful",
            user: {
                id: newUser._id,
                username: newUser.username,
            },
            security: {
                cookieDomains: process.env.JWT_COOKIE_DOMAIN,
                cookieSecure: process.env.NODE_ENV === 'production',
                sameSite: "Strict"
            }
        };

        // Set secure cookies
        res
            .set({
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Content-Security-Policy': "default-src 'self'"
            })
            .status(200)
            .json(response);

        logger.info(`New user registered: ${await decrypt(userData.userData.encryptedData.email)}`);

    } catch (error) {
        logger.error('Registration completion failed:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            headers: req.headers
        });
        
        const statusCode = error.message.includes('CSRF') ? 403 :
                         error.message.includes('Content-Type') ? 415 :
                         error.message.includes('Missing') ? 400 :
                         error.message.includes('Validation error') ? 400 :
                         error.message.includes('Invalid or expired') ? 400 :
                         error.message.includes('Session validation') ? 403 :
                         error.message.includes('Account already exists') ? 409 :
                         error.message.includes('Security validation') ? 401 :
                         error.message.includes('Temporary system') ? 503 : 500;
        
        res.status(statusCode).json({ 
            error: error.message,
            ...(process.env.NODE_ENV === 'development' && { 
                stack: error.stack,
                receivedBody: req.body 
            })
        });
    }
  }

  async login(req, res) {
    try {
        logger.info(`Login attempt from IP: ${req.ip}`);

        // Content type validation
        if (!req.is('application/json')) {
            throw new Error('Content-Type must be application/json');
        }

        // Validate input using Joi schema
        const { error, value } = loginSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            throw new Error(`Validation error: ${errorMessages}`);
        }

        const { email, password } = value;

        if (!password) {
            throw new Error('Password is required');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const emailHash = await createSecureHash(normalizedEmail);
        logger.info(`Login attempt for email hash: ${emailHash.substring(0, 8)}...`);

        // Find user using the findUser method
        const user = await User.findUser(
            { emailHash },
            {
                password: 1,
                accountVerified: 1,
                mfaEnabled: 1,
                nameEncrypted: 1,
                role: 1,
                roles: 1,
                status: 1,
                _id: 1,
                username: 1
            }
        );

        if (!user) {
            logger.info(`No user found for email hash: ${emailHash.substring(0, 8)}...`);
            throw new Error('Invalid credentials');
        }

        if (!user.password) {
            throw new Error('Password login not available for this account');
        }

        // Verify the stored password is a valid bcrypt hash
        if (!user.password.match(/^\$2[aby]\$\d+\$/)) {
            logger.error(`Invalid password hash format for user ${user._id}`);
            throw new Error('Authentication system error - please reset your password');
        }

        // Trim password input consistently with registration process
        const trimmedPassword = password.trim();

        // Compare passwords
        const isMatch = await bcrypt.compare(trimmedPassword, user.password);
        logger.debug(`Password match: ${isMatch}`);

        if (!isMatch) {
            logger.warn(`Failed login attempt for user ${user._id}`);
            throw new Error('Invalid credentials');
        }

        // Determine user role
        const userRole = user.roles[0] || user.role;
        if (!userRole) {
            throw new Error('User role not defined');
        }

        // Check account status
        if (user.status !== 'active') {
            throw new Error(`Account status: ${user.status}`);
        }

        // Generate tokens
        const accessToken = createAccessToken({
            _id: user._id,
            role: userRole
        });

        const refreshToken = createRefreshToken({
            _id: user._id
        });

        await User.updateUser(user._id, {
          meta: {
              lastLogin: new Date(),
              lastIp: req.ip,
              loginCount: (user.meta?.loginCount || 0) + 1
          },
          auth: {
              loginHistory: [{
                  ip: req.ip,
                  userAgent: req.get('User-Agent') || 'Unknown',
                  timestamp: new Date(),
                  action: 'login'
              }]
          }
        });

        // Prepare response
        const response = {
            message: "Login successful",
            user: {
                id: user._id,
                name: user.username,
                email: normalizedEmail,
                role: userRole,
                mfaEnabled: user.mfaEnabled
            },
            tokens: {
                accessToken,
                refreshToken,
                accessTokenExpiresIn: parseInt(process.env.ACCESS_TOKEN_EXPIRY?.replace(/[^\d]/g, '') || 900),
                refreshTokenExpiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRY?.replace(/[^\d]/g, '') || 604800)
            }
        };

        // Set secure cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            domain: process.env.JWT_COOKIE_DOMAIN,
            path: '/'
        };

        res
            .cookie('accessToken', accessToken, {
                ...cookieOptions,
                maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRY?.replace(/[^\d]/g, '') || 900000)
            })
            .cookie('refreshToken', refreshToken, {
                ...cookieOptions,
                maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY?.replace(/[^\d]/g, '') || 604800000)
            })
            .status(200)
            .json(response);

        // Log successful login
        await AuditLog.logAsync({
            event: 'LOGIN_SUCCESS',
            action: 'login',
            source: 'web',
            user: user._id,
            userEmail: normalizedEmail,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            status: 'info',
            metadata: {
                role: userRole,
                authMethod: 'password',
                deviceInfo: req.headers['x-device-fingerprint'] || 'unknown'
            }
        });

        logger.info(`Successful login for user ${user._id}`);

    } catch (error) {
        logger.error(`Login failed: ${error.message}`);
        
        const statusCode = error.message.includes('credentials') ? 401 :
                         error.message.includes('verified') ? 403 :
                         error.message.includes('approved') || error.message.includes('status') ? 403 :
                         400;
        
        res.status(statusCode).json({ 
            error: 'Authentication failed',
            ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
    }
  }
  
  async logout(req, res) {
    try {
        logger.info(`Logout request from IP: ${req.ip}, User-Agent: ${req.get('User-Agent')?.slice(0, 50)}...`);

        // Get tokens from either body or cookies (matching login behavior)
        const accessToken = req.body.accessToken || req.cookies.accessToken;
        const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

        if (!accessToken && !refreshToken) {
            logger.warn('Logout attempt with no tokens provided');
            return res.status(200).json({ 
                message: 'No active session found',
                status: 'success'
            });
        }

        // Clear cookies (matching login cookie options)
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            domain: process.env.JWT_COOKIE_DOMAIN,
            path: '/'
        };

        res.clearCookie('accessToken', cookieOptions)
           .clearCookie('refreshToken', cookieOptions);

        // Get user info from token if available
        let userId = null;
        let userRole = null;
        let userEmailHash = null;
        
        try {
            if (accessToken) {
                const decoded = verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET);
                userId = decoded._id; // Matching login's token structure
                userRole = decoded.role;
            }
        } catch (tokenError) {
            logger.debug('Access token verification failed during logout (may be expired)', tokenError.message);
        }

        // Create audit log if we have user info
        if (userId) {
            try {
              const user = await User.findUser(
                  { id: userId },
                  {
                      password: 1,
                      accountVerified: 1,
                      mfaEnabled: 1,
                      username: 1
                  }
              );
                if (user) {
                    userEmailHash = user.emailHash;
                    
                    await AuditLog.logAsync({
                        event: 'LOGOUT_SUCCESS',
                        action: 'logout',
                        source: 'web',
                        user: userId,
                        userEmail: user.emailHash.substring(0, 8) + '...',
                        ip: req.ip,
                        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                        status: 'info',
                        metadata: {
                            role: userRole,
                            logoutType: 'user_initiated',
                            deviceInfo: req.headers['x-device-fingerprint'] || 'unknown',
                            username: user.username
                        }
                    });

                    logger.info(`User ${userId} logged out successfully`);
                }
            } catch (dbError) {
                logger.error('Error while recording logout audit log:', dbError.message);
            }
        }

        // Prepare response matching login's structure
        const response = {
            message: 'Logout successful',
            status: 'success',
            timestamp: new Date().toISOString(),
            ...(userId && { user: { id: userId } })
        };

        res.status(200).json(response);

    } catch (error) {
        logger.error(`Logout processing failed: ${error.message}`);
        
        res.status(500).json({ 
            error: 'Logout processing failed',
            status: 'error',
            ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
    }
  }

  async requestPasswordReset(req, res) {
    try {
      logger.info(`Password reset request from IP: ${req.ip}`);

      // Content type validation
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }

      const { error, value } = resetPasswordSchema.validate(req.body, {
        abortEarly: false, // Return all errors not just the first one
        stripUnknown: true, // Remove unknown fields
        allowUnknown: false // Reject unknown fields
      });

      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }

      const { email } = req.body;

      // Input validation
      if (!email) {
        throw new Error('Email address required');
      }

      const cleanEmail = xss(email).trim().toLowerCase();

      // Rate limiting by email
      const regAttemptKey = `pwd_reset:${cleanEmail}`;
      const attemptCount = await RedisClient.incr(regAttemptKey);
      if (attemptCount > 200) {
          await RedisClient.expire(regAttemptKey, 3600); // 1 hour lockout
          throw new Error('Too many password reset attempts. Please try again later.');
      }
      await RedisClient.expire(regAttemptKey, 300); // 5 minute window

      // Find user by email hash
      const emailHash = await createSecureHash(cleanEmail);

      const user = await User.findUser({ 
        emailHash 
      }, { 
          _id: 1 
      });

      if (!user) {
        logger.info(`Password reset request for unregistered email: ${cleanEmail}`);
        return res.status(200).json({
          message: "If this email exists, a reset link has been sent",
          cooldown: 300
        });
      }

      if (user.status !== "active") {
        logger.warning(`Password reset for unverified account: ${cleanEmail}`);
        throw new Error('Account not verified');
      }

      // Generate verification code and challenge
      const verificationCode = createChallenge({ size: 16 }); 
      const challengeHex = createChallenge();

      // Prepare reset data
      const redisData = {
        userId: user._id.toString(),
        code: verificationCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        createdAt: new Date().toISOString(),
        attempts: 0,
        deviceFingerprint: req.headers['x-device-fingerprint'] || ''
      };

      try {
        await RedisClient.set(challengeHex, JSON.stringify(redisData), {
          EX: 900 // 15 minutes expiration
        });
      } catch (err) {
        logger.error(`Redis error: ${err.message}`);
        throw new Error('Temporary system error');
      }

      // Send verification email
      try {
        await sendVerificationEmail(cleanEmail, verificationCode);
        logger.info(`Password reset code sent to ${cleanEmail}`);
      } catch (err) {
        await RedisClient.del(challengeHex);
        logger.error(`Email sending failed: ${err.message}`);
        throw new Error('Failed to send reset email');
      }

      // Log the reset request
      await AuditLog.logAsync({
        event: 'PASSWORD_RESET_REQUESTED',
        action: 'reset_request',
        userId: user._id,
        user: null,
        source: 'web',
        userEmail: cleanEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          riskScore: calculateRiskScore(req),
          headers: {
              'user-agent': req.get('User-Agent'),
              'accept-language': req.get('Accept-Language')
          }
        }
      });

      // Prepare response
      const response = {
        message: "If this email exists, a reset link has been sent",
        cooldown: 300,
        challenge: challengeHex,
        security: {
          token_expiry: 900,
          max_attempts: 3
        }
      };

      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);

    } catch (error) {
      logger.error(`Password reset request error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('CSRF') ? 403 :
                       error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Email') ? 400 :
                       error.message.includes('Too many') ? 429 :
                       error.message.includes('Account not verified') ? 403 :
                       error.message.includes('Temporary system') ? 503 :
                       error.message.includes('Failed to send') ? 500 : 400;
      
      res.status(statusCode).json({ error: error.message });
    }
  }

  async verifyResetCode(req, res) {
    try {
      logger.info(`Password reset verification request from IP: ${req.ip}`);
  
      // Content type validation
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }
  
      const { error, value } = verifyCodeSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
  
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
  
      const { challenge, code } = req.body;
  
      // Input validation
      if (!challenge || !code) {
        throw new Error('Challenge and code are required');
      }
  
      // Rate limiting by IP
      const ipAttemptKey = `pwd_verify:${req.ip}`;
      const ipAttemptCount = await RedisClient.incr(ipAttemptKey);
      if (ipAttemptCount > 50) {
        await RedisClient.expire(ipAttemptKey, 3600); // 1 hour lockout
        throw new Error('Too many verification attempts. Please try again later.');
      }
      await RedisClient.expire(ipAttemptKey, 300); // 5 minute window
  
      // Get reset data from Redis
      const resetDataStr = await RedisClient.get(challenge);
      if (!resetDataStr) {
        throw new Error('Invalid or expired challenge');
      }
  
      const resetData = JSON.parse(resetDataStr);
  
      // Check attempts
      resetData.attempts = (resetData.attempts || 0) + 1;
      if (resetData.attempts > 3) {
        await RedisClient.del(challenge);
        throw new Error('Maximum attempts reached. Please request a new reset link.');
      }
  
      // Update attempts in Redis
      await RedisClient.set(challenge, JSON.stringify(resetData), {
        EX: 900 // Reset expiration to maintain 15 minute window
      });
  
      // Verify the code
      if (resetData.code !== code.trim()) {
        throw new Error('Invalid verification code');
      }
  
      // Find the user
      const user = await User.findUser(
        { id: resetData.userId },
        {
            password: 1,
            accountVerified: 1,
            mfaEnabled: 1,
            username: 1
        }
      );

      if (!user || user.status !== 'active') {
        await RedisClient.del(challenge);
        throw new Error('User not found or account not active');
      }
  
      // Generate a one-time token for password change
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = Date.now() + 900000; // 15 minutes
  
      // Store the token in Redis
      await RedisClient.set(`pwd_token:${resetToken}`, JSON.stringify({
        userId: user._id.toString(),
        challenge,
        expiresAt: tokenExpiry
      }), {
        EX: 900 // 15 minutes expiration
      });
  
      // Log the successful verification
      await AuditLog.create({
        event: 'PASSWORD_RESET_VERIFIED',
        action: 'reset_verify',
        userId: user._id,
        user: null,
        source: 'web',
        userEmail: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          riskScore: calculateRiskScore(req),
          headers: {
            'user-agent': req.get('User-Agent'),
            'accept-language': req.get('Accept-Language')
          }
        }
      });
  
      // Prepare response
      const response = {
        message: "Verification successful",
        resetToken,
        security: {
          token_expiry: 900,
          single_use: true
        }
      };
  
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json(response);
  
    } catch (error) {
      logger.error(`Password reset verification error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('CSRF') ? 403 :
                       error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Challenge') ? 400 :
                       error.message.includes('Too many') ? 429 :
                       error.message.includes('Maximum attempts') ? 403 :
                       error.message.includes('Invalid verification') ? 401 :
                       error.message.includes('User not found') ? 404 : 400;
      
      res.status(statusCode).json({ error: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      logger.info(`Password reset attempt from IP: ${req.ip}`);
  
      // Content type validation
      if (!req.is('application/json')) {
        throw new Error('Content-Type must be application/json');
      }
  
      const { error, value } = newPasswordSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
  
      if (error) {
        const errorMessages = error.details.map(detail => detail.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
  
      const { newPassword, resetToken } = req.body;
  
      // Input validation
      if (!newPassword || !resetToken) {
        throw new Error('New password and reset token are required');
      }
  
      const cleanPassword = xss(newPassword).trim();
      const cleanToken = xss(resetToken).trim();
  
      // Rate limiting by IP
      const ipAttemptKey = `pwd_reset_attempt:${req.ip}`;
      const ipAttemptCount = await RedisClient.incr(ipAttemptKey);
      if (ipAttemptCount > 50) {
        await RedisClient.expire(ipAttemptKey, 3600);
        throw new Error('Too many password reset attempts. Please try again later.');
      }
      await RedisClient.expire(ipAttemptKey, 300);
  
      // Get and validate reset token
      const tokenDataStr = await RedisClient.get(`pwd_token:${cleanToken}`);
      if (!tokenDataStr) {
        throw new Error('Invalid or expired reset token');
      }
  
      const tokenData = JSON.parse(tokenDataStr);
      if (Date.now() > tokenData.expiresAt) {
        await RedisClient.del(`pwd_token:${cleanToken}`);
        throw new Error('Reset token has expired');
      }
  
      // Get the original reset data
      const resetDataStr = await RedisClient.get(tokenData.challenge);
      if (!resetDataStr) {
        await RedisClient.del(`pwd_token:${cleanToken}`);
        throw new Error('Reset session expired');
      }
  
      const resetData = JSON.parse(resetDataStr);
  
      // Verify request consistency
      if (resetData.ip !== req.ip) {
        logger.warning(`IP mismatch during reset: ${req.ip} vs ${resetData.ip}`);
        throw new Error('Security verification failed');
      }
  
      // Find user
      const user = await User.findUser(
        { id: tokenData.userId },
        {
            password: 1,
            mfaEnabled: 1,
            username: 1,
            status: 1
        }
      );
  
      if (!user || user.status !== 'active') {
        await RedisClient.del(`pwd_token:${cleanToken}`);
        throw new Error('User account not found or inactive');
      }
  
      // Use the changePassword method from User model
      const passwordChangeResult = await User.changePassword({
        userId: tokenData.userId,
        newPassword: cleanPassword,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
  
      // Cleanup Redis keys
      await Promise.all([
        RedisClient.del(`pwd_token:${cleanToken}`),
        RedisClient.del(tokenData.challenge),
        RedisClient.del(`login_block:${user._id}`),
        RedisClient.del(ipAttemptKey)
      ]);
  
      // Log successful reset
      await AuditLog.logAsync({
        event: 'PASSWORD_RESET_SUCCESS',
        action: 'password_reset',
        userId: user._id,
        source: 'web',
        userEmail: user.emailHash,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          riskScore: calculateRiskScore(req),
          resetMethod: 'email',
          deviceFingerprint: resetData.deviceFingerprint,
          headers: {
            'user-agent': req.get('User-Agent'),
            'accept-language': req.get('Accept-Language')
          }
        }
      });
  
      // Send security notification
      try {
        await sendPasswordChangedNotification(user.emailHash, {
          ip: req.ip,
          timestamp: new Date(),
          userAgent: req.get('User-Agent')
        });
      } catch (emailError) {
        logger.error('Password change notification failed', { error: emailError });
      }
  
      res
        .set('X-Content-Type-Options', 'nosniff')
        .set('X-Frame-Options', 'DENY')
        .status(200)
        .json({ 
          message: 'Password successfully updated',
          security: {
            sessionsInvalidated: true,
            changeTimestamp: passwordChangeResult.changedAt.toISOString()
          }
        });
  
    } catch (error) {
      logger.error(`Password reset error: ${error.message}`, { stack: error.stack });
      
      const statusCode = error.message.includes('Content-Type') ? 415 :
                       error.message.includes('Validation error') ? 400 :
                       error.message.includes('required') ? 400 :
                       error.message.includes('Too many') ? 429 :
                       error.message.includes('Invalid or expired') ? 401 :
                       error.message.includes('Security verification') ? 403 :
                       error.message.includes('User account not found') ? 404 :
                       error.message.includes('Password must contain') ? 400 :
                       error.message.includes('New password must be different') ? 400 : 500;
      
      res.status(statusCode).json({ 
        error: error.message,
        ...(statusCode === 401 && { canRetry: false }),
        ...(statusCode === 429 && { retryAfter: 3600 })
      });
    }
  }


  //You must configure yoursefl oath section
  async oAuthRedirect(req, res, next) {
    try {
      const { provider } = req.params;
      const { state, redirect_uri } = req.query;
      
      // Validate provider
      if (!['github', 'facebook'].includes(provider)) {
        throw new Error('Unsupported OAuth provider');
      }

      // Validate redirect URI if provided
      if (redirect_uri && !isValidRedirectUri(redirect_uri)) {
        throw new Error('Invalid redirect URI');
      }

      // Create or use existing state token
      const stateToken = state || createChallenge({ size: 32 });
      
      // Store state in Redis with expiration
      await RedisClient.set(`oauth:state:${stateToken}`, JSON.stringify({
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        provider,
        originalUrl: req.originalUrl,
        redirectUri: redirect_uri || null,
      }), { EX: 300 }); // 5 minute expiration
      
      // Initiate authentication with the provider
      passport.authenticate(provider, {
        scope: provider === 'github' ? ['user:email'] : ['email'],
        state: stateToken,
        session: false
      })(req, res, next);
    } catch (error) {
      logger.error('OAuth redirect error:', error);
      res.status(500).json({ 
        error: 'OAuth initialization failed',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  async oAuthCallback(req, res, next) {
    const { provider } = req.params;
    
    passport.authenticate(provider, { session: false }, async (err, userData, info) => {
      try {
        // Error handling
        if (err) {
          logger.error(`${provider} OAuth error:`, err);
          throw err;
        }
        
        if (!userData) {
          throw new Error(`Failed to authenticate with ${provider}`);
        }
        
        // Validate state parameter
        if (!req.query.state) {
          throw new Error('Missing state parameter');
        }
        
        // Verify state token
        const stateData = await RedisClient.get(`oauth:state:${req.query.state}`);
        if (!stateData) {
          throw new Error('Invalid or expired state token');
        }
        await RedisClient.del(`oauth:state:${req.query.state}`);
        
        // Normalize and hash email
        const normalizedEmail = validator.normalizeEmail(userData.email).toLowerCase().trim();
        const emailHash = await createSecureHash(normalizedEmail);
        
        // Check for existing user
        const existingUser = await User.findUser({ emailHash });
        
        if (existingUser) {
          // Update existing user's auth info
          const updateData = {
            [`auth.${provider}.lastUsed`]: new Date()
          };
          
          if (!existingUser.auth || !existingUser.auth[provider]) {
            updateData[`auth.${provider}`] = {
              id: userData.providerId,
              profile: userData.profile,
              lastUsed: new Date()
            };
          }
          
          await User.updateUser(existingUser._id, updateData);
          
          // Generate tokens
          const accessToken = createAccessToken({
            _id: existingUser._id,
            role: existingUser.roles[0] || existingUser.role
          });
          
          const refreshToken = createRefreshToken({
            _id: existingUser._id
          });
          
          // Log successful login
          await AuditLog.logAsync({
            event: 'LOGIN_SUCCESS',
            action: 'login',
            source: 'oauth',
            status: 'success',
            user: existingUser._id,
            userEmail: normalizedEmail,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              registrationMethod: provider,
              providerId: userData.providerId,
              deviceFingerprint: req.headers['x-device-fingerprint'] || '',
              riskScore: calculateRiskScore(req)
            }
          });
          
          // Return success response
          return res.status(200).json({
            message: "Login successful",
            user: {
              id: existingUser._id,
              name: existingUser.username,
              email: normalizedEmail,
              role: existingUser.roles[0] || existingUser.role,
              mfaEnabled: existingUser.mfaEnabled
            },
            tokens: {
              accessToken,
              refreshToken
            }
          });
        } else {
          // Create new user
          const username = userData.name 
            ? `${userData.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}${Math.floor(1000 + Math.random() * 9000)}`
            : `user${Math.floor(1000000 + Math.random() * 9000000)}`;
          
          const newUserData = {
            username,
            encryptedData: {
              email: await encrypt(normalizedEmail),
              firstName: await encrypt(userData.name?.split(' ')[0] || 'User'),
              lastName: await encrypt(userData.name?.split(' ').slice(1).join(' ') || 'Account')
            },
            emailHash,
            status: 'active',
            roles: ['customer'],
            auth: {
              [provider]: {
                id: userData.providerId,
                profile: userData.profile,
                lastUsed: new Date()
              }
            },
            preferences: {
              language: req.acceptsLanguages(['en', 'es', 'fr', 'de']) || 'en',
              theme: 'system'
            }
          };
          
          const newUser = await User.register(newUserData);
          
          // Generate tokens for new user
          const accessToken = createAccessToken({
            _id: newUser._id,
            role: newUser.roles[0] || newUser.role
          });
          
          const refreshToken = createRefreshToken({
            _id: newUser._id
          });
          
          // Log successful registration
          await AuditLog.logAsync({
            event: 'REGISTRATION_COMPLETED',
            action: 'register',
            source: 'oauth',
            status: 'success',
            user: newUser._id,
            userEmail: normalizedEmail,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
              registrationMethod: provider,
              providerId: userData.providerId,
              deviceFingerprint: req.headers['x-device-fingerprint'] || '',
              riskScore: calculateRiskScore(req)
            }
          });
          
          // Return success response
          return res.status(200).json({
            message: "Registration successful",
            user: {
              id: newUser._id,
              name: newUser.username,
              email: normalizedEmail,
              role: newUser.roles[0] || newUser.role,
              mfaEnabled: false
            },
            tokens: {
              accessToken,
              refreshToken
            }
          });
        }
      } catch (error) {
        logger.error(`${provider} OAuth callback error:`, error);
        return res.status(500).json({ 
          error: error.message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
      }
    })(req, res, next);
  }

}

module.exports = new AuthController();