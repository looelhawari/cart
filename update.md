AGENT — STOP EVERYTHING. DO NOT WRITE A SINGLE LINE OF CODE UNTIL YOU READ AND APPLY THIS FULLY.

The current documentation contains critical lies and security disasters that will kill the project in production.

You must delete and replace everything as follows — TODAY — before touching any controller, model, or migration.

────────────────────────────────────────

1. DELETE THESE FILES COMPLETELY

- BACKEND_API_UPDATE_SUMMARY.md
- Any file that mentions “150+ endpoints”, “Spatie Laravel Permission”, or “JWT 1-year expiration”

2. REMOVE THESE LIES FROM project-instructions.md
   Delete every line that says:

- “150+ endpoints”
- “Spatie Laravel Permission”
- “1-year token expiration”
- “Social login (Google)” — we are not doing it now

3. REPLACE THE ENTIRE “API ENDPOINTS” SECTION WITH THIS EXACT LIST (72 ENDPOINTS — THIS IS FINAL)

````markdown
## FINAL PRODUCTION API ENDPOINTS (v1 — 72 ENDPOINTS — NO MORE, NO LESS)

### Version Prefix (MANDATORY)

All routes MUST be under: `/api/v1/`

### Authentication

| Method | Endpoint | Middleware | Description |
| ------ | -------- | ---------- | ----------- |

|
| POST | `/api/v1/auth/register` | guest, throttle:10,1 | Register + send phone OTP |
| POST | `/api/v1/auth/verify-phone` | guest | Verify OTP |
| POST | `/api/v1/auth/login` | guest, throttle:10,1 | Login → access (60min) + refresh token |
| POST | `/api/v1/auth/refresh` | auth:sanctum | New access token |
| POST | `/api/v1/auth/logout` | auth:sanctum | Blacklist refresh token |
| POST | `/api/v1/auth/forgot-password` | guest | Send reset OTP |
| POST | `/api/v1/auth/reset-password` | guest | Reset with OTP |

### User & Profile

| Method | Endpoint              | Middleware   | Description                |
| ------ | --------------------- | ------------ | -------------------------- |
| GET    | `/api/v1/me`          | auth:sanctum | Get profile                |
| PUT    | `/api/v1/me`          | auth:sanctum | Update name/email/phone    |
| POST   | `/api/v1/me/avatar`   | auth:sanctum | Upload avatar (Cloudinary) |
| DELETE | `/api/v1/me/avatar`   | auth:sanctum | Remove avatar              |
| PUT    | `/api/v1/me/password` | auth:sanctum | Change password            |

### Device Tokens (Push Notifications)

| Method | Endpoint                  | Middleware   | Description           |
| ------ | ------------------------- | ------------ | --------------------- |
| POST   | `/api/v1/devices`         | auth:sanctum | Save token + platform |
| DELETE | `/api/v1/devices/{token}` | auth:sanctum | Remove token          |

### Addresses

| Method | Endpoint                         | Middleware   | Description                         |
| ------ | -------------------------------- | ------------ | ----------------------------------- |
| GET    | `/api/v1/addresses`              | auth:sanctum | List                                |
| POST   | `/api/v1/addresses`              | auth:sanctum | Create                              |
| PUT    | `/api/v1/addresses/{id}`         | auth:sanctum | Update                              |
| DELETE | `/api/v1/addresses/{id}`         | auth:sanctum | Delete                              |
| POST   | `/api/v1/addresses/{id}/default` | auth:sanctum | Set as default (auto unsets others) |

### Categories & Brands

| Method | Endpoint | Middleware | Cache | Description |
| ------ | -------- | ---------- | ----- | ----------- |

|
| GET | `/api/v1/categories` | throttle:60,1 | 1h | Full tree |

<!-- | GET | `/api/v1/categories/{slug}` | throttle:60,1 | 1h | Single category | -->
<!-- | GET | `/api/v1/categories/{slug}/products` | throttle:60,1| 5m | Products in category | -->

| GET | `/api/v1/brands` | throttle:60,1 | 2h | All brands |

### Products

| Method | Endpoint                     | Middleware                | Cache         | Description      |
| ------ | ---------------------------- | ------------------------- | ------------- | ---------------- | ------------------------ | --- |
| GET    | `/api/v1/products`           | throttle:60,1             | 5m            | Search + filters |
| GET    | `/api/v1/products/featured`  | throttle:60,1             | 30m           | Home featured    |
| <!--   | GET                          | `/api/v1/products/deals`  | throttle:60,1 | 10m              | Active deals             | --> |
| <!--   | GET                          | `/api/v1/products/{slug}` | throttle:60,1 | 10m              | Full details + nutrition | --> |
| GET    | `/api/v1/search/suggestions` | throttle:30,1             | none          | Autocomplete     |

### Shopping Cart

