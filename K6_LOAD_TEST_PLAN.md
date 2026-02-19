# ElBaraka Load Testing Plan — k6

## Objective

Simulate **100 concurrent users** performing realistic grocery-app flows against the production API (`https://cartshop.site/api/v1`) to identify bottlenecks, race conditions, and breaking points.

---

## System Under Test

| Component       | Detail                                          |
|-----------------|-------------------------------------------------|
| Backend         | Laravel 11 (PHP) + MySQL 8.4                    |
| Auth            | Sanctum Bearer Token                            |
| API Base URL    | `https://cartshop.site/api/v1`                  |
| DB Tables       | ~40 tables, 1569 products, 1528 users, 107 orders |
| External APIs   | Paymob (card payments), Pusher (WebSocket)      |

---

## Test Scenarios (Priority Order)

### 1. AUTH — Login Storm (CRITICAL)
**Why it breaks things:** Token generation, password hashing (bcrypt), and DB writes (revoke old tokens + create new) are CPU-heavy. Rate limiter: 60/min per IP.

| Step | Endpoint | Method |
|------|----------|--------|
| Login | `/auth/login` | POST |
| Get Profile | `/profile` | GET |
| Refresh Token | `/auth/refresh` | POST |

**Thresholds:** p95 < 2s, error rate < 5%

---

### 2. BROWSE — Product Catalog Load (HIGH)
**Why it breaks things:** Product listing with filters, sorting, and search hits MySQL FULLTEXT indexes. Category tree traversal with recursive CTEs.

| Step | Endpoint | Method |
|------|----------|--------|
| List Products | `/products?per_page=20` | GET |
| Featured Products | `/products/featured` | GET |
| Search Products | `/products?search=milk` | GET |
| Categories | `/categories` | GET |
| Category Products | `/categories/{id}/products` | GET |
| Single Product | `/products/{barcode}` | GET |

**Thresholds:** p95 < 1s (cached), p95 < 3s (uncached), error rate < 1%

---

### 3. CART — Add/Update/Remove (HIGH)
**Why it breaks things:** No transactions in addItem(), TOCTOU race on stock check, cart ownership merge race on login. Missing cache population (all reads hit DB).

| Step | Endpoint | Method |
|------|----------|--------|
| View Cart | `/cart` | GET |
| Add Item | `/cart/items` | POST |
| Add 2nd Item | `/cart/items` | POST |
| Update Quantity | `/cart/items/{id}` | PUT |
| Apply Promo | `/cart/apply-promo` | POST |
| Remove Item | `/cart/items/{id}` | DELETE |

**Thresholds:** p95 < 1.5s, error rate < 3%

---

### 4. CHECKOUT + ORDER — Full Purchase Flow (CRITICAL)
**Why it breaks things:** DB transaction with pessimistic locks on products, stock decrement race, wallet debit without rollback if Paymob fails, promo code usage_count race.

| Step | Endpoint | Method |
|------|----------|--------|
| Login | `/auth/login` | POST |
| Get Addresses | `/addresses` | GET |
| Get Cart | `/cart` | GET |
| Add Item to Cart | `/cart/items` | POST |
| Add 2nd Item | `/cart/items` | POST |
| Calculate Summary | `/checkout/calculate` | POST |
| Create Order | `/orders` | POST |
| Get Order | `/orders/{id}` | GET |
| Track Order | `/orders/{id}/tracking` | GET |

**Thresholds:** p95 < 4s, error rate < 5%, 0 double-orders

---

### 5. ORDER TRACKING — Polling Storm (MEDIUM)
**Why it breaks things:** Users poll tracking endpoint every 10-30s. With 100 concurrent users on active orders, this creates sustained DB load.

| Step | Endpoint | Method |
|------|----------|--------|
| List My Orders | `/orders` | GET |
| Order Details | `/orders/{id}` | GET |
| Tracking | `/orders/{id}/tracking` | GET |

**Thresholds:** p95 < 2s, error rate < 2%

---

