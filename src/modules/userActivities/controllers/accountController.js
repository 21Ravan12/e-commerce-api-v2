const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuditLog = require('../../../models/AuditLog');
const { encrypt, decrypt, createSecureHash } = require('../../../core/utilities/crypto');
const { completeUpdateSchema, updatePersonalDataSchema } = require('../schemas');
const { sendVerificationEmail, createChallenge } = require('../../../services/mailService');
const { calculateRiskScore } = require('../../../services/riskCalculator');
const { createAccessToken, createRefreshToken } = require('../../../core/security/jwt');
const RedisClient = require('../../../lib/redis'); // Using your RedisClient class
const speakeasy = require('speakeasy');
const logger = require('../../../services/logger');
const User = require('../../../models/User');
const { console } = require('inspector');

class AccountController {
  constructor() {
    this.redis = RedisClient; 
    this.initiateUpdatePersonalData = this.initiateUpdatePersonalData.bind(this);
    this.completeUpdatePersonalData = this.completeUpdatePersonalData.bind(this);
  }

  // ==================== USER PROFILE OPERATIONS ====================

  async getProfile(req, res) {
    try {
      const userId = req.user._id;

      const user = await User.findUser(
        { id: userId },
        {
          accountVerified: 1,
          username: 1
        }
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error) {
      logger.error(`Error fetching profile: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const { username, avatar } = req.body;

      // Validate username if provided
      if (username) {
        if (username.length < 3 || username.length > 30) {
          return res.status(400).json({ error: 'Username must be between 3-30 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return res.status(400).json({ error: 'Username can only contain letters, numbers and underscores' });
        }
      }

      // Prepare update data
      const updateData = {};
      if (username) updateData.username = username;
      if (avatar) updateData.avatar = avatar;

      // Use the updateUser static method
      const updatedUser = await User.updateUser(userId, updateData);

      // Get clean user data for response (excluding sensitive fields)
      const userResponse = {
        _id: updatedUser._id,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
        roles: updatedUser.roles,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      };

      // Create detailed audit log matching your pattern
      await AuditLog.logAsync({
        event: 'PROFILE_UPDATED',
        action: 'update',
        entityType: 'user',
        entityId: userId,
        user: userId,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          updatedFields: Object.keys(updateData),
          oldUsername: req.user.username,
          newUsername: username || req.user.username,
        },
        transactionId: req.headers['x-transaction-id'] || null
      });

      res.status(200).json({
        message: 'Profile updated successfully',
        user: userResponse
      });
    } catch (error) {
      logger.error(`Error updating profile: ${error.message}`);
      
      // Create audit log for the failed attempt
      try {
        await AuditLog.logAsync({
          event: 'PROFILE_UPDATE_FAILED',
          action: 'update',
          entityType: 'user',
          entityId: req.user._id,
          user: req.user._id,
          source: req.headers['x-source'] || 'web',
          ip: req.ip,
          userAgent: req.get('User-Agent') || '',
          metadata: {
            error: error.message,
            attemptedUpdates: req.body
          },
          transactionId: req.headers['x-transaction-id'] || null
        });
      } catch (auditError) {
        logger.error(`Failed to create audit log for profile update failure: ${auditError.message}`);
      }

      res.status(500).json({ 
        error: 'Failed to update profile',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  // ==================== ENCRYPTED PERSONAL DATA OPERATIONS ====================

  async getPersonalData(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findUser(
        { id: userId },
        {
          accountVerified: 1,
          encryptedData: 1,
          username: 1
        }
      );
  
      if (!user || !user.encryptedData) {
        await AuditLog.logAsync({
          event: 'PERSONAL_DATA_ACCESS_FAILED',
          action: 'read',
          entityType: 'user',
          entityId: userId,
          user: userId,
          source: req.headers['x-source'] || 'web',
          ip: req.ip,
          userAgent: req.get('User-Agent') || '',
          metadata: { error: user ? 'Encrypted data not found' : 'User not found' },
          status: 'failure', // Use whatever your schema expects
          transactionId: req.headers['x-transaction-id'] || null
        });
        return res.status(404).json({ 
          error: user ? 'No personal data found' : 'User not found' 
        });
      }
  
      const encryptedData = user.encryptedData;
      logger.info('Encrypted data accessed', { 
        fields: Object.keys(encryptedData).filter(k => encryptedData[k] !== null) 
      });
  
      let decryptedData;
      try {
        decryptedData = {
          email: (await decrypt(encryptedData.email)).slice(1,-1),
          firstName: (await decrypt(encryptedData.firstName)).slice(1,-1),
          lastName: (await decrypt(encryptedData.lastName)).slice(1,-1),
          phone: (await decrypt(encryptedData.phone)).slice(1,-1),
          dateOfBirth: (await decrypt(encryptedData.dateOfBirth)).slice(1,-1)
        }

      } catch (decryptError) {
        logger.error('Decryption failed', { error: decryptError.message });
        throw new Error('Failed to decrypt personal data');
      }
  
      await AuditLog.logAsync({
        event: 'PERSONAL_DATA_ACCESSED',
        action: 'read',
        entityType: 'user',
        entityId: userId,
        user: userId,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          fieldsAccessed: Object.keys(encryptedData).filter(k => encryptedData[k] !== null)
        },
        status: 'success', // Use whatever your schema expects
        transactionId: req.headers['x-transaction-id'] || null
      });
  
      res.status(200).json({
        message: 'Personal data retrieved successfully',
        decryptedData: decryptedData
      });
    } catch (error) {
      logger.error(`Error fetching personal data: ${error.message}`);
      
      await AuditLog.logAsync({
        event: 'PERSONAL_DATA_ACCESS_FAILED',
        action: 'read',
        entityType: 'user',
        entityId: req.user._id,
        user: req.user._id,
        source: req.headers['x-source'] || 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || '',
        metadata: {
          error: error.message,
          attemptedAction: 'getPersonalData'
        },
        status: 'failure', // Use whatever your schema expects
        transactionId: req.headers['x-transaction-id'] || null
      });
  
      res.status(500).json({ 
        error: 'Failed to fetch personal data',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  async initiateUpdatePersonalData(req, res) {
    try {
        logger.info(`Initiate personal data update from IP: ${req.ip}`, {
            userId: req.user?._id,
            action: 'initiateUpdatePersonalData'
        });

        // Validate input
        const { error, value } = updatePersonalDataSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            logger.warn(`Validation error in initiateUpdatePersonalData: ${errorMessages}`);
            return res.status(400).json({ 
                error: 'Validation failed',
                details: errorMessages.split(', ')
            });
        }

        const userId = req.user._id;
        const { data } = value;

        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
            logger.warn('Invalid data format in initiateUpdatePersonalData');
            return res.status(400).json({ 
                error: 'Invalid data format',
                code: 'INVALID_DATA_FORMAT'
            });
        }

        // Rate limiting by user ID
        const updateAttemptKey = `update_attempt:${userId}`;
        const attemptCount = await RedisClient.incr(updateAttemptKey);
        await RedisClient.expire(updateAttemptKey, 300); // 5 minute window

        if (attemptCount > 10) {
            logger.warn(`Rate limit exceeded for user ${userId} in initiateUpdatePersonalData`);
            await RedisClient.expire(updateAttemptKey, 3600); // 1 hour lockout
            return res.status(429).json({ 
                error: 'Too many update attempts',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 3600
            });
        }

        // Prepare update data for sensitive fields
        const updatePayload = {};
        const sensitiveFields = ['email', 'phone'];

        // Check if any sensitive fields are being updated
        const isSensitiveUpdate = Object.keys(data).some(field => 
            sensitiveFields.includes(field)
        );

        if (!isSensitiveUpdate) {
            logger.info(`Non-sensitive update for user ${userId}, proceeding directly`);
            const updatedUser = await User.updateSensitiveUser(userId, data);
            return res.status(200).json({
                message: 'User data updated successfully',
                user: updatedUser
            });
        }

        // Prepare encrypted data for sensitive fields
        if (data.email) {
            updatePayload.email = await encrypt(data.email);
            updatePayload.emailHash = await createSecureHash(data.email);
        }
        
        if (data.phone) {
            updatePayload.phone = await encrypt(data.phone);
            updatePayload.phoneHash = await createSecureHash(data.phone);
        }

        // Generate verification code and challenge for sensitive updates
        const verificationCode = createChallenge({ size: 16 }); // Verification code
        const challenge = createChallenge(); // Default 32-byte hex challenge

        // Get current email for verification
        const user = await User.findUser(
          { id: userId },
          {
            accountVerified: 1,
            encryptedData: 1,
            username: 1
          }
        );
        
        if (!user) {
            logger.error(`User not found during 2FA initiation: ${userId}`);
            return res.status(404).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const currentEmail = await decrypt(user.encryptedData.email);
        
        // Prepare Redis payload
        const redisPayload = {
            userId,
            data: updatePayload, // Contains only the encrypted sensitive data
            code: verificationCode,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            createdAt: new Date().toISOString(),
            attempts: 0
        };

        // Store in Redis with TTL
        await RedisClient.set(`update_2fa:${challenge}`, JSON.stringify(redisPayload), {
            EX: 900 // 15 minutes expiration
        });

        // Send verification email
        try {
            await sendVerificationEmail(currentEmail, verificationCode);
            logger.info(`2FA code sent to user ${userId} (${currentEmail})`);
        } catch (emailError) {
            await RedisClient.del(`update_2fa:${challenge}`);
            logger.error(`Email sending failed for user ${userId}: ${emailError.message}`);
            return res.status(500).json({ 
                error: 'Failed to send verification code',
                code: 'EMAIL_SEND_FAILURE'
            });
        }

        // Create audit log
        await AuditLog.logAsync({
            event: 'PERSONAL_DATA_UPDATE_INITIATED',
            user: userId,
            action: 'initiate',
            source: 'api',
            status: 'pending',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                requestedFields: Object.keys(data),
                isSensitiveUpdate,
                challengeToken: challenge
            }
        });

        return res.status(202).json({
            message: 'Two-factor authentication required',
            challenge,
            required: true,
            method: 'email',
            expiresIn: 900,
            code: '2FA_REQUIRED'
        });

    } catch (error) {
        logger.error(`Error in initiateUpdatePersonalData: ${error.message}`, {
            stack: error.stack,
            userId: req.user?._id
        });

        const statusCode = error.message.includes('Too many') ? 429 :
                         error.message.includes('Validation') ? 400 :
                         error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({ 
            error: error.message,
            code: error.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
  
  }

  async completeUpdatePersonalData(req, res) {
    try {
        logger.info(`Complete personal data update from IP: ${req.ip}`, {
            userId: req.user?._id,
            action: 'completeUpdatePersonalData'
        });

        const { error, value } = completeUpdateSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: false
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            logger.warn(`Validation error in completeUpdatePersonalData: ${errorMessages}`);
            
            // Audit log for validation failure
            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: req.user?._id,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: 'Validation failed',
                    details: errorMessages.split(', '),
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });
            
            return res.status(400).json({ 
                error: 'Validation failed',
                details: errorMessages.split(', ')
            });
        }

        const userId = req.user._id;
        const { challenge, verificationCode } = value;

        // Validate challenge token
        if (!challenge) {
            logger.warn('Missing challenge token in completeUpdatePersonalData');
            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: userId,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: 'Security challenge required',
                    code: 'CHALLENGE_REQUIRED',
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });
            return res.status(400).json({ 
                error: 'Security challenge required',
                code: 'CHALLENGE_REQUIRED'
            });
        }

        // Retrieve verification data from Redis
        const redisData = await RedisClient.get(`update_2fa:${challenge}`);
        if (!redisData) {
            logger.warn(`Invalid/expired challenge token: ${challenge}`);
            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: userId,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: 'Invalid or expired challenge',
                    code: 'INVALID_CHALLENGE',
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });
            return res.status(400).json({ 
                error: 'Invalid or expired challenge',
                code: 'INVALID_CHALLENGE'
            });
        }

        const { 
            userId: storedUserId, 
            data, 
            code, 
            attempts,
            ip: originalIp,
            userAgent: originalUserAgent
        } = JSON.parse(redisData);

        // Security validations
        if (userId !== storedUserId) {
            logger.error(`User ID mismatch in challenge: ${userId} vs ${storedUserId}`);
            await RedisClient.del(`update_2fa:${challenge}`);
            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: userId,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent')?.slice(0, 200) || '',
                metadata: {
                    error: 'User ID mismatch',
                    code: 'USER_MISMATCH',
                    storedUserId,
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });
            return res.status(400).json({ 
                error: 'Verification failed',
                code: 'USER_MISMATCH'
            });
        }

        // Verify IP and User Agent haven't changed significantly
        const currentIp = req.ip;
        const currentUserAgent = req.get('User-Agent') || '';
        
        if (!this.isSimilarRequest(originalIp, currentIp, originalUserAgent, currentUserAgent)) {
            logger.warn(`Request context changed for challenge ${challenge}`);
            await RedisClient.del(`update_2fa:${challenge}`);
            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: userId,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: currentUserAgent.slice(0, 200),
                metadata: {
                    error: 'Security context changed',
                    code: 'CONTEXT_CHANGED',
                    originalIp,
                    currentIp,
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });
            return res.status(400).json({ 
                error: 'Security context changed. Please restart the process.',
                code: 'CONTEXT_CHANGED'
            });
        }

        // Verify code
        if (verificationCode !== code) {
            const newAttempts = attempts + 1;
            await RedisClient.set(`update_2fa:${challenge}`, JSON.stringify({
                ...JSON.parse(redisData),
                attempts: newAttempts
            }));

            await AuditLog.logAsync({
                event: 'PERSONAL_DATA_UPDATE_FAILED',
                user: userId,
                action: 'update',
                source: 'api',
                status: 'failure',
                ip: req.ip,
                userAgent: currentUserAgent.slice(0, 200),
                metadata: {
                    error: 'Invalid verification code',
                    code: 'INVALID_2FA_CODE',
                    attempts: newAttempts,
                    deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                    location: req.headers['x-geo-location'] || ''
                }
            });

            if (newAttempts >= 3) {
                await RedisClient.del(`update_2fa:${challenge}`);
                logger.warn(`Too many 2FA failures for user ${userId}`);
                return res.status(403).json({ 
                    error: 'Too many failed attempts. Please restart the process.',
                    code: '2FA_MAX_ATTEMPTS'
                });
            }

            logger.warn(`Invalid verification code provided by user ${userId}`);
            return res.status(401).json({ 
                error: 'Invalid verification code',
                attempts: newAttempts,
                remainingAttempts: 3 - newAttempts,
                code: 'INVALID_2FA_CODE'
            });
        }

        // Clean up after successful verification
        await RedisClient.del(`update_2fa:${challenge}`);
        logger.info(`2FA verification successful for user ${userId}`);

        // Proceed with the actual update
        const updatedUser = await User.updateSensitiveUser(userId, data);
        const updatedFields = Object.keys(data);
        const isSensitiveUpdate = updatedFields.some(field => 
            ['email', 'phone', 'password', 'address'].includes(field)
        );

        // Create audit log
        await AuditLog.logAsync({
            event: 'PERSONAL_DATA_UPDATE_COMPLETED',
            user: userId,
            action: 'update',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: currentUserAgent.slice(0, 200),
            metadata: {
                updatedFields,
                isSensitiveUpdate,
                deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                location: req.headers['x-geo-location'] || '',
                challengeId: challenge
            }
        });

        // Success response
        return res.status(200).json({
            success: true,
            message: 'Personal data updated successfully',
            updatedFields,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error(`Error in completeUpdatePersonalData: ${error.message}`, {
            stack: error.stack,
            userId: req.user?._id
        });

        // Error audit log
        await AuditLog.logAsync({
            event: 'PERSONAL_DATA_UPDATE_FAILED',
            user: req.user?._id,
            action: 'update',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                code: error.code || 'INTERNAL_ERROR',
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                location: req.headers['x-geo-location'] || ''
            }
        });

        const statusCode = error.message.includes('Too many') ? 429 :
                         error.message.includes('Validation') ? 400 :
                         error.message.includes('not found') ? 404 : 500;

        res.status(statusCode).json({ 
            error: error.message,
            code: error.code || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }
  }

  isSimilarRequest(originalIp, currentIp, originalUserAgent, currentUserAgent) {
    // Basic check - for production you might want more sophisticated checks
    return originalIp === currentIp && 
           originalUserAgent === currentUserAgent;
  }

  // ==================== ACCOUNT STATUS OPERATIONS ====================

  async deactivateAccount(req, res) {
    try {
        const userId = req.user._id;
        const { reason } = req.body;
        
        const data = {status: 'suspended'}

        await User.updateUser(userId, data);

        // Standardized audit log
        await AuditLog.logAsync({
            event: 'ACCOUNT_DEACTIVATION',
            user: userId,
            action: 'update',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                reason,
                statusChange: 'active → suspended',
                deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                location: req.headers['x-geo-location'] || ''
            }
        });

        res.status(200).json({ message: 'Account deactivated successfully' });
    } catch (error) {
        logger.error(`Error deactivating account: ${error.message}`);
        
        // Audit log for failure case
        await AuditLog.logAsync({
            event: 'ACCOUNT_DEACTIVATION',
            user: req.user?._id,
            action: 'update',
            source: 'api',
            status: 'failed',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        res.status(500).json({ error: 'Failed to deactivate account' });
    }
  }

  async changeRole(req, res) {
    try {
        const adminId = req.user._id;
        const { newRole, reason, userId } = req.body;

        // Check ownership or admin role
        if (req.user.role !== 'admin') {
            throw new Error('Not authorized to get all orders', 403);
        }
        
        // Get current role before change for audit log
        const currentUser = await User.findById(adminId);
        const currentRole = currentUser.roles[0];
        
        const data = { role: newRole };
        await User.updateUser(userId, data);

        // Standardized audit log
        await AuditLog.logAsync({
            event: 'ROLE_CHANGE',
            user: userId,
            action: 'update',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                reason,
                roleChange: `${currentRole} → ${newRole}`,
                deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                location: req.headers['x-geo-location'] || '',
                changedBy: req.user._id // Track who initiated the role change
            }
        });

        res.status(200).json({ message: 'Role changed successfully' });
    } catch (error) {
        logger.error(`Error changing role: ${error.message}`);
        
        // Audit log for failure case
        await AuditLog.logAsync({
            event: 'ROLE_CHANGE',
            user: req.user?._id,
            action: 'update',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                requestedNewRole: req.body.newRole,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        res.status(500).json({ error: 'Failed to change role' });
    }
  }

  async deleteAccount(req, res) {
    try {
        const userId = req.user._id;
        const { reason } = req.body;

        // Use the static method
        const deletionResult = await User.deleteAccount(userId, reason, {
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            deviceFingerprint: req.headers['x-device-fingerprint'] || '',
            geoLocation: req.headers['x-geo-location'] || ''
        });

        // Standardized audit log
        await AuditLog.logAsync({
            event: 'ACCOUNT_DELETION',
            user: userId,
            action: 'delete',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: deletionResult.metadata
        });

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting account: ${error.message}`);
        
        // Audit log for failure case
        await AuditLog.logAsync({
            event: 'ACCOUNT_DELETION',
            user: req.user?._id,
            action: 'delete',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  async setupTwoFactor(req, res) {
    try {
      const userId = req.user._id;
      const { secret } = req.body;

      if (!secret) {
        return res.status(400).json({ error: 'Secret and verification code are required' });
      }

      // In a real implementation, you would verify the code against the secret
      // For this example, we'll assume verification is successful

      const data = {
        auth: {
          twoFactorSecret: secret,
          twoFactorEnabled: true
        }
      };

      await User.updateUser(userId, data);

      await AuditLog.logAsync({
        event: '2FA_ENABLED',
        user: userId,
        action: 'other',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          method: 'authenticator', // or 'sms', etc. if known
          statusChange: '2FA off → on',
          deviceFingerprint: req.headers['x-device-fingerprint'] || '',
          location: req.headers['x-geo-location'] || ''
        }
      });      

      res.status(200).json({ message: 'Two-factor authentication enabled successfully' });
    } catch (error) {
      logger.error(`Error setting up two-factor authentication: ${error.message}`);
      res.status(500).json({ error: 'Failed to setup two-factor authentication' });
    }
  }

  async disableTwoFactor(req, res) {
    try {
      const userId = req.user._id;

      const data = {
        auth: {
          twoFactorSecret: null,
          twoFactorEnabled: false
        }
      };

      await User.updateUser(userId, data);

      await AuditLog.logAsync({
        event: '2FA_DISABLED',
        user: userId,
        action: 'other',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          statusChange: '2FA on → off',
          deviceFingerprint: req.headers['x-device-fingerprint'] || '',
          location: req.headers['x-geo-location'] || ''
        }
      });
      
      res.status(200).json({ message: 'Two-factor authentication disabled successfully' });
    } catch (error) {
      logger.error(`Error disabling two-factor authentication: ${error.message}`);
      res.status(500).json({ error: 'Failed to disable two-factor authentication' });
    }
  }

  // ==================== SOCIAL ACCOUNT LINKING ====================

  async linkSocialAccount(req, res) {
    try {
      const userId = req.user._id;
      const { provider, providerId } = req.body;
  
      // Use the static method
      const result = await User.linkSocialAccount(userId, provider, providerId, {
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        deviceFingerprint: req.headers['x-device-fingerprint'] || '',
        geoLocation: req.headers['x-geo-location'] || ''
      });
  
      // Audit log
      await AuditLog.logAsync({
        event: 'SOCIAL_ACCOUNT_LINKED',
        user: userId,
        action: 'link',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          provider,
          ...result.metadata
        }
      });
  
      res.status(200).json({ message: 'Social account linked successfully' });
    } catch (error) {
      logger.error(`Error linking social account: ${error.message}`);
      
      // Audit log for failure
      await AuditLog.logAsync({
        event: 'SOCIAL_ACCOUNT_LINKED',
        user: req.user?._id,
        action: 'link',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
  
      res.status(500).json({ error: error.message || 'Failed to link social account' });
    }
  }
  
  async unlinkSocialAccount(req, res) {
    try {
      const userId = req.user._id;
      const { provider } = req.body;
  
      // Use the static method
      const result = await User.unlinkSocialAccount(userId, provider, {
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        deviceFingerprint: req.headers['x-device-fingerprint'] || '',
        geoLocation: req.headers['x-geo-location'] || ''
      });
  
      // Audit log
      await AuditLog.logAsync({
        event: 'SOCIAL_ACCOUNT_UNLINKED',
        user: userId,
        action: 'unlink',
        source: 'api',
        status: 'success',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          provider,
          ...result.metadata
        }
      });
  
      res.status(200).json({ message: 'Social account unlinked successfully' });
    } catch (error) {
      logger.error(`Error unlinking social account: ${error.message}`);
      
      // Audit log for failure
      await AuditLog.logAsync({
        event: 'SOCIAL_ACCOUNT_UNLINKED',
        user: req.user?._id,
        action: 'unlink',
        source: 'api',
        status: 'failure',
        ip: req.ip,
        userAgent: req.get('User-Agent')?.slice(0, 200) || '',
        metadata: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
  
      res.status(500).json({ error: error.message || 'Failed to unlink social account' });
    }
  }

  // ==================== PREFERENCE MANAGEMENT ====================

  async getPreferences(req, res) {
    try {
      const userId = req.user._id;
      
      const data = {
        id: userId
      };

      const user = await User.updateUser(userId, data);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Set default preferences if not set
      const preferences = {
        ...user.preferences
      };
  
      res.status(200).json(preferences);
    } catch (error) {
      logger.error(`Error getting preferences: ${error.message}`);
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  }
  
  async updatePreferences(req, res) {
    try {
        const userId = req.user._id;
        const { language, theme, notifications } = req.body;

        const preferencesUpdate = {};
        const updatedFields = [];

        // Validate and prepare language update
        if (language) {
            if (!['en', 'es', 'fr', 'de', 'tr'].includes(language)) {
                return res.status(400).json({ error: 'Invalid language preference' });
            }
            preferencesUpdate.language = language;
            updatedFields.push('language');
        }

        // Validate and prepare theme update
        if (theme) {
            if (!['light', 'dark', 'system'].includes(theme)) {
                return res.status(400).json({ error: 'Invalid theme preference' });
            }
            preferencesUpdate.theme = theme;
            updatedFields.push('theme');
        }

        // Validate and prepare notifications update
        if (notifications) {
            preferencesUpdate.notifications = preferencesUpdate.notifications || {};
            
            if (typeof notifications.email === 'boolean') {
                preferencesUpdate.notifications.email = notifications.email;
                updatedFields.push('notifications.email');
            }
            if (typeof notifications.push === 'boolean') {
                preferencesUpdate.notifications.push = notifications.push;
                updatedFields.push('notifications.push');
            }
            if (typeof notifications.sms === 'boolean') {
                preferencesUpdate.notifications.sms = notifications.sms;
                updatedFields.push('notifications.sms');
            }
        }

        if (Object.keys(preferencesUpdate).length === 0) {
            return res.status(400).json({ error: 'No valid preference fields to update' });
        }

        // Use the static updateUser method
        const updatedUser = await User.updateUser(userId, {
            preferences: preferencesUpdate
        });

        await AuditLog.logAsync({ 
            event: 'PREFERENCES_UPDATE',
            user: userId,
            action: 'update',
            source: 'api',
            status: 'success',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: { 
                fields: updatedFields,
                deviceFingerprint: req.headers['x-device-fingerprint'] || '',
                location: req.headers['x-geo-location'] || ''
            }
        });      

        res.status(200).json({
            message: 'Preferences updated successfully',
            preferences: updatedUser.preferences
        });
    } catch (error) {
        logger.error(`Error updating preferences: ${error.message}`);
        
        // Audit log for failure
        await AuditLog.logAsync({
            event: 'PREFERENCES_UPDATE',
            user: req.user?._id,
            action: 'update',
            source: 'api',
            status: 'failure',
            ip: req.ip,
            userAgent: req.get('User-Agent')?.slice(0, 200) || '',
            metadata: {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });

        res.status(500).json({ error: error.message || 'Failed to update preferences' });
    }
  }

  // ==================== MFA ====================

  async enableMfa(req, res) {
    try {
      const userId = req.user._id;
      const user = await User.findUser(
        { id: userId }, 
        { 
          'encryptedData.email': 1,
          roles: 1,
          status: 1,
          username: 1
        }
      );
        
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      if (user.auth.mfa.enabled) {
        return res.status(400).json({ error: "MFA already enabled" });
      }
  
      // Generate MFA secret
      const mfaSecret = speakeasy.generateSecret({
        length: 32,
        name: `Medicare:${await decrypt(user.encryptedData.email)}`,
        issuer: "Medicare"
      });
  
      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
  
      // Store encrypted data
      user.auth.mfa = {
        enabled: true,
        enabledAt: new Date(),
        secret: await encrypt(mfaSecret.base32),
        backupCodes: await Promise.all(backupCodes.map(async code => ({
          code: await bcrypt.hash(code, 10),
          used: false
        }))),
        devices: [{
          id: crypto.randomUUID(),
          name: 'Primary Device',
          ip: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          lastUsed: new Date(),
          trusted: true,
          createdAt: new Date()
        }],
        methods: ['authenticator'],
        recoveryOptions: {
          email: true,
          backupCodes: true,
          sms: false
        }
      };
  
      await User.updateSensitiveUser(userId, {
        auth: {
          mfa: user.auth.mfa
        }
      });
  
      // Generate QR code URL
      const qrUrl = speakeasy.otpauthURL({
        secret: mfaSecret.base32,
        label: `Medicare:${await decrypt(user.encryptedData.email)}`,
        issuer: "Medicare",
        encoding: 'base32'
      });
  
      // Create audit log
      await AuditLog.logAsync({
        event: 'MFA_ENABLED',
        action: 'enable_mfa', // Fixed enum value
        userId: user._id,
        source: 'web',
        userEmail: await decrypt(user.encryptedData.email),
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown', // Ensure userAgent is never undefined
        metadata: {
          riskScore: calculateRiskScore(req),
          mfaMethod: 'authenticator'
        }
      });
  
      // Return response
      const response = {
        message: "MFA enabled successfully",
        qrUrl,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        backupCodesExpireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
  
      if (process.env.NODE_ENV === 'development') {
        response.secret = mfaSecret.base32;
        response.backupCodes = backupCodes;
      }
  
      return res.status(200).json(response);
  
    } catch (error) {
      logger.error(`MFA enable error: ${error.message}`, { 
        stack: error.stack,
        userId: req.user?._id,
        ip: req.ip 
      });
      
      // Create error audit log with proper enum value
      await AuditLog.logAsync({
        event: 'MFA_ENABLE_FAILED',
        action: 'mfa_failure', // Fixed enum value
        userId: req.user?._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        error: error.message,
        metadata: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
  
      return res.status(500).json({ 
        error: "Failed to enable MFA",
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  async disableMfa(req, res) {
    try {
      const userId = req.user._id;
      const { verificationCode } = req.body;
  
      // Early validation
      if (!verificationCode || typeof verificationCode !== 'string') {
        return res.status(400).json({ error: "Valid verification code required" });
      }

      const user = await User.findUser(
        { id: userId }, 
        { 
          'encryptedData.email': 1,
          roles: 1,
          status: 1,
          username: 1
        }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      if (!user.auth.mfa.enabled) {
        return res.status(400).json({ error: "MFA not enabled" });
      }

      let isValidCode = false;
      const isPotentialBackupCode = verificationCode.length !== 6; // TOTP codes are typically 6 digits

      // Check backup codes first if the code doesn't look like a TOTP
      if (isPotentialBackupCode && user.auth.mfa.backupCodes?.length > 0) {
        for (const backupCode of user.auth.mfa.backupCodes) {
          if (!backupCode.used && backupCode.code) {
            try {
              const isMatch = await bcrypt.compare(verificationCode, backupCode.code);
              if (isMatch) {
                isValidCode = true;
                break;
              }
            } catch (bcryptError) {
              logger.warn(`Backup code comparison error: ${bcryptError.message}`, {
                userId: user._id,
                codeLength: verificationCode.length
              });
            }
          }
        }
      }

      // If not a valid backup code, check TOTP
      if (!isValidCode) {
        try {
          if (!user.auth.mfa.secret) {
            throw new Error("MFA secret not found");
          }

          const decryptedSecret = await decrypt(user.auth.mfa.secret);
          const verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: verificationCode,
            window: 1
          });
          
          isValidCode = verified;
        } catch (totpError) {
          logger.error(`TOTP verification error: ${totpError.message}`, {
            userId: user._id,
            stack: totpError.stack
          });
        }
      }

      if (!isValidCode) {
        await AuditLog.logAsync({
          event: 'MFA_DISABLE_FAILED',
          action: 'mfa_failure',
          userId: user._id,
          source: 'web',
          ip: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          metadata: {
            attemptCode: verificationCode.slice(0, 2) + '...' + verificationCode.slice(-2),
            reason: 'Invalid code',
            riskScore: calculateRiskScore(req),
            codeType: isPotentialBackupCode ? 'backup' : 'totp'
          }
        });
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Clear MFA data
      user.auth.mfa = {
        enabled: false,
        disabledAt: new Date(),
        secret: null,
        backupCodes: [],
        devices: [],
        methods: [],
        recoveryOptions: {
          email: false,
          backupCodes: false,
          sms: false
        }
      };

      await User.updateSensitiveUser(userId, {
        auth: {
          mfa: user.auth.mfa
        }
      });

      // Create audit log
      await AuditLog.logAsync({
        event: 'MFA_DISABLED',
        action: 'disable_mfa',
        userId: user._id,
        source: 'web',
        userEmail: await decrypt(user.encryptedData.email),
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        metadata: {
          method: isValidCode ? (isPotentialBackupCode ? 'backup_code' : 'totp') : 'unknown',
          riskScore: calculateRiskScore(req)
        }
      });

      return res.status(200).json({ 
        message: "MFA disabled successfully",
        disabledAt: user.auth.mfa.disabledAt
      });

    } catch (error) {
      logger.error(`MFA disable error: ${error.message}`, { 
        stack: error.stack,
        userId: req.user?._id,
        ip: req.ip 
      });

      await AuditLog.logAsync({
        event: 'MFA_DISABLE_FAILED',
        action: 'mfa_failure',
        userId: req.user?._id,
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        error: error.message,
        metadata: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          verificationCodePresent: !!req.body.verificationCode
        }
      });

      return res.status(500).json({ 
        error: "Failed to disable MFA",
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }

  async verifyMfa(req, res) {
    try {
      const userId = req.user._id;
      const { code, deviceId, deviceName } = req.body;
  
      // Input validation
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Valid MFA code required" });
      }
  
      // Rate limiting
      const rateLimitKey = `mfa_attempts:${userId}`;
      const attempts = await RedisClient.incr(rateLimitKey);
      if (attempts > 5) {
        await RedisClient.expire(rateLimitKey, 3600); // 1 hour lockout
        await AuditLog.logAsync({
          event: 'MFA_RATE_LIMIT',
          userId,
          action: 'mfa_failure',
          ip: req.ip,
          metadata: {
            attempts,
            device: req.get('User-Agent'),
            riskScore: calculateRiskScore(req)
          }
        });
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      }
      await RedisClient.expire(rateLimitKey, 300); // 5 minute window
  
      const user = await User.findUser(
        { id: userId }, 
        { 
          'encryptedData.email': 1,
          roles: 1,
          status: 1,
          username: 1
        }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      if (!user.auth.mfa.enabled) {
        return res.status(400).json({ error: "MFA not enabled" });
      }

      // Initialize devices array if it doesn't exist
      if (!user.auth.mfa.devices) {
        user.auth.mfa.devices = [];
      }
  
      // Check backup codes first if the code doesn't look like a TOTP
      let isBackupCode = false;
      const isPotentialBackupCode = code.length !== 6; // TOTP codes are typically 6 digits
      
      if (isPotentialBackupCode && user.auth.mfa.backupCodes?.length > 0) {
        for (let i = 0; i < user.auth.mfa.backupCodes.length; i++) {
          const backupCode = user.auth.mfa.backupCodes[i];
          if (!backupCode.used && backupCode.code) {
            try {
              if (await bcrypt.compare(code, backupCode.code)) {
                user.auth.mfa.backupCodes[i].used = true;
                isBackupCode = true;
                break;
              }
            } catch (bcryptError) {
              logger.warn(`Backup code comparison error: ${bcryptError.message}`, {
                userId,
                codeLength: code.length
              });
            }
          }
        }
      }
  
      let verified = isBackupCode;
      
      // If not a backup code, verify as TOTP
      if (!verified) {
        try {
          if (!user.auth.mfa.secret) {
            throw new Error("MFA secret not found");
          }
  
          const decryptedSecret = await decrypt(user.auth.mfa.secret);
          verified = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: code,
            window: 1
          });
        } catch (totpError) {
          logger.error(`TOTP verification error: ${totpError.message}`, {
            userId,
            stack: totpError.stack
          });
        }
      }
  
      if (!verified) {
        await AuditLog.logAsync({
          event: 'MFA_FAILED',
          userId,
          action: 'mfa_failure',
          source: 'web',
          ip: req.ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          metadata: {
            attemptCode: code.slice(0, 2) + '...' + code.slice(-2),
            reason: 'Invalid code',
            remainingAttempts: 5 - attempts,
            riskScore: calculateRiskScore(req),
            codeType: isPotentialBackupCode ? 'backup' : 'totp'
          }
        });
        return res.status(400).json({ 
          error: "Invalid MFA code",
          remainingAttempts: 5 - attempts
        });
      }
  
      // Update device information
      if (deviceId) {
        const existingDevice = user.auth.mfa.devices.find(d => d.id === deviceId);
        if (existingDevice) {
          existingDevice.lastUsed = new Date();
          existingDevice.ip = req.ip;
          existingDevice.userAgent = req.get('User-Agent');
        }
      } else if (deviceName) {
        user.auth.mfa.devices.push({
          id: crypto.randomUUID(),
          name: deviceName,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          lastUsed: new Date(),
          trusted: false,
          createdAt: new Date()
        });
      }
  
      await User.updateSensitiveUser(userId, {
        auth: {
          mfa: {
            devices: user.auth.mfa.devices,
            backupCodes: user.auth.mfa.backupCodes
          }
        }
      });      
      
      await RedisClient.del(rateLimitKey); // Clear rate limit on success
  
      // Create tokens
      const accessToken = createAccessToken({
        _id: user._id,
        role: user.roles[0],
        authLevel: 'full',
        mfaVerified: true
      });
  
      const refreshToken = createRefreshToken({
        _id: user._id
      });
  
      await AuditLog.logAsync({
        event: 'MFA_SUCCESS',
        userId: user._id,
        action: 'mfa_success',
        source: 'web',
        ip: req.ip,
        userAgent: req.get('User-Agent') || 'Unknown',
        metadata: {
          method: isBackupCode ? 'backup_code' : 'totp',
          deviceId: deviceId || user.auth.mfa.devices.slice(-1)[0]?.id,
          riskScore: calculateRiskScore(req),
          newDevice: !deviceId
        }
      });
  
      return res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000 // 15 minutes
        })
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
        .status(200)
        .json({ 
          message: "MFA verification successful",
          backupCodesRemaining: user.auth.mfa.backupCodes.filter(c => !c.used).length,
          trustedDevice: deviceId ? user.auth.mfa.devices.find(d => d.id === deviceId)?.trusted : false
        });
  
    } catch (error) {
      logger.error(`MFA verification error: ${error.message}`, { 
        stack: error.stack,
        userId: req.user?._id,
        ip: req.ip 
      });
      
      await AuditLog.logAsync({
        event: 'MFA_VERIFICATION_ERROR',
        userId: req.user?._id,
        ip: req.ip,
        source: 'web',
        action: 'mfa_failure',
        userAgent: req.get('User-Agent') || 'Unknown',
        error: error.message,
        metadata: {
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          codePresent: !!req.body.code,
          riskScore: calculateRiskScore(req)
        }
      });
      
      return res.status(500).json({ 
        error: "Internal server error",
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  }
}

module.exports = new AccountController();