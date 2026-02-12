# 🔒 El Baraka — Payment Tokenization System: A-to-Z Complete Guide

> **Last Updated:** After P0/P1 Enterprise Patches + Frontend Integration Fix  
> **Backend:** Laravel PHP 8.2 / MySQL 8.0  
> **Frontend:** React Native (Expo Router) / TypeScript  
> **Payment Gateway:** Paymob (Egypt — accept.paymob.com)  
> **Currency:** EGP (Egyptian Pounds, stored as cents internally)

---

## TABLE OF CONTENTS

1. [What Is This System?](#1-what-is-this-system)
2. [The Big Picture — Visual Flow](#2-the-big-picture--visual-flow)
3. [Step-by-Step: New Card Payment (A→Z)](#3-step-by-step-new-card-payment-az)
4. [Step-by-Step: Saved Card Payment (A→Z)](#4-step-by-step-saved-card-payment-az)
5. [How Card Tokenization Works](#5-how-card-tokenization-works)
6. [The Webhook — The Single Source of Truth](#6-the-webhook--the-single-source-of-truth)
7. [The State Machine](#7-the-state-machine)
8. [Polling — Read-Only Display](#8-polling--read-only-display)
9. [The Reconciliation Safety Net](#9-the-reconciliation-safety-net)
10. [Payment Recovery (App Crash/Kill)](#10-payment-recovery-app-crashkill)
11. [Security Deep Dive](#11-security-deep-dive)
12. [Database Schema](#12-database-schema)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [File Map — Every File and Its Job](#14-file-map--every-file-and-its-job)
15. [Environment Configuration](#15-environment-configuration)
16. [Paymob Dashboard Configuration](#16-paymob-dashboard-configuration)
17. [Testing Checklist](#17-testing-checklist)
18. [Troubleshooting Guide](#18-troubleshooting-guide)
19. [Glossary](#19-glossary)

---

## 1. WHAT IS THIS SYSTEM?

Imagine you're buying groceries from El Baraka's mobile app. You pick items, go to checkout, and pay with your credit card. This system handles **everything** that happens from the moment you tap "Pay" until your order is confirmed.

**What makes it special:**

- **Card Tokenization** — If you check "Save this card", the system securely stores a token (NOT your actual card number) so you can pay with one tap next time
- **3DS Security** — Every card payment goes through 3D Secure verification (the bank confirmation page)
- **Enterprise-grade safety** — Race conditions prevented, HMAC verification on every webhook, state machine enforcement, automatic reconciliation

**The 3 payment flows:**
| Flow | When Used | How It Works |
|------|-----------|--------------|
| **Unified Checkout (3DS)** | New card, first time | Opens Paymob's hosted page in a WebView |
| **Saved Card (Tokenized)** | Returning customer | Uses stored token + may require 3DS |
| **MOTO Fallback** | When MOTO fails | Falls back to 3DS if bank requires it |

---

## 2. THE BIG PICTURE — VISUAL FLOW

```
┌─────────────────┐
│   CUSTOMER       │
│   taps "Pay"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     POST /payments/paymob/initiate
│   FRONTEND       │ ──────────────────────────────────►┌──────────────┐
│   (React Native) │                                     │   BACKEND    │
│                   │◄──────────────────────────────────  │   (Laravel)  │
│   Gets iframe_url │     { iframe_url, payment_id }     │              │
└────────┬────────┘                                     │  Creates:    │
         │                                               │  - Order     │
         │  Opens WebView                                │  - Payment   │
         ▼                                               │    record    │
┌─────────────────┐                                     └──────┬───────┘
│   WEBVIEW        │                                            │
│   (Paymob Page)  │                                            │
│                   │     Customer enters card details           │
│   3DS Challenge   │     Bank verifies with OTP                │
│                   │                                            │
└────────┬────────┘                                            │
         │                                                      │
         │  Payment completes                                   │
         │                                                      │
         ▼                                                      │
┌─────────────────┐     POST /paymob/processed (webhook)       │
│   PAYMOB         │ ──────────────────────────────────────────►│
│   (Gateway)      │     HMAC-signed callback                  │
│                   │                                            ▼
│   Sends webhook  │                                    ┌──────────────┐
│   to YOUR server │                                    │  WEBHOOK     │
└─────────────────┘                                    │  HANDLER     │
                                                        │              │
         ┌──────────────────────────────────────────────│  Verifies:   │
         │                                              │  ✅ HMAC     │
         │  Meanwhile, frontend polls every 3 seconds   │  ✅ Amount   │
         │  GET /payments/status/{paymentId}             │  ✅ Currency │
         │                                              │  ✅ Capture  │
         │  (READ-ONLY — never changes anything)        │              │
         │                                              │  Then:       │
         ▼                                              │  🔒 Lock row │
┌─────────────────┐                                    │  → PAID      │
│   FRONTEND       │                                    │  → Clear cart│
│   sees PAID      │                                    │  → Save token│
│   → navigates to │                                    │  → Dispatch  │
│   order-success  │                                    │    order job │
└─────────────────┘                                    └──────────────┘
```

---

## 3. STEP-BY-STEP: NEW CARD PAYMENT (A→Z)

Here is EXACTLY what happens when a customer pays with a new card. Every single step.

### STEP A — Customer taps "Pay Now"

**File:** `frontend/app/checkout/confirmation.tsx` (or equivalent checkout screen)

The customer has:

- Selected items in their cart
- Entered their delivery address
- Chosen "Credit/Debit Card" as payment method
- Optionally checked ☑️ "Save this card for future purchases"

They tap the "Pay Now" button.

### STEP B — Frontend calls the Initiate endpoint

**File:** `frontend/services/paymentMethodsApi.ts` → `initiatePayment()`

The app sends a POST request:

```
POST /api/v1/payments/paymob/initiate
Authorization: Bearer {user_token}

{
  "order_id": 42,
  "payment_method": "CARD",
  "save_card": true,           ← user wants to save card
  "billing_data": {
    "first_name": "Ahmed",
    "last_name": "Mohamed",
    "email": "ahmed@email.com",
    "phone_number": "01012345678",
    "city": "Cairo",
    "street": "123 Nile St"
  }
}
```

### STEP C — Backend creates Paymob Intention

**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `initiatePayment()`

What happens server-side:

1. Validates the request (order exists, belongs to user, not already paid)
2. Calculates amount in cents (e.g., 150.00 EGP → 15000 cents)
3. Calls Paymob's **Intention API** (V1):
   ```
   POST https://accept.paymob.com/v1/intention/
   {
     "amount": 15000,
     "currency": "EGP",
     "payment_methods": [5084814],    ← Integration ID
     "billing_data": {...},
     "special_reference": "ORD-42-1749301234-abc123",
     "redirection_url": "elbaraka://payment-return",
     "notification_url": "https://your-domain.com/api/v1/paymob/processed"
   }
   ```
4. Paymob returns a `client_secret` and `intention_id`
5. Backend creates a `paymob_payments` database record:
   ```sql
   INSERT INTO paymob_payments (
     order_id, user_id, paymob_order_id, amount_cents, currency,
     status, flow, special_reference, save_card_requested,
     paymob_intention_id
   ) VALUES (42, 7, '...', 15000, 'EGP', 'PENDING', 'unified_3ds',
     'ORD-42-...', 1, 'intention_abc...');
   ```
6. Returns response to frontend:
   ```json
   {
     "success": true,
     "data": {
       "payment_id": 101,
       "iframe_url": "https://accept.paymob.com/unifiedcheckout/?publicKey=...&clientSecret=...",
       "order_id": 42,
       "amount_cents": 15000,
       "flow": "unified_3ds"
     }
   }
   ```

### STEP D — Frontend opens the WebView

**File:** `frontend/components/PaymentWebView.tsx`

The app opens a full-screen WebView pointing to the `iframe_url`. This is Paymob's hosted checkout page where the customer:

1. Sees the order amount (150.00 EGP)
2. Enters their card number, expiry, CVV
3. Gets redirected to their bank's 3DS page (OTP verification)
4. Enters the OTP from their phone
5. Gets redirected back to Paymob's completion page

### STEP E — Frontend starts polling (read-only)

**File:** `frontend/components/PaymentWebView.tsx` → `handleNavigationStateChange()`

When the WebView URL changes to a Paymob success page (e.g., contains `acceptance/post_pay`), the frontend:

1. Shows a "Processing payment..." overlay
2. Waits 3 seconds (for webhook to arrive first)
3. Starts polling every 3 seconds:
   ```
   GET /api/v1/payments/status/101
   ```
4. The response is **read-only** — it shows the current state but NEVER changes it:
   ```json
   {
     "success": true,
     "data": {
       "payment_id": 101,
       "order_id": 42,
       "status": "PENDING",           ← hasn't been updated by webhook yet
       "order_payment_status": null,
       "order_status": null,
       "paymob_status": "PROCESSED",  ← Paymob says it went through
       "paymob_success": true,
       "message": "Final confirmation is webhook-based. Polling is for display only."
     }
   }
   ```

### STEP F — Paymob sends the webhook (THE CRITICAL STEP)

**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `processedCallback()`

This is the **single source of truth**. Paymob sends an HTTP POST to your server:

```
POST /api/v1/paymob/processed
Content-Type: application/json

{
  "type": "TRANSACTION",
  "obj": {
    "id": 987654,
    "order": { "id": 123456 },
    "amount_cents": 15000,
    "currency": "EGP",
    "success": true,
    "is_capture": true,
    "is_auth": false,
    "source_data": {
      "sub_type": "MasterCard",
      "pan": "2346"
    },
    "data": {
      "token": "encrypted_card_token_from_paymob..."
    },
    "hmac": "sha512_signature_here..."
  }
}
```

What the webhook handler does (in exact order):

1. **Extract payload** — Gets `obj` from the request
2. **Validate HMAC** — Computes SHA-512 hash of specific fields concatenated in Paymob's documented order, compares with `hash_equals()` (timing-safe)
3. **Amount check (stateless)** — Verifies `amount_cents` matches what we stored. **This happens BEFORE the lock** because it needs no DB mutation
4. **Currency check** — Verifies `currency` matches what we stored (EGP)
5. **Open DB transaction + lock the row:**
   ```php
   DB::transaction(function () {
       $payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)
           ->lockForUpdate()    // ← Prevents race conditions
           ->first();
   ```
6. **Idempotency check (INSIDE the lock)** — If payment is already PAID, return 200 OK immediately (duplicate webhook)
7. **Capture/Auth check:**
   - `is_capture = true` → Full payment captured → proceed
   - `is_auth = true, is_capture = false` → Only authorized, not captured → call `markAsPending()` with reason
   - `is_capture = false, is_auth = false` → Neither → mark FAILED
8. **If captured + successful:**
   - `$payment->transitionTo('PAID')` — State machine validates PENDING→PAID is legal
   - Stores `paymob_transaction_id`
   - Updates order: `payment_status = 'completed'`
   - Clears the customer's cart
   - Dispatches `ProcessOrderAsync` job (notifications, etc.)
   - **Saves card token** (if `save_card_requested` was true):
     ```php
     $this->tokenService->saveCardToken($payment, $payload);
     ```
9. **If failed:**
   - `$payment->transitionTo('FAILED')` — State machine validates PENDING→FAILED is legal
   - Stores error message from Paymob response
10. **Returns 200 OK** to Paymob (must respond quickly)

### STEP G — Frontend poll sees "PAID"

**File:** `frontend/components/PaymentWebView.tsx` → `pollPaymentStatus()` (local)

The next poll (within 3-30 seconds) gets:

```json
{
  "status": "PAID",
  "order_payment_status": "completed"
}
```

The frontend:

1. Stops polling
2. Clears the pending payment from AsyncStorage
3. Refreshes the cart (should be empty now)
4. Navigates to `/order-success` with the order ID

### STEP H — Customer sees success screen ✅

The order success page shows:

- "Your order #42 has been confirmed!"
- Order details, estimated delivery, etc.

**That's it. A → H. Payment complete.**

---

## 4. STEP-BY-STEP: SAVED CARD PAYMENT (A→Z)

When a customer has previously saved a card, the flow is shorter but still secure.

### STEP A — Customer selects saved card

The checkout screen shows their saved cards:

```
💳 Visa •••• 4242 (Default) ✓
💳 Mastercard •••• 5678
```

They select one and tap "Pay Now".

### STEP B — Frontend calls saved-card endpoint

**File:** `frontend/services/paymentMethodsApi.ts` → `initiatePaymentWithSavedCard()`

```
POST /api/v1/payments/paymob/initiate-with-saved-card
{
  "order_id": 42,
  "payment_method_id": 5,    ← ID of saved card in our DB
  "billing_data": { ... }
}
```

### STEP C — Backend uses stored token

**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `initiateSavedCardPayment()`

1. Finds the saved `PaymentMethod` record (ID 5)
2. Decrypts the stored `paymob_card_token` (AES-256-CBC via Laravel's `Crypt::decrypt()`)
3. Calls Paymob's **Token Payment API**:
   ```
   POST https://accept.paymob.com/api/acceptance/payments/pay
   {
     "source": {
       "identifier": "decrypted_paymob_token",
       "subtype": "TOKEN"
     },
     "payment_token": "auth_token_from_paymob"
   }
   ```
4. Paymob may return:
   - **Direct success** → Webhook fires, same flow as steps F-H above
   - **3DS required** → Returns `redirect_url` for 3DS challenge → WebView opens

### STEP D onwards — Same as New Card

From the WebView/webhook point onwards, the flow is identical to Steps D-H.

---

## 5. HOW CARD TOKENIZATION WORKS

### What is a token?

When you pay with your card (number `4111 1111 1111 1234`), Paymob generates a **token** — a random string like `tok_abc123def456...` — that represents your card. This token:

- ✅ Can be used to charge the card again
- ✅ Is useless without Paymob's API keys (stolen tokens can't be used)
- ❌ Cannot be reversed to get the actual card number
- ⏰ Has an expiration date (same as the card)

### Where tokens live in our system:

```
┌──────────────────────────────────────────────────────────────┐
│                    payment_methods TABLE                       │
├──────────────┬───────────────────────────────────────────────┤
│ id           │ 5                                              │
│ user_id      │ 7                                              │
│ card_brand   │ "visa"                                         │
│ card_last_four│ "4242"                                        │
│ masked_card  │ "XXXX-XXXX-XXXX-4242"                         │
│ paymob_card_token │ AES-256-CBC encrypted blob               │ ← THE TOKEN
│ token_fingerprint │ SHA-256 hash of the token                 │ ← For dedup
│ is_default   │ true                                           │
│ is_verified  │ true                                           │
│ expires_at   │ "2027-12-31"                                   │
│ deleted_at   │ null (soft delete)                              │
└──────────────┴───────────────────────────────────────────────┘
```

### When is a token saved?

A token is saved **only** when ALL of these are true:

1. ✅ HMAC verification passed (webhook is authentic)
2. ✅ Payment was successful (`success = true`)
3. ✅ Payment was captured (`is_capture = true`)
4. ✅ User requested save (`save_card_requested = true` on the payment record)
5. ✅ Token data exists in the webhook payload (`$payload['data']['token']`)
6. ✅ Card info exists (`source_data.sub_type`, `source_data.pan`)

**File:** `unibackend/app/Services/PaymentTokenService.php` → `saveCardToken()`

### Deduplication

Before saving, we check if this exact token already exists using a **fingerprint**:

```php
$fingerprint = hash('sha256', $rawToken);
$existing = PaymentMethod::where('user_id', $userId)
    ->where('token_fingerprint', $fingerprint)
    ->first();
```

If the same card was already saved, we skip the duplicate.

### Encryption at rest

The raw Paymob token is **never stored in plain text**. It's encrypted using Laravel's `Crypt::encrypt()` which uses AES-256-CBC with the `APP_KEY` from your `.env` file.

To use it later, we `Crypt::decrypt()` just before sending to Paymob's API.

---

## 6. THE WEBHOOK — THE SINGLE SOURCE OF TRUTH

### Why is the webhook so important?

```
❌ WRONG: "The user's browser/app says payment succeeded → mark as paid"
✅ RIGHT: "Paymob's server tells OUR server payment succeeded → mark as paid"
```

The webhook is the **only** thing that can change a payment from PENDING to PAID/FAILED. Not the frontend. Not the polling endpoint. Not an admin. Only the webhook.

### HMAC Verification

Paymob signs every webhook with HMAC-SHA512. Here's how we verify:

1. Paymob concatenates specific fields in a specific order (amount, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_refunded, is_standalone_payment, is_voided, order_id, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success)
2. Paymob hashes this concatenated string with your HMAC secret using SHA-512
3. Paymob sends the hash in the `hmac` field
4. Our server computes the same hash and compares with `hash_equals()` (timing-safe to prevent timing attacks)

If the hashes don't match → reject the webhook immediately.

### The Lock (Preventing Race Conditions)

```php
DB::transaction(function () use ($paymobOrderId, ...) {
    $payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)
        ->lockForUpdate()     // ← MySQL row-level lock
        ->first();

    // ... all mutations happen inside this lock ...
});
```

**Why?** If Paymob sends the same webhook twice at the exact same millisecond (it happens!), without the lock:

- Thread 1: Reads payment (PENDING) → marks PAID → clears cart
- Thread 2: Reads payment (PENDING, hasn't been saved yet) → marks PAID AGAIN → clears cart AGAIN

With `lockForUpdate()`:

- Thread 1: Locks row → reads PENDING → marks PAID ✅
- Thread 2: Waits... → Lock released → reads PAID → idempotency check → returns 200 OK (no-op) ✅

---

## 7. THE STATE MACHINE

Payments follow strict state transitions. You can't go from FAILED to PAID, or from REFUNDED to PENDING. The state machine enforces this.

**File:** `unibackend/app/Models/PaymobPayment.php`

```
         ┌───────────┐
         │  PENDING   │
         └─────┬─────┘
               │
        ┌──────┴──────┐
        ▼             ▼
  ┌───────────┐ ┌───────────┐
  │   PAID     │ │  FAILED   │
  └─────┬─────┘ └───────────┘
        │         (terminal)
        ▼
  ┌───────────┐
  │ REFUNDED  │
  └───────────┘
    (terminal)
```

**Legal transitions:**
| From | To | When |
|------|----|------|
| PENDING | PAID | Webhook confirms successful capture |
| PENDING | FAILED | Webhook reports failure or no capture |
| PAID | REFUNDED | Admin initiates refund |

**Illegal transitions (will throw `LogicException`):**

- FAILED → PAID (can't "un-fail" a payment)
- REFUNDED → anything
- PAID → PENDING
- PAID → FAILED

```php
public function transitionTo(string $newStatus): void
{
    $allowed = self::ALLOWED_TRANSITIONS[$this->status] ?? [];
    if (!in_array($newStatus, $allowed)) {
        throw new \LogicException(
            "Cannot transition from {$this->status} to {$newStatus}"
        );
    }
    $this->status = $newStatus;
}
```

---

## 8. POLLING — READ-ONLY DISPLAY

### What the frontend does

After the customer completes the 3DS challenge in the WebView:

**Component: `PaymentWebView.tsx`** (inline polling)

- Detects WebView URL change → starts polling timer
- Polls `GET /payments/status/{paymentId}` every 3 seconds
- Maximum 30 seconds of polling
- If PAID → navigate to success
- If FAILED → show error alert
- If timeout → show "check your orders" message

**Screen: `payment-webview.tsx`** (uses imported `pollPaymentStatus`)

- Starts polling immediately when screen loads (has paymentId)
- Polls every 2 seconds, max 30 attempts (60 seconds)
- Shows status indicator overlay on WebView

### What the backend returns

```json
{
  "success": true,
  "data": {
    "payment_id": 101,
    "order_id": 42,
    "status": "PENDING", // OUR DB status
    "order_payment_status": null, // Order's payment_status
    "order_status": null, // Order's status
    "transaction_id": null, // Paymob transaction ID
    "amount": 150.0, // In EGP (not cents)
    "currency": "EGP",
    "flow": "unified_3ds",
    "updated_at": "2025-01-15T10:30:00.000000Z",
    "paymob_status": "PROCESSED", // Live from Paymob API
    "paymob_success": true, // Live from Paymob API
    "message": "Final confirmation is webhook-based. Polling is for display only."
  }
}
```

**Key insight:** `paymob_status` and `paymob_success` come from querying Paymob's API in real-time. They show that Paymob processed the payment, but our DB hasn't been updated yet (webhook hasn't arrived). The frontend should trust `status` (our DB) for navigation decisions, not `paymob_status`.

### Why polling never writes to DB

**Old code (DANGEROUS):**

```php
// ❌ REMOVED — Polling used to do this:
if ($paymobSuccess) {
    $payment->markAsPaid();      // DB mutation from polling!
    $order->clearCart();          // Side effect from polling!
}
```

**New code (SAFE):**

```php
// ✅ CURRENT — Polling is 100% read-only
return response()->json([
    'data' => [
        'status' => $payment->status,  // Just reads from DB
        'paymob_status' => $paymobStatus, // Just displays remote status
        // NO markAsPaid(), NO clearCart(), NO ProcessOrderAsync
    ]
]);
```

Why? Because if polling could change state, an attacker could forge a poll response or a timing issue could mark a payment as paid when it actually failed.

---

## 9. THE RECONCILIATION SAFETY NET

### The problem

What if the webhook never arrives? (Network timeout, server crash, Paymob outage)

The payment would stay PENDING forever. The customer paid, but we never know.

### The solution

**File:** `unibackend/app/Jobs/ReconcilePendingPayments.php`

A scheduled job runs **every 5 minutes** and:

1. Finds all PENDING payments older than 10 minutes (but less than 24 hours)
2. For each stale payment, queries Paymob's API server-to-server
3. Locks the row with `lockForUpdate()` (same protection as webhook)
4. Verifies:
   - Amount matches ✅
   - Currency matches ✅
   - `is_capture = true` ✅
   - `success = true` ✅
5. If all checks pass → `transitionTo('PAID')`, update order, dispatch job
6. If Paymob says it failed → `transitionTo('FAILED')`
7. If Paymob still shows pending → skip (will retry next run)

### Configuration

```php
const STALE_AFTER_MINUTES = 10;  // Don't check payments younger than this
const MAX_AGE_HOURS = 24;        // Don't check payments older than this
const BATCH_SIZE = 50;           // Process max 50 per run
```

### Schedule

**File:** `unibackend/routes/console.php`

```php
Schedule::job(new ReconcilePendingPayments)
    ->everyFiveMinutes()
    ->withoutOverlapping();  // Prevents duplicate runs if job takes >5 min
```

---

## 10. PAYMENT RECOVERY (APP CRASH/KILL)

### The problem

Customer is on the 3DS page in the WebView. They:

- Get a phone call → app goes to background → killed by OS
- Accidentally swipe the app closed
- Phone runs out of battery

When they reopen the app, what happens?

### The solution

**File:** `frontend/app/payment-recovery.tsx`

Before initiating payment, the frontend stores a "pending payment" in AsyncStorage:

```json
{
  "orderId": 42,
  "orderNumber": "ORD-42",
  "paymentAttemptId": 101,
  "timestamp": 1705312200000
}
```

When the app launches, it checks for this pending payment. If found:

1. Shows "Checking Payment Status..." screen
2. Polls `GET /payments/status/101` up to 5 times (2-second intervals)
3. If PAID → "Payment Successful!" → navigate to order success
4. If FAILED → "Payment Failed" → show retry button
5. If still PENDING → "Payment Pending" → show "Check Again" and "View Order" buttons

After handling, the pending payment is cleared from AsyncStorage.

---

## 11. SECURITY DEEP DIVE

### Authentication Layer

| Layer               | Mechanism                                                  |
| ------------------- | ---------------------------------------------------------- |
| API Auth            | Laravel Sanctum (Bearer token)                             |
| Payment Owner Check | `user_id` compared to `auth()->id()` on every status check |
| Webhook Auth        | HMAC-SHA512 with shared secret                             |
| Token Encryption    | AES-256-CBC via Laravel Crypt (APP_KEY)                    |
| Sensitive Deletions | `password.confirm` middleware                              |

### What's verified in the webhook:

| Check           | Why                                                           |
| --------------- | ------------------------------------------------------------- |
| HMAC signature  | Proves webhook came from Paymob, not an attacker              |
| Amount in cents | Prevents attacker from paying 1 EGP for 1000 EGP order        |
| Currency        | Prevents cross-currency attacks                               |
| `is_capture`    | Ensures money was actually captured, not just authorized      |
| Row lock        | Prevents double-processing from duplicate webhooks            |
| Idempotency     | If already PAID, silently returns 200 (no double crediting)   |
| State machine   | Even if somehow called twice, PAID→PAID throws LogicException |

### What's encrypted:

| Data           | Method                      | Where                               |
| -------------- | --------------------------- | ----------------------------------- |
| Card token     | AES-256-CBC (Laravel Crypt) | `payment_methods.paymob_card_token` |
| User passwords | Bcrypt                      | `users.password`                    |
| API tokens     | SHA-256 hash                | `personal_access_tokens`            |

### What's NOT stored (by design):

- ❌ Full card numbers
- ❌ CVV/CVC codes
- ❌ Raw Paymob tokens (always encrypted)
- ❌ 3DS passwords/OTPs

---

## 12. DATABASE SCHEMA

### `paymob_payments` — Every payment attempt

```sql
CREATE TABLE paymob_payments (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id              BIGINT UNSIGNED NOT NULL,         -- FK to orders
  user_id               BIGINT UNSIGNED NULL,             -- FK to users (nullable for legacy)
  paymob_order_id       VARCHAR(255) NULL,                -- Paymob's order ID
  paymob_transaction_id VARCHAR(255) NULL,                -- Paymob's txn ID (set on success)
  paymob_intention_id   VARCHAR(255) NULL,                -- Intention ID (Unified Checkout)
  special_reference     VARCHAR(255) NULL UNIQUE,         -- Our unique reference
  amount_cents          INTEGER NOT NULL,                 -- Amount in cents (15000 = 150.00 EGP)
  currency              VARCHAR(10) NOT NULL DEFAULT 'EGP',
  status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING/PAID/FAILED/REFUNDED
  flow                  ENUM('classic_iframe','unified_3ds','moto') DEFAULT 'classic_iframe',
  save_card_requested   BOOLEAN DEFAULT FALSE,            -- Did user check "save card"?
  error_message         TEXT NULL,                        -- Error detail on failure
  paymob_response       LONGTEXT NULL,                   -- Full Paymob response JSON
  is_fallback_from_moto BOOLEAN DEFAULT FALSE,
  moto_attempts         INTEGER DEFAULT 0,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP,

  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_paymob_order_id (paymob_order_id)
);
```

### `payment_methods` — Saved cards (tokens)

```sql
CREATE TABLE payment_methods (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NOT NULL,
  card_brand          VARCHAR(50) NOT NULL,       -- visa, mastercard, amex
  card_last_four      VARCHAR(4) NOT NULL,        -- 4242
  masked_card         VARCHAR(50) NULL,           -- XXXX-XXXX-XXXX-4242
  paymob_card_token   TEXT NOT NULL,              -- AES-256-CBC encrypted
  token               TEXT NULL,                  -- Legacy field
  token_fingerprint   VARCHAR(64) NULL UNIQUE,    -- SHA-256 for dedup
  is_default          BOOLEAN DEFAULT FALSE,
  is_verified         BOOLEAN DEFAULT TRUE,
  expires_at          VARCHAR(10) NULL,           -- "12/27" (month/year)
  deleted_at          TIMESTAMP NULL,             -- Soft delete
  created_at          TIMESTAMP,
  updated_at          TIMESTAMP,

  INDEX idx_user_id (user_id)
);
```

---

## 13. API ENDPOINTS REFERENCE

### Payment Endpoints (require authentication)

| Method | Endpoint                                           | Purpose                                   |
| ------ | -------------------------------------------------- | ----------------------------------------- |
| POST   | `/api/v1/payments/paymob/pre-check`                | Validate Paymob connectivity before order |
| POST   | `/api/v1/payments/paymob/initiate`                 | Start new card payment                    |
| POST   | `/api/v1/payments/paymob/initiate-with-saved-card` | Pay with saved card                       |
| GET    | `/api/v1/payments/status/{paymentId}`              | Poll payment status (read-only)           |
| GET    | `/api/v1/payments/order/{orderId}/status`          | Legacy: status by order ID                |

### Webhook Endpoint (NO authentication — HMAC verified)

| Method | Endpoint                   | Purpose                               |
| ------ | -------------------------- | ------------------------------------- |
| POST   | `/api/v1/paymob/processed` | Paymob callback (the source of truth) |

### Payment Methods (require authentication)

| Method | Endpoint                               | Purpose                               |
| ------ | -------------------------------------- | ------------------------------------- |
| GET    | `/api/v1/payment-methods`              | List saved cards                      |
| PUT    | `/api/v1/payment-methods/{id}/default` | Set card as default                   |
| DELETE | `/api/v1/payment-methods/{id}`         | Delete saved card (requires password) |

---

## 14. FILE MAP — EVERY FILE AND ITS JOB

### Backend (Laravel)

| File                                                   | Lines | Purpose                                               |
| ------------------------------------------------------ | ----- | ----------------------------------------------------- |
| `app/Http/Controllers/Api/PaymentController.php`       | ~1291 | Main orchestrator: initiate, webhook, status check    |
| `app/Services/PaymobService.php`                       | ~400+ | Paymob API client: intentions, transactions, tokens   |
| `app/Services/PaymentTokenService.php`                 | ~165  | Token save/validate logic (extracted from controller) |
| `app/Services/PaymentDecisionService.php`              | ~200+ | Decides flow: Unified vs Classic vs MOTO              |
| `app/Services/CheckoutService.php`                     | ~500+ | Checkout orchestration, order creation                |
| `app/Models/PaymobPayment.php`                         | ~185  | Payment model + state machine                         |
| `app/Models/PaymentMethod.php`                         | ~100  | Saved card model                                      |
| `app/Jobs/ReconcilePendingPayments.php`                | ~243  | Reconciliation cron job                               |
| `app/Http/Controllers/Api/PaymentMethodController.php` | ~200  | CRUD for saved cards                                  |
| `routes/api.php`                                       | ~618  | API route definitions                                 |
| `routes/console.php`                                   | ~30   | Scheduler registration                                |
| `database/migrations/*_payment*.php`                   | —     | Schema migrations                                     |

### Frontend (React Native / TypeScript)

| File                                  | Purpose                                           |
| ------------------------------------- | ------------------------------------------------- |
| `services/paymentMethodsApi.ts`       | API calls + polling logic + types                 |
| `components/PaymentWebView.tsx`       | WebView component with inline polling             |
| `app/payment-webview.tsx`             | Screen wrapper using imported `pollPaymentStatus` |
| `app/payment.tsx`                     | Screen wrapper using `PaymentWebView` component   |
| `app/payment-recovery.tsx`            | App resume/crash recovery screen                  |
| `services/payment/paymentRecovery.ts` | AsyncStorage pending payment management           |
| `services/payment/paymentMessages.ts` | Error message mapping for UI                      |
| `types/index.ts`                      | TypeScript interfaces for all API types           |

---

## 15. ENVIRONMENT CONFIGURATION

### Backend `.env` — REQUIRED

```bash
# ═══════════════════════════════════════════════════════════════
# PAYMOB PAYMENT GATEWAY — ALL REQUIRED
# ═══════════════════════════════════════════════════════════════

# Your Paymob API key (from Paymob Dashboard → Settings → API Keys)
PAYMOB_API_KEY=your_api_key_here

# Paymob Secret Key (for V1 Intention API)
PAYMOB_SECRET_KEY=egy_sk_test_xxxx   # test key starts with egy_sk_test_
                                      # live key starts with egy_sk_live_

# Paymob Public Key (for Unified Checkout iframe URL)
PAYMOB_PUBLIC_KEY=egy_pk_test_xxxx   # test key starts with egy_pk_test_

# HMAC Secret (from Paymob Dashboard → Settings → HMAC)
PAYMOB_HMAC_SECRET=your_32_char_hex_string

# Integration IDs (from Paymob Dashboard → Developers → Integration IDs)
PAYMOB_CARD_INTEGRATION_ID=5084814       # Card payments
PAYMOB_WALLET_INTEGRATION_ID=5084831     # Wallet payments (if applicable)
PAYMOB_INTEGRATION_ID_3DS=5084814        # 3DS verification (usually same as card)
PAYMOB_MOTO_INTEGRATION_ID=              # MOTO (leave empty to disable)

# Iframe ID (from Paymob Dashboard → Developers → iFrames)
PAYMOB_IFRAME_ID=919973

# URLs — CRITICAL: Must be publicly accessible
PAYMOB_CALLBACK_URL=https://your-domain.com/api/v1/paymob/processed    # Webhook
PAYMOB_REDIRECT_URL=https://your-domain.com/payment-return              # After 3DS

# Paymob API base URL
PAYMOB_BASE_URL=https://accept.paymob.com/api

# Feature flags
PAYMENT_ENABLE_MOTO=true           # Enable MOTO flow
PAYMENT_ENABLE_SAVED_CARDS=true    # Enable card tokenization
PAYMENT_ENABLE_UNIFIED=true        # Enable Unified Checkout (V1 API)

# ═══════════════════════════════════════════════════════════════
# LARAVEL APP KEY — CRITICAL FOR TOKEN ENCRYPTION
# ═══════════════════════════════════════════════════════════════
APP_KEY=base64:your_key_here       # php artisan key:generate
# ⚠️ IF YOU CHANGE THIS, ALL SAVED CARD TOKENS BECOME UNREADABLE
```

### Frontend `.env`

```bash
# API base URL — points to your Laravel backend
API_URL=https://your-domain.com/api/v1

# For local development with Android emulator:
# API_URL=http://10.0.2.2:8000/api/v1

# For local development with iOS simulator:
# API_URL=http://localhost:8000/api/v1

# For ngrok tunnel (development):
# API_URL=https://xxxx-xxx-xxx-xxx-xxx.ngrok-free.app/api/v1
```

---

## 16. PAYMOB DASHBOARD CONFIGURATION

These settings must be configured in your Paymob merchant dashboard at https://accept.paymob.com/portal2/en/dashboard

### 1. Webhook (Transaction Processed Callback)

**Location:** Dashboard → Settings → Account Settings → Notification URL

```
https://your-domain.com/api/v1/paymob/processed
```

⚠️ This URL must be:

- Publicly accessible (not localhost!)
- HTTPS in production
- Responding within 10 seconds

### 2. HMAC Secret

**Location:** Dashboard → Settings → HMAC

- Copy the HMAC secret → paste into `PAYMOB_HMAC_SECRET` in `.env`
- Ensure HMAC is **enabled** (checkbox is checked)

### 3. Integration IDs

**Location:** Dashboard → Developers → Payment Integrations

- Create a **Card** integration → copy ID → `PAYMOB_CARD_INTEGRATION_ID`
- Create a **Wallet** integration → copy ID → `PAYMOB_WALLET_INTEGRATION_ID`
- Note: 3DS integration ID is usually the same as Card

### 4. iFrame ID

**Location:** Dashboard → Developers → iFrames

- Create an iframe → copy ID → `PAYMOB_IFRAME_ID`

### 5. API Keys

**Location:** Dashboard → Settings → API Keys (or Profile → API Key)

- Copy API Key → `PAYMOB_API_KEY`
- Under V1 API section:
  - Secret Key → `PAYMOB_SECRET_KEY`
  - Public Key → `PAYMOB_PUBLIC_KEY`

### 6. Redirect URL (for 3DS return)

**Location:** Set programmatically via the Intention API `redirection_url` parameter

Currently set to: `elbaraka://payment-return` (deep link back to the app)

---

## 17. TESTING CHECKLIST

### Test Cards (Paymob Egypt Test Mode)

| Card Number           | Result         | Use Case              |
| --------------------- | -------------- | --------------------- |
| `5123 4567 8901 2346` | ✅ Success     | Happy path            |
| `4987 6543 2109 8769` | ❌ Decline     | Test failure handling |
| `5111 1111 1111 1118` | ✅ 3DS Success | Test 3DS flow         |
| `4000 0000 0000 0002` | ❌ 3DS Fail    | Test 3DS failure      |

### Scenarios to Test

- [ ] **New card → success** → Order marked PAID, card saved (if requested)
- [ ] **New card → failure** → Error message shown, retry available
- [ ] **New card → save card unchecked** → Payment succeeds, no card saved
- [ ] **Saved card → success** → Pays without re-entering card details
- [ ] **Saved card → 3DS required** → WebView opens for 3DS, then success
- [ ] **Duplicate webhook** → Second webhook is silently ignored (idempotency)
- [ ] **App kill mid-payment** → Recovery screen checks status on reopen
- [ ] **Polling timeout** → "Check your orders" message shown
- [ ] **Network error during poll** → Graceful error with retry option
- [ ] **Delete saved card** → Card removed (soft delete), new default auto-selected
- [ ] **Reconciliation job** → Stale PENDING payments resolved after 10 minutes

---

## 18. TROUBLESHOOTING GUIDE

### "Payment stays PENDING forever"

1. **Check webhook URL** — Is `PAYMOB_CALLBACK_URL` reachable from the internet?
2. **Check HMAC** — Is `PAYMOB_HMAC_SECRET` correct? (Copy-paste from dashboard)
3. **Check server logs** — `storage/logs/laravel.log` for webhook errors
4. **Wait 10 minutes** — Reconciliation job will catch it
5. **Manual check** — Query Paymob's API directly with the `paymob_order_id`

### "HMAC verification failed"

- Double-check `PAYMOB_HMAC_SECRET` matches the dashboard exactly
- Ensure no extra whitespace in the `.env` value
- Check that HMAC is enabled in Paymob dashboard settings

### "Card token not being saved"

- Verify `save_card_requested` is `true` on the `paymob_payments` record
- Check that `is_capture` was `true` in the webhook (not just `is_auth`)
- Check `storage/logs/laravel.log` for "Token save" related messages

### "Polling shows PENDING but Paymob says success"

- This is NORMAL. The webhook hasn't arrived yet.
- `paymob_status: "PROCESSED"` + `paymob_success: true` means Paymob processed it
- But `status: "PENDING"` means our webhook hasn't confirmed it yet
- Wait a few more seconds, or the reconciliation job will handle it

### "Frontend shows wrong error message"

- `mapPaymentError()` in `paymentMessages.ts` maps Paymob error strings to user-friendly messages
- If you see a generic "Something went wrong", the Paymob error string wasn't recognized
- Add the new error pattern to `paymentMessages.ts`

---

## 19. GLOSSARY

| Term                | Meaning                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Tokenization**    | Converting a card number into a reusable token for future charges                            |
| **3DS / 3D Secure** | Bank verification (OTP) that confirms the cardholder approves the charge                     |
| **HMAC**            | Hash-based Message Authentication Code — proves a webhook is genuine                         |
| **Webhook**         | Server-to-server notification from Paymob to your backend                                    |
| **Polling**         | Frontend repeatedly checking status endpoint (every few seconds)                             |
| **Idempotency**     | Processing the same webhook twice produces the same result (no double charge)                |
| **lockForUpdate**   | MySQL row-level lock preventing concurrent access to the same payment                        |
| **State Machine**   | Rules about which status transitions are allowed (e.g., PENDING→PAID ✅, FAILED→PAID ❌)     |
| **Reconciliation**  | Background job that catches payments where the webhook was missed                            |
| **MOTO**            | Mail Order/Telephone Order — card-not-present payment without 3DS                            |
| **Intention**       | Paymob V1 API concept — represents a payment intent before the actual charge                 |
| **Integration ID**  | Paymob's identifier for your payment method configuration                                    |
| **iframe_url**      | URL of Paymob's hosted checkout page, displayed in WebView                                   |
| **capture**         | Actually taking the money (vs. authorization which just reserves it)                         |
| **AES-256-CBC**     | Encryption algorithm used to encrypt card tokens at rest                                     |
| **Sanctum**         | Laravel's API authentication package (Bearer token)                                          |
| **AsyncStorage**    | React Native's persistent key-value storage (used for pending payment recovery)              |
| **Deep Link**       | `elbaraka://payment-return` — opens the app from a URL                                       |
| **EGP**             | Egyptian Pound (currency)                                                                    |
| **Cents**           | Backend stores amounts as integers (150.00 EGP = 15000 cents) to avoid floating-point errors |

---

## APPENDIX: WHAT YOU NEED FROM PAYMOB (Configuration Checklist)

Before the system works, you need to provide/configure:

| #   | Item                      | Where to Get It                  | Status                                                                          |
| --- | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| 1   | **Paymob API Key**        | Dashboard → Settings → API Keys  | ⚠️ Currently using test key                                                     |
| 2   | **Paymob Secret Key**     | Dashboard → V1 API section       | ⚠️ Currently `egy_sk_test_...`                                                  |
| 3   | **Paymob Public Key**     | Dashboard → V1 API section       | ⚠️ Currently `egy_pk_test_...`                                                  |
| 4   | **HMAC Secret**           | Dashboard → Settings → HMAC      | ✅ Set                                                                          |
| 5   | **Card Integration ID**   | Dashboard → Payment Integrations | ✅ `5084814`                                                                    |
| 6   | **Wallet Integration ID** | Dashboard → Payment Integrations | ✅ `5084831`                                                                    |
| 7   | **MOTO Integration ID**   | Dashboard → Payment Integrations | ❌ Empty (MOTO disabled)                                                        |
| 8   | **iFrame ID**             | Dashboard → Developers → iFrames | ✅ `919973`                                                                     |
| 9   | **Webhook URL**           | You set this in dashboard        | ⚠️ Currently ngrok (dev only)                                                   |
| 10  | **Production domain**     | Your hosting provider            | ❓ Needed for live                                                              |
| 11  | **SSL certificate**       | Your hosting provider            | ❓ Required for HTTPS webhook                                                   |
| 12  | **Laravel APP_KEY**       | `php artisan key:generate`       | ✅ Set (DO NOT CHANGE)                                                          |
| 13  | **Laravel scheduler**     | `crontab -e` on server           | ❌ Must add: `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1` |

### For Going Live (Production):

- [ ] Switch from `egy_sk_test_` to `egy_sk_live_` keys
- [ ] Switch from `egy_pk_test_` to `egy_pk_live_` keys
- [ ] Update `PAYMOB_CALLBACK_URL` from ngrok to your real domain
- [ ] Update `PAYMOB_REDIRECT_URL` to your real domain
- [ ] Set up the Laravel scheduler cron job on the server
- [ ] Ensure HTTPS is working on your domain
- [ ] Test with a real card (small amount, then refund)

---

_Document generated after full enterprise audit + P0/P1 patches + frontend integration fixes._
