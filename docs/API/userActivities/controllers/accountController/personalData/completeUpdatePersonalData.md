# Complete Update Personal Data Endpoint Documentation

## `POST /api/userActivities/personalData/update/complete`

### Description
Allows authenticated users to finalize their sensitive personal data updates (e.g., email, phone, password, address) after passing a multi-step verification process including 2FA via a challenge token. Includes strong security checks and comprehensive audit logging.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |
| `x-device-fingerprint` | String | Optional (recommended for fraud prevention) |
| `x-geo-location` | String | Optional (recommended for logging) |

### Request Body Schema
```json
{
  "challenge": "string (required)",
  "verificationCode": "string (required)"
}
