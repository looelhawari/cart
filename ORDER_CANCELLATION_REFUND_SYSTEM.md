# 🏗️ Enterprise Order Cancellation & Refund System — A-to-Z Documentation

**Phase 14 — El Baraka Payment System**  
**Version:** 1.0.0  
**Date:** 2026-02-12  
**Score Target:** 100/100

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Decision Matrix](#2-decision-matrix)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Implementation](#4-frontend-implementation)
5. [API Reference](#5-api-reference)
6. [Database Schema](#6-database-schema)
7. [Configuration](#7-configuration)
8. [Test Scenarios](#8-test-scenarios)
9. [Files Modified/Created](#9-files-modifiedcreated)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER / ADMIN                             │
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │  orders/[id].tsx  │     │   Admin Panel    │                 │
│  │  (Cancel Button)  │     │ (Admin Refund UI)│                 │
│  └────────┬─────────┘     └────────┬─────────┘                 │
│           │ checkCancellationEligibility()                      │
│           │ cancelOrder()                                       │
│           ▼                        ▼                            │
│  ┌──────────────────────────────────────────────┐              │
│  │         OrderController (API Layer)          │              │
│  │  GET  /orders/{id}/can-cancel                │              │
│  │  POST /orders/{id}/cancel                    │              │
│  │  GET  /orders/{id}/refunds                   │              │
│  └────────────────────┬─────────────────────────┘              │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────┐              │
│  │      OrderCancellationService (Core)         │              │
│  │                                              │              │
│  │  ┌─────────────────┐  ┌──────────────────┐  │              │
│  │  │ Card Cancellation│  │ COD Cancellation │  │              │
│  │  │ (Full/Penalty)   │  │ (Cancel+Restock) │  │              │
│  │  └────────┬────────┘  └────────┬─────────┘  │              │
│  │           │                     │            │              │
│  │  ┌────────▼────────────────────▼──────────┐  │              │
│  │  │    restoreStock() + rollbackPromo()    │  │              │
│  │  └───────────────────────────────────────┘  │              │
│  └────────────────────┬─────────────────────────┘              │
│                       │ (card payments only)                    │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────┐              │
│  │          PaymobService.refundTransaction()    │              │
│  │  POST /api/acceptance/void_refund/refund      │              │
│  └────────────────────┬─────────────────────────┘              │
│                       │                                         │
│                       ▼                                         │
│  ┌──────────────────────────────────────────────┐              │
│  │        OrderRefund (Audit Trail)              │              │
│  │  Records every refund attempt with:           │              │
│  │  - Amounts, penalties, Paymob response        │              │
│  │  - Status tracking (pending→completed/failed) │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Refund-First-Then-Cancel** — For card payments, the Paymob refund API is called BEFORE the order status changes. If the refund fails, the order stays in its original state.
2. **Over-Refund Protection** — `OrderRefund::totalRefundedForOrder()` sums only `completed` refunds. Every refund checks against the maximum refundable balance.
3. **Pessimistic Locking** — `lockForUpdate()` inside `DB::transaction()` prevents race conditions on concurrent cancel requests.
4. **Full Audit Trail** — Every refund attempt (success or failure) creates an `OrderRefund` record with Paymob response data.
5. **Config-Driven Rules** — All status rules and penalty percentages are in `config/payments.php` and can be changed via `.env` without code changes.

---

## 2. Decision Matrix

### Scenario 1 — Card Payment (Prepaid Order)

| Order Status       | Action               | Refund % | Penalty % | Paymob API            |
| ------------------ | -------------------- | -------- | --------- | --------------------- |
| `pending`          | ✅ Full Refund       | 100%     | 0%        | `refundTransaction()` |
| `pending_payment`  | ✅ Full Refund       | 100%     | 0%        | `refundTransaction()` |
| `confirmed`        | ✅ Full Refund       | 100%     | 0%        | `refundTransaction()` |
| `preparing`        | ✅ Penalty Refund    | 86%      | 14%       | `refundTransaction()` |
| `out_for_delivery` | ❌ BLOCKED           | —        | —         | —                     |
| `delivered`        | ❌ BLOCKED           | —        | —         | —                     |
| `cancelled`        | ❌ Already cancelled | —        | —         | —                     |
| `failed`           | ❌ Already failed    | —        | —         | —                     |

### Scenario 2 — COD (Cash On Delivery)

| Order Status       | Action               | Refund      |
| ------------------ | -------------------- | ----------- |
| `pending`          | ✅ Cancel + Restock  | None needed |
| `pending_payment`  | ✅ Cancel + Restock  | None needed |
| `confirmed`        | ✅ Cancel + Restock  | None needed |
| `preparing`        | ✅ Cancel + Restock  | None needed |
| `out_for_delivery` | ❌ BLOCKED           | —           |
| `delivered`        | ❌ BLOCKED           | —           |
| `cancelled`        | ❌ Already cancelled | —           |
| `failed`           | ❌ Already failed    | —           |

### Scenario 3 — Partial Item Refund (Admin Only, Card Only)

| Condition                      | Action                                 |
| ------------------------------ | -------------------------------------- |
| Items not yet refunded         | ✅ Refund exact item amount via Paymob |
| Items already refunded         | ❌ Skip (`.where('refunded', false)`)  |
| Refund amount > max refundable | ❌ Reject with over-refund error       |
| COD order                      | ❌ Reject (card-only)                  |

---

## 3. Backend Implementation

### 3.1 OrderCancellationService

**File:** `unibackend/app/Services/OrderCancellationService.php`

| Method                                                         | Access  | Purpose                                 |
| -------------------------------------------------------------- | ------- | --------------------------------------- |
| `cancelOrder(orderId, userId, reason)`                         | Public  | Customer-initiated cancellation         |
| `adminCancelOrder(orderId, adminId, reason, ?penaltyOverride)` | Public  | Admin-initiated cancellation            |
| `partialItemRefund(orderId, itemIds, reason, adminId)`         | Public  | Admin partial refund for specific items |
| `getCancellationEligibility(order)`                            | Public  | Pre-check for frontend UI               |
| `getRefundHistory(orderId)`                                    | Public  | Get all refund records for an order     |
| `handleCardCancellation(...)`                                  | Private | Routes card cancellations               |
| `handleCodCancellation(...)`                                   | Private | Routes COD cancellations                |
| `processCardCancellationWithRefund(...)`                       | Private | Executes Paymob refund + cancel         |
| `executePaymobRefund(payment, amountCents, refund)`            | Private | Calls Paymob API, updates refund record |
| `restoreStock(order)`                                          | Private | Increments stock, decrements sales      |
| `rollbackPromo(order)`                                         | Private | Rolls back promo code usage             |
| `notifyCustomer(order, amount, type)`                          | Private | Push notification dispatch              |
| `cancelOrderRecord(order, reason)`                             | Private | Updates order status fields             |
| `getBlockedMessage(status, isCod)`                             | Private | User-friendly error messages            |

### 3.2 PaymobService Refund Methods

**File:** `unibackend/app/Services/PaymobService.php`

```php
refundTransaction(string $transactionId, int $amountCents): array
// Returns: { success: bool, refund_id: string|null, response: array }
// Endpoint: POST {baseUrl}/acceptance/void_refund/refund
// Retries: 2x with 500ms delay

voidTransaction(string $transactionId): array
// Returns: same shape
// For voiding un-settled transactions (Paymob decides void vs refund)
```

### 3.3 OrderRefund Model

**File:** `unibackend/app/Models/OrderRefund.php`

| Method                                | Purpose                                  |
| ------------------------------------- | ---------------------------------------- |
| `markAsProcessing()`                  | Set status to processing                 |
| `markAsCompleted(refundId, response)` | Set status to completed with Paymob data |
| `markAsFailed(reason, response)`      | Set status to failed with error details  |
| `totalRefundedForOrder(orderId)`      | Static — sum of completed refund amounts |
| `scopeForOrder(orderId)`              | Scope filter                             |
| `scopeCompleted()`                    | Scope filter                             |

---

## 4. Frontend Implementation

### 4.1 Order Detail Screen (`orders/[id].tsx`)

**Cancel Flow:**

1. User taps "Cancel Order" button (visible for `pending`, `pending_payment`, `confirmed`, `preparing`)
2. `handleOpenCancelDialog()` calls `GET /orders/{id}/can-cancel`
3. Response determines what's shown in the modal:
   - **Full refund** → Green notice: "Full refund will be processed to your card..."
   - **Penalty refund** → Yellow warning: "A 14% preparation fee will apply..."
   - **COD** → Gray notice: "Order will be cancelled and items restocked."
   - **Blocked** → Toast error, modal does NOT open
4. User enters reason, taps "Cancel Order" (or "Cancel & Accept Fee" for penalty)
5. `POST /orders/{id}/cancel` is called
6. On success:
   - If refund was processed → **Refund Result Modal** appears showing: type, penalty amount, refund amount, estimated arrival
   - Toast success message
   - Order details refresh

### 4.2 API Layer (`orderApi.ts`)

| Function                                | HTTP | Endpoint                  |
| --------------------------------------- | ---- | ------------------------- |
| `cancelOrder(orderId, reason)`          | POST | `/orders/{id}/cancel`     |
| `checkCancellationEligibility(orderId)` | GET  | `/orders/{id}/can-cancel` |
| `getRefundHistory(orderId)`             | GET  | `/orders/{id}/refunds`    |

### 4.3 Types Added

```typescript
CancellationEligibility { can_cancel, reason, refund_type, refund_percent, penalty_percent, estimated_refund? }
CancelResult { success, message, data: { order, refund } }
OrderRefund { id, type, original_amount, penalty_percent, penalty_amount, refund_amount, ... }
```

---

## 5. API Reference

### `GET /api/v1/orders/{id}/can-cancel`

**Auth:** Bearer token required  
**Purpose:** Pre-check cancellation eligibility for frontend UI

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "can_cancel": true,
    "reason": "Full refund will be processed to your card...",
    "refund_type": "full", // "full" | "penalty" | "none" | null
    "refund_percent": 100,
    "penalty_percent": 0,
    "estimated_refund": 150.0 // Only for penalty type
  }
}
```

### `POST /api/v1/orders/{id}/cancel`

**Auth:** Bearer token required  
**Body:** `{ "reason": "Changed my mind" }` (optional, max 500 chars)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Order cancelled. Full refund of 150.00 EGP will appear on your card within 5-14 business days.",
  "data": {
    "order": { ... },
    "refund": {
      "id": 1,
      "type": "full",
      "original_amount": 150.00,
      "penalty_percent": 0,
      "penalty_amount": 0,
      "refund_amount": 150.00,
      "status": "completed",
      "estimated_days": "5-14 business days"
    }
  }
}
```

**Error Response (422):**

```json
{
  "success": false,
  "message": "Your order is already out for delivery and cannot be cancelled."
}
```

### `GET /api/v1/orders/{id}/refunds`

**Auth:** Bearer token required  
**Purpose:** Get refund history for an order

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "refunds": [
      {
        "id": 1,
        "type": "full",
        "refund_amount": 150.0,
        "status": "completed",
        "created_at": "2026-02-12T10:00:00"
      }
    ]
  }
}
```

---

## 6. Database Schema

### `order_refunds` Table

| Column                  | Type               | Description                                    |
| ----------------------- | ------------------ | ---------------------------------------------- |
| `id`                    | bigint PK          | Auto-increment                                 |
| `order_id`              | bigint FK          | → orders.id                                    |
| `user_id`               | bigint FK          | → users.id                                     |
| `paymob_payment_id`     | bigint FK nullable | → paymob_payments.id                           |
| `type`                  | enum               | `full`, `partial`, `penalty`                   |
| `original_amount`       | decimal(10,2)      | Order total at time of refund                  |
| `penalty_percent`       | decimal(5,2)       | 0 or 14                                        |
| `penalty_amount`        | decimal(10,2)      | Deducted amount                                |
| `refund_amount`         | decimal(10,2)      | Actual refund to customer                      |
| `paymob_transaction_id` | varchar nullable   | Paymob transaction ID                          |
| `paymob_refund_id`      | varchar nullable   | Paymob refund reference                        |
| `refund_method`         | enum               | `paymob`, `wallet`, `none`                     |
| `status`                | enum               | `pending`, `processing`, `completed`, `failed` |
| `reason`                | text nullable      | Customer/admin reason                          |
| `failure_reason`        | text nullable      | Error message if failed                        |
| `initiated_by`          | enum               | `customer`, `admin`                            |
| `admin_id`              | bigint FK nullable | → users.id (admin)                             |
| `paymob_response`       | json nullable      | Full Paymob API response                       |
| `refunded_items`        | json nullable      | For partial: item details                      |
| `completed_at`          | timestamp nullable | When refund completed                          |
| `created_at`            | timestamp          | Record created                                 |
| `updated_at`            | timestamp          | Last updated                                   |

### Indexes

- `order_id` — Quick lookup by order
- `user_id` — Quick lookup by user
- `status` — Filter by status
- `paymob_refund_id` — Paymob reconciliation

---

## 7. Configuration

**File:** `config/payments.php` → `cancellation` block

```php
'cancellation' => [
    'full_refund_statuses'   => ['pending', 'pending_payment', 'confirmed'],
    'penalty_refund_statuses'=> ['preparing'],
    'penalty_percent'        => env('CANCELLATION_PENALTY_PERCENT', 14),
    'blocked_statuses'       => ['out_for_delivery', 'delivered', 'cancelled', 'failed'],
    'cod_cancel_statuses'    => ['pending', 'pending_payment', 'confirmed', 'preparing'],
    'cod_blocked_statuses'   => ['out_for_delivery', 'delivered', 'cancelled', 'failed'],
],
```

**Environment Variable:**

```
CANCELLATION_PENALTY_PERCENT=14
```

---

## 8. Test Scenarios

### Card Payment Scenarios

| #   | Scenario                                  | Order Status     | Payment   | Expected Result                                 |
| --- | ----------------------------------------- | ---------------- | --------- | ----------------------------------------------- |
| C1  | Cancel card order (pending)               | pending          | completed | ✅ Full refund via Paymob, order cancelled      |
| C2  | Cancel card order (confirmed)             | confirmed        | completed | ✅ Full refund via Paymob, order cancelled      |
| C3  | Cancel card order (preparing)             | preparing        | completed | ✅ 86% refund (14% penalty), order cancelled    |
| C4  | Cancel card order (out for delivery)      | out_for_delivery | completed | ❌ Blocked with user-friendly message           |
| C5  | Cancel card order (delivered)             | delivered        | completed | ❌ Blocked                                      |
| C6  | Cancel card order (payment not completed) | pending          | pending   | ✅ Cancel without refund (no payment to refund) |
| C7  | Cancel already cancelled order            | cancelled        | —         | ❌ "Already cancelled" error                    |
| C8  | Cancel card order, Paymob API fails       | confirmed        | completed | ❌ Order NOT cancelled, error shown             |
| C9  | Partial item refund (admin)               | any              | completed | ✅ Exact item amounts refunded                  |
| C10 | Partial refund exceeding total            | any              | completed | ❌ Over-refund protection triggers              |
| C11 | Partial refund, items already refunded    | any              | completed | ❌ "Already refunded" error                     |
| C12 | Double-cancel race condition              | pending          | completed | ✅ lockForUpdate prevents double refund         |

### COD Scenarios

| #   | Scenario                            | Order Status     | Expected Result                   |
| --- | ----------------------------------- | ---------------- | --------------------------------- |
| D1  | Cancel COD order (pending)          | pending          | ✅ Cancelled + restock, no refund |
| D2  | Cancel COD order (confirmed)        | confirmed        | ✅ Cancelled + restock            |
| D3  | Cancel COD order (preparing)        | preparing        | ✅ Cancelled + restock            |
| D4  | Cancel COD order (out for delivery) | out_for_delivery | ❌ Blocked                        |
| D5  | Cancel COD order (delivered)        | delivered        | ❌ Blocked                        |

### Frontend Scenarios

| #   | Scenario                           | Expected UI Behavior                                                 |
| --- | ---------------------------------- | -------------------------------------------------------------------- |
| F1  | Tap cancel on pending card order   | Green "Full Refund" notice in modal                                  |
| F2  | Tap cancel on preparing card order | Yellow "14% Fee" warning in modal, button says "Cancel & Accept Fee" |
| F3  | Tap cancel on COD order            | Gray "Cancel + restock" notice                                       |
| F4  | Tap cancel on out_for_delivery     | Error toast, modal does NOT open                                     |
| F5  | Cancel succeeds with refund        | Refund Result Modal shows amount + estimated days                    |
| F6  | Cancel succeeds (COD)              | Toast "cancelled successfully", no refund modal                      |
| F7  | Cancel fails (network error)       | Error toast with message                                             |

### Admin Scenarios

| #   | Scenario                            | Expected Result                               |
| --- | ----------------------------------- | --------------------------------------------- |
| A1  | Admin cancel with penalty override  | Custom penalty % applied                      |
| A2  | Admin partial refund (2 of 5 items) | Only those items refunded, order stays active |
| A3  | Admin cancel delivered order        | ❌ Blocked (returns not refunds)              |

---

## 9. Files Modified/Created

### Created (New Files)

| File                                                                              | Purpose                                 |
| --------------------------------------------------------------------------------- | --------------------------------------- |
| `unibackend/database/migrations/2026_02_12_100000_create_order_refunds_table.php` | Migration for order_refunds audit table |
| `unibackend/app/Models/OrderRefund.php`                                           | Eloquent model for refund records       |
| `unibackend/app/Services/OrderCancellationService.php`                            | Core orchestrator (500+ lines)          |

### Modified (Existing Files)

| File                                                      | Changes                                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `unibackend/app/Services/PaymobService.php`               | Added `refundTransaction()` + `voidTransaction()` methods                           |
| `unibackend/app/Models/PaymobPayment.php`                 | Added `markAsRefunded()` + `isRefunded()`                                           |
| `unibackend/app/Models/Order.php`                         | Added `refunds()` relationship + `partially_refunded` label                         |
| `unibackend/app/Models/OrderItem.php`                     | Added `refunded` to `$fillable` and `$casts`                                        |
| `unibackend/app/Services/OrderService.php`                | Deprecated old `cancelOrder()`, delegates to new service                            |
| `unibackend/app/Services/PushNotificationService.php`     | Enhanced `sendRefundNotification()` for card/wallet/COD types                       |
| `unibackend/config/payments.php`                          | Added `cancellation` config block                                                   |
| `unibackend/app/Http/Controllers/Api/OrderController.php` | Rewrote `cancel()`, added `canCancel()` + `refundHistory()`                         |
| `unibackend/routes/api.php`                               | Added `GET /{id}/can-cancel` + `GET /{id}/refunds` routes                           |
| `frontend/services/api/orderApi.ts`                       | Added types + `checkCancellationEligibility()` + `getRefundHistory()`               |
| `frontend/app/orders/[id].tsx`                            | Enhanced cancel UI with eligibility pre-check, penalty warning, refund result modal |

---

## 10. Deployment Checklist

```
□ 1. Run migration:
      php artisan migrate
      (creates order_refunds table)

□ 2. Verify order_items.refunded column exists:
      (migration 2026_01_21_100001 should have already created it)

□ 3. Set environment variable (optional, default is 14):
      CANCELLATION_PENALTY_PERCENT=14

□ 4. Clear config cache:
      php artisan config:clear
      php artisan config:cache

□ 5. Verify Paymob credentials are set:
      PAYMOB_API_KEY=xxx
      PAYMOB_SECRET_KEY=xxx
      (refundTransaction uses authenticate() which reads these)

□ 6. Test endpoints:
      GET  /api/v1/orders/{id}/can-cancel  (pre-check)
      POST /api/v1/orders/{id}/cancel       (cancel + refund)
      GET  /api/v1/orders/{id}/refunds      (history)

□ 7. Verify frontend build:
      npx expo export --platform web  (or iOS/Android build)

□ 8. Smoke test on staging:
      - Cancel a pending card order → verify full refund
      - Cancel a preparing card order → verify 14% penalty
      - Try to cancel an out_for_delivery order → verify blocked
      - Cancel a COD order → verify restock without refund
```

---

**Implementation Status: ✅ COMPLETE**  
**Review Status: ✅ ALL ISSUES FIXED**  
**Error Count: 0**