### 6. CANCEL + REFUND — Stress Test (MEDIUM)
**Why it breaks things:** lockForUpdate on Order, rate limiter (1 cancel/30s), Phase 3 stock restore not transactional.

| Step | Endpoint | Method |
|------|----------|--------|
| Check Can Cancel | `/orders/{id}/can-cancel` | GET |
| Cancel Order | `/orders/{id}/cancel` | POST |
| Refund History | `/orders/{id}/refunds` | GET |

**Thresholds:** p95 < 3s, error rate < 10% (rate limiter expected)

---

### 7. FULL USER JOURNEY — End-to-End (CRITICAL)
**Why it breaks things:** Combines all flows to simulate real user behavior. Exposes cross-flow contention.

End-to-end flow per VU:
1. Login → 2. Browse Products → 3. Add to Cart → 4. Checkout/Order → 5. Track → 6. Cancel (30% of users)

---

## Virtual User Distribution (100 VUs)

| Scenario | VUs | Duration | Ramp |
|----------|-----|----------|------|
| Auth Login Storm | 100 | 2 min | 30s ramp-up |
| Browse Catalog | 100 | 2 min | 30s ramp-up |
| Cart Operations | 50 | 2 min | 20s ramp-up |
| Full Order Flow | 100 | 3 min | 30s ramp-up |
| Tracking Poll | 50 | 2 min | 10s ramp-up |
| Cancel/Refund | 30 | 1 min | 10s ramp-up |
| Full Journey (E2E) | 100 | 5 min | 1 min ramp-up |

---

## Test Data

### Login Credentials (test users)
Will create 100 test users via seeder before running tests.

### Product Barcodes (active, in-stock)
```
1230331, 1230739, 1231233, 1231932, 2781433
2783842, 2852724, 2854528, 2886925, 2888224
```

### Delivery Zones
```
Zone 1: id=1, fee=20, min_order=1
Zone 2: id=2, fee=30, min_order=1
Zone 3: id=3, fee=30, min_order=2
```

---

## Known Risk Areas (from code audit)

| # | Risk | Severity | Service |
|---|------|----------|---------|
| 1 | Cart `getCart()` race condition — read-modify-write without txn | HIGH | CartService |
| 2 | `payWithWalletAndCard()` wallet debit committed before Paymob | HIGH | CheckoutService |
| 3 | `payWithCardOnly()` no transaction on PaymobPayment + Order | HIGH | CheckoutService |
| 4 | Cart cache defined but never populated — all reads hit DB | MEDIUM | CartService |
| 5 | `reorder()` N+1 — addItem() per order item | MEDIUM | OrderService |
| 6 | Phase 3 cancel: restoreStock + rollbackPromo not transactional | MEDIUM | CancellationService |
| 7 | `addItem()` stock check no lock (TOCTOU) | MEDIUM | CartService |
| 8 | BOGO recursive CTE on deep category trees | LOW | CartService |
| 9 | Verbose logging in createOrderFromCart | LOW | OrderService |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| HTTP Error Rate (non-4xx) | < 5% |
| p95 Response Time | < 3s (API), < 5s (checkout) |
| p99 Response Time | < 8s |
| Data Integrity | 0 duplicate orders, 0 negative stock, 0 double-charged wallets |
| Throughput | > 50 req/s sustained |

---

## Files

| File | Purpose |
|------|---------|
| `k6-tests/01-auth-storm.js` | Login/logout/refresh load test |
| `k6-tests/02-browse-catalog.js` | Product browsing & search |
| `k6-tests/03-cart-operations.js` | Cart CRUD stress test |
| `k6-tests/04-full-order-flow.js` | Complete order placement |
| `k6-tests/05-tracking-poll.js` | Order tracking polling |
| `k6-tests/06-cancel-refund.js` | Cancel/refund stress test |
| `k6-tests/07-full-journey.js` | End-to-end user journey |
| `k6-tests/helpers.js` | Shared config, headers, checks |
| `k6-tests/seed-test-users.php` | DB seeder for 100 test users |
