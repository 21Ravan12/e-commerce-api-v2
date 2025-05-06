# Delete Category Endpoint Documentation

## `DELETE /api/category/delete/:id`

### Description
Safely removes a product category after validating there are no associated products or subcategories. Requires admin privileges and creates detailed audit logs.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | String | Valid MongoDB ObjectId of category to delete |

### Validation Steps
1. **Admin Verification**: Confirms requesting user has admin role
2. **ID Validation**: Checks ObjectId format validity
3. **Existence Check**: Verifies category exists
4. **Safety Checks**:
   - No linked products (via `productCount` virtual)
   - No child categories (via `subcategories` virtual)

### Success Response (200)
```json
{
  "message": "Category deleted successfully",
  "deletedId": "507f1f77bcf86cd799439011",
  "timestamp": "2023-08-01T12:00:00.000Z"
}