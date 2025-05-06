# Get Campaigns Endpoint Documentation

## `GET /api/campaign/get`

### Description
Retrieves a paginated list of marketing campaigns with advanced filtering and sorting capabilities.

### Authentication
- **Type**: Optional Bearer Token (JWT)
- **Required Role**: None (public endpoint)

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Items per page (default: 25) |
| `status` | String | Filter by status: `draft/active/paused/completed/archived` |
| `type` | String | Filter by campaign type |
| `active` | Boolean | Currently active campaigns |
| `upcoming` | Boolean | Future-dated campaigns |
| `expired` | Boolean | Past-dated campaigns |
| `search` | String | Text search on campaign name |
| `sort` | String | Sorting criteria (e.g. `startDate:asc`) |

### Success Response (200)
```json
{
    "meta": {
        "success": true,
        "count": 2,
        "total": 2,
        "page": 1,
        "pages": 1,
        "filters": {
            "type": "percentage"
        }
    },
    "data": [
        {
            "id": "680a6b3e47888767320116e8",
            "name": "Black Friday 2023",
            "type": "percentage",
            "status": "completed",
            "dates": {
                "start": "2023-11-24T00:00:00.000Z",
                "end": "2023-11-27T23:59:59.000Z"
            },
            "usage": {
                "limit": 5000,
                "count": 0
            },
            "restrictions": {
                "minPurchase": 100,
                "maxDiscount": 50,
                "categories": [
                    {
                        "_id": "6800b670b69e3adf2c95c8d7",
                        "name": "Main Category",
                        "slug": "main-category"
                    }
                ],
                "excludedProducts": 0
            },
            "audience": {
                "segment": "all",
                "customCustomers": 0
            },
            "assets": {
                "banner": "https://example.com/images/black-friday.jpg",
                "landingPage": "https://example.com/black-friday"
            },
            "createdBy": {
                "_id": "68089d7425f5548f64e74920",
                "username": "jhony"
            },
            "createdAt": "2025-04-24T16:47:59.001Z",
            "updatedAt": "2025-04-24T16:47:59.001Z"
        },
        {
            "id": "68029cf401d9e6cc7322b7e0",
            "name": "Summer Sale 2023",
            "type": "percentage",
            "status": "completed",
            "dates": {
                "start": "2023-06-01T00:00:00.000Z",
                "end": "2023-08-31T23:59:59.000Z"
            },
            "usage": {
                "limit": 1000,
                "count": 0
            },
            "restrictions": {
                "minPurchase": 50,
                "maxDiscount": 100,
                "categories": [
                    {
                        "_id": "6800b9a34e1277a8cf272207",
                        "name": "Electronics",
                        "slug": "electronics"
                    }
                ],
                "excludedProducts": 1
            },
            "audience": {
                "segment": "all",
                "customCustomers": 0
            },
            "assets": {
                "banner": "summer-sale-banner.jpg",
                "landingPage": "https://example.com/summer-sale"
            },
            "createdBy": null,
            "createdAt": "2025-04-18T18:41:56.789Z",
            "updatedAt": "2025-04-18T18:41:56.789Z"
        }
    ]
}