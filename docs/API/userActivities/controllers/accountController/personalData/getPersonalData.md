# Get Personal Data Endpoint Documentation

## `GET /api/userActivities/personalData/get`

### Description
Allows authenticated users to retrieve their own personal data. Handles decryption of encrypted fields and logs both success and failure events for auditing purposes.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Scope**: `user`

### Request Headers
| Header               | Value                 | Required |
|----------------------|-----------------------|----------|
| `Authorization`      | `Bearer <token>`      | Yes      |
| `Content-Type`       | `application/json`    | Yes      |
| `x-source`           | `string (e.g. web)`   | Optional |
| `x-transaction-id`   | `string`              | Optional |

### Response Body Schema

#### Success (200 OK)
```json
{
  "message": "Personal data retrieved successfully",
  "decryptedData": {
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "dateOfBirth": "string"
  }
}
