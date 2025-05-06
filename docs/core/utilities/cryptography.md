# cryptography.md
```markdown
## Cryptography Module Documentation

### Configuration
- **Algorithm**: `aes-256-gcm` (configurable via `CRYPTO_ALGORITHM`)
- **IV Length**: 16 bytes (configurable via `CRYPTO_IV_LENGTH`)
- **Salt Length**: 16 bytes (configurable via `CRYPTO_SALT_LENGTH`)
- **Required Env Var**: `ENCRYPTION_KEY` (no fallback)

### Core Functions

#### `encrypt(text, password)`
Encrypts data using AES-256-GCM:
- Generates random salt and IV
- Derives key using scrypt
- Returns object containing:
  - `salt` (hex)
  - `iv` (hex)
  - `content` (encrypted hex)
  - `authTag` (hex)
  - `algorithm`

**Validation**:
- Requires non-empty input
- Converts non-string data to JSON
- Validates encryption key

#### `decrypt(encryptedData, password)`
Decrypts AES-256-GCM encrypted data:
- Requires object with:
  - `salt`
  - `iv` 
  - `content`
  - `authTag`
  - `algorithm`
- Verifies algorithm matches
- Attempts JSON parsing for objects

#### `createSecureHash(data)`
Creates deterministic HMAC-SHA256 hash:
- Normalizes input (trim + lowercase)
- Requires `HASH_PEPPER` env var (min 32 chars)
- Returns hex digest

#### `verifyPassword(inputPassword, storedHash)`
Verifies bcrypt hashed passwords:
- Trims input password
- Uses `bcrypt.compare`

### Error Handling
- Throws explicit errors for:
  - Missing ENCRYPTION_KEY
  - Invalid input data
  - Algorithm mismatches
  - Missing HASH_PEPPER
- Detailed logging via logger service

### Example Usage
```javascript
// Encryption
const encrypted = await encrypt('sensitive data');
// Returns:
// {
//   salt: 'a1b2c3...',
//   iv: 'd4e5f6...',
//   content: 'encryptedHex...', 
//   authTag: 'g7h8i9...',
//   algorithm: 'aes-256-gcm'
// }

// Decryption  
const decrypted = await decrypt(encrypted);

// Secure Hashing
const hash = createSecureHash('user@example.com');

// Password Verification
const isValid = await verifyPassword('userInput', storedHash);