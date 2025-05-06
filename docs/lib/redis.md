# Redis Client Documentation

## Connection Management

### Initialization
Automatically establishes connection using environment configuration:
- Production: TLS encrypted connection
- Development: Plaintext connection
- Automatic reconnection strategy (max 5 second delay)

### Events
| Event | Description | Log Level |
|-------|-------------|-----------|
| `connect` | Initial connection established | INFO |
| `ready` | Client ready for commands | INFO |
| `error` | Connection/operation errors | ERROR |

## Core Operations

### `set(key, value, options)`
Stores key-value pair with optional expiration  
**Parameters:**
- `key` (String, required): Redis key
- `value` (Any): Value to store (automatically stringified)
- `options` (Object): 
  - `EX` (Number): Expiration in seconds  
**Returns:**  
Redis "OK" response  
**Throws:**  
TypeError for invalid keys, Redis errors

### `get(key)`
Retrieves value by key  
**Parameters:**
- `key` (String, required)  
**Returns:**  
Stored value or null  
**Throws:**  
TypeError for invalid keys, Redis errors

### `del(key)`
Deletes key-value pair  
**Parameters:**
- `key` (String, required)  
**Returns:**  
Number of keys deleted  
**Throws:**  
TypeError for invalid keys, Redis errors

## Utility Operations

### `exists(key)`
Checks if key exists  
**Parameters:**
- `key` (String, required)  
**Returns:**  
1 if exists, 0 if not  
**Throws:**  
TypeError for invalid keys, Redis errors

### `incr(key)`
Atomic counter increment  
**Parameters:**
- `key` (String, required)  
**Returns:**  
New integer value  
**Throws:**  
Redis errors

### `expire(key, seconds)`
Sets key expiration  
**Parameters:**
- `key` (String, required)
- `seconds` (Number): TTL in seconds  
**Returns:**  
1 if timeout was set, 0 if key doesn't exist  
**Throws:**  
Redis errors

## Advanced Features

### `call(...args)`
Raw Redis command execution  
**Parameters:**
- Variadic command arguments (e.g., `['SET', 'foo', 'bar']`)  
**Returns:**  
Redis command response  
**Throws:**  
Redis errors

### Automatic Reconnection
- Exponential backoff (max 5s)
- TLS/plaintext auto-detection
- Connection state management

## Error Handling
- Validates all key inputs
- Logs all operations with error context
- Preserves original Redis error stack traces

## Example Usage

```javascript
// Store session data
await RedisClient.set(
  `session:${sessionId}`, 
  JSON.stringify(userData),
  { EX: 3600 } // 1 hour TTL
);

// Rate limiting example
const attempts = await RedisClient.incr(`login_attempts:${ip}`);
if (attempts > 5) {
  await RedisClient.expire(`login_attempts:${ip}`, 300);
  throw new Error('Too many attempts');
}