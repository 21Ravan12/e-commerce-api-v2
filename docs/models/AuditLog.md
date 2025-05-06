# AuditLog.md
```markdown
# Audit Log Model Documentation

## Schema Overview
The AuditLog model tracks all significant system events with detailed metadata for security, debugging, and compliance purposes.

### Core Fields
| Field          | Type           | Description | Validation |
|----------------|----------------|-------------|------------|
| `event`        | String         | Event type/name | Required, 1-100 chars |
| `user`         | ObjectId       | Reference to User | Optional |
| `userEmail`    | String         | User's email | Indexed, lowercase |
| `ip`           | String         | IP address | Required, validated format |
| `userAgent`    | String         | Browser/device info | Required, max 512 chars |
| `metadata`     | Mixed          | Additional event data | Defaults to {} |
| `timestamp`    | Date           | Event time | Auto-generated, indexed |
| `status`       | String         | Event status | Enum: success/failure/warning/info/pending |
| `source`       | String         | Event origin | Enum: web/mobile/api/admin/system/cli |
| `action`       | String         | Action type | Enum: create/read/update/delete/etc. |
| `entityType`   | String         | Related entity type | Max 50 chars |
| `entityId`     | ObjectId       | Related entity ID | Optional |
| `correlationId`| String         | Request trace ID | Auto-generated UUID |

## Indexes
- `event + status`
- `user + timestamp`
- `entityType + entityId`
- `source + action`
- `correlationId`
- Text index on `event`, `userAgent`, and `metadata.message`

## Virtual Properties
- `humanTime`: Formatted timestamp
- `logMessage`: Standardized log format string

## Key Methods

### Static Methods
```javascript
// Create and save a log entry
AuditLog.logAsync({
  event: 'user_login',
  user: userId,
  ip: '192.168.1.1',
  // ...other fields
})