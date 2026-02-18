# 🚀 ElBaraka — Performance & Security Optimization Guide

> **Comprehensive Enterprise-Grade Guide for Maximum Performance & Security**
> Last Updated: February 18, 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Performance Architecture](#2-performance-architecture)
3. [Redis Caching Strategy](#3-redis-caching-strategy)
4. [Backend (Laravel) Optimization](#4-backend-laravel-optimization)
5. [Frontend (React Native) Optimization](#5-frontend-react-native-optimization)
6. [Database (MySQL) Optimization](#6-database-mysql-optimization)
7. [API Design & Network Optimization](#7-api-design--network-optimization)
8. [Security Hardening](#8-security-hardening)
9. [Admin Dashboard Optimization](#9-admin-dashboard-optimization)
10. [Monitoring & Observability](#10-monitoring--observability)
11. [Pre-Launch Checklist](#11-pre-launch-checklist)

---

## 1. Executive Summary

### Current State Audit Results

| Area                  | Status                                  | Score |
| --------------------- | --------------------------------------- | ----- |
| **Backend Caching**   | ⚠️ Cache driver is FILE, not Redis      | 3/10  |
| **API Response Time** | ⚠️ No Redis = slow cache reads          | 4/10  |
| **Frontend Caching**  | ✅ Good in-memory + AsyncStorage layer  | 7/10  |
| **Database Queries**  | ⚠️ Some N+1, missing eager loading      | 6/10  |
| **Security Headers**  | ✅ SecurityHeaders middleware exists    | 7/10  |
| **Input Validation**  | ⚠️ SQL injection vectors found          | 4/10  |
| **Authentication**    | ✅ Sanctum + social auth solid          | 8/10  |
| **Payment Security**  | ✅ HMAC verification, PCI-DSS compliant | 9/10  |
| **Rate Limiting**     | ⚠️ Defined but NOT applied to routes    | 3/10  |
| **Error Exposure**    | 🔴 APP_DEBUG=true in .env               | 1/10  |

### Target: Enterprise-Grade Hypermarket Performance

| Metric                       | Current (Estimated)    | Target            |
| ---------------------------- | ---------------------- | ----------------- |
| API response time (cached)   | 100-300ms (file cache) | **<30ms** (Redis) |
| API response time (uncached) | 200-500ms              | **<100ms**        |
| Product search               | 300-800ms              | **<150ms**        |
| Category tree load           | 200-400ms              | **<50ms** (Redis) |
| Cart operations              | 150-300ms              | **<80ms**         |
| App cold start (TTI)         | 3-5s                   | **<2s**           |
| Image load (first)           | 1-3s                   | **<500ms**        |
| Search typeahead             | N/A (not implemented)  | **<200ms**        |

---

## 2. Performance Architecture

### 2.1 Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────────────────┐
│                    MOBILE APP                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ In-Memory    │→│ AsyncStorage  │→│ React Query │ │
│  │ Cache (JS)   │  │ (Persistent) │  │ (Stale-    │ │
│  │ TTL: 5min    │  │ TTL: varies  │  │  While-    │ │
│  │              │  │              │  │  Revalidate)│ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                         │                            │
│                    Network Request                   │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│                   LARAVEL API                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Route Cache  │→│ Redis Cache   │→│ Eager Load  │ │
│  │ (artisan)    │  │ TTL: varies   │  │ (Eloquent) │ │
│  │              │  │ Tags support  │  │            │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│                         │                            │
│                    Query Builder                     │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│                     MySQL                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Query Cache  │  │ Indexes      │  │ Connection │ │
│  │              │  │ (optimized)  │  │ Pooling    │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.2 Request Lifecycle (Optimized)

```
1. User taps "Search milk"
   ↓
2. Frontend: Check React Query cache → HIT? Return instantly
   ↓ (MISS)
3. Frontend: Check AsyncStorage cache → HIT? Return + background refresh
   ↓ (MISS)
4. Network: GET /api/v1/products/search?q=milk
   ↓
5. Laravel: Check Redis cache → HIT? Return JSON (<5ms)
   ↓ (MISS)
6. Laravel: MySQL query (indexed, eager-loaded)
   ↓
7. Laravel: Store in Redis (5-min TTL), return JSON
   ↓
8. Frontend: Store in React Query + AsyncStorage
   ↓
9. User sees results (<200ms total)
```

---

## 3. Redis Caching Strategy

### 3.1 Environment Configuration

```env
# .env (REQUIRED CHANGES)
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null           # Set a strong password in production
REDIS_DB=0                     # Main cache
REDIS_QUEUE_DB=1               # Queue jobs
REDIS_SESSION_DB=2             # Sessions
```

### 3.2 Cache Key Patterns & TTLs

| Data Type          | Cache Key Pattern                 | TTL    | Invalidation            |
| ------------------ | --------------------------------- | ------ | ----------------------- |
| Products List      | `products:list:{hash}`            | 5 min  | Product CRUD            |
| Product Detail     | `product:{barcode}`               | 10 min | Product update          |
| Categories Tree    | `categories:tree`                 | 30 min | Category CRUD           |
| Category Products  | `categories:{id}:products:{hash}` | 5 min  | Product/Category update |
| Featured Products  | `products:featured`               | 10 min | Product update          |
| Flash Deals        | `products:flash-deals`            | 2 min  | Flash sale events       |
| Search Results     | `search:{hash}`                   | 3 min  | Product CRUD            |
| Search Suggestions | `search:suggest:{prefix}`         | 5 min  | Product CRUD            |
| User Cart          | `cart:user:{id}`                  | 15 min | Cart modification       |
| User Profile       | `user:profile:{id}`               | 15 min | Profile update          |
| User Orders        | `user:orders:{id}:{hash}`         | 5 min  | Order status change     |
| Product Reviews    | `reviews:product:{barcode}`       | 5 min  | Review approved         |
| Store Settings     | `settings:all`                    | 1 hour | Settings update         |
| Delivery Zones     | `zones:all`                       | 1 hour | Zone CRUD               |
| Active Promotions  | `promotions:active`               | 10 min | Promotion CRUD          |
| Active Offers      | `offers:active`                   | 10 min | Offer CRUD              |
| Promo Codes        | `promo:validate:{code}`           | 5 min  | Code CRUD               |
| Notification Count | `user:{id}:unread`                | 2 min  | Notification events     |
| Popular Searches   | `search:popular`                  | 1 hour | Computed hourly         |
| Trending Products  | `products:trending`               | 30 min | Order events            |

### 3.3 Cache Tag Groups

```php
// Tag-based invalidation for bulk clearing
Cache::tags(['products'])->flush();           // Clear ALL product caches
Cache::tags(['categories'])->flush();         // Clear ALL category caches
Cache::tags(['user', "user:{$id}"])->flush(); // Clear specific user caches
Cache::tags(['promotions'])->flush();         // Clear ALL promotion caches
Cache::tags(['search'])->flush();             // Clear ALL search caches
```

### 3.4 Cache Warming Strategy

```php
// Run on deployment or schedule every 30 minutes
php artisan cache:warm

// Warms:
// 1. Categories tree (most visited)
// 2. Featured products
// 3. Active promotions
// 4. Store settings
// 5. Delivery zones
// 6. Popular searches
```

---

## 4. Backend (Laravel) Optimization

### 4.1 Query Optimization Techniques

#### Eager Loading (Prevent N+1)

```php
// ❌ BAD — N+1 query problem
$products = Product::all();
foreach ($products as $product) {
    echo $product->categories; // Triggers new query per product!
}

// ✅ GOOD — Single query with eager loading
$products = Product::with(['categories'])->get();

// ✅ BEST — Conditional eager loading
$products = Product::with([
    'categories:id,name_en,name_ar,slug',  // Select only needed columns
])->get();
```

#### Chunked Processing for Large Datasets

```php
// ❌ BAD — Loads all products into memory
Product::all()->each(fn($p) => processProduct($p));

// ✅ GOOD — Process in chunks of 200
Product::chunk(200, function ($products) {
    foreach ($products as $product) {
        processProduct($product);
    }
});
```

#### Select Only Needed Columns

```php
// ❌ BAD — SELECT * FROM products
$products = Product::all();

// ✅ GOOD — Only what the list view needs
$products = Product::select([
    'barcode', 'name_en', 'name_ar', 'price', 'sale_price',
    'stock_quantity', 'is_active', 'image', 'rating'
])->get();
```

### 4.2 Database Indexes (Must-Have)

```sql
-- Already existing indexes to verify:
CREATE INDEX idx_products_featured ON products(is_featured, is_active);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_sales ON products(sales_count DESC);
CREATE INDEX idx_products_rating ON products(rating DESC);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- Search optimization indexes:
CREATE FULLTEXT INDEX ft_products_search ON products(name_en, name_ar, description_en, description_ar);
CREATE INDEX idx_categories_active ON categories(is_active, sort_order);
CREATE INDEX idx_categories_parent ON categories(parent_id, is_active);
CREATE INDEX idx_orders_user ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, user_id);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_reviews_product ON reviews(product_barcode, is_approved);
CREATE INDEX idx_promo_codes_code ON promo_codes(code, is_active);
CREATE INDEX idx_promo_usage ON promo_code_usages(promo_code_id, user_id);
```

### 4.3 Artisan Commands for Production

```bash
# Route caching (huge performance boost)
php artisan route:cache

# Config caching
php artisan config:cache

# View caching
php artisan view:cache

# Event caching
php artisan event:cache

# Optimize autoloader
composer dump-autoload --optimize

# Clear and rebuild all caches
php artisan optimize
```

### 4.4 SQL Injection Fix (CRITICAL)

```php
// ❌ CURRENT (VULNERABLE):
$sortBy = $request->get('sort_by', 'created_at');
$query->orderBy($sortBy, $sortOrder); // User can inject SQL!

// ✅ FIXED (WHITELIST):
$allowedSorts = ['price', 'created_at', 'name_en', 'rating', 'sales_count'];
$sortBy = in_array($request->get('sort_by'), $allowedSorts)
    ? $request->get('sort_by')
    : 'created_at';
$sortOrder = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
$query->orderBy($sortBy, $sortOrder);
```

### 4.5 Response Compression

Already implemented via `GzipCompress` middleware — compresses JSON responses >1KB. Ensure it's applied to all API routes.

---

## 5. Frontend (React Native) Optimization

### 5.1 React Query Integration (Stale-While-Revalidate)

```typescript
// QueryClient already configured in _layout.tsx:
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch if data is fresh
    },
  },
});

// USE THIS for all data fetching instead of raw fetch:
const { data, isLoading } = useQuery({
  queryKey: ["products", "featured"],
  queryFn: () => ProductAPI.getFeatured(),
  staleTime: 10 * 60 * 1000, // 10 min
});
```

### 5.2 Image Optimization

```typescript
// ✅ Already using expo-image with caching:
<Image
  source={{ uri: imageUrl }}
  cachePolicy="memory-disk"     // Memory first, then disk
  recyclingKey={barcode}        // Reuse memory allocation
  transition={200}              // Smooth fade-in
  placeholder={blurhash}        // Show blurred placeholder while loading
/>

// Additional tips:
// - Use WebP format on backend (30% smaller than JPEG)
// - Serve multiple sizes: thumb (150px), medium (400px), full (800px)
// - Use CDN for static assets
```

### 5.3 FlatList Optimization

```typescript
<FlatList
  data={products}
  renderItem={renderProduct}
  keyExtractor={(item) => item.barcode.toString()}
  // Performance props:
  removeClippedSubviews={true}         // Unmount off-screen items
  maxToRenderPerBatch={10}             // Render 10 items per batch
  updateCellsBatchingPeriod={50}       // 50ms between batches
  initialNumToRender={8}              // Render 8 items initially
  windowSize={5}                       // Render 5 screens worth
  getItemLayout={(_, index) => ({      // Skip layout measurement
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  keyboardDismissMode="on-drag"        // Dismiss keyboard on scroll
/>
```

### 5.4 Memoization

```typescript
// ✅ Memoize expensive computations
const sortedProducts = useMemo(() => {
  return [...products].sort((a, b) => a.price - b.price);
}, [products]);

// ✅ Memoize callbacks
const handlePress = useCallback((barcode: string) => {
  router.push(`/product/${barcode}`);
}, []);

// ✅ Memoize components
const ProductCard = React.memo(({ product }) => {
  // Only re-renders if product prop changes
});
```

### 5.5 Bundle Size Optimization

```typescript
// ❌ BAD — Imports entire library
import { Ionicons } from "@expo/vector-icons";

// ✅ Already correct — Expo tree-shakes icons

// ❌ BAD — Imports all of lodash
import _ from "lodash";

// ✅ GOOD — Import specific functions
import debounce from "lodash/debounce";

// Use Expo Router's lazy loading for heavy screens
export default function Screen() {
  // This screen is only loaded when navigated to
}
```

### 5.6 Network Request Optimization

```typescript
// ✅ Request deduplication (React Query handles this)
// Multiple components requesting same data → single network call

// ✅ Prefetching (load data before user navigates)
queryClient.prefetchQuery({
  queryKey: ["product", barcode],
  queryFn: () => ProductAPI.getProduct(barcode),
});

// ✅ Optimistic updates (already implemented for cart/favorites)
// User sees instant feedback, rollback on failure

// ✅ Background refresh (stale-while-revalidate)
// Show cached data immediately, refresh in background
```

---

## 6. Database (MySQL) Optimization

### 6.1 Connection Configuration

```php
// config/database.php — optimize MySQL connection
'mysql' => [
    'driver' => 'mysql',
    'options' => [
        PDO::ATTR_EMULATE_PREPARES => false,    // ✅ Already set
        PDO::ATTR_PERSISTENT => true,            // Connection pooling
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true,
    ],
    'strict' => true,   // ✅ Already set
],
```

### 6.2 Query Performance Rules

| Rule                              | Description                                    |
| --------------------------------- | ---------------------------------------------- |
| **SELECT only needed columns**    | Never `SELECT *` in production                 |
| **Eager load relationships**      | Always use `with()` for related models         |
| **Use database-level pagination** | Never load all records and slice in PHP        |
| **Index foreign keys**            | All `_id` columns must be indexed              |
| **Avoid N+1 in loops**            | Pre-load collections before iterating          |
| **Use chunk for bulk operations** | Process large datasets in chunks of 200-500    |
| **Cache computed aggregates**     | Don't recalculate counts/sums on every request |

### 6.3 Slow Query Detection

```php
// Add to AppServiceProvider::boot()
if (app()->environment('local')) {
    DB::listen(function ($query) {
        if ($query->time > 100) { // Queries over 100ms
            Log::warning('Slow query detected', [
                'sql' => $query->sql,
                'time' => $query->time,
                'bindings' => $query->bindings,
            ]);
        }
    });
}
```

---

## 7. API Design & Network Optimization

### 7.1 Response Format Standards

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 156,
    "last_page": 8
  },
  "cache_hit": true,
  "response_time_ms": 12
}
```

### 7.2 Pagination Standards

| Endpoint       | Default Per Page | Max Per Page |
| -------------- | ---------------- | ------------ |
| Products       | 20               | 100          |
| Categories     | 50               | 100          |
| Orders         | 15               | 50           |
| Notifications  | 20               | 50           |
| Search Results | 20               | 100          |
| Reviews        | 10               | 50           |
| Admin Lists    | 50               | 200          |

### 7.3 Conditional Requests (ETag/If-None-Match)

```php
// Backend: Add ETag to cacheable responses
$data = Cache::remember($key, $ttl, fn() => $query);
$etag = md5(json_encode($data));

if ($request->header('If-None-Match') === $etag) {
    return response('', 304); // Not Modified — saves bandwidth
}

return response()->json($data)->header('ETag', $etag);
```

### 7.4 Gzip Compression

Already implemented via `GzipCompress` middleware. Typical savings:

| Response                 | Uncompressed | Compressed | Savings |
| ------------------------ | ------------ | ---------- | ------- |
| Products list (20 items) | ~15KB        | ~3KB       | 80%     |
| Categories tree          | ~8KB         | ~1.5KB     | 81%     |
| Order details            | ~5KB         | ~1KB       | 80%     |

---

## 8. Security Hardening

### 8.1 Critical Fixes Required

#### Fix 1: Disable Debug Mode (CRITICAL)

```env
# .env — MUST change for production
APP_ENV=production
APP_DEBUG=false
```

#### Fix 2: SQL Injection Prevention (CRITICAL)

```php
// In EVERY controller that accepts sort_by/sort_order:
// ProductController, CategoryController, etc.

$allowedSorts = ['price', 'created_at', 'name_en', 'name_ar', 'rating', 'sales_count'];
$sortBy = in_array($request->get('sort_by'), $allowedSorts)
    ? $request->get('sort_by')
    : 'created_at';
$sortOrder = in_array(strtolower($request->get('sort_order', 'desc')), ['asc', 'desc'])
    ? strtolower($request->get('sort_order', 'desc'))
    : 'desc';
```

#### Fix 3: Secure Health Endpoints

```php
// Add auth:sanctum + admin middleware to health routes
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('/health/detailed', ...);
    Route::get('/health/metrics', ...);
});
```

#### Fix 4: Apply Rate Limiters to Routes

```php
// In routes/api.php — use the DEFINED rate limiters
Route::middleware(['throttle:auth'])->group(...);    // Auth routes
Route::middleware(['throttle:cart'])->group(...);    // Cart routes
Route::middleware(['throttle:checkout'])->group(...); // Checkout routes
Route::middleware(['throttle:heavy'])->group(...);   // Search routes
```

#### Fix 5: XSS in Payment Return Route

```php
// In routes/web.php — sanitize Paymob params
Route::get('/payment-return', function (Request $request) {
    $params = array_intersect_key($request->all(), array_flip([
        'id', 'pending', 'amount_cents', 'success', 'order', 'merchant_order_id'
    ]));
    $deepLink = 'elbaraka://payment?' . http_build_query(
        array_map('htmlspecialchars', $params)
    );
    return view('payment-return', ['deepLink' => $deepLink]);
});
```

### 8.2 Security Headers (Already Implemented)

```
X-Content-Type-Options: nosniff         ✅
X-Frame-Options: DENY                   ✅
X-XSS-Protection: 1; mode=block        ✅
Strict-Transport-Security: max-age=... ✅ (production only)
Referrer-Policy: strict-origin-...      ✅
```

### 8.3 Additional Security Measures

| Measure                                      | Status                              | Priority |
| -------------------------------------------- | ----------------------------------- | -------- |
| Sanctum token expiration (reduce to 30 days) | ⚠️ Currently 180 days               | High     |
| Apply email verification middleware          | ⚠️ Middleware exists, never applied | Medium   |
| Encrypt sessions                             | ⚠️ SESSION_ENCRYPT=false            | Medium   |
| Production CORS config                       | ⚠️ Only `*` in local                | High     |
| Remove ngrok-skip-browser-warning header     | ⚠️ Dev-only header in prod code     | Low      |
| Guest cart session signing                   | ⚠️ Client-supplied session IDs      | Medium   |

### 8.4 Frontend Security

| Item                         | Status                            | Action                              |
| ---------------------------- | --------------------------------- | ----------------------------------- |
| No hardcoded secrets         | ✅ Tokens from auth only          | Maintain                            |
| Ngrok URL in config          | ⚠️ Must change for production     | Replace with production URL         |
| Token stored in AsyncStorage | ✅ Standard practice              | Consider SecureStore for production |
| Input sanitization           | ✅ Server-side validation         | Maintain                            |
| Deep link handling           | ⚠️ Must validate deep link params | Add validation                      |

---

## 9. Admin Dashboard Optimization

### 9.1 Data Tables

- **Use server-side pagination** — never load all records
- **Debounce search inputs** — 300ms delay before API call
- **Cache dashboard analytics** — 5-min TTL for charts/stats

### 9.2 API Calls

- **Batch related API calls** — use Promise.all()
- **Cache static data** (categories, brands) — React Query with long staleTime
- **Lazy load heavy components** — charts, reports loaded on demand

### 9.3 Build Optimization

- **Enable production build** — `npm run build` with minification
- **Tree-shaking** — import specific components from libraries
- **Code splitting** — lazy load admin routes

---

## 10. Monitoring & Observability

### 10.1 Recommended Stack

| Tool                 | Purpose                                 | Priority    |
| -------------------- | --------------------------------------- | ----------- |
| Laravel Telescope    | Local debugging & profiling             | Development |
| Sentry               | Error tracking (Laravel + React Native) | Production  |
| Redis Monitor        | Cache hit/miss rates                    | Production  |
| MySQL slow query log | Query performance                       | Production  |
| Laravel Horizon      | Redis queue monitoring                  | Production  |

### 10.2 Key Metrics to Track

| Metric                  | Target | Alert Threshold |
| ----------------------- | ------ | --------------- |
| API response time (p95) | <200ms | >500ms          |
| Redis cache hit rate    | >85%   | <70%            |
| Error rate              | <0.1%  | >1%             |
| DB query time (p95)     | <50ms  | >200ms          |
| App crash rate          | <0.5%  | >1%             |
| API availability        | 99.9%  | <99.5%          |

---

## 11. Pre-Launch Checklist

### 11.1 Backend Pre-Launch

- [ ] Set `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Set `CACHE_STORE=redis` and verify Redis is running
- [ ] Set `QUEUE_CONNECTION=redis`
- [ ] Set `SESSION_DRIVER=redis` and `SESSION_ENCRYPT=true`
- [ ] Run `php artisan optimize` (route, config, view cache)
- [ ] Run `composer dump-autoload --optimize`
- [ ] Fix SQL injection in ProductController and CategoryController
- [ ] Apply named rate limiters to all routes
- [ ] Secure health endpoints with admin auth
- [ ] Reduce Sanctum token expiration to 30 days
- [ ] Apply email verification middleware
- [ ] Configure production CORS
- [ ] Set up SSL certificates
- [ ] Enable Gzip compression in nginx
- [ ] Configure Redis max memory and eviction policy
- [ ] Set up database backups (daily)
- [ ] Configure log rotation

### 11.2 Frontend Pre-Launch

- [ ] Replace ngrok URL with production URL
- [ ] Remove `ngrok-skip-browser-warning` header
- [ ] Enable React Native Hermes engine
- [ ] Test on low-end Android devices
- [ ] Verify all images have fallbacks
- [ ] Test offline mode
- [ ] Verify deep link handling
- [ ] Run production build: `eas build --platform all`

### 11.3 Database Pre-Launch

- [ ] Verify all indexes are created
- [ ] Run ANALYZE TABLE on all tables
- [ ] Set innodb_buffer_pool_size to 70% of available RAM
- [ ] Enable slow query log (threshold: 100ms)
- [ ] Verify foreign key constraints
- [ ] Test backup and restore procedure

---

## Appendix A: Redis Memory Estimation

| Data Type           | Estimated Keys | Avg Size | Total Memory |
| ------------------- | -------------- | -------- | ------------ |
| Products            | ~5,000         | ~2KB     | ~10MB        |
| Categories          | ~200           | ~1KB     | ~200KB       |
| Search results      | ~1,000         | ~5KB     | ~5MB         |
| User sessions       | ~500           | ~500B    | ~250KB       |
| User carts          | ~200           | ~2KB     | ~400KB       |
| Queue jobs          | ~100           | ~1KB     | ~100KB       |
| **Total Estimated** |                |          | **~16MB**    |

Redis recommended minimum: **64MB** (with 50% headroom for spikes)

---

## Appendix B: Key File Locations

| File                                      | Purpose                      |
| ----------------------------------------- | ---------------------------- |
| `config/cache.php`                        | Cache driver configuration   |
| `config/database.php`                     | Database & Redis connections |
| `config/sanctum.php`                      | Token expiration settings    |
| `app/Http/Middleware/SecurityHeaders.php` | Security headers             |
| `app/Http/Middleware/GzipCompress.php`    | Response compression         |
| `app/Providers/AppServiceProvider.php`    | Rate limiters definition     |
| `routes/api.php`                          | All API routes & middleware  |
| `frontend/config/app.config.ts`           | API base URL                 |
| `frontend/services/api.ts`                | API client                   |
| `frontend/app/_layout.tsx`                | React Query config           |
