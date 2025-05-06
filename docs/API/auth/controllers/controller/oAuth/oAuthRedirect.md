# OAuth Redirect Module Documentation

## Endpoint: `/api/auth/oauth/:provider` (GET)

### Authentication Flow
1. **Provider Validation**
   - Supports GitHub and Facebook providers
   - Rejects unsupported providers immediately

2. **Security Checks**
   - Validates redirect URIs against allowlist
   - Generates 32-byte state token if not provided
   - Enforces state token expiration (5 minutes)

3. **Session Initialization**
   - Stores state in Redis with request metadata:
     * Client IP address
     * User agent fingerprint
     * Timestamp
     * Original request URL
   - Sets provider-specific OAuth scopes:
     * GitHub: `user:email`
     * Facebook: `email`

### Request Parameters
| Parameter    | Required | Validation                     | Description |
|-------------|----------|--------------------------------|-------------|
| `provider`  | Yes      | Must be 'github' or 'facebook' | OAuth provider |
| `state`     | No       | 32-byte hex if provided        | CSRF protection token |
| `redirect_uri` | No    | Must match registered URIs     | Post-auth redirect |

### Security Features
| Protection Layer      | Implementation |
|----------------------|---------------|
| State Token          | Redis-backed with TTL |
| CSRF Protection      | Required state parameter |
| Metadata Collection  | IP, user agent, timestamp |
| Scope Limitation     | Minimal required scopes |

### Error Responses

**Invalid Provider (400)**
```json
{
  "error": "Unsupported OAuth provider"
}