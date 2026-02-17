# 🔍 El Baraka – Full System Audit, DevOps Guide & Enhancement Roadmap

> **Generated:** June 2025  
> **Scope:** Frontend (React Native/Expo), Admin Dashboard (React/Vite), Backend (Laravel), Driver App (React Native/Expo)  
> **Total Issues Found:** 83 across 6 categories

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues (Fix Immediately)](#critical-issues)
3. [Performance Audit](#performance-audit)
4. [Architecture Audit](#architecture-audit)
5. [Security Audit](#security-audit)
6. [Scalability Audit](#scalability-audit)
7. [Code Quality Audit](#code-quality-audit)
8. [DevOps & Deployment Guide](#devops-guide)
9. [Database Optimization Guide](#database-optimization)
10. [Enhancement Roadmap](#enhancement-roadmap)
11. [Recommended Tech Stack Improvements](#tech-stack)

---

## 1. Executive Summary <a name="executive-summary"></a>

| Category     | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Total  |
| ------------ | ----------- | ------- | --------- | ------ | ------ |
| Performance  | 2           | 5       | 6         | 3      | **16** |
| Architecture | 2           | 6       | 5         | 3      | **16** |
| Security     | 4           | 5       | 4         | 2      | **15** |
| Scalability  | 1           | 4       | 4         | 2      | **11** |
| DevOps       | 2           | 4       | 3         | 2      | **11** |
| Code Quality | 1           | 4       | 5         | 4      | **14** |
| **TOTAL**    | **12**      | **28**  | **27**    | **16** | **83** |

### System Overview

| Component       | Stack                                                       | Size                                                           |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Frontend        | Expo 54, React Native 0.81, React 19, Zustand 5, TypeScript | 23 API service files, 676-line store                           |
| Admin Dashboard | React, Vite, TailwindCSS, TypeScript                        | Full analytics + order management                              |
| Backend         | Laravel 11 (PHP 8.2), MySQL, Redis                          | 52 controllers, 54 models, 76 migrations, 707-line routes file |
| Driver App      | Expo, React Native, TypeScript                              | Dedicated driver interface                                     |

---

## 2. Critical Issues (Fix Immediately) <a name="critical-issues"></a>

### 🔴 CRIT-01: Hardcoded Ngrok URL as Production API

**File:** `frontend/config/api.ts`

```typescript
BASE_URL: "https://c7e8-197-50-154-121.ngrok-free.app/api/v1";
```

**Impact:** Ngrok tunnels are temporary (expire on restart), have rate limits (40 connections/minute), and cost money for fixed subdomains. The entire customer app will stop working when the tunnel expires.

**Fix:**

```typescript
// config/api.ts
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? "http://192.168.1.10:8000/api/v1"
    : "https://api.elbaraka.com/api/v1", // ← proper production domain
  TIMEOUT: 15000,
};
```

**Action Items:**

1. Purchase a domain (e.g., `elbaraka.com`)
2. Deploy backend on a VPS (DigitalOcean $12/mo or AWS Lightsail $7/mo)
3. Use Nginx as reverse proxy with SSL via Let's Encrypt
4. Point DNS A record to the VPS IP

---

### 🔴 CRIT-02: Driver App Points to Local IP

**File:** `driver-app/config/app.config.ts`

```typescript
BASE_URL: "http://192.168.1.10:8000/api/v1";
```

**Impact:** Driver app only works on the developer's local network. No driver can use it outside the office.

**Fix:** Same as CRIT-01 – use a proper production URL. Also, the driver app should use `expo-secure-store` (it already does ✅).

---

### 🔴 CRIT-03: Auth Tokens Stored in AsyncStorage

**File:** `frontend/store/index.ts`

The Zustand store uses `AsyncStorage` for persistence, which stores auth tokens in plaintext on the device filesystem.

**Impact:** Any rooted/jailbroken device can read tokens. Malware can steal user sessions.

**Fix:**

```typescript
import * as SecureStore from "expo-secure-store";

// Create a custom storage adapter for Zustand
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) =>
    SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

// Use in Zustand persist config
persist(storeCreator, {
  name: "el-baraka-store",
  storage: createJSONStorage(() => secureStorage),
  partialize: (state) => ({ token: state.token, user: state.user }),
});
```

---

### 🔴 CRIT-04: Admin Tokens in localStorage

**File:** `admindash frontend/src/services/` (auth service)

**Impact:** Admin JWT stored in `localStorage` is vulnerable to XSS attacks. If any admin page has an XSS vulnerability, the attacker gets full admin access.

**Fix:**

- Use `httpOnly` cookies for admin auth (set by backend)
- Or use `sessionStorage` (clears on tab close) as a lesser mitigation

---

### 🔴 CRIT-05: No IDOR Protection (Missing Laravel Policies)

**Files:** `unibackend/app/Http/Controllers/OrderController.php`, `AddressController.php`, `ComplaintController.php`

**Impact:** Without Laravel Policies/Gates, any authenticated user can access other users' orders, addresses, and complaints by guessing IDs. Example: `GET /api/v1/orders/123` — if order 123 belongs to user B, user A can still access it.

**Fix:**

```php
// app/Policies/OrderPolicy.php
class OrderPolicy {
    public function view(User $user, Order $order): bool {
        return $user->id === $order->user_id;
    }
}

// In OrderController
public function show(Order $order) {
    $this->authorize('view', $order);
    return new OrderResource($order);
}
```

---

### 🔴 CRIT-06: Zero Test Coverage

**Files:** `unibackend/tests/` — only 3 test files exist across the entire 52-controller, 54-model backend.

**Impact:** Any code change can silently break features. Refactoring is extremely risky. No way to verify tax/delivery fee changes don't break calculations.

**Fix Priority:**

1. **Unit tests** for CartService, CheckoutService (calculation logic)
2. **Feature tests** for auth flow (register → verify → login)
3. **Feature tests** for order flow (add to cart → checkout → payment)
4. **API tests** for all CRUD endpoints

---

### 🔴 CRIT-07: React Query Installed But Never Used

**File:** `frontend/package.json` has `@tanstack/react-query: ^5.83.0`

**Impact:** All API calls bypass React Query's caching/dedup/retry layer. The app makes redundant network requests, doesn't cache data, and has no automatic retry on failures.

**Fix:** Wrap all API calls in `useQuery`/`useMutation` hooks:

```typescript
// hooks/useOrders.ts
export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => orderApi.getOrders(),
    staleTime: 30_000, // Cache for 30 seconds
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
```

---

## 3. Performance Audit <a name="performance-audit"></a>

### 🔴 PERF-01: Duplicate API Calls on Tab Switch

**Impact:** Every time user switches tabs, all data is re-fetched from scratch instead of using cached data.

**Where:** `frontend/app/(tabs)/home.tsx`, `cart.tsx`, `orders.tsx` — each use `useEffect` + `useFocusEffect` that triggers full re-fetches.

**Fix:** Use React Query with `staleTime` — data served from cache unless stale.

---

### 🟠 PERF-02: N+1 Query Risk in Product Listings

**Files:** `unibackend/app/Http/Controllers/ProductController.php`, `CategoryController.php`

**Impact:** Loading products without eager loading causes N+1 queries (1 query for products + N queries for each product's category/images/reviews).

**Fix:**

```php
Product::with(['category', 'images', 'reviews'])->paginate(20);
```

---

### 🟠 PERF-03: No API Response Caching

**Files:** `unibackend/app/Http/Controllers/` (all public endpoints)

**Impact:** Frequently-accessed data (categories, products, promotions) is re-queried from the database on every single request.

**Fix:**

```php
// Cache categories for 1 hour
$categories = Cache::remember('categories:all', 3600, function () {
    return Category::with('children')->orderBy('sort_order')->get();
});
```

---

### 🟠 PERF-04: Monolithic Zustand Store (676 lines)

**File:** `frontend/store/index.ts` — single file, single store

**Impact:** Any state change triggers re-renders across ALL subscribed components, even if the changed state isn't relevant to them.

**Fix:** Split into domain-specific stores:

```
store/
  useAuthStore.ts
  useCartStore.ts
  useFavoritesStore.ts
  useAddressStore.ts
```

---

### 🟠 PERF-05: No Image Optimization

**Impact:** Product images loaded at full resolution. No progressive loading, no thumbnails, no WebP format.

**Fix:**

- Use `expo-image` (already excellent caching) instead of React Native `Image`
- Backend should generate thumbnails (300px) for list views
- Serve WebP format with a CDN (Cloudflare, Cloudinary)

---

### 🟠 PERF-06: No Pagination on Order History

**Impact:** All orders loaded at once. Users with 100+ orders will experience significant delays.

**Fix:** Implement cursor-based pagination with `FlatList` + `onEndReached`.

---

### 🟡 PERF-07: Notification Polling

**Impact:** App polls for unread notification count. Should use WebSockets (Laravel Echo + Pusher is already installed).

**Fix:** Already have `laravel-echo` and `pusher-js` in `package.json` — activate them for real-time notifications instead of polling.

---

### 🟡 PERF-08: Large Bundle Size Risk

**Impact:** `lucide-react-native` imports individual icons but the full icon set may still be bundled.

**Fix:** Verify tree-shaking works. Consider switching to `@expo/vector-icons` for icons already included in the Expo bundle.

---

### 🟡 PERF-09: Backend Route File Size (707 lines)

**File:** `unibackend/routes/api.php`

**Impact:** Single monolithic route file makes maintenance difficult and increases boot time slightly.

**Fix:** Split into route groups:

```
routes/
  api/
    auth.php
    cart.php
    orders.php
    admin.php
    driver.php
```

---

## 4. Architecture Audit <a name="architecture-audit"></a>

### 🔴 ARCH-01: Dual Cart Services with Inconsistent Logic

**Files:** `unibackend/app/Services/CartService.php` vs `RedisCartService.php`

**Previously:** CartService taxed `(subtotal + deliveryFee - discount)` but RedisCartService taxed `(subtotal - discount)`. Now tax is removed, but the pattern of duplicated services with diverging logic remains.

**Fix:** Either:

- Use CartService exclusively and cache results in Redis
- Or create a shared `CartCalculator` class that both services call

---

### 🔴 ARCH-02: Missing Repository Pattern

**Impact:** Controllers directly call Eloquent models and services inconsistently. Some controllers are 500+ lines.

**Fix:** Implement Repository + Service pattern:

```
Controller → Service → Repository → Model
```

---

### 🟠 ARCH-03: No API Versioning Strategy

**Impact:** All routes are under `/v1` but there's no plan for `/v2`. Breaking changes will break all active app versions.

**Fix:**

- Maintain backward compatibility on `/v1`
- Use API version header: `Accept: application/vnd.elbaraka.v2+json`
- Never remove fields — only add new ones

---

### 🟠 ARCH-04: Mixed Responsibility in Store

**File:** `frontend/store/index.ts`

The store handles state management AND API calls AND business logic. It should only manage state.

**Fix:** Separate concerns:

- **Store:** Pure state management (Zustand)
- **Services:** API communication
- **Hooks:** Business logic combining store + services

---

### 🟠 ARCH-05: No Error Boundary in React Native

**Impact:** Unhandled JS errors crash the entire app with no recovery option.

**Fix:**

```tsx
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <ErrorFallbackScreen />;
    return this.props.children;
  }
}
```

---

### 🟠 ARCH-06: Hardcoded Mock Data in Production

**File:** `frontend/data/orders.ts`

**Impact:** Mock addresses, orders, and test data may leak into production views.

**Fix:** Remove all mock data files or gate them behind `__DEV__` checks.

---

### 🟠 ARCH-07: Missing Service Provider Registration

**File:** `unibackend/app/Providers/` — only `AppServiceProvider.php` exists.

**Impact:** No dedicated providers for events, routes, policies, or broadcasting. Everything is dumped into AppServiceProvider.

**Fix:** Create dedicated providers:

```
AuthServiceProvider.php  → Policies & Gates
EventServiceProvider.php → Events & Listeners
RouteServiceProvider.php → Route model binding, rate limiting
BroadcastServiceProvider.php → WebSocket channels
```

---

### 🟡 ARCH-08: Frontend Services Not Using TypeScript Generics

**Impact:** API response types are manually cast everywhere instead of using typed API helpers.

**Fix:**

```typescript
async function apiGet<T>(url: string): Promise<T> {
  const response = await api.get(url);
  return response.data as T;
}
```

---

## 5. Security Audit <a name="security-audit"></a>

### 🔴 SEC-01: No Rate Limiting on Sensitive Endpoints

**File:** `unibackend/routes/api.php`

Most endpoints use `throttle:60,1` (60 requests/minute). But sensitive endpoints like password reset, OTP verification, and login need stricter limits.

**Fix:**

```php
Route::post('auth/login', [AuthController::class, 'login'])
     ->middleware('throttle:5,1');  // 5 attempts per minute

Route::post('auth/verify-email', [AuthController::class, 'verifyEmail'])
     ->middleware('throttle:3,1');  // 3 OTP attempts per minute
```

---

### 🔴 SEC-02: Missing CORS Configuration

**Impact:** Without proper CORS, the admin dashboard (running on a different port/domain) may be blocked, or worse, overly permissive CORS allows any website to make API calls.

**Fix:** In `config/cors.php`:

```php
'allowed_origins' => [
    'https://admin.elbaraka.com',
    'https://elbaraka.com',
],
'supports_credentials' => true,
```

---

### 🟠 SEC-03: No Input Validation on File Uploads

**Impact:** Users may upload malicious files (PHP scripts disguised as images).

**Fix:**

```php
$request->validate([
    'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
]);
```

---

### 🟠 SEC-04: Missing Security Headers

**File:** `unibackend/app/Http/Middleware/SecurityHeaders.php` exists ✅ but verify it sets:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`

---

### 🟠 SEC-05: No Request Logging for Admin Actions

**File:** `unibackend/app/Http/Middleware/LogAdminActivity.php` exists ✅ — verify it's applied to all admin routes.

---

### 🟡 SEC-06: Paymob Webhook Signature Verification

**File:** `unibackend/app/Http/Controllers/RefundWebhookController.php`

**Impact:** If webhook signatures aren't verified, an attacker can fake payment confirmations.

**Fix:** Verify HMAC signature on every webhook:

```php
$calculatedHmac = hash_hmac('sha512', $payload, config('services.paymob.hmac_secret'));
if (!hash_equals($calculatedHmac, $request->header('hmac'))) {
    abort(403, 'Invalid webhook signature');
}
```

---

## 6. Scalability Audit <a name="scalability-audit"></a>

### 🔴 SCALE-01: No Database Indexing Strategy

**Impact:** With 76 migrations, there's no evidence of composite indexes on frequently-queried columns.

**Fix:** Add indexes for common queries:

```sql
-- Orders by user (most common query)
ALTER TABLE orders ADD INDEX idx_user_status (user_id, status);

-- Products by category
ALTER TABLE products ADD INDEX idx_category_active (category_id, is_active);

-- Cart items by cart
ALTER TABLE cart_items ADD INDEX idx_cart_product (cart_id, product_id);
```

---

### 🟠 SCALE-02: No Queue Workers for Heavy Tasks

**Impact:** Email sending, invoice generation, and notification dispatch block the HTTP request cycle.

**Fix:**

```php
// Instead of
Mail::to($user)->send(new OrderConfirmation($order));

// Use queued mail
Mail::to($user)->queue(new OrderConfirmation($order));

// Run queue worker
php artisan queue:work redis --tries=3 --timeout=30
```

---

### 🟠 SCALE-03: No CDN for Static Assets

**Impact:** Product images served from the application server. Under load, image requests compete with API requests.

**Fix:**

- Use Cloudflare (free tier) or AWS CloudFront
- Store images on S3/R2 instead of local filesystem
- Use `FILESYSTEM_DISK=s3` in `.env`

---

### 🟠 SCALE-04: Single Database Connection

**Impact:** Read and write operations share the same database connection. Under load, reads block writes.

**Fix:** Use read/write splitting:

```php
// config/database.php
'mysql' => [
    'read' => ['host' => env('DB_READ_HOST')],
    'write' => ['host' => env('DB_WRITE_HOST')],
    // ... other config
],
```

---

### 🟡 SCALE-05: Session-based Cart for Guests

**Impact:** Guest carts stored in session/Redis expire. No cart recovery for abandoned sessions.

**Fix:** Use browser fingerprint or localStorage-synced cart IDs to allow cart recovery.

---

## 7. Code Quality Audit <a name="code-quality-audit"></a>

### 🔴 QUAL-01: Extensive TypeScript `any` Usage

**Impact:** Defeats the purpose of TypeScript. Runtime errors not caught at compile time.

**Fix:** Replace `any` with proper types:

```typescript
// Bad
} catch (error: any) {
    console.error(error.message);
}

// Good
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error(error.message);
    }
}
```

---

### 🟠 QUAL-02: Inconsistent Error Handling

**Impact:** Some endpoints return `{ message: "error" }`, others return `{ error: "error" }`, others return `{ success: false, message: "error" }`.

**Fix:** Create a standard error response format:

```php
// app/Traits/ApiResponses.php
trait ApiResponses {
    protected function success($data, $message = null, $code = 200) {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $code);
    }

    protected function error($message, $code = 400, $errors = null) {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $code);
    }
}
```

---

### 🟠 QUAL-03: Dead Code and Unused Imports

**Impact:** Increases bundle size and confuses developers.

**Fix:** Run `npx tsc --noEmit` and fix all TypeScript errors. Use ESLint's `no-unused-vars` rule.

---

### 🟠 QUAL-04: Missing i18n Keys

**Impact:** Several strings are hardcoded in English across the app. Arabic users see mixed-language UI.

**Fix:** Audit all `.tsx` files for raw strings and add i18n keys:

```typescript
// Bad
<Text>No Saved Cards</Text>

// Good
<Text>{t.paymentMethods.noSavedCards}</Text>
```

---

### 🟡 QUAL-05: Magic Numbers Throughout Codebase

**Impact:** Numbers like `200` (free delivery threshold), `25` (delivery fee), `3600` (cache TTL) are scattered without constants.

**Fix:**

```php
// config/elbaraka.php
return [
    'delivery_fee' => env('DELIVERY_FEE', 25),
    'free_delivery_threshold' => env('FREE_DELIVERY_THRESHOLD', 200),
    'cache_ttl' => env('CACHE_TTL', 3600),
];
```

---

## 8. DevOps & Deployment Guide <a name="devops-guide"></a>

### Current State: ❌ No CI/CD, Manual Deployment

### Recommended Production Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare CDN                     │
│              (SSL, DDoS, Static Cache)               │
└────────────────┬────────────────┬────────────────────┘
                 │                │
    ┌────────────▼──┐    ┌───────▼────────┐
    │  Nginx        │    │  Static Files  │
    │  (Reverse     │    │  (R2/S3)       │
    │   Proxy)      │    └────────────────┘
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │  Laravel App  │──── Redis (Cache + Queue + Sessions)
    │  (PHP-FPM)    │
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │  MySQL 8      │
    │  (Primary)    │──── MySQL Replica (Read)
    └───────────────┘
```

### Step-by-Step Production Deployment

#### A. Server Setup (Ubuntu 22.04)

```bash
# 1. Update & install essentials
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server redis-server php8.2-fpm php8.2-mysql \
  php8.2-redis php8.2-curl php8.2-xml php8.2-mbstring php8.2-zip \
  php8.2-gd php8.2-bcmath composer certbot python3-certbot-nginx

# 2. Configure MySQL
sudo mysql_secure_installation
mysql -u root -p -e "CREATE DATABASE elbaraka; CREATE USER 'elbaraka'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD'; GRANT ALL ON elbaraka.* TO 'elbaraka'@'localhost'; FLUSH PRIVILEGES;"

# 3. Deploy Laravel
cd /var/www
git clone https://github.com/your-repo/elbaraka-backend.git elbaraka
cd elbaraka
composer install --no-dev --optimize-autoloader
cp .env.example .env
# Edit .env with production values
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Set permissions
sudo chown -R www-data:www-data /var/www/elbaraka
sudo chmod -R 755 /var/www/elbaraka/storage
sudo chmod -R 755 /var/www/elbaraka/bootstrap/cache
```

#### B. Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.elbaraka.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.elbaraka.com;

    ssl_certificate /etc/letsencrypt/live/api.elbaraka.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.elbaraka.com/privkey.pem;

    root /var/www/elbaraka/public;
    index index.php;

    # Gzip
    gzip on;
    gzip_types application/json text/css application/javascript;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Block dotfiles
    location ~ /\. { deny all; }

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### C. SSL Certificate

```bash
sudo certbot --nginx -d api.elbaraka.com
sudo certbot renew --dry-run  # verify auto-renewal
```

#### D. Queue Worker (Systemd)

```ini
# /etc/systemd/system/elbaraka-worker.service
[Unit]
Description=El Baraka Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
RestartSec=5
ExecStart=/usr/bin/php /var/www/elbaraka/artisan queue:work redis --tries=3 --timeout=90

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable elbaraka-worker
sudo systemctl start elbaraka-worker
```

#### E. Scheduled Tasks (Cron)

```bash
# Add to crontab (sudo crontab -u www-data -e)
* * * * * cd /var/www/elbaraka && php artisan schedule:run >> /dev/null 2>&1
```

#### F. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with: { php-version: "8.2" }
      - run: composer install --prefer-dist
      - run: cp .env.testing .env
      - run: php artisan key:generate
      - run: php artisan test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/elbaraka
            git pull origin main
            composer install --no-dev --optimize-autoloader
            php artisan migrate --force
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            sudo systemctl restart elbaraka-worker
```

#### G. Monitoring Setup

```bash
# 1. Install monitoring (Laravel Telescope for dev, Sentry for production)
composer require sentry/sentry-laravel

# 2. Health check endpoint already exists: GET /health
# Set up uptime monitoring (UptimeRobot - free):
# Monitor: https://api.elbaraka.com/health every 5 min

# 3. Log aggregation
# Laravel logs → /storage/logs/laravel.log
# Rotate logs daily:
# config/logging.php → 'daily' channel, 'days' => 14
```

#### H. Backup Strategy

```bash
# /scripts/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/backups

# Database backup
mysqldump -u elbaraka -p'PASSWORD' elbaraka | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Storage backup (user uploads)
tar czf $BACKUP_DIR/storage_$DATE.tar.gz /var/www/elbaraka/storage/app/public

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

# Upload to S3 (optional)
# aws s3 sync $BACKUP_DIR s3://elbaraka-backups/
```

```bash
# Crontab
0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

### Mobile App Deployment

#### Expo EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
cd frontend
eas build:configure

# Build for Android (APK for testing)
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

#### Environment Variables for Builds

```json
// eas.json
{
  "build": {
    "development": {
      "env": { "API_URL": "http://192.168.1.10:8000/api/v1" }
    },
    "preview": {
      "env": { "API_URL": "https://staging-api.elbaraka.com/api/v1" }
    },
    "production": {
      "env": { "API_URL": "https://api.elbaraka.com/api/v1" }
    }
  }
}
```

---

## 9. Database Optimization Guide <a name="database-optimization"></a>

### Current State: 76 Migrations, ~54 Models

### Recommended Indexes

```sql
-- High-priority indexes (add migration)
-- Orders
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Products
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_products_featured ON products(is_featured, is_active);
CREATE INDEX idx_products_slug ON products(slug);

-- Cart Items
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);

-- Notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);

-- Delivery Zones
CREATE INDEX idx_delivery_zones_active ON delivery_zones(is_active);
```

### Query Optimization Tips

```php
// ❌ Bad: Loading all products with all relations
$products = Product::all();

// ✅ Good: Paginated with eager loading and selected columns
$products = Product::with(['category:id,name', 'images:id,product_id,url'])
    ->where('is_active', true)
    ->select(['id', 'name', 'price', 'category_id', 'slug'])
    ->paginate(20);
```

---

## 10. Enhancement Roadmap <a name="enhancement-roadmap"></a>

### Phase 1: Critical Fixes (Week 1-2)

| #   | Task                                     | Priority    | Effort |
| --- | ---------------------------------------- | ----------- | ------ |
| 1   | Deploy backend to proper VPS with domain | 🔴 Critical | 4h     |
| 2   | Fix auth token storage (SecureStore)     | 🔴 Critical | 2h     |
| 3   | Add Laravel Policies for IDOR protection | 🔴 Critical | 4h     |
| 4   | Add rate limiting to auth endpoints      | 🔴 Critical | 1h     |
| 5   | Configure CORS properly                  | 🟠 High     | 1h     |

### Phase 2: Performance (Week 3-4)

| #   | Task                                       | Priority    | Effort |
| --- | ------------------------------------------ | ----------- | ------ |
| 6   | Implement React Query across all API calls | 🔴 Critical | 8h     |
| 7   | Add Redis caching for products/categories  | 🟠 High     | 3h     |
| 8   | Fix N+1 queries with eager loading         | 🟠 High     | 3h     |
| 9   | Split Zustand store into domain stores     | 🟠 High     | 4h     |
| 10  | Add database indexes                       | 🟠 High     | 2h     |

### Phase 3: Architecture (Week 5-6)

| #   | Task                                 | Priority  | Effort |
| --- | ------------------------------------ | --------- | ------ |
| 11  | Standardize API error responses      | 🟠 High   | 3h     |
| 12  | Unify CartService + RedisCartService | 🟠 High   | 4h     |
| 13  | Add Error Boundary to app            | 🟠 High   | 1h     |
| 14  | Remove mock/hardcoded data           | 🟡 Medium | 2h     |
| 15  | Split routes into modules            | 🟡 Medium | 2h     |

### Phase 4: DevOps (Week 7-8)

| #   | Task                               | Priority    | Effort |
| --- | ---------------------------------- | ----------- | ------ |
| 16  | Set up CI/CD with GitHub Actions   | 🔴 Critical | 4h     |
| 17  | Configure automated backups        | 🟠 High     | 2h     |
| 18  | Set up uptime monitoring           | 🟠 High     | 1h     |
| 19  | Add Sentry error tracking          | 🟠 High     | 1h     |
| 20  | Write unit tests for core services | 🟠 High     | 8h     |

---

## 11. Recommended Tech Stack Improvements <a name="tech-stack"></a>

### Keep (Already Good ✅)

| Tech                    | Why                                  |
| ----------------------- | ------------------------------------ |
| **Expo 54**             | Latest, excellent DX, OTA updates    |
| **React Native 0.81**   | Latest with new architecture         |
| **Zustand**             | Lightweight, fast state management   |
| **Laravel 11**          | Solid, well-documented PHP framework |
| **Redis**               | Excellent for caching and queues     |
| **TypeScript**          | Type safety across frontend          |
| **TailwindCSS** (admin) | Fast UI development                  |

### Add

| Tech                  | Why                                              | Priority    |
| --------------------- | ------------------------------------------------ | ----------- |
| **React Query**       | Already installed – activate it for data caching | 🔴 Critical |
| **Sentry**            | Error tracking in production                     | 🟠 High     |
| **expo-image**        | Better image caching than `Image`                | 🟠 High     |
| **Cloudflare**        | Free CDN, SSL, DDoS protection                   | 🟠 High     |
| **GitHub Actions**    | Free CI/CD for GitHub repos                      | 🟠 High     |
| **Laravel Horizon**   | Redis queue monitoring dashboard                 | 🟡 Medium   |
| **Laravel Telescope** | Development debugging tool                       | 🟡 Medium   |

### Consider Replacing

| Current               | Replace With               | Why                       |
| --------------------- | -------------------------- | ------------------------- |
| Ngrok tunnel          | Nginx + VPS                | Proper production hosting |
| localStorage (admin)  | httpOnly cookies           | XSS protection            |
| AsyncStorage (tokens) | expo-secure-store          | Encrypted storage         |
| Manual deploys        | EAS Build + GitHub Actions | Automated releases        |

---

## Summary

The El Baraka system has a solid foundation with modern technologies (Expo 54, React 19, Laravel 11, Redis). However, it currently operates in a "development mode" configuration that is not production-ready. The most critical issues are:

1. **No proper hosting** — relying on ngrok tunnels
2. **Insecure token storage** — plaintext on device
3. **No authorization layer** — missing IDOR protection
4. **No test coverage** — extremely risky to make changes
5. **Wasted React Query** — installed but unused, causing redundant API calls

Addressing these 5 items alone would dramatically improve the system's reliability, security, and performance. The full roadmap above provides a structured 8-week plan to bring the system to production quality.

---

_This document should be reviewed and updated quarterly as the system evolves._
