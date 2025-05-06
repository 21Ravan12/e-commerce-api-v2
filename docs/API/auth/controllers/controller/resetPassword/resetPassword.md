# Password Reset Module Documentation

## Endpoint: `/api/auth/reset-password` (POST)

### Security Flow
1. **Initial Validation**
   - Enforces JSON content-type
   - Validates input against Joi schema
   - Sanitizes inputs with XSS protection

2. **Rate Limiting**
   - Tracks attempts per IP (50 max/hour)
   - Implements 5-minute sliding window
   - Blocks brute force attempts

3. **Token Verification**
   - Checks Redis for valid reset token
   - Validates token expiration
   - Verifies session consistency (IP matching)

4. **User Verification**
   - Confirms user exists and is active
   - Validates password meets requirements
   - Checks against previous passwords

5. **Cleanup & Notification**
   - Invalidates all active sessions
   - Sends security notification email
   - Cleans up Redis tokens

### Security Measures
| Protection Layer       | Implementation Details |
|------------------------|------------------------|
| Request Validation     | Joi schema + XSS filtering |
| Rate Limiting          | Redis-backed IP tracking |
| Token Security         | Time-limited challenge tokens |
| Session Verification   | IP consistency check |
| Password Security      | Bcrypt hashing + history check |
| Data Cleanup          | Automatic Redis key deletion |

### Response Types

**Success (200)**
```json
{
  "message": "Password successfully updated",
  "security": {
    "sessionsInvalidated": true,
    "changeTimestamp": "2023-07-15T14:30:00Z"
  }
}