# Backend Deep Audit — `unibackend/`

**Scope**: Laravel 11 backend at `D:\elbarakkaaaaa\unibackend\`
**Branch**: `feature/card-machine-request` (waves 1+2+3 merged; today's mobile fixes ported in)
**Method**: 10 parallel domain audits (auth, RBAC, input/injection, payments, database, business logic, performance, dead code, errors/logging, architecture/tests) followed by cross-review
**Date**: 2026-05-15
**Baseline test suite**: `AuditFindingsTest` — **52 passed (108 assertions)**

---

## Executive verdict

> The codebase is **MVP-grade**: it works, recent security waves closed several real exploits, and the core data model is sound. But it is **not production-hardened**. **Cancel/refund flow is currently broken in admin paths** (customer money stays with Paymob, no audit trail), **paid-card orders are stuck invisible to drivers** until manual admin intervention, and **registration is currently an auth bypass** (OTP gate is commented out). Test coverage is regression-only — there are no happy-path tests for refunds, role changes, or password reset.
>
> **Stability verdict: DO NOT SHIP** to a real money workload until at least the 12 Critical-1 items below are fixed. After those are addressed, the system can ship to a controlled beta. Full production-hardening requires the High-priority items as well.

---

## Critical chains (cross-corroborated by multiple agents)

These are the failures where two or more independent audits converge on the same root cause — highest confidence, highest priority.

| # | Chain | Agents | Why it's bad |
|---|---|---|---|
| C1 | **Registration auth bypass** — `AuthController:65-99` auto-sets `is_verified=true`, issues access+refresh tokens, OTP flow is commented out. Combined with `forgot-password` requiring `email_verified_at` (498), an attacker who registers first can lock out a legitimate user's signup. | Auth, Architecture, Dead-code | Any "verified" claim across the app is meaningless; complete account takeover via prior-registration. |
| C2 | **Admin order-cancel bypass** — `Admin/AdminOrderController::cancel:196-253` bypasses `OrderCancellationService` entirely (no Paymob refund call, no `OrderRefund` row, no promo rollback, no `ActivityLog`). Plus the `permission:orders.view,orders.manage` OR-pattern lets `support` / `store_manager` roles reach this endpoint at all. | RBAC, Business, Errors | Money stays with Paymob; customer-facing "cancelled" with no refund; audit trail absent. |
| C3 | **Refund double-charge surface** — `RefundService` calls `paymobService->refundTransaction()` inside `DB::transaction` AND ignores `success:false`; uses `refund_locks` table while `OrderCancellationService` uses `idempotency_key` precheck (wave-3 only unified row shape). Two parallel refunds can both charge Paymob. | Payments, Business | Real money lost; "refund successful" notification sent when Paymob refused. |
| C4 | **Permission OR-pattern** — `permission:x.view,x.manage` evaluated as OR throughout `routes/api.php`. `store_manager` has only `products.view` yet can write products; `cashier` has only `customers.view` yet can reset customer passwords. | RBAC | Vertical privilege escalation across most admin write surfaces. |
| C5 | **Paid card orders invisible to drivers** — `PaymentConfirmationService:80-83` sets paid card orders to `status='pending'`; `DriverController::acceptOrder:169` only accepts `status='confirmed'`. COD/card-on-delivery jump straight to `confirmed`. | Business | Card customers' orders sit forever until admin manual flip. |
| C6 | **Payment webhook has no replay protection** — `PaymentController::processedCallback:597` has no `paymob_webhook_events` insert and no age cutoff. Only the refund webhook has this. | Payments | Captured webhook can be replayed indefinitely. |
| C7 | **Stored XSS surfaces** — `Admin/StaticPageController:147-148` accepts raw HTML for `content_en/content_ar` rendered in mobile WebView; `Admin/AdminProductController:226` + `Admin/AdminCategoryController:98` allow SVG uploads served via Cloudinary as `image/svg+xml`. | Input, RBAC | Any admin (or attacker who escalates via C4) can JS-inject every user. |
| C8 | **SQL injection via admin sort** — `Admin/OrderController:93-95` + `Admin/AdminReviewController:18-19,38` accept raw `sort_by` and `sort_order` from the request and pass them to `orderBy($sortBy, $sortOrder)`. | Input | Admin can craft `sort_order=desc,(SELECT SLEEP(5))` for DoS / blind injection. |
| C9 | **partialItemRefund swallow-and-succeed** — `OrderCancellationService:330-353` Phase 3 catches exceptions but **still returns `success=true`**. Paymob refunded ✓ but DB shows items not marked refunded, stock not restored, totals stale. | Business | Customer/admin sees "refund completed"; orphan audit row, real-world stock & money mismatch. |
| C10 | **COD partial cancel doesn't recompute total** — `codPartialItemCancel:416-522` updates `refunded_amount` only; `Order::total` and `subtotal` keep their original values. | Business | Driver asks customer to pay full original amount, including the cancelled items. |
| C11 | **`password.confirm` middleware unreachable from mobile** — `RequirePasswordConfirmation:28` reads `$request->session()->get('auth.password_confirmed_at')` but the API is stateless bearer-token. Used on `DELETE /payment-methods/{id}` and `POST /checkout/process-payment`. | Auth | Step-up auth is either ineffective or unreachable. |
| C12 | **Synchronous network in request path** — `PushNotificationService::dispatchPushToUser` (90s worst case with retries) + `OrderController::sendInvoice:789` (sync `Mail::send` + dompdf) + `Admin/AdminProductController::update:155-194` (N×30s Expo HTTP per watcher). | Performance, Errors, Architecture | One slow third-party call exhausts PHP-FPM workers; trivial DoS. |

---

## Critical-1 (independent findings, must fix before ship)

| # | Finding | File:Line | Fix |
|---|---|---|---|
| I1 | `PaymentController::processedCallback` no replay store / age cutoff | `PaymentController.php:597-688` | Insert into `paymob_webhook_events` keyed by `transaction_id`; reject `created_at > 10 min` |
| I2 | `OrderService::createOrderFromCart` calls notifications + `UserPurchasePattern::recordPurchase` inside `DB::transaction` | `OrderService.php:228-256` | Move to `DB::afterCommit()` |
| I3 | `InventoryService::syncStockToDatabase` duplicate decrement (dead code today, dangerous if wired) | `InventoryService.php:249-261` | Delete `InventoryService` entirely (never injected per Agent 8) |
| I4 | `Admin/PromotionController::update:245` uses `$request->except(...)` not `$validator->validated()` — `created_by` rewritable | `Admin/PromotionController.php:245` | Use `validated()` and strip `created_by` |
| I5 | `POST /admin/orders/{id}/assign-driver` registered outside any permission middleware | `routes/api.php:659` | Wrap in `permission:drivers.manage` |
| I6 | `GET /api/v1/reviews/{id}` public + returns reviews regardless of moderation status | `V1/ReviewController.php:34-38` | Add `where('status', 'approved')` like `getProductReviews` |
| I7 | `Migration 2026_01_22…add_pending_payment_status_to_orders` `down()` drops `partially_refunded` from enum (data loss on rollback) | migration file | Use the preserve-siblings pattern (see `9f582da`) |
| I8 | `Migration 2026_01_26…update_promo_codes_for_targets_and_bogo` `down()` is empty/no-op | migration file | Implement explicit down |
| I9 | `PromoCodeService::recordUsage:212-232` increments `used_count` without `lockForUpdate` | `PromoCodeService.php:212` | Use `PromoCode::where('id', ...)->lockForUpdate()->increment('used_count')` like `OrderService::finalizePromoUsage` |
| I10 | `CustomerController::update` silently no-ops on `is_active`/`is_cod_restricted`/`is_vip`/`max_order_value` (not on `User::$fillable`) | `Admin/CustomerController.php:147` | Use `forceFill()` after permission check; OR add to fillable and ensure FormRequest strips on customer-facing endpoints |
| I11 | `RefundService::partialRefund` lacks idempotency-key precheck before Paymob call | `RefundService.php:151-233` | Mirror `OrderCancellationService::partialItemRefund:277-299` precheck |
| I12 | `Order::generateOrderNumber` check-then-insert with no lock and **no retry wrapper** in `OrderService` despite docblock claiming retry | `Order.php:299-322` + `OrderService.php:159` | Wrap `Order::create` in a 1062-retry loop |
| I13 | Two BOGO engines in live paths produce different totals — `PromoCodeService::applyPromoCode` (apply endpoint) vs `CartService::evaluatePromoForCart` (order creation) | both | Make apply-endpoint delegate to `CartService` |
| I14 | `CheckoutService::calculateOrderSummary:410` has no `max(0, …)` clamp — preview can return negative total | `CheckoutService.php:410` | Mirror `CartService::calculateTotals` clamp |
| I15 | Dead route `POST /api/v1/admin/refund-dashboard/reconcile` — method doesn't exist → 500 | `routes/api.php`, `Admin/AdminRefundDashboardController.php` | Implement or remove route |

---

## High-severity findings

| # | Finding | File:Line | Fix summary |
|---|---|---|---|
| H1 | `OTP verifyResetOtp` no attempt counter — 6-digit OTP × no lockout = ~10⁶ brute force within 10-min window | `Auth/AuthController.php:524-556` | Per-identifier failure counter; invalidate OTP after N |
| H2 | `resetPassword` revokes tokens AFTER password change but has no current-password requirement | `Auth/AuthController.php:586-587` | OK as designed for forgot flow; add notify-by-email |
| H3 | Refresh-token throttle is per-IP (60/min) — leaked refresh-token replayable | `routes/api.php:90` | Throttle by token-id (5/min) + reuse detection |
| H4 | Forgot-password / register / `check-email` / `check-phone` leak account existence (3-way oracle) | `Auth/AuthController.php:474,491,842,879` | Return generic 200 "if account exists, OTP sent" |
| H5 | Google sign-in doesn't enforce `email_verified=true` from Google for new-account creation path | `Auth/SocialAuthController.php:84-93` | Reject if `!$emailVerified` |
| H6 | Apple sign-in accepts `email=null` on subsequent logins (only sent on first sign-in) | `Auth/SocialAuthController.php:213-217` | Persist on first link, reuse thereafter |
| H7 | Social-auth login revokes ALL tokens on every social login | `Auth/SocialAuthController.php:541` | Remove `tokens()->delete()` for parity with email-login |
| H8 | `complaints.{id}` private channel grants any `isAdmin()` (cashier included) | `routes/channels.php:9-23` | Tighten to `support` permission via RbacService |
| H9 | `PaymentController::checkStatus` null-ownerId bypass if `$payment->user_id` and `$payment->order` both null | `PaymentController.php:1099-1111` | `if (!$ownerId || $ownerId !== auth()->id()) return 403;` |
| H10 | `Admin/AdminRefundDashboardController` whitelisted `sort_by` but raw `sort_order` | `Admin/AdminRefundDashboardController.php:92-96` | Force `asc`/`desc` |
| H11 | `RefundWebhookController:108` `if (!$isRefund && !$transactionId)` — logic bug | `RefundWebhookController.php:108` | Should be `||` |
| H12 | Save-card cache key only keyed by `paymob_order_id` (attacker-controllable cross-customer) | `PaymentController.php:707-741` | Bind cache key to `(payment_id, paymob_order_id)` |
| H13 | `PaymobPayment.billing_data` stored unencrypted (PII) | `PaymobPayment.php:43-54` | Use `encrypted:array` cast |
| H14 | No canonical `create_products_table` / `create_categories_table` / `create_reviews_table` migrations — `migrate:fresh` is broken | DB structure | Document SQL-dump dep OR add canonical create migrations |
| H15 | `product_id` columns referenced as FK to `products.barcode` with **no actual FK constraint** | order_items, cart_items, promo_code_products, etc. | Add FK constraints (or document the gap with cleanup job) |
| H16 | `migrate:fresh` on the 2026_05_10_000003 migration's `down()` sets `user_id=0` then re-adds cascade FK — FK constraint will fail (no user id=0) | migration file | Down should seed a sentinel user or no-op |
| H17 | `Admin/AdminOrderController::index` runs 9 `(clone $query)->count/sum()` aggregates before paginate | `Admin/AdminOrderController.php:79-90` | Single `selectRaw('status, COUNT(*), SUM(total)')->groupBy('status')` |
| H18 | `Admin/AdminReviewController` stats runs 14+ clone counts/avgs | `Admin/AdminReviewController.php:64-92` | Single `selectRaw('rating, rating_type, is_approved, COUNT(*)')` |
| H19 | `AnalyticsController:38-42` cache key built from raw user-supplied dates — admin can flood Redis | `Admin/AnalyticsController.php:38-42` | `Carbon::parse(...)->toDateString()` first |
| H20 | `PromoCodeService::getAnalytics` top_users N+1 via `User::find()` per row | `PromoCodeService.php:284-300` | `User::whereIn()->keyBy('id')` |
| H21 | `V1/ReviewController::updateProductRating:284-291` loads all approved reviews to count/avg in PHP, no transaction/lock | `V1/ReviewController.php:284-291` + `99-100` | `selectRaw` + row lock |
| H22 | No `app/Exceptions/Handler.php` and no custom exception classes — `APP_DEBUG=true` leaks full traces | bootstrap | Implement Handler with debug-gated detail leak |
| H23 | No Sentry / Bugsnag / Slack — crashes are file-log-only | composer.json, config/logging | Add Sentry or similar |
| H24 | Admin privileged actions don't `ActivityLog::log()` (refunds, price changes, zone changes, role-permission edits, store settings) | `Admin/*Controller.php` | Add per-action audit rows with before/after diffs |
| H25 | 11/13 queue jobs missing `$timeout` — workers can hang indefinitely on Paymob reconcile / Expo push | `app/Jobs/*.php` | Set `$timeout = N; $failOnTimeout = true;` everywhere |
| H26 | `Order::generateOrderNumber`/`generateInvoiceNumber` swallows `\Throwable` silently with no log | `Order.php:299-322` | Log warning with attempt count |
| H27 | `routes/api.php:526` cashier role group: customer-update / reset-password / notes are write actions sitting behind `customers.view,customers.manage` OR-pattern | route grouping | Split write actions behind `customers.manage` only |
| H28 | `PaymentController:679-688` "success but not captured/auth" branch uses raw `markAsFailed` instead of `confirmationService->failPayment` — no stock restore | `PaymentController.php:679-688` | Route through `confirmationService->failPayment` |
| H29 | `Admin/SupportController` has two endpoints (`update`, `updateStatus`) writing same `status` column with no transition guard — `closed → open` flips drop `resolved_at` | `Admin/SupportController.php:118-141, 146-174` | Centralize transitions in a service |
| H30 | `Admin/AdminOrderController::updateStatus:136-153` allows `confirmed → preparing` for card orders without checking `payment_status` | same file | Mirror `DriverController::acceptOrder` payment guard |

---

## Medium / Low summary (selected)

- **Cache + queue defaults are `database`** — heavy fan-out cache keys + queue jobs hammer the same DB. Move to Redis in env.
- **Guest cart keyed on `X-Session-ID` header** — attacker-controllable. Need server-issued signed cookie.
- **`PaymobService` logs full `$response->body()` on errors** — can contain card metadata.
- **No `request_id` / `correlation_id` middleware** — tracing across logs is impossible.
- **`SearchSuggestionsController` runs `LIKE '%query%'` across multiple columns** — unindexable, no rate limit at controller (only middleware throttle).
- **God classes**: PaymentController 1617 LOC, AuthController 1363, OrderCancellationService 1285, PaymobService 1168, CartService 1083, ComprehensiveAnalyticsController 1112.
- **Duplicate admin controllers** from incomplete rename: `Admin/OrderController.php` ↔ `Admin/AdminOrderController.php`, `Admin/ReviewController.php` ↔ `Admin/AdminReviewController.php`, `Admin/StoreSettingsController.php` ↔ `Admin/AdminStoreSettingsController.php`.
- **`Admin/RateLimitController`** has 9 methods, zero routes.
- **`Brand` model** survived its drop migration.
- **`OrderStatusHistory` model** with no migration (table never existed).
- **`PromoCode::$appends = ['status','remaining_uses','is_expired','discount_display']`** forces 4 derived attributes per serialization; `discount_display` lazy-loads relations → N+1 on admin promo list.
- **Wallet branches** still in `PushNotificationService` + `lang/{en,ar}/wallet.php`.

---

## Logic flow verdicts (per Agent 6)

| Flow | Verdict | Worst defect |
|---|---|---|
| 1. Cart → checkout → place order → driver → delivered | **RISKY** | Card payments stuck at `pending`, never reach drivers without admin |
| 2. Apply promo → discount → finalize/rollback | **SAFE** | (BOGO preview/charge mismatch is documented and limited to recommendations) |
| 3. Cancel order → refund → restore stock | **BROKEN** | Admin cancel bypasses refund service; COD partial doesn't recompute totals; partialItemRefund swallow-then-succeed |
| 4. Address → zone match → fee → snapshot | **SAFE** | (only minor concern: Nominatim fail-open keeps client `place_id`) |
| 5. Support ticket lifecycle | **RISKY** | Two endpoints write the same status with no transition guard; customer escalation message mis-attributed |
| 6. Reviews / ratings | **RISKY** | Product rating recalc races; "order experience" rating type defined but no controller writes it |

---

## Architecture & test coverage

- **Rating: MVP**. Works in production but accumulates structural debt rapidly.
- **2 substantive test files** for ~24 controllers and ~25 services. Coverage is **purely security-regression**.
- **No happy-path tests** for: password reset, role change, refund, order cancel, broadcasting auth, queue job retries.
- **No factories** visible for Order / Cart / PromoCode / PaymentMethod — tests depend on SQL-dump shape (fixture/seed drift risk).
- **5 `markTestSkipped` calls** in `AuditFindingsTest` — silently skip when seed data missing; CI cannot distinguish skipped from passed.
- **No repository layer** — every service queries Eloquent directly. Hard to swap data stores or test without DB.

---

## Recommended fix priority (in order)

### Wave A — Ship blockers (before any production push)
1. **C1** (registration OTP bypass) — restore OTP gate
2. **C2 + C4** (admin cancel bypass + permission OR-pattern) — split `permission:x.view,x.manage` into separate groups; route admin cancel through `OrderCancellationService::adminCancelOrder`
3. **C5** (paid card orders stuck) — confirm card orders go to `status='confirmed'` after webhook, not `pending`
4. **C6** (payment webhook replay protection) — reuse the `paymob_webhook_events` table the refund webhook already uses
5. **C9** + **C10** (partial refund swallow + COD partial total) — wrap Phase 3 with retry/202, recompute total on COD partial
6. **C3** + **I11** (refund double-charge surface) — unify on `OrderCancellationService::executePaymobRefund`; consider deleting `RefundService` entirely
7. **C7** (StaticPage HTML XSS + SVG upload) — HTMLPurifier on save, remove SVG from mime whitelist
8. **C8** (admin sort-by injection) — whitelist sort columns; force `asc`/`desc`
9. **C12** (sync network in request path) — queue all `notify*` and `Mail::send` calls
10. **I1**-**I15** (the 15 independent criticals)

### Wave B — Production hardening
- All High items (H1-H30)
- Add `app/Exceptions/Handler.php`, Sentry, request-id middleware
- Switch CACHE_STORE + QUEUE_CONNECTION to Redis in env
- ActivityLog every admin privileged action
- Add `$timeout` to all 13 queue jobs

### Wave C — Test pyramid
- Happy-path tests: password reset, role change, refund full path, order cancel full path
- Concurrent-replay test for refund webhook
- Job retry / `failed()` tests for all 13 jobs
- Broadcasting channel ownership tests
- Replace SQL-dump-dependent tests with model factories

### Wave D — Code health
- Delete duplicate admin controllers
- Delete `InventoryService`, `RedisCartService`, `Brand`, `OrderStatusHistory`, `RateLimitController`
- Decompose god classes (PaymentController, AuthController, OrderCancellationService)
- Add `OrderStatus` enum class to replace 30+ string literals

---

## Final stability verdict

| Dimension | Score | Reason |
|---|---|---|
| Code structure | C+ | Functional but god-classed; no repo layer |
| Security posture | **D** | Open registration; XSS; permission escalation; refund money holes |
| Money safety | **D** | Refund flow broken; admin cancel keeps customer money; webhook replayable |
| Observability | D+ | No Sentry, no correlation id, no ActivityLog on admin actions |
| Performance | C | Sync HTTP in request path; DB cache/queue defaults; admin analytics N+1 |
| Test coverage | D | Regression-only; zero happy-path |
| Data integrity | C+ | FK gaps; migration down() bugs; `migrate:fresh` broken |

**Overall**: **DO NOT SHIP** to a real money workload. After Wave A is complete, this can ship to controlled beta with monitoring. Full production after Waves A+B.

Test baseline at audit time: `AuditFindingsTest` 52/52 (108 assertions).
