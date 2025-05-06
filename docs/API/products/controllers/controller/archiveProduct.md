# Archive Product Endpoint Documentation

## `PUT /api/products/archive/:id`

### Description
Performs a soft delete/archival of a product while maintaining referential integrity. Executes synchronous archival and asynchronous cleanup operations.

### Authentication
- **Type**: Bearer Token (JWT)
- **Required Role**: `product_manager` or `admin`

### Request Headers
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |
| `X-Request-ID` | UUID | No (auto-generated if missing) |
| `X-Source` | Request source | No |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | ObjectId | Valid MongoDB Product ID |

### Process Flow
1. **Pre-Validation**:
   - Checks product existence
   - Verifies no active orders reference the product
   - Validates user permissions

2. **Archival Operations**:
   - Sets `status: archived`
   - Updates `archivedAt` timestamp
   - Records archiving user

3. **Post-Archival**:
   - Cache invalidation (product + related listings)
   - Audit logging
   - Inventory status updates

### Success Response (200)
```json
{
  "success": true,
  "message": "Product archived successfully",
  "metadata": {
    "transactionId": "uuidv4",
    "processedIn": "processingTimeMs"
  }
}