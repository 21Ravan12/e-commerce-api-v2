# Delete Account Endpoint Documentation

## `DELETE /api/userActivities/delete`

### Description
Allows authenticated users to permanently delete their account. Performs associated cleanup, audit logging, and optional metadata tracking (e.g., user agent, device fingerprint, geolocation).

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `Content-Type` | `application/json` | Yes |
| `x-device-fingerprint` | `string` | Optional |
| `x-geo-location` | `string` | Optional |

### Request Body Schema
```json
{
  "reason": "string (max 500 chars, optional)"
}