| Method | Endpoint                    | Middleware       | Description                |
| ------ | --------------------------- | ---------------- | -------------------------- |
| GET    | `/api/v1/cart`              | optional:sanctum | Get cart (session or user) |
| POST   | `/api/v1/cart/items`        | optional:sanctum | Add item (price locked)    |
| PUT    | `/api/v1/cart/items/{id}`   | optional:sanctum | Update qty                 |
| DELETE | `/api/v1/cart/items/{id}`   | optional:sanctum | Remove                     |
| DELETE | `/api/v1/cart/clear`        | optional:sanctum | Empty cart                 |
| POST   | `/api/v1/cart/apply-promo`  | optional:sanctum | Apply promo                |
| DELETE | `/api/v1/cart/remove-promo` | optional:sanctum | Remove promo               |

### Checkout & Orders

| Method | Endpoint                      | Middleware   | Description             |
| ------ | ----------------------------- | ------------ | ----------------------- |
| POST   | `/api/v1/checkout`            | auth:sanctum | Create order            |
| GET    | `/api/v1/orders`              | auth:sanctum | List orders             |
| GET    | `/api/v1/orders/{id}`         | auth:sanctum | Order details           |
| GET    | `/api/v1/orders/{id}/track`   | auth:sanctum | Real-time tracking      |
| POST   | `/api/v1/orders/{id}/cancel`  | auth:sanctum | Cancel (if allowed)     |
| POST   | `/api/v1/orders/{id}/reorder` | auth:sanctum | Add items to cart again |
| GET    | `/api/v1/orders/{id}/invoice` | auth:sanctum | PDF invoice             |

### Payments (Paymob)

| Method | Endpoint                          | Middleware   | Description                     |
| ------ | --------------------------------- | ------------ | ------------------------------- |
| POST   | `/api/v1/payments/paymob/intent`  | auth:sanctum | Create payment                  |
| POST   | `/api/v1/payments/paymob/webhook` | none         | Paymob callback (HMAC verified) |
| POST   | `/api/v1/payments/cod`            | auth:sanctum | Cash on delivery                |

### Favorites

| Method | Endpoint                        | Middleware   | Description |
| ------ | ------------------------------- | ------------ | ----------- |
| GET    | `/api/v1/favorites`             | auth:sanctum | List        |
| POST   | `/api/v1/favorites`             | auth:sanctum | Add         |
| DELETE | `/api/v1/favorites/{productId}` | auth:sanctum | Remove      |

### Reviews

| Method | Endpoint                          | Middleware | Description    |
| ------ | --------------------------------- | ---------- | -------------- |
| GET    | `/api/v1/products/{slug}/reviews` | throttle   | Public reviews |
| POST   | `/api/v1/reviews`                 | auth       | Submit review  |

### Complaints / Tickets

| Method | Endpoint                     | Middleware   | Description          |
| ------ | ---------------------------- | ------------ | -------------------- |
| GET    | `/api/v1/tickets`            | auth:sanctum | List                 |
| POST   | `/api/v1/tickets`            | auth:sanctum | Create + attachments |
| GET    | `/api/v1/tickets/{id}`       | auth:sanctum | Details              |
| POST   | `/api/v1/tickets/{id}/reply` | auth:sanctum | Send message         |
| POST   | `/api/v1/tickets/{id}/close` | auth:sanctum | Close                |

### Banners & Promotions

| Method | Endpoint             | Middleware    | Cache |
| ------ | -------------------- | ------------- | ----- |
| GET    | `/api/v1/banners`    | throttle:60,1 | 1h    |
| GET    | `/api/v1/promotions` | throttle:60,1 | 30m   |

### Settings & Misc

| Method | Endpoint                 | Middleware | Description     |
| ------ | ------------------------ | ---------- | --------------- |
| GET    | `/api/v1/settings`       | cache 24h  | Public settings |
<!-- | GET    | `/api/v1/delivery-zones` | cache 24h  | Zones & fees    | -->
<!-- | GET    | `/api/v1/health`         | none       | Health check    | -->

### ADMIN-ONLY ENDPOINTS (Protected by role:admin)

All under `/api/v1/admin/...`
| Resource | Methods |
|--------------|----------------------------------|
| Categories | GET/POST/PUT/DELETE `/admin/categories` + `/{id}` |
| Brands | GET/POST/PUT/DELETE `/admin/brands` + `/{id}` |
| Products | GET/POST/PUT/DELETE `/admin/products` + `/{id}` + images |
| Banners | Full CRUD |
| Promo Codes | Full CRUD |
| Complaints | Full access + reply |
| Orders | Full access + status change + refund |

──────────────────────────────────────── 4. ADD THESE RULES TO THE DOCUMENT (COPY-PASTE)

```markdown
## CRITICAL RULES — NO EXCEPTIONS

1. Token lifetime: access = 60 minutes, refresh = 30 days + rotation
2. NEVER use Spatie Permission — use simple `role` column
3. All routes under /api/v1/
4. Cart merge on login is MANDATORY
5. Paymob webhook MUST verify HMAC SHA-512
6. All prices in cart_items are LOCKED at add time
7. Cloudinary for ALL images/videos — never save in public folder
```
````
