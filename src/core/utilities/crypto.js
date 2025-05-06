const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const logger = require('../../services/logger'); // Adjust the path as necessary
const bcrypt = require('bcryptjs');

// Configuration from environment variables with fallbacks
const ALGORITHM = process.env.CRYPTO_ALGORITHM || 'aes-256-gcm';
const IV_LENGTH = parseInt(process.env.CRYPTO_IV_LENGTH) || 16;
const SALT_LENGTH = parseInt(process.env.CRYPTO_SALT_LENGTH) || 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Mandatory, no fallback

if (!ENCRYPTION_KEY) {
  logger.error('ENCRYPTION_KEY environment variable is required');
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

/**
 * Creates a consistent, non-reversible hash for PII data
 * @param {string} data - The sensitive data to hash (email/phone)
 * @returns {string} - Returns hash in consistent format
 * @throws {Error} - If input is invalid or pepper is not configured
*/

// Helper function to validate encryption key
const validateKey = (key) => {
  if (!key || typeof key !== 'string') {
    logger.error('Invalid encryption key');
    throw new Error('Invalid encryption key');
  }
  return key;
};

// AES-256 Encryption
const encrypt = async (text, password = ENCRYPTION_KEY) => { 
  try {
    // Validate inputs
    if (text === undefined || text === null) {
      logger.error('Text to encrypt cannot be empty');
      throw new Error('Text to encrypt cannot be empty');
    }

    if (typeof text !== 'string') {
      logger.debug('Non-string data provided for encryption, converting to JSON string');
      text = JSON.stringify(text); // Handle non-string data
    }

    const validatedPassword = validateKey(password);

    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive key using scrypt
    logger.debug('Deriving encryption key using scrypt');
    const key = await scrypt(validatedPassword, salt, 32);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    logger.debug('Starting encryption process');
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (important for GCM mode)
    const authTag = cipher.getAuthTag();
    
    logger.info('Encryption completed successfully');
    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      content: encrypted,
      authTag: authTag.toString('hex'),
      algorithm: ALGORITHM
    };
  } catch (error) {
    logger.error(`Encryption failed: ${error.message}`, { error });
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

// Decryption
const decrypt = async (encryptedData, password = ENCRYPTION_KEY) => {
  try {
    logger.debug('Starting decryption process');

    // Validate inputs
    if (!encryptedData || typeof encryptedData !== 'object') {
      logger.error('Invalid encrypted data format - expected object');
      throw new Error('Invalid encrypted data format - expected object');
    }

    // Check required fields
    const requiredFields = ['salt', 'iv', 'content', 'authTag', 'algorithm'];
    for (const field of requiredFields) {
      if (!encryptedData[field]) {
        logger.error(`Missing required field in encrypted data: ${field}`);
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Verify algorithm matches
    if (encryptedData.algorithm !== ALGORITHM) {
      logger.error(`Algorithm mismatch. Expected ${ALGORITHM}, got ${encryptedData.algorithm}`);
      throw new Error(`Algorithm mismatch. Expected ${ALGORITHM}, got ${encryptedData.algorithm}`);
    }

    const validatedPassword = validateKey(password);

    // Convert hex strings to buffers
    logger.debug('Converting hex strings to buffers');
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    // Derive the same key using scrypt
    logger.debug('Deriving decryption key using scrypt');
    const key = await scrypt(validatedPassword, salt, 32);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the content
    logger.debug('Decrypting content');
    let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse if it was an object
    try {
      const result = JSON.stringify(decrypted);
      return result;
    } catch (e) {
      return decrypted;
    }
  } catch (error) {
    logger.error(`Decryption failed: ${error.message}`, { 
      error: error.stack,
      encryptedData: encryptedData ? {
        algorithm: encryptedData.algorithm,
        salt: encryptedData.salt ? 'present' : 'missing',
        iv: encryptedData.iv ? 'present' : 'missing',
        content: encryptedData.content ? 'present' : 'missing',
        authTag: encryptedData.authTag ? 'present' : 'missing'
      } : 'No encrypted data provided'
    });
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

const createSecureHash = (data) => {
  if (!data || typeof data !== 'string') {
    throw new Error('Invalid input data for hashing');
  }

  // Normalize the input consistently
  const normalized = data.trim().toLowerCase();
  const pepper = process.env.HASH_PEPPER;

  if (!pepper || pepper.length < 32) {
    throw new Error('HASH_PEPPER is not properly configured (min 32 chars required)');
  }

  // Using HMAC-SHA256 for deterministic hashing with pepper as key
  const hmac = crypto.createHmac('sha256', pepper);
  hmac.update(normalized);
  return hmac.digest('hex');
};

async function verifyPassword(inputPassword, storedHash) {
  return await bcrypt.compare(inputPassword.trim(), storedHash); // Must match registration trim
}

module.exports = { encrypt, decrypt, createSecureHash,verifyPassword };