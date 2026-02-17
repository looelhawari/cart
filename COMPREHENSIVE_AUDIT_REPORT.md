# 🔍 El Baraka — Comprehensive Full-Stack Audit Report

**Date:** February 18, 2026  
**Auditor:** GitHub Copilot  
**Scope:** Frontend (Expo/RN), Admin Dashboard (React/Vite), Backend (Laravel 11), Driver App (Expo/RN)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Performance Issues](#2-performance-issues)
3. [Architecture Issues](#3-architecture-issues)
4. [Security Issues](#4-security-issues)
5. [Scalability Issues](#5-scalability-issues)
6. [DevOps Issues](#6-devops-issues)
7. [Code Quality Issues](#7-code-quality-issues)
8. [Summary Matrix](#8-summary-matrix)

---

## 1. Executive Summary

| Category     | Critical | High   | Medium | Low    | Total  |
| ------------ | -------- | ------ | ------ | ------ | ------ |
| Performance  | 2        | 5      | 6      | 3      | 16     |
| Architecture | 2        | 6      | 5      | 3      | 16     |
| Security     | 4        | 5      | 4      | 2      | 15     |
| Scalability  | 1        | 4      | 4      | 2      | 11     |
| DevOps       | 2        | 4      | 3      | 2      | 11     |
| Code Quality | 1        | 4      | 5      | 4      | 14     |
| **TOTAL**    | **12**   | **28** | **27** | **16** | **83** |

---

## 2. Performance Issues

### 🔴 P-01: Monolithic Zustand Store — Single Re-render Bottleneck (Critical)

**Files:** `frontend/store/index.ts`  
**Lines:** 1–676 (entire file)

The entire frontend state is managed by a single Zustand store with **676 lines** combining auth, cart, favorites, addresses, payment methods, orders, and checkout state. Every state update re-renders every subscriber. With Zustand's `persist` middleware active, every mutation also triggers a full serialization + `AsyncStorage.setItem` call.

**Impact:** Unnecessary re-renders across the entire app tree on any state change; laggy UX on low-end devices.

**Recommendation:** Split into domain-specific stores (`useAuthStore`, `useCartStore`, `useFavoritesStore`, etc.) and use Zustand selectors.

---

### 🔴 P-02: QueryClient Instantiated at Module Scope — Memory Leak on Hot Reload (Critical)

**File:** `frontend/app/_layout.tsx` (line 37–47)

```
const queryClient = new QueryClient({ ... });
```

`QueryClient` is created outside the component at module scope. In Expo development with hot reloading, every reload creates a new `QueryClient` without cleaning up the previous one, leaking timers and cached data.

**Impact:** Memory leaks during development; stale query caches.

**Recommendation:** Instantiate inside the component with `useRef` or `useState`, or use `React.useMemo` inside `RootLayout`.

---

### 🟠 P-03: No React Query Usage in Frontend App (High)

**Files:** All `frontend/app/**` screen files  
**Evidence:** Zero `useQuery`/`useMutation`/`useInfiniteQuery` imports found in any screen

Despite `@tanstack/react-query` being installed and `QueryClientProvider` being set up in `_layout.tsx`, **no screen actually uses React Query hooks**. All data fetching goes through the Zustand store with raw `fetch()` calls. This means:

- No automatic caching, deduplication, or stale-while-revalidate
- No automatic refetching/retry logic at the component level
- No optimistic update rollbacks via mutation callbacks
- The entire React Query setup is dead weight (bundle size cost)

**Impact:** Every screen manually reimplements caching/loading/error patterns; duplicated API calls when navigating.

**Recommendation:** Migrate data fetching to `useQuery`/`useMutation` hooks, using Zustand only for client-side-only state (UI preferences, onboarding flag).

---

### 🟠 P-04: Cart Routes Have No Auth — Guest Cart Without Session Causes Duplicate Carts (High)

**File:** `unibackend/routes/api.php` (lines 93–103)

Cart routes are public (`throttle:60,1` only, no `auth:sanctum`), relying on a session/guest identifier. The frontend calls `getSessionId()` for guests. However:

- Each app install generates a new session ID
- Reinstalls, cache clears, and device switches create orphaned carts in the database
- No cleanup mechanism found for abandoned guest carts

**Impact:** Database bloat from orphaned cart records; inconsistent cart state.

---

### 🟠 P-05: `StoreSetting::all()` Called Without Caching in Model (High)

**File:** `unibackend/app/Models/StoreSetting.php` (lines 74, 185)

`static::all()` fetches every row from the `store_settings` table on every call. This model is used for store status, working hours, delivery settings, etc. — hit on nearly every customer request.

**Impact:** Unnecessary database queries on every request.

**Recommendation:** Use `Cache::remember()` with a reasonable TTL (already partially done in some controllers but not at the model level).

---

### 🟠 P-06: Analytics Endpoints Run Heavy Aggregation Queries Without Caching (High)

**Files:** `unibackend/app/Http/Controllers/Api/Admin/ComprehensiveAnalyticsController.php`, `AnalyticsController.php`

Multiple endpoints use `selectRaw()`, `DB::raw()`, and complex aggregation queries (SUM, COUNT, GROUP BY with date ranges). These run on every request with no caching layer.

**Impact:** Slow admin dashboard loading; database strain during peak hours.

**Recommendation:** Cache analytics results with 5–15 min TTL; consider materialized views or pre-computed aggregation tables.

---

### 🟠 P-07: Missing Pagination on Multiple Endpoints (High)

**Files (examples):**

- `unibackend/app/Http/Controllers/Api/WatchlistController.php` (line 25): uses `->get()` not `->paginate()`
- `unibackend/app/Http/Controllers/Api/WalletController.php` (line 50): uses `->get()`
- `unibackend/app/Http/Controllers/Api/Admin/StaticPageController.php` (line 32): uses `->get()`
- `unibackend/app/Http/Controllers/Api/Admin/SupportController.php` (lines 301, 341, 481): uses `->get()`

Multiple controller methods return unbounded result sets. As data grows, these will return increasingly large payloads.

**Impact:** Slow responses, mobile memory pressure, potential OOM on large datasets.

---

### 🟡 P-08: Frontend Loads All Products Client-Side for Search (Medium)

**File:** `frontend/app/search.tsx`

The search screen fetches products and filters client-side rather than using a server-side search endpoint with pagination.

**Impact:** Slow initial load; high memory usage; poor search experience as catalog grows.

---

### 🟡 P-09: Redundant API Calls on Authentication State Change (Medium)

**File:** `frontend/store/index.ts` (lines 298–330, `socialLogin`)

The `socialLogin` function makes the social auth API call, sets the user, then immediately makes a second `getProfile()` call. This is redundant since the social auth response already contains the user object.

**Impact:** Double API call on every social login.

---

### 🟡 P-10: No Image Optimization Pipeline (Medium)

**Files:** `frontend/services/cache/imageCache.ts`, `unibackend/app/Services/CloudinaryService.php`

While Cloudinary is used for storage, there's no evidence of:

- WebP/AVIF format conversion
- Responsive image sizes (thumbnails vs full)
- Lazy loading strategy for product lists
- Image placeholder/blur hash

**Impact:** Large image payloads on mobile; slow product list rendering.

---

### 🟡 P-11: Driver Location Polling at 15s Interval (Medium)

**File:** `driver-app/config/app.config.ts` (line 18)

`UPDATE_INTERVAL: 15000` (15 seconds). For active deliveries this is reasonable, but it runs continuously even when the driver is idle/unavailable.

**Impact:** Battery drain; unnecessary API calls.

---

### 🟡 P-12: Hardcoded Pagination Sizes (Medium)

**Files:** Multiple admin controllers use hardcoded `paginate(20)` or `paginate(10)`.

No client-configurable page sizes or limit caps. Some admin tables may need 50+ rows; mobile lists may need 10.

**Impact:** Inflexible pagination; over-fetching or under-fetching.

---

### 🟡 P-13: Broadcasting Auth Has Inline Business Logic (Medium)

**File:** `unibackend/routes/api.php` (lines 186–261)

~75 lines of Pusher broadcasting auth logic are inlined directly in the route file, including complaint ownership checks and manual HMAC signature generation. This runs on every WebSocket subscription.

**Impact:** Route file bloat; hard to test; duplicated auth logic.

---

### 🟢 P-14: Multiple `console.log` Statements in Production Services (Low)

**Files:** 24+ `console.log` calls in `frontend/services/**` (echo.ts, notificationService.ts, backgroundNotificationTask.ts, reviewsCache.ts, api/base.ts)

While some are guarded by `__DEV__`, many are not (e.g., in `echo.ts`, `reviewsCache.ts`, `backgroundNotificationTask.ts`).

**Impact:** Console noise in production; minor performance overhead.

---

### 🟢 P-15: `date-fns` Duplicated Across Frontend and Admin (Low)

**Files:** `frontend/package.json` (v4.1.0), `admindash frontend/package.json` (v3.6.0)

Different major versions of `date-fns` used. If shared code exists, this could cause inconsistencies.

---

### 🟢 P-16: Admin Dashboard Excludes `jspdf` from Optimization (Low)

**File:** `admindash frontend/vite.config.ts` (line 14)

```ts
optimizeDeps: {
  exclude: ["jspdf", "jspdf-autotable"];
}
```

These are large libraries. Excluding them from optimization means they're loaded unprocessed.

---

## 3. Architecture Issues

### 🔴 A-01: Hardcoded Mock Data in Production Store (Critical)

**File:** `frontend/store/index.ts` (lines 527–551)

The Zustand store ships with **hardcoded mock addresses** as default state:

```ts
addresses: [
  { id: "1", label: "Home", street: "123 Main Street", apartment: "Apt 4B", city: "Cairo", ... },
  { id: "2", label: "Work", street: "456 Oak Avenue", apartment: "Suite 12", city: "Cairo", ... },
],
```

These mock addresses appear in every user's app and are persisted to AsyncStorage. The address management also uses local state only — `addAddress`, `removeAddress`, `updateAddress` all modify local arrays, disconnected from the backend API (even though `/api/v1/addresses` endpoint exists).

**Impact:** Users see fake addresses; address changes are lost on reinstall; backend addresses are ignored.

---

### 🔴 A-02: Frontend Stores Auth Tokens in AsyncStorage Instead of SecureStore (Critical)

**Files:**

- `frontend/services/api/base.ts` (lines 112–119): tokens saved via `AsyncStorage.multiSet()`
- `frontend/services/api.ts` (lines 315, 339, 424, 451): tokens saved via `AsyncStorage.setItem()`
- `frontend/services/biometricAuth.ts`: only biometric credentials use `SecureStore`

The app has `expo-secure-store` installed and uses it for biometric credentials, but **auth tokens (access_token, refresh_token) are stored in unencrypted `AsyncStorage`** via the `base.ts` helper functions. The driver app correctly uses `SecureStore` (`driver-app/services/api.ts` line 10).

**Impact:** Auth tokens accessible to any app with root/jailbreak access; fails security audit requirements for financial apps.

---

### 🟠 A-03: Dual HTTP Client Pattern — `httpClient.ts` vs `api/base.ts` (High)

**Files:**

- `frontend/services/httpClient.ts` (138 lines) — standalone HTTP client
- `frontend/services/api/base.ts` (175 lines) — `apiRequest()` function
- `frontend/services/api.ts` — yet another auth-specific API module

Three separate HTTP request abstractions exist:

1. `httpClient` — generic wrapper around `fetch()` with auth injection
2. `apiRequest` in `base.ts` — nearly identical wrapper around `fetch()` with auth injection
3. Individual API files in `services/api/` that import from `base.ts`

**Impact:** Inconsistent error handling; developers unsure which to use; duplicate code.

**Recommendation:** Consolidate into a single HTTP client with interceptor pattern (similar to admin dashboard's Axios-based `ApiClient`).

---

### 🟠 A-04: No Authorization Policies or Gates (High)

**Files:** `unibackend/app/Policies/` — directory does not exist

The app has no Laravel Policy classes. Authorization is handled only by middleware (`AdminMiddleware`, `DriverMiddleware`), which provides role-based access but not resource-level authorization.

This means:

- Any authenticated user can access any other user's order via `/orders/{id}` if they guess the ID
- Any authenticated user can view/modify any other user's complaint, address, review
- No `$this->authorize()` calls found in controllers

**Impact:** Insecure Direct Object Reference (IDOR) vulnerabilities across all resource endpoints.

---

### 🟠 A-05: Mixed Validation Patterns (High)

**Files:**

- `unibackend/app/Http/Requests/` — has `CreateOrderRequest.php` and a few sub-directories
- Most controllers use inline `$request->validate()` (15+ controllers)
- Some use `Validator::make()` pattern (ReviewController, RatingController)

Three different validation patterns with no consistency:

1. Form Request classes (only for orders)
2. Inline `$request->validate()` in controller methods
3. `Validator::make($request->all(), [...])` with manual error handling

**Impact:** Inconsistent error responses; hard to maintain; duplicate validation rules.

---

### 🟠 A-06: Admin Dashboard Has Single Auth Store — No Role-Based UI (High)

**File:** `admindash frontend/src/store/auth.store.ts`

The admin dashboard stores `user.role` but `ProtectedRoute.tsx` logs the check but doesn't enforce granular permissions. The `hasPermission()` helper is defined but there's no evidence of it being used for feature-level access control (hiding/showing specific admin features based on role).

**Impact:** All admin users see all features regardless of their actual permissions.

---

### 🟠 A-07: Payment Methods Managed Locally in Frontend Store (High)

**File:** `frontend/store/index.ts` (lines 586–605)

Payment method CRUD (`addPaymentMethod`, `removePaymentMethod`, `setDefaultPaymentMethod`) all operate on **local Zustand state only**, imported from `@/data/user`. Meanwhile, the backend has a full `/payment-methods` CRUD API.

**Impact:** Payment methods are lost on reinstall; no sync with backend; inconsistent with saved card tokens in Paymob.

---

### 🟠 A-08: Orders Managed Locally in Frontend Store (High)

**File:** `frontend/store/index.ts` (lines 607–621)

`addOrder` and `cancelOrder` modify local state only. The backend has full order management with status tracking, but the frontend store maintains a separate disconnected orders array.

**Impact:** Order state is out of sync; cancelled orders don't reflect backend status.

---

### 🟡 A-09: No Shared Types Between Frontend and Backend (Medium)

**Files:**

- `frontend/types/index.ts` (361 lines)
- `admindash frontend/src/types/index.ts`
- Backend uses PHP models/resources with different field names

The `Order` interface in `frontend/types/index.ts` uses camelCase (`orderNumber`, `deliveryFee`) while the backend API returns snake_case (`order_number`, `delivery_fee`). There's no automatic mapping layer.

**Impact:** Silent data loss when backend field names change; manual sync required.

---

### 🟡 A-10: No Service Layer Pattern in Many Controllers (Medium)

**Files:** Some controllers (OrderController, CartController) use service classes, but many admin controllers directly query models.

Examples: `ActivityLogController`, `SupportController`, `StaticPageController`, `UserController`, `ReviewController` all contain business logic directly.

**Impact:** Untestable business logic; tight coupling to HTTP layer.

---

### 🟡 A-11: Admin Dashboard and Frontend Use Different State Libraries (Medium)

- Frontend: `zustand@5.0.2` with `persist` middleware + `AsyncStorage`
- Admin: `zustand@4.5.0` with `persist` middleware + `localStorage`

Different major versions of the same library. If shared patterns exist, they're not compatible.

---

### 🟡 A-12: Backup `.bak` Files Committed to Repository (Medium)

**Files found:**

- `unibackend/app/Services/OrderCancellationService.php.bak`
- `frontend/components/SavedCardsList.tsx.bak`
- `TOKENIZATION_SYSTEM_A_TO_Z.md.bak`

**Impact:** Dead code in repository; confusion about which file is current.

---

### 🟡 A-13: Inconsistent API Error Response Formats (Medium)

**Files:** Different controllers return errors in different formats:

- Some: `{ success: false, message: "..." }`
- Some: `{ error: "..." }`
- Some: `{ message: "...", errors: {...} }`

The frontend `httpClient.ts` tries to parse `errorData.message`, but doesn't handle all formats.

---

### 🟢 A-14: Excessive Controller Count Without Route Model Binding (Low)

**Files:** 48+ controller files across `Api/` and `Api/Admin/`. Many pass raw `int $id` and manually query models instead of using Laravel route model binding.

---

### 🟢 A-15: Event System Underutilized (Low)

**File:** `unibackend/app/Events/` — only 4 events (`ComplaintMessageSent`, `DriverLocationUpdated`, `OrderStatusUpdated`, `UserTyping`)

Many side effects (notifications, analytics logging, inventory updates) are handled synchronously in controllers instead of being dispatched as events.

---

### 🟢 A-16: Redundant `api.ts` in Frontend Services (Low)

**Files:** `frontend/services/api.ts` and `frontend/services/api/` directory both exist, with overlapping functionality for auth endpoints.

---

## 4. Security Issues

### 🔴 S-01: Hardcoded Ngrok URL in Production Config (Critical)

**File:** `frontend/config/app.config.ts` (line 13)

```ts
BASE_URL: "https://c7e8-197-50-154-121.ngrok-free.app/api/v1",
```

A specific ngrok tunnel URL is hardcoded as the production API base URL. Ngrok URLs are temporary, publicly accessible, and expose the development server.

**Impact:** Production app points to a temporary development tunnel; anyone with the URL can access the API; tunnel URL changes break the app.

---

### 🔴 S-02: Auth Tokens Stored in Unencrypted AsyncStorage (Critical)

**Files:** `frontend/services/api/base.ts` (lines 112–119)

(See A-02 above.) Access tokens and refresh tokens are stored in `AsyncStorage`, which is unencrypted on both iOS and Android. `expo-secure-store` is available but only used for biometric credentials.

**Impact:** Credential theft on rooted/jailbroken devices.

---

### 🔴 S-03: No IDOR Protection on Resource Endpoints (Critical)

**File:** `unibackend/routes/api.php` (lines 281–373)

All authenticated resource endpoints (`/orders/{id}`, `/complaints/{id}`, `/addresses/{id}`, `/reviews/{id}`, `/favorites/{id}`) accept any valid authenticated user's token. There are **no Policy classes** and **no ownership checks** in most controllers (some controllers do manual checks, but it's inconsistent).

**Examples of vulnerable endpoints:**

- `GET /orders/{id}` — any user can view any order
- `POST /orders/{id}/cancel` — any user can cancel any order
- `GET /complaints/{id}` — any user can view any complaint
- `PUT /addresses/{id}` — any user can modify any address
- `DELETE /reviews/{id}` — any user can delete any review
- `GET /orders/{id}/invoice/download` — any user can download any invoice

**Impact:** Full IDOR vulnerability chain; customers can access other customers' personal data, orders, and financial information.

---

### 🔴 S-04: Admin Dashboard Stores Tokens in `localStorage` (Critical)

**File:** `admindash frontend/src/store/auth.store.ts` (line 30), `admindash frontend/src/lib/api-client.ts` (line 53)

Admin tokens are stored in `localStorage`, which is accessible to any JavaScript running on the same origin. Combined with no Content Security Policy header, this is vulnerable to XSS-based token theft.

**Impact:** Any XSS vulnerability gives full admin access; admin tokens persist indefinitely in browser storage.

---

### 🟠 S-05: No CORS Configuration File (High)

**Evidence:** No `config/cors.php` file found; `SecurityHeaders.php` has wildcard CORS (`Access-Control-Allow-Origin: *`) in local environment only (line 38).

In production, there are **no CORS headers configured**, which means:

- The admin SPA cannot make cross-origin requests to the API
- Or the API is served on the same origin (which should be verified)

**Impact:** Either the admin dashboard doesn't work in production, or CORS is overly permissive.

---

### 🟠 S-06: Login Rate Limiting at 60 req/min is Too Generous (High)

**File:** `unibackend/routes/api.php` (line 65)

Auth routes are rate limited at `throttle:60,1` (60 requests per minute). The more targeted `login` rate limiter in `AppServiceProvider.php` allows 10 attempts per 15 minutes, but this limiter is defined but **not applied to routes** (the routes use the generic `throttle:60,1` instead).

**Impact:** Brute-force attacks can attempt 60 passwords per minute.

**Recommendation:** Apply the `login` rate limiter: `Route::middleware(['guest', 'throttle:login'])`.

---

### 🟠 S-07: Pusher Secret Used in Route File for Manual Auth (High)

**File:** `unibackend/routes/api.php` (lines 232–240)

```php
$pusherSecret = config('broadcasting.connections.pusher.secret');
$stringToSign = $socketId . ':' . $channelName;
$signature = hash_hmac('sha256', $stringToSign, $pusherSecret);
```

The Pusher secret is accessed and used for manual HMAC signing inside the route file. If the error handler exposes this (and `APP_DEBUG=true` does), the secret is leaked.

**Impact:** Pusher secret exposure enables unauthorized channel subscriptions.

---

### 🟠 S-08: Token Expiry Set to 7 Days (High)

**File:** `frontend/config/app.config.ts` (lines 42–43)

```ts
ACCESS_TOKEN_EXPIRY: 604800,  // 7 days
REFRESH_TOKEN_EXPIRY: 7776000, // 90 days
```

Access tokens valid for 7 days is excessive for a payment-enabled mobile app. Industry standard is 15–60 minutes with refresh token rotation.

**Impact:** Stolen tokens are valid for a full week.

---

### 🟠 S-09: Error Messages Expose Internal Details (High)

**File:** `unibackend/routes/api.php` (lines 260–261)

```php
return response()->json(['error' => 'Broadcasting auth failed: ' . $e->getMessage()], 500);
```

Exception messages are returned directly to the client, potentially exposing file paths, SQL errors, or configuration details.

**Impact:** Information disclosure.

---

### 🟡 S-10: No Content Security Policy Header (Medium)

**File:** `unibackend/app/Http/Middleware/SecurityHeaders.php`

While `X-Frame-Options`, `X-Content-Type-Options`, and `X-XSS-Protection` are set, there is **no Content-Security-Policy header**. This is the primary defense against XSS attacks.

**Impact:** No XSS mitigation for the admin dashboard.

---

### 🟡 S-11: Admin Dashboard Uses `dompurify` but No Evidence of Consistent Sanitization (Medium)

**File:** `admindash frontend/package.json` — `dompurify` is listed as a dependency.

While the library is installed, there's no evidence of a consistent sanitization wrapper applied to all user-generated content rendered in the admin panel.

**Impact:** Potential stored XSS if admin views unsanitized user input (product names, complaint messages, etc.).

---

### 🟡 S-12: `ProtectedRoute` Logs Auth State to Console in Production (Medium)

**File:** `admindash frontend/src/components/ProtectedRoute.tsx` (lines 13–16)

```tsx
console.log("ProtectedRoute - isAuthenticated:", isAuthenticated);
console.log("ProtectedRoute - user:", user);
console.log("localStorage auth_token:", localStorage.getItem("auth_token"));
```

Auth tokens are logged to the browser console in production.

**Impact:** Token exposure via browser dev tools.

---

### 🟡 S-13: Driver App Hardcodes Local IP Address (Medium)

**File:** `driver-app/config/app.config.ts` (line 6)

```ts
BASE_URL: "http://192.168.1.10:8000/api/v1",
```

Local network IP is hardcoded. Production builds will fail or connect to the wrong server.

**Impact:** Driver app non-functional in production.

---

### 🟢 S-14: `X-XSS-Protection` Header is Deprecated (Low)

**File:** `unibackend/app/Http/Middleware/SecurityHeaders.php` (line 26)

`X-XSS-Protection: 1; mode=block` is deprecated by modern browsers and can actually introduce vulnerabilities in some cases.

**Recommendation:** Remove and rely on CSP instead.

---

### 🟢 S-15: No API Versioning Fallback Strategy (Low)

**File:** `unibackend/routes/api.php`

All routes are under `v1` prefix. There's a `V1/` controller directory, but no `V2/` — when breaking changes are needed, all clients must update simultaneously.

---

## 5. Scalability Issues

### 🔴 SC-01: Queue Uses Database Driver by Default (Critical)

**File:** `unibackend/config/queue.php` (line 16)

```php
'default' => env('QUEUE_CONNECTION', 'database'),
```

The queue system defaults to the database driver. With 13 job classes (`unibackend/app/Jobs/`), including `ProcessBroadcastNotification`, `SendBroadcastChunk`, and `ReconcilePendingPayments`, the `jobs` table will become a bottleneck under load.

**Impact:** Queue processing speed limited by database throughput; failed jobs block table; no priority queues.

**Recommendation:** Switch to Redis queue driver (Predis is already installed).

---

### 🟠 SC-02: No Database Indexes on Frequently Queried Columns (High)

**File:** `unibackend/database/migrations/2026_02_02_100000_add_performance_indexes.php`

A performance indexes migration exists, but based on the raw SQL queries found (`selectRaw`, `whereRaw`, `DATE()`, `HOUR()`, `DAYOFWEEK()` operations), many queries apply functions to columns, defeating index usage:

- `DATE(created_at)` — won't use index on `created_at`
- `HOUR(used_at)` — full table scan
- `COALESCE(sale_price, price)` — no composite index possible

**Impact:** Full table scans on analytics queries as data grows.

---

### 🟠 SC-03: Redis Keys Pattern Scan in Inventory Service (High)

**File:** `unibackend/app/Services/InventoryService.php` (line 349)

```php
$keys = Redis::keys(self::STOCK_PREFIX . '*');
```

`KEYS` command scans all Redis keys and blocks the server. With thousands of products, this becomes a performance nightmare.

**Impact:** Redis server blocks during `clearStockCache()` calls.

**Recommendation:** Use `SCAN` iterator instead of `KEYS`.

---

### 🟠 SC-04: Single Server Architecture with No Health Check Dependencies (High)

**File:** `unibackend/app/Http/Controllers/Api/HealthController.php`

Health endpoints exist (`/health`, `/health/detailed`, `/health/metrics`) but there's no evidence of:

- Load balancer integration
- Session affinity configuration
- Centralized logging (ELK, etc.)
- Horizontal scaling strategy

**Impact:** Single point of failure; no high availability.

---

### 🟠 SC-05: File Storage Not Configured for Cloud (High)

**Evidence:** Cloudinary is used for product images, but complaint attachments, invoices (DomPDF), and exports likely use local filesystem. No S3 or Azure Blob Storage configuration found.

**Impact:** Files lost on server migration; no CDN support; disk space limits.

---

### 🟡 SC-06: Inventory Locking Uses Redis without TTL Verification (Medium)

**File:** `unibackend/app/Services/InventoryService.php` (lines 93–140)

The distributed lock uses `Redis::set($lockKey, '1', 'NX', 'EX', self::LOCK_TIMEOUT)` which is correct, but there's no lock renewal for long-running operations and no deadlock detection.

**Impact:** Potential stuck locks under high concurrency.

---

### 🟡 SC-07: No Database Read Replica Configuration (Medium)

**File:** `unibackend/config/database.php`

Only a single MySQL/MariaDB connection is configured. No read replica for offloading analytics queries.

**Impact:** Read and write queries compete for the same database connection pool.

---

### 🟡 SC-08: 54 Models with No Database Sharding Strategy (Medium)

**File:** `unibackend/app/Models/` — 54 model files

Tables like `orders`, `order_items`, `wallet_transactions`, `notifications`, and `activity_logs` will grow indefinitely with no archival or partitioning strategy.

**Impact:** Table scan times increase linearly with data.

---

### 🟡 SC-09: 74 Migrations with No Rollback Strategy (Medium)

**File:** `unibackend/database/migrations/` — 74 migration files

Many migrations add columns to existing tables (`ALTER TABLE`). No evidence of down migrations being tested or rollback procedures documented.

**Impact:** Risky deployments; hard to recover from failed migrations.

---

### 🟢 SC-10: WebSocket/Pusher with No Presence Channel Limits (Low)

**File:** `unibackend/routes/api.php` — broadcasting auth

No limits on how many channels a user can subscribe to or how many concurrent WebSocket connections are allowed.

---

### 🟢 SC-11: No API Response Compression Beyond Gzip Middleware (Low)

**File:** `unibackend/app/Http/Middleware/GzipCompress.php`

Gzip compression exists as middleware, but it's applied to all responses. No Brotli support or conditional compression based on response size.

---

## 6. DevOps Issues

### 🔴 D-01: No CI/CD Pipeline Configuration (Critical)

**Evidence:** No `.github/workflows/`, no `.gitlab-ci.yml`, no `Jenkinsfile`, no `azure-pipelines.yml`, no `bitbucket-pipelines.yml` found in the workspace.

**Impact:** All deployments are manual; no automated testing; no build verification; easy to deploy broken code.

---

### 🔴 D-02: Hardcoded Environment-Specific URLs in Source Code (Critical)

**Files:**

- `frontend/config/app.config.ts`: Hardcoded ngrok URL (`c7e8-197-50-154-121.ngrok-free.app`)
- `driver-app/config/app.config.ts`: Hardcoded local IP (`192.168.1.10:8000`)
- `admindash frontend/src/lib/api-client.ts`: Fallback to `http://localhost:8000`

No environment variable injection for any frontend app. Changing the API URL requires code changes and rebuilds.

**Impact:** Cannot deploy to different environments (staging, production) without code changes.

**Recommendation:** Use `.env` files with `EXPO_PUBLIC_*` variables for Expo apps; use `VITE_*` variables for admin dashboard.

---

### 🟠 D-03: No Docker Configuration (High)

**Evidence:** No `Dockerfile`, `docker-compose.yml`, or `.dockerignore` found.

**Impact:** Inconsistent development environments; hard to onboard new developers; no containerized deployments.

---

### 🟠 D-04: No Monitoring or APM Integration (High)

**Evidence:** No Sentry, New Relic, DataDog, or any error tracking service configured in any project.

**Impact:** No visibility into production errors; no performance monitoring; issues discovered by user complaints only.

---

### 🟠 D-05: No Backup Strategy Documented (High)

**Evidence:** No database backup scripts, no backup scheduling configuration, no disaster recovery documentation.

**Impact:** Data loss risk; no point-in-time recovery capability.

---

### 🟠 D-06: No Logging Strategy — All Uses `console.log` / `\Log::info` (High)

**Files:** Frontend uses `console.log` extensively; Backend uses `\Log::info/error/warning` but with no structured logging format, no log levels per environment, and no log aggregation.

**Impact:** Cannot search/filter production logs; no alerting on error spikes.

---

### 🟡 D-07: No `.env.example` Verified for All Projects (Medium)

**Evidence:** `.gitignore` references `.env.example` but only the backend likely has one. Frontend and driver app have no `.env.example` (they use hardcoded config files instead of env vars).

**Impact:** New developers don't know what environment variables are needed.

---

### 🟡 D-08: `vendor/` Directory Structure Suggests It May Be Committed (Medium)

**Evidence:** `unibackend/vendor/` is visible in the workspace structure. If committed to git, this adds thousands of files to the repository.

**Impact:** Bloated repository; slow clones; potential security issues with vendored dependencies.

---

### 🟡 D-09: No Database Migration CI Step (Medium)

**Evidence:** No automated migration testing. The dev script in `composer.json` runs `php artisan serve` and `php artisan queue:listen`, but no migration validation.

**Impact:** Schema changes may break in production.

---

### 🟢 D-10: No Production Build Documentation for Mobile Apps (Low)

**Files:** `frontend/eas.json` exists, suggesting EAS Build is planned, but no build profiles or signing configuration are documented.

---

### 🟢 D-11: No SSL/HTTPS Enforcement in App Configuration (Low)

**File:** `unibackend/app/Http/Middleware/SecurityHeaders.php` (lines 30–32)

HSTS is only set in production, but there's no configuration to force HTTPS redirects for the API itself.

---

## 7. Code Quality Issues

### 🔴 CQ-01: Near-Zero Test Coverage (Critical)

**Files:**

- `unibackend/tests/Feature/` — only 2 files: `ExampleTest.php`, `PaymentMethodTest.php`
- `unibackend/tests/Unit/` — only 1 file: `ExampleTest.php`
- `frontend/` — **zero test files** (no `__tests__/`, no `*.test.tsx`, no `*.spec.ts`)
- `admindash frontend/` — **zero test files**
- `driver-app/` — **zero test files**

Total: **3 test files** for an application with 48+ controllers, 23 services, 54 models, and 4 frontend apps.

**Impact:** No regression protection; refactoring is extremely risky; impossible to verify correctness.

---

### 🟠 CQ-02: Excessive TypeScript `any` Usage (High)

**Files:**

- `frontend/store/index.ts`: **19 instances** of `any` type — `cart: any`, `error: any`, `item: any`, `userData?: any`, `(fav: any)`, `persistedState: any`
- `admindash frontend/src/types/index.ts`: `orders?: any[]`, `complaints?: any[]`, `addresses?: any[]`, `default_address?: any`, `notes?: any[]`, `attachments?: any[]`
- `admindash frontend/src/services/user.service.ts`: `params?: any`, `data: any` on multiple methods
- `admindash frontend/src/services/support.service.ts`: `Promise<any>` return types

**Impact:** TypeScript type safety is circumvented; runtime errors not caught at compile time; IDE autocomplete broken.

---

### 🟠 CQ-03: No Error Boundary in Frontend Mobile App (High)

**Evidence:** No `ErrorBoundary` component found in `frontend/components/` or `frontend/app/`. The admin dashboard has one (`admindash frontend/src/components/ErrorBoundary.tsx`), but the mobile apps do not.

**Impact:** Unhandled errors crash the entire app with no recovery mechanism.

---

### 🟠 CQ-04: Dead Code and Unused Imports (High)

**Files:**

- `frontend/store/index.ts`: Imports `paymentMethods` from `@/data/user` (mock data, not API)
- `frontend/store/index.ts`: `promoCode` state managed locally AND via `applyPromoCodeToCart` API — conflicting patterns
- `frontend/services/httpClient.ts` — seems entirely unused given all API calls go through `api/base.ts`
- `*.bak` files committed

**Impact:** Bundle size bloat; developer confusion.

---

### 🟠 CQ-05: Inconsistent TypeScript Strictness (High)

**Files:**

- `admindash frontend/tsconfig.json`: `"strict": true` but `"noUnusedLocals": false`, `"noUnusedParameters": false`
- `frontend/tsconfig.json`: `"strict": true` (inherited from expo base)

Despite strict mode, the `noUnused*` flags are explicitly disabled in admin, allowing dead variables/parameters.

---

### 🟡 CQ-06: Frontend Types Don't Match Backend API Contracts (Medium)

**File:** `frontend/types/index.ts`

The `Product` type has both snake_case (`name_en`, `sale_price`) and camelCase (`salePrice`, `nameAr`) properties with comments like "Computed properties for backwards compatibility". This indicates the types were migrated but not cleaned up.

**Impact:** Type confusion; unnecessary nullable fields.

---

### 🟡 CQ-07: Admin Dashboard Has No Types for Most Service Responses (Medium)

**Files:** `admindash frontend/src/services/*.service.ts`

Most service functions use `any` for parameters and some return types. Only a few services return typed responses.

---

### 🟡 CQ-08: Only 3 Custom Hooks in Frontend (Medium)

**File:** `frontend/hooks/` — only `useNotifications.ts`, `usePasswordConfirm.tsx`, `useResponsive.ts`

With 26+ screens and 26 components, common patterns (loading states, pagination, form handling, debounce, etc.) are likely reimplemented across components.

**Impact:** Code duplication; inconsistent UX patterns.

---

### 🟡 CQ-09: Inconsistent File Naming Conventions (Medium)

**Files:**

- Backend: PascalCase (`OrderController.php`, `CartService.php`) — consistent ✓
- Admin services: kebab-case (`auth.service.ts`, `order.service.ts`) — consistent ✓
- Frontend services: camelCase (`httpClient.ts`, `notificationService.ts`) — consistent ✓
- Frontend components: PascalCase (`ProductCard.tsx`) — consistent ✓
- But types mix conventions: `promoCode.ts`, `promotion.ts`, `index.ts`

---

### 🟡 CQ-10: React Version Mismatch Between Frontend Apps (Medium)

**Files:**

- `frontend/package.json`: React `19.1.0`
- `admindash frontend/package.json`: React `18.2.0`

The mobile app uses React 19 while the admin dashboard uses React 18. This means different rendering behaviors, different feature availability, and incompatible shared code.

---

### 🟢 CQ-11: Backend Has 54 Models but Minimal Resources/Transformers (Low)

**Evidence:** Some controllers return raw model data, others use Resource classes. No systematic API resource layer.

**Impact:** Inconsistent API response shapes; accidental exposure of internal model attributes.

---

### 🟢 CQ-12: Missing JSDoc/Comments on Service Functions (Low)

**Files:** Frontend API services (`frontend/services/api/*.ts`) have minimal documentation. Parameters and return types are often not documented.

---

### 🟢 CQ-13: Admin Dashboard Has 20 Service Files Matching 20 Page Directories (Low)

**Evidence:** `admindash frontend/src/services/` has exactly one service per page section, suggesting high coupling.

---

### 🟢 CQ-14: Multiple Date Libraries and Inconsistent Usage (Low)

**Files:**

- Frontend: `date-fns@4.1.0`
- Admin: `date-fns@3.6.0`
- Backend: PHP native `Carbon` (via Laravel)

---

## 8. Summary Matrix

### Top 12 Critical Issues Requiring Immediate Action

| #   | ID    | Issue                                         | Category     |
| --- | ----- | --------------------------------------------- | ------------ |
| 1   | S-01  | Hardcoded ngrok URL in production config      | Security     |
| 2   | S-02  | Auth tokens in unencrypted AsyncStorage       | Security     |
| 3   | S-03  | No IDOR protection on resource endpoints      | Security     |
| 4   | S-04  | Admin tokens in localStorage (XSS-vulnerable) | Security     |
| 5   | A-01  | Hardcoded mock addresses in production store  | Architecture |
| 6   | A-02  | Tokens in AsyncStorage instead of SecureStore | Architecture |
| 7   | D-01  | No CI/CD pipeline                             | DevOps       |
| 8   | D-02  | Hardcoded environment URLs in source code     | DevOps       |
| 9   | CQ-01 | Near-zero test coverage (3 tests total)       | Quality      |
| 10  | P-01  | Monolithic Zustand store                      | Performance  |
| 11  | P-02  | QueryClient at module scope (memory leak)     | Performance  |
| 12  | SC-01 | Queue uses database driver                    | Scalability  |

### Recommended Priority Order

1. **Week 1 (Security):** Fix S-01, S-02, S-03, S-04, S-06, S-08, S-12
2. **Week 2 (Architecture):** Fix A-01, A-02, A-04, A-07, A-08
3. **Week 3 (DevOps):** Set up D-01, D-02, D-03, D-04
4. **Week 4 (Performance):** Fix P-01, P-03, P-05, P-07
5. **Ongoing:** Test coverage (CQ-01), scalability improvements (SC-01, SC-02)

---

_End of Audit Report_
