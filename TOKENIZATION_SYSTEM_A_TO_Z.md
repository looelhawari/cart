# 🔒 El Baraka — Payment Tokenization System: A-to-Z Complete Guide

> **Version:** 3.0 — Post MOTO Integration + Enterprise Hardening  
> **Last Updated:** February 12, 2026  
> **Backend:** Laravel PHP 8.2 / MySQL 8.0 / Sanctum Auth  
> **Frontend:** React Native (Expo Router) / TypeScript / Zustand  
> **Payment Gateway:** Paymob (Egypt — accept.paymob.com)  
> **Currency:** EGP (Egyptian Pounds, stored as cents internally)  
> **Encryption:** AES-256-CBC (Laravel `Crypt` facade, APP_KEY derived)  
> **HMAC:** SHA-512 with `hash_equals()` timing-safe comparison

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture Diagram — The Big Picture](#2-architecture-diagram--the-big-picture)
3. [Payment Flows — All 4 Flows Explained](#3-payment-flows--all-4-flows-explained)
   - 3.1 [Flow A — New Card Payment (Unified Checkout / 3DS)](#31-flow-a--new-card-payment-unified-checkout--3ds)
   - 3.2 [Flow B — Saved Card Payment (MOTO / One-Click)](#32-flow-b--saved-card-payment-moto--one-click)
   - 3.3 [Flow C — MOTO → 3DS Fallback](#33-flow-c--moto--3ds-fallback)
   - 3.4 [Flow D — Cash on Delivery (COD)](#34-flow-d--cash-on-delivery-cod)
4. [The Decision Engine — How Flow Routing Works](#4-the-decision-engine--how-flow-routing-works)
5. [Card Tokenization Deep Dive](#5-card-tokenization-deep-dive)
   - 5.1 [What Is a Token?](#51-what-is-a-token)
   - 5.2 [Token Save Lifecycle (Dual Webhook Bridge)](#52-token-save-lifecycle-dual-webhook-bridge)
   - 5.3 [Token Storage & Encryption](#53-token-storage--encryption)
   - 5.4 [Token Deduplication](#54-token-deduplication)
   - 5.5 [Soft-Delete Restore Strategy](#55-soft-delete-restore-strategy)
6. [The Webhook — Single Source of Truth](#6-the-webhook--single-source-of-truth)
   - 6.1 [HMAC Verification](#61-hmac-verification)
   - 6.2 [Token Webhook vs Transaction Webhook](#62-token-webhook-vs-transaction-webhook)
   - 6.3 [Webhook Processing (Atomic Lock Sequence)](#63-webhook-processing-atomic-lock-sequence)
   - 6.4 [The Paymob Unified Checkout Quirk (is_capture Bug)](#64-the-paymob-unified-checkout-quirk-is_capture-bug)
7. [The State Machine](#7-the-state-machine)
8. [Polling — Read-Only Display](#8-polling--read-only-display)
9. [Payment Confirmation Service](#9-payment-confirmation-service)
10. [Payment Recovery (App Crash/Kill)](#10-payment-recovery-app-crashkill)
11. [Security Deep Dive](#11-security-deep-dive)
12. [Database Schema](#12-database-schema)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [File Map — Every File and Its Job](#14-file-map--every-file-and-its-job)
15. [Environment Configuration](#15-environment-configuration)
16. [Paymob Dashboard Configuration](#16-paymob-dashboard-configuration)
17. [Frontend Payment Screens](#17-frontend-payment-screens)
18. [Complete Test Scenarios](#18-complete-test-scenarios)
19. [Troubleshooting Guide](#19-troubleshooting-guide)
20. [Glossary](#20-glossary)

---

## 1. SYSTEM OVERVIEW

### What This System Does

El Baraka's payment system handles the complete lifecycle of credit/debit card payments through Paymob (Egypt's leading payment gateway). It supports:

1. **New Card Payments** — Customer enters card details in Paymob's hosted Unified Checkout page (3DS verified)
2. **Saved Card Payments (MOTO)** — One-click server-to-server payment using tokenized card (no UI)
3. **Automatic 3DS Fallback** — If MOTO requires 3DS (bank/issuer policy), seamlessly falls back to Unified Checkout with saved card pre-filled
4. **Card Tokenization** — Securely save card tokens for future one-click payments
5. **Cash on Delivery** — No card processing, order placed immediately

### Design Principles

| Principle                  | Implementation                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Single Source of Truth** | Only the webhook handler mutates payment/order status — never the frontend, never polling    |
| **Idempotent Webhooks**    | Duplicate webhooks are safely ignored via pessimistic row locking + status check inside lock |
| **Token-Never-Fails**      | Card token save failures are caught and logged but NEVER break payment confirmation          |
| **State Machine**          | All status transitions validated — illegal transitions throw `LogicException`                |
| **Encryption at Rest**     | Card tokens encrypted with AES-256-CBC, fingerprinted with SHA-256                           |
| **Timing-Safe HMAC**       | SHA-512 HMAC verified with `hash_equals()` — immune to timing attacks                        |
| **Read-Only Polling**      | Frontend polling endpoint NEVER mutates database state                                       |
| **Graceful Degradation**   | If MOTO fails → automatic 3DS fallback. If encryption key rotates → returns null (not crash) |

### The 4 Payment Flows at a Glance

| Flow                       | When Used                     | Customer Experience                                           | Server Behavior                                                      |
| -------------------------- | ----------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Unified Checkout (3DS)** | New card, or forced 3DS       | Opens Paymob hosted page → enters card → 3DS OTP → success    | Backend creates Intention → gets client_secret → builds iframe URL   |
| **MOTO (One-Click)**       | Saved card, eligible          | Taps "Pay" → instant confirmation                             | Backend creates MOTO Intention → server-to-server pay with token     |
| **MOTO → 3DS Fallback**    | Saved card, bank requires 3DS | Taps "Pay" → redirected to Paymob (card pre-filled) → 3DS OTP | MOTO attempted → bank says 3DS needed → fallback to Unified Checkout |
| **Cash on Delivery**       | Customer chooses COD          | Taps "Pay" → order confirmed instantly                        | No payment processing, order created with status=confirmed           |

---

## 2. ARCHITECTURE DIAGRAM — THE BIG PICTURE

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CUSTOMER'S PHONE                                          │
│                                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                │
│  │  Payment      │───▶│ Confirmation │───▶│  WebView     │───▶│ Order        │                │
│  │  Selection    │    │  Screen      │    │  (3DS/Pay)   │    │ Success      │                │
│  │  (Step 2)     │    │  (Step 3)    │    │              │    │              │                │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘    └──────────────┘                │
│                             │                    │                                            │
│                    ┌────────┼────────────────────┼─────────────────────┐                     │
│                    │        │   MOTO (instant)   │  3DS (redirect)     │                     │
│                    │        ▼                    ▼                     │                     │
│                    │   navigate to          navigate to                │                     │
│                    │   order-success        payment-webview            │                     │
│                    │   + polling            + polling after            │                     │
│                    │                        redirect back              │                     │
│                    └──────────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                          POST /payments/paymob/initiate
                          POST /payments/paymob/initiate-with-saved-card
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    LARAVEL BACKEND                                           │
│                                                                                              │
│  ┌──────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐                  │
│  │ PaymentController │──▶│ PaymentDecision     │──▶│ PaymobService         │                  │
│  │                   │   │ Service             │   │                       │                  │
│  │ • initiatePayment │   │                     │   │ • createIntention()   │                  │
│  │ • initiateMoto    │   │ 8 Rules:            │   │ • createMotoIntention │                  │
│  │ • initiateSaved   │   │ • No saved card→3DS │   │ • payWithSavedCard   │                  │
│  │ • processedCb     │   │ • Inactive→3DS      │   │   Moto()              │                  │
│  │ • checkStatus     │   │ • High value→3DS    │   │ • verifyHmac()       │                  │
│  │                   │   │ • Failures→3DS      │   │ • extractCardToken   │                  │
│  └────────┬─────────┘   │ • MOTO disabled→3DS │   │   FromIntention()    │                  │
│           │              │ • New user→3DS      │   └──────────┬───────────┘                  │
│           │              │ • Default→MOTO      │              │                              │
│           │              └─────────────────────┘              │                              │
│           │                                                    │                              │
│           ▼                                                    │                              │
│  ┌──────────────────┐   ┌─────────────────────┐              │                              │
│  │ PaymentConfirm   │   │ PaymentToken         │              │                              │
│  │ ationService     │   │ Service              │              │                              │
│  │                   │   │                      │              │                              │
│  │ • confirmPayment │   │ • shouldSaveCard()   │              │                              │
│  │   → PAID         │   │ • saveCardToken()    │              │                              │
│  │   → clear cart   │   │   → encrypt          │              │                              │
│  │   → finalize     │   │   → fingerprint      │              │                              │
│  │   → dispatch job │   │   → dedup            │              │                              │
│  │ • failPayment    │   │   → restore deleted  │              │                              │
│  │   → FAILED       │   │                      │              │                              │
│  │   → restore stock│   └─────────────────────┘              │                              │
│  └──────────────────┘                                         │                              │
│                                                                │                              │
│  ┌──────────────────────────────────────────────────────────────┘                              │
│  │  CACHE BRIDGE (Token Webhook → Transaction Webhook)                                       │
│  │  Cache::put("paymob_token_webhook:{orderId}", tokenData, 30min)                           │
│  │  Cache::pull("paymob_token_webhook:{orderId}") in transaction webhook                     │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                           Webhook POST /paymob/processed
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PAYMOB GATEWAY                                            │
│                                                                                              │
│  Sends TWO webhooks for payments with save_card:                                            │
│  1. TOKEN webhook  — { type: "TOKEN", obj: { token, masked_pan, ... } }                     │
│  2. TRANSACTION webhook — { type: "TRANSACTION", obj: { success, amount_cents, ... } }      │
│                                                                                              │
│  Integration IDs:                                                                            │
│  • Card/3DS:  5084814    (Unified Checkout — customer enters card, 3DS verification)        │
│  • MOTO:      5511054    (Server-to-server — no customer interaction, Risk team approved)    │
│  • Wallet:    5084831    (Mobile wallet payments — Vodafone Cash, etc.)                      │
│  • iFrame:    919973     (Legacy hosted page)                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. PAYMENT FLOWS — ALL 4 FLOWS EXPLAINED

### 3.1 Flow A — New Card Payment (Unified Checkout / 3DS)

This is the primary flow for first-time card payments. The customer sees Paymob's hosted checkout page.

#### Step-by-Step (A→Z)

**Step A: Customer taps "Pay Now"**  
**File:** `frontend/app/checkout/confirmation.tsx`

The customer has:

- Selected items in their cart
- Entered their delivery address (Step 1)
- Chosen "Card" payment and optionally "Save this card" (Step 2)
- Reviewed order summary, selected delivery slot (Step 3)

They tap "Place Order".

**Step B: Frontend creates order + calls initiate**  
**File:** `frontend/app/checkout/confirmation.tsx` → `handlePlaceOrder()`

1. Validates: T&C accepted, address selected, date + time slot selected
2. Checks store is currently open (real-time API check)
3. Creates order: `POST /api/v1/orders` → gets `order_id`
4. Calls payment initiation: `POST /api/v1/payments/paymob/initiate`

```json
{
  "order_id": 42,
  "payment_method": "CARD",
  "save_card": true,
  "billing_data": {
    "first_name": "Ahmed",
    "last_name": "Hassan",
    "email": "ahmed@example.com",
    "phone_number": "+201234567890",
    "city": "Cairo",
    "street": "123 Tahrir St"
  }
}
```

**Step C: Backend creates Paymob Intention**  
**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `initiatePayment()` → `initiateUnifiedCheckout()`

What happens server-side:

1. **Validates request**: order exists, belongs to authenticated user, no existing PAID payment
2. **Decision engine**: `PaymentDecisionService::decidePaymentFlow()` — no saved card → returns `unified_3ds`
3. **Builds items array**: Product items + delivery fee line item + tax line item + rounding adjustment (Paymob requires items total = amount exactly)
4. **Generates unique IDs**:
   - `internalOrderId` = `"ORD-42-1707753600123456"` (order ID + microsecond timestamp)
   - `specialReference` = `"ORD-42-1707753600123456-65a1b2c3d4e5f"` (+ uniqid for uniqueness)
5. **Creates Intention**: `POST https://accept.paymob.com/v1/intention/`
   - `payment_methods: [5084814]` (3DS integration ID)
   - `amount: 15000` (in cents)
   - `currency: "EGP"`
   - `billing_data`: customer info
   - `items`: order line items
   - `redirection_url`: `"elbaraka://payment-return"` (deep link back to app)
   - `extras: { save_card: true }` (if customer opted in)
6. **Paymob returns**: `intention_id`, `client_secret`
7. **Builds Unified Checkout URL**: `https://accept.paymob.com/unifiedcheckout/?publicKey={publicKey}&clientSecret={clientSecret}`
8. **Creates `paymob_payments` record**:

```sql
INSERT INTO paymob_payments (
  order_id, user_id, internal_order_id, special_reference,
  paymob_intention_id, amount_cents, currency, payment_method,
  flow, save_card_requested, status, billing_data, integration_id
) VALUES (
  42, 7, 'ORD-42-1707753600123456', 'ORD-42-1707753600123456-65a1b2c3d4e5f',
  'pi_test_abc123', 15000, 'EGP', 'CARD',
  'unified_3ds', true, 'PENDING', '{...}', '5084814'
);
```

9. **Returns response to frontend**:

```json
{
  "flow": "unified_3ds",
  "payment_id": 12,
  "order_id": 42,
  "unified_checkout_url": "https://accept.paymob.com/unifiedcheckout/?publicKey=egy_pk_test_...&clientSecret=...",
  "requires_redirect": true
}
```

**Step D: Frontend opens WebView**  
**File:** `frontend/app/payment-webview.tsx`

The app navigates to the payment-webview screen with params:

- `iframeUrl`: the unified checkout URL
- `orderId`: 42
- `paymentId`: 12

The WebView loads Paymob's hosted checkout where the customer:

1. Sees the order amount (150.00 EGP)
2. Enters card number, expiry, CVV
3. Redirected to bank's 3DS page (OTP verification)
4. Enters OTP from their phone
5. Redirected back via `elbaraka://payment-return`

**Step E: Frontend detects redirect + starts polling**  
**File:** `frontend/app/payment-webview.tsx` → `handleShouldStartLoadWithRequest()`

When the WebView URL changes to `elbaraka://payment-return` (or ngrok fallback in dev):

1. **Guards**: Checks `pollingStarted.current` — prevents duplicate polling
2. Sets `pollingStarted.current = true`
3. Shows "Verifying payment..." overlay
4. **Waits 2 seconds** (lets webhook arrive at backend first)
5. **Calls `pollPaymentStatus()`**: polls `GET /api/v1/payments/status/{paymentId}` every 2 seconds, max 30 attempts (60s total)
6. **Terminal states**: `PAID` → success modal, `FAILED` → failure modal
7. **Timeout**: If still `PENDING` after 60s → shows "check your orders" alert

**Step F: Paymob sends webhooks (THE CRITICAL STEP)**  
**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `processedCallback()`

For a payment with `save_card: true`, Paymob sends **TWO** webhooks (in this order):

1. **TOKEN webhook** — arrives first:

```json
{
  "type": "TOKEN",
  "obj": {
    "id": 12345,
    "token": "tok_abc123def456...",
    "masked_pan": "424242XXXXXX4242",
    "merchant_id": 67890,
    "card_subtype": "Visa",
    "order_id": "468610688"
  }
}
```

2. **TRANSACTION webhook** — arrives second:

```json
{
  "type": "TRANSACTION",
  "obj": {
    "id": 412532416,
    "order": { "id": 468610688 },
    "success": true,
    "is_capture": true,
    "is_auth": false,
    "amount_cents": 15000,
    "currency": "EGP",
    "source_data": {
      "pan": "424242XXXXXX4242",
      "type": "card",
      "sub_type": "Visa",
      "token": "tok_abc123def456..."
    },
    "data": {
      "token": { "token": "tok_abc123def456..." }
    }
  }
}
```

**Token Webhook Handling** (Step F.1):

```
processedCallback() receives webhook
  → Detects payload has "token" + "masked_pan" but no typical transaction data
  → Extracts order_id from payload
  → Cache::put("paymob_token_webhook:{orderId}", tokenData, 30 minutes)
  → Returns 200 OK immediately
```

**Transaction Webhook Handling** (Step F.2) — see Section 6.3 for full atomic sequence.

**Step G: Frontend poll sees "PAID"**  
**File:** `frontend/app/payment-webview.tsx` → `startPolling()`

Next poll (within 2-60 seconds) gets:

```json
{
  "status": "PAID",
  "order_payment_status": "completed",
  "order_status": "confirmed",
  "transaction_id": "412532416",
  "flow": "unified_3ds"
}
```

Frontend: stops polling → shows success modal → navigates to order-success screen.

**Step H: Customer sees success screen ✅**

---

### 3.2 Flow B — Saved Card Payment (MOTO / One-Click)

When a customer has a saved card and conditions allow MOTO, the payment is processed server-to-server with no customer UI.

**Step A: Customer selects saved card + taps "Pay Now"**  
**File:** `frontend/app/checkout/payment.tsx` → selects saved card  
**File:** `frontend/app/checkout/confirmation.tsx` → `handlePlaceOrder()`

Frontend sends:

```json
POST /api/v1/payments/paymob/initiate
{
  "order_id": 57,
  "payment_method": "CARD",
  "payment_method_id": 1,
  "billing_data": { ... }
}
```

**Step B: Decision engine routes to MOTO**  
**File:** `unibackend/app/Services/PaymentDecisionService.php` → `decidePaymentFlow()`

Decision tree evaluates 8 rules → all pass → returns `{ flow: "moto", fallback_to_3ds: true }`.

**Step C: Backend creates MOTO Intention + pays server-to-server**  
**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `initiateMotoPayment()`

**Sub-step C.1 — Build items array:**

```php
$items = [];
foreach ($order->items as $item) {
    $items[] = [
        'name' => $item->product->name_en ?? $item->product->name,
        'amount' => (int) round($item->price * 100),
        'quantity' => $item->quantity,
    ];
}

// Add delivery fee as line item
if ($order->delivery_fee > 0) {
    $items[] = [
        'name' => 'Delivery Fee',
        'amount' => (int) round($order->delivery_fee * 100),
        'quantity' => 1,
    ];
}

// Add tax as line item
if ($order->tax > 0) {
    $items[] = [
        'name' => 'Tax',
        'amount' => (int) round($order->tax * 100),
        'quantity' => 1,
    ];
}

// Rounding adjustment (Paymob requires items total = amount exactly)
$itemsTotal = array_sum(array_map(fn($i) => $i['amount'] * $i['quantity'], $items));
$diff = $amountCents - $itemsTotal;
if ($diff !== 0) {
    $items[] = [
        'name' => 'Adjustment',
        'amount' => $diff,
        'quantity' => 1,
    ];
}
```

**Sub-step C.2 — Create MOTO Intention:**

```
POST https://accept.paymob.com/v1/intention/
Authorization: Token {secretKey}

{
  "amount": 21686,
  "currency": "EGP",
  "payment_methods": [5511054],     ← MOTO Integration ID
  "billing_data": { ... },
  "items": [ ... ],
  "special_reference": "ORD-57-..."
}
```

Paymob returns: `intention_id`, `payment_keys[0].key` (the payment token), `intention_order_id` (paymob_order_id).

**Sub-step C.3 — Pay with saved card token (server-to-server):**

```
POST https://accept.paymob.com/api/acceptance/payments/pay

{
  "source": {
    "identifier": "tok_abc123def456...",    ← Decrypted from PaymentMethod model
    "subtype": "TOKEN"
  },
  "payment_token": "ZXlKaGJHY2lPaU..."    ← From MOTO Intention payment_keys[0].key
}
```

**Sub-step C.4 — Response handling:**

| Paymob Response                                        | Action                                 |
| ------------------------------------------------------ | -------------------------------------- |
| `success: true, pending: false, requires_3ds: false`   | MOTO succeeded → payment processing    |
| `success: true, pending: true` or `requires_3ds: true` | Bank requires 3DS → fallback to Flow C |
| `success: false`                                       | MOTO failed → mark payment FAILED      |

**Step D: Frontend receives instant response**

```json
{
  "flow": "moto",
  "payment_id": 11,
  "order_id": 57,
  "requires_redirect": false,
  "message": "Payment is being processed"
}
```

Frontend: navigates directly to order-success screen with polling (no WebView needed).

**Step E-H: Same as Flow A** — webhook confirms payment, poll shows PAID, success screen.

---

### 3.3 Flow C — MOTO → 3DS Fallback

This flow activates when MOTO is attempted but the bank/issuer requires 3DS verification.

**Trigger:** `payWithSavedCardMoto()` returns `requires_3ds: true` or `requires_redirection: true`

**What happens:**

1. `PaymentController::initiateMotoPayment()` detects 3DS requirement
2. Calls `$payment->markAsFallbackTo3DS("3DS required by issuer")`
   - Sets `is_fallback_from_moto = true`
   - Changes `flow` from `moto` to `unified_3ds`
3. Creates new Unified Checkout Intention with `card_tokens` array (pre-fills saved card)
4. Updates existing `paymob_payments` record with new intention data
5. Returns `unified_checkout_url` to frontend

**Frontend behavior:**

```json
{
  "flow": "unified_3ds",
  "payment_id": 11,
  "unified_checkout_url": "https://accept.paymob.com/unifiedcheckout/?...",
  "requires_redirect": true,
  "message": "3DS verification required"
}
```

Customer sees Paymob's Unified Checkout with their saved card already selected → completes 3DS → webhook fires → done.

> **Important — Test Environment Behavior:** In Paymob's test environment, MOTO with test cards (4111 1111 1111 1111) will ALWAYS trigger 3DS fallback. This is expected. In production with real cards and a live MOTO integration ID (requires Risk team approval from Paymob), MOTO will work as true one-click with no UI.

---

### 3.4 Flow D — Cash on Delivery (COD)

Simplest flow — no payment processing.

1. Customer selects "Cash" on Step 2
2. On Step 3, taps "Place Order"
3. Order created with `payment_status: 'pending'`, `status: 'processing'`
4. Navigates directly to order-success screen
5. No webhooks, no polling, no Paymob interaction

---

## 4. THE DECISION ENGINE — HOW FLOW ROUTING WORKS

**File:** `unibackend/app/Services/PaymentDecisionService.php`

The decision engine is called inside `initiatePayment()` to determine whether a payment should use MOTO (one-click) or Unified 3DS (redirect).

### Decision Rules (evaluated in order — first match wins)

| #   | Condition                                                                      | Flow             | Reason                                             |
| --- | ------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------- |
| 1   | No `payment_method_id` (no saved card)                                         | `unified_3ds`    | First time payment — must enter card details       |
| 2   | Saved card is inactive, expired, or token invalid                              | `unified_3ds`    | Card needs to be re-entered                        |
| 3   | `payments.enable_unified_checkout` is `false`                                  | `classic_iframe` | Feature flag disabled                              |
| 4   | `amount_cents > high_value_threshold` (default: 200,000 = EGP 2,000)           | `unified_3ds`    | High-value transactions require extra verification |
| 5   | `recentFailures >= failure_threshold` (default: 2 failures in 30 days)         | `unified_3ds`    | Too many recent failures — force fresh 3DS         |
| 6   | `payments.enable_moto` is `false`                                              | `unified_3ds`    | MOTO feature disabled                              |
| 7   | `payments.force_3ds_for_new_users` is `true` AND user has < 2 completed orders | `unified_3ds`    | New customer policy                                |
| 8   | **All checks pass** (default)                                                  | `moto`           | One-click payment with `fallback_to_3ds: true`     |

### Configuration

```php
// config/payments.php
return [
    'high_value_threshold'         => env('PAYMENT_HIGH_VALUE_THRESHOLD', 200000), // 2000 EGP
    'moto_max_attempts'            => 1,       // MOTO once, then fallback
    'recent_failure_lookback_days' => 30,
    'recent_failure_threshold'     => 2,       // Force 3DS after 2+ failures in 30 days
    'enable_moto'                  => env('PAYMENT_ENABLE_MOTO', true),
    'enable_saved_cards'           => env('PAYMENT_ENABLE_SAVED_CARDS', true),
    'enable_unified_checkout'      => env('PAYMENT_ENABLE_UNIFIED', true),
    'force_3ds_for_new_users'      => env('PAYMENT_FORCE_3DS_NEW_USERS', false),
    'payment_key_ttl_seconds'      => 3600,    // Paymob JWT TTL (1 hour)
    'status_polling_interval_ms'   => 2000,
    'status_polling_max_duration_ms' => 60000,
];
```

---

## 5. CARD TOKENIZATION DEEP DIVE

### 5.1 What Is a Token?

When you pay with card number `4111 1111 1111 1111`, Paymob generates a **token** — a random string like `tok_abc123def456...` — that represents your card. This token:

- ✅ Can be used to charge the card again (via MOTO)
- ✅ Is useless without Paymob's API keys (stolen tokens can't be used standalone)
- ❌ Cannot be reversed to get the actual card number
- ⏰ Has the same expiration date as the physical card

### 5.2 Token Save Lifecycle (Dual Webhook Bridge)

**The Problem:** Paymob sends card token data in a SEPARATE webhook (TOKEN type) that arrives BEFORE the transaction webhook. By the time the transaction webhook arrives and we confirm the payment, the token data is gone.

**The Solution:** Cache bridge pattern.

```
Timeline:
──────────────────────────────────────────────────────────────────────
  T+0s    Customer completes payment on Paymob
  T+1s    TOKEN webhook arrives → Cache::put("paymob_token_webhook:{orderId}", data, 30min)
  T+2s    TRANSACTION webhook arrives → payment confirmed
          → Cache::pull("paymob_token_webhook:{orderId}") retrieves token data
          → PaymentTokenService::saveCardToken() encrypts + stores
──────────────────────────────────────────────────────────────────────
```

**Cache key format:** `paymob_token_webhook:{paymob_order_id}`  
**TTL:** 30 minutes (generous — webhook gap is typically < 5 seconds)  
**Strategy:** `put()` on TOKEN webhook, `pull()` (get + delete) on TRANSACTION webhook

**Token data sources (tried in order):**

1. Direct from transaction webhook payload: `$payload['source_data']['token']` or `$payload['data']['token']['token']`
2. Cached from TOKEN webhook: `Cache::pull("paymob_token_webhook:{orderId}")`
3. If neither available → token not saved (payment still succeeds)

### 5.3 Token Storage & Encryption

**File:** `unibackend/app/Models/PaymentMethod.php`

```
┌──────────────────────────────────────────────────────────────┐
│                    payment_methods TABLE                       │
├──────────────────┬───────────────────────────────────────────┤
│ id               │ 1                                          │
│ user_id          │ 26                                         │
│ type             │ "card"                                     │
│ card_last_four   │ "1111"                                     │
│ card_brand       │ "visa"                                     │
│ card_holder_name │ "Ahmed Hassan"                             │
│ masked_card      │ "**** **** **** 1111"  (computed)          │
│ paymob_card_token│ [AES-256-CBC encrypted blob]  ← THE TOKEN │
│ token_fingerprint│ [SHA-256 hash of raw token]   ← For dedup │
│ token_type       │ "paymob_saved_card"                       │
│ status           │ "active"                                   │
│ is_default       │ true                                       │
│ is_verified      │ true                                       │
│ expires_at       │ "2027-12-31 23:59:59"                      │
│ deleted_at       │ null (soft delete for audit trail)          │
└──────────────────┴───────────────────────────────────────────┘
```

**Encryption:**

- **Algorithm:** AES-256-CBC via Laravel's `Crypt::encryptString()`
- **Key:** Derived from `APP_KEY` in `.env`
- **Mutator:** `setPaymobCardTokenAttribute($value)` auto-encrypts on write + generates fingerprint
- **Accessor:** `getPaymobCardTokenAttribute($value)` auto-decrypts on read
- **Failure handling:** If decryption fails (e.g., APP_KEY rotated), returns `null` — card becomes unusable but system doesn't crash

### 5.4 Token Deduplication

Before saving a new token, the system checks for duplicates using SHA-256 fingerprints:

```php
$fingerprint = hash('sha256', $rawToken);
$existing = PaymentMethod::where('user_id', $userId)
    ->where('token_fingerprint', $fingerprint)
    ->first();

if ($existing) {
    // Already saved — skip (don't create duplicate)
    return;
}
```

### 5.5 Soft-Delete Restore Strategy

If a customer deletes a card and then saves the same card again:

```php
// PaymentMethod::findOrRestoreDeleted($userId, $tokenFingerprint)
$trashed = PaymentMethod::withTrashed()
    ->where('user_id', $userId)
    ->where('token_fingerprint', $fingerprint)
    ->onlyTrashed()
    ->first();

if ($trashed) {
    $trashed->restore();           // Restore soft-deleted record
    $trashed->update([...]);       // Update with fresh data
    return $trashed;
}

// Otherwise create new record
return PaymentMethod::create([...]);
```

**Why?** This prevents unique constraint violations and maintains audit trail continuity.

### 5.6 Token Save Conditions

A token is saved **only** when ALL conditions are met:

1. ✅ HMAC verification passed (webhook is authentic)
2. ✅ Payment was successful (`success = true`)
3. ✅ Payment was captured (`is_capture = true`)
4. ✅ User opted in (`save_card_requested = true` on the payment record)
5. ✅ Token data exists (in webhook payload OR in cache from TOKEN webhook)
6. ✅ Card info extractable (brand, last 4 digits)

**File:** `unibackend/app/Services/PaymentTokenService.php` → `shouldSaveCardToken()` + `saveCardToken()`

---

## 6. THE WEBHOOK — SINGLE SOURCE OF TRUTH

### 6.1 HMAC Verification

**File:** `unibackend/app/Services/PaymobService.php` → `verifyHmac()`

Paymob sends an HMAC hash in the webhook that proves the request is authentic. We verify it by:

1. **Concatenate fields** in Paymob's documented order:

```
amount_cents + created_at + currency + error_occured + has_parent_transaction +
id + integration_id + is_3d_secure + is_auth + is_capture + is_refunded +
is_standalone_payment + is_voided + order.id + owner + pending +
source_data.pan + source_data.sub_type + source_data.type + success
```

2. **Boolean conversion:** `true` → `"true"`, `false` → `"false"` (literal strings)

3. **Hash:** `hash_hmac('sha512', $concatenated, $hmacSecret)`

4. **Compare:** `hash_equals($calculated, $received)` — timing-safe comparison (immune to side-channel attacks)

**Security note:** If HMAC fails → `403 Forbidden` returned to Paymob. Payment is NOT processed.

### 6.2 Token Webhook vs Transaction Webhook

| Aspect       | TOKEN Webhook                                     | TRANSACTION Webhook                                          |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| `type` field | `"TOKEN"`                                         | `"TRANSACTION"`                                              |
| When sent    | After card tokenization                           | After payment attempt                                        |
| Contains     | `token`, `masked_pan`, `card_subtype`, `order_id` | `success`, `amount_cents`, `is_capture`, `source_data`, etc. |
| HMAC signed? | Yes (separate HMAC calculation)                   | Yes                                                          |
| Our handling | Cache token data (`Cache::put`)                   | Process payment + retrieve cached token                      |
| Mutates DB?  | No (cache only)                                   | Yes (payment status, order status, card save)                |

### 6.3 Webhook Processing (Atomic Lock Sequence)

**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `processedCallback()`

This is the exact sequence of operations when the TRANSACTION webhook arrives:

```
1. EXTRACT PAYLOAD
   → $payload = $request->input('obj') ?? $request->all()

2. TOKEN-ONLY WEBHOOK CHECK
   → If payload has "token" + "masked_pan" but no "order":
     → Cache::put("paymob_token_webhook:{orderId}", tokenData, 30min)
     → Return 200 OK immediately

3. HMAC VERIFICATION
   → $this->paymobService->verifyHmac($payload)
   → If fails → Return 403 Forbidden

4. FIND PAYMENT RECORD
   → Try by paymob_order_id first
   → Fallback: match by special_reference / internal_order_id (regex ORD-\d+ prefix)
   → If not found → Return 404

5. AMOUNT VERIFICATION (stateless — before the lock)
   → Compare $payload['amount_cents'] with $payment->amount_cents
   → Compare $payload['currency'] with $payment->currency
   → If mismatch → Mark FAILED with "Security violation: amount/currency mismatch"

6. OPEN DB TRANSACTION + LOCK ROW
   → DB::transaction(function() use (...) {
   →   $payment = PaymobPayment::where('id', $paymentId)->lockForUpdate()->first()

7. IDEMPOTENCY CHECK (inside lock)
   → If $payment->isPaid() → Return 200 OK (duplicate webhook — safe to ignore)

8. EVALUATE PAYMENT RESULT
   → $isSuccess = (bool) $payload['success']
   → $isCapture = (bool) $payload['is_capture']
   → $transactionId = (string) $payload['id']

9. THE PAYMOB UNIFIED CHECKOUT QUIRK (is_capture fix)
   → If $isSuccess && !$isCapture:
     → Check $payload['data']['migs_order']['status'] === 'CAPTURED'
     → Check $payload['data']['captured_amount'] > 0
     → Check $payload['order']['payment_status'] === 'PAID'
     → If any true → override $isCapture = true

10. FAILURE PATH
    → If !$isSuccess:
      → $confirmationService->failPayment($payment, $transactionId, $errorMessage, $payload)
      → (This: marks FAILED, restores stock, updates order)

11. AUTH-BUT-NOT-CAPTURED PATH
    → If $isSuccess && !$isCapture && !$isAuth:
      → $payment->markAsPending("Authorized but not captured")
      → Return 200 OK (awaiting manual capture in Paymob Dashboard)

12. SUCCESS PATH
    → $confirmationService->confirmPayment($payment, $transactionId, $payload)
    → (This: marks PAID, clears cart, finalizes promo, dispatches ProcessOrderAsync)

13. CARD TOKEN SAVE (after success)
    → If $paymentTokenService->shouldSaveCardToken($payment, $payload):
      → Try extract token from $payload directly
      → If not found → Cache::pull("paymob_token_webhook:{paymobOrderId}") (bridge pattern)
      → $paymentTokenService->saveCardToken($userId, $tokenData)
    → Token save wrapped in try/catch — NEVER breaks payment confirmation

14. RETURN 200 OK
```

### 6.4 The Paymob Unified Checkout Quirk (is_capture Bug)

**Problem:** Paymob's Unified Checkout sometimes sends `is_capture: false` at the top level of the webhook, even when the underlying payment processor (MIGS) has already captured the funds.

**Evidence from real Order #48:**

```json
{
  "success": true,
  "is_capture": false,     ← TOP LEVEL SAYS NOT CAPTURED
  "is_auth": false,
  "data": {
    "migs_order": {
      "status": "CAPTURED"  ← BUT MIGS SAYS CAPTURED!
    },
    "captured_amount": 9290
  },
  "order": {
    "payment_status": "PAID"
  }
}
```

**Fix:** Three-layer deep check:

```php
if ($isSuccess && !$isCapture) {
    $migsStatus = $payload['data']['migs_order']['status'] ?? null;
    $capturedAmount = $payload['data']['captured_amount'] ?? 0;
    $orderStatus = $payload['order']['payment_status'] ?? null;

    if ($migsStatus === 'CAPTURED' || $capturedAmount > 0 || $orderStatus === 'PAID') {
        $isCapture = true; // Override — Paymob's top-level is wrong
    }
}
```

---

## 7. THE STATE MACHINE

**File:** `unibackend/app/Models/PaymobPayment.php` → `transitionTo()`

```
                    ┌──────────┐
                    │  PENDING  │ (initial state)
                    └─────┬────┘
                          │
                ┌─────────┼─────────┐
                │                   │
                ▼                   ▼
         ┌──────────┐       ┌──────────┐
         │   PAID   │       │  FAILED  │ (terminal)
         └─────┬────┘       └──────────┘
               │
               ▼
        ┌──────────┐
        │ REFUNDED │ (terminal)
        └──────────┘
```

### Legal Transitions

| From    | To       | Method                     | Trigger                                     |
| ------- | -------- | -------------------------- | ------------------------------------------- |
| PENDING | PAID     | `markAsPaid()`             | Webhook: `success=true, is_capture=true`    |
| PENDING | FAILED   | `markAsFailed()`           | Webhook: `success=false` or amount mismatch |
| PAID    | REFUNDED | `transitionTo('REFUNDED')` | Manual refund in Paymob Dashboard + webhook |

### Illegal Transitions (throw `LogicException`)

- FAILED → PAID (cannot resurrect a failed payment)
- FAILED → REFUNDED (cannot refund a failed payment)
- REFUNDED → PAID (cannot un-refund)
- PAID → PENDING (cannot go backwards)

### PaymobPayment Helper Methods

| Method                                   | Action                                                             |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `markAsPaid($transactionId, $response)`  | Sets status=PAID, stores transaction ID, sets `paid_at`            |
| `markAsFailed($errorMessage, $response)` | Sets status=FAILED, stores error message                           |
| `markAsPending($reason, $response)`      | Keeps PENDING, stores gateway response (e.g., auth-not-captured)   |
| `markMotoAttempted()`                    | Increments `moto_attempts`, sets `moto_attempted_at`               |
| `markAsFallbackTo3DS($reason)`           | Sets `is_fallback_from_moto=true`, changes `flow` to `unified_3ds` |

---

## 8. POLLING — READ-ONLY DISPLAY

**Endpoint:** `GET /api/v1/payments/status/{paymentId}`  
**File:** `unibackend/app/Http/Controllers/Api/PaymentController.php` → `checkStatus()`

### Critical Design: This endpoint NEVER mutates the database.

The polling endpoint is used by the frontend to check if the webhook has arrived and processed the payment. It:

1. Validates the authenticated user owns this payment
2. Returns current status from database
3. If payment is still PENDING and has a `paymob_intention_id`, fetches remote status from Paymob for display (but does NOT update local DB)

### Response Format

```json
{
  "status": "PAID",
  "order_payment_status": "completed",
  "order_status": "confirmed",
  "transaction_id": "412532416",
  "amount": 216.86,
  "currency": "EGP",
  "flow": "moto",
  "updated_at": "2026-02-12T10:30:00.000000Z",
  "paymob_status": "PAID",
  "paymob_success": true,
  "message": "Final confirmation is webhook-based. This status is for display only."
}
```

### Frontend Polling Engine

**File:** `frontend/services/paymentMethodsApi.ts` → `pollPaymentStatus()`

```
Default interval: 2,000ms (2 seconds)
Default max attempts: 30 (60 seconds total — can be overridden per caller)
WebView polling: 15 attempts (30s) + 2s initial delay = 32 seconds total
Terminal states: PAID, FAILED, REFUNDED → resolve immediately
Non-terminal after timeout: resolves with current state
Error resilience: retries on HTTP errors until max attempts
```

---

## 9. PAYMENT CONFIRMATION SERVICE

**File:** `unibackend/app/Services/PaymentConfirmationService.php`

Extracted from the PaymentController (God Controller breakup). This is the single place where payment outcomes affect the order.

### `confirmPayment()` — Success Path (5-step atomic sequence)

**Prerequisites (caller must guarantee):**

- HMAC verified
- Amount + currency validated
- Row locked via `lockForUpdate()` inside `DB::transaction`
- Payment is still `PENDING`

**Steps:**

1. `$payment->markAsPaid($transactionId, $gatewayResponse)` — state machine transition PENDING → PAID
2. `PaymentTransaction::updateOrCreate(...)` — legacy audit trail record
3. `$order->update(['payment_status' => 'completed', 'status' => 'confirmed'])` — order confirmation
4. `$this->orderService->finalizePromoUsage($order)` + `$this->cartService->clearCart($cart)` — finalization
5. `ProcessOrderAsync::dispatch($order->id, 'confirmed')` — async job for notifications, analytics

### `failPayment()` — Failure Path

1. `$payment->markAsFailed($errorMessage, $gatewayResponse)`
2. `PaymentTransaction::updateOrCreate(...)` — status `failed`
3. `$order->update(['payment_status' => 'failed', 'status' => 'failed'])`
4. **Stock restoration**: loops through order items, increments `quantity_available` for each product

---

## 10. PAYMENT RECOVERY (APP CRASH/KILL)

If the app crashes or is killed during payment:

1. **Payment is in PENDING state** in the database
2. When user reopens the app, the order shows as "payment pending"
3. User can retry payment from order details
4. If the original payment actually succeeded (webhook arrived while app was dead):
   - The webhook already marked the payment as PAID
   - When user checks, they see the order is confirmed
5. If the original payment failed:
   - The webhook marked it as FAILED
   - User can retry with a new payment

**Reconciliation safety net:** A scheduled job can be configured to check PENDING payments older than X minutes, query Paymob's API for actual status, and reconcile.

---

## 11. SECURITY DEEP DIVE

### Authentication & Authorization

| Layer                     | Mechanism                                                         |
| ------------------------- | ----------------------------------------------------------------- |
| API Authentication        | Laravel Sanctum bearer tokens                                     |
| Payment ownership         | `$order->user_id === auth()->id()` checked before every operation |
| Card ownership            | `$paymentMethod->user_id === auth()->id()` verified               |
| Webhook authentication    | HMAC SHA-512 verification                                         |
| Webhook replay protection | Idempotent processing via pessimistic locking                     |

### Encryption

| Data               | Algorithm      | Key                |
| ------------------ | -------------- | ------------------ |
| Card token at rest | AES-256-CBC    | Laravel APP_KEY    |
| Token fingerprint  | SHA-256        | N/A (one-way hash) |
| Webhook HMAC       | SHA-512        | Paymob HMAC_SECRET |
| API communication  | HTTPS/TLS 1.2+ | Paymob SSL cert    |

### Race Condition Prevention

```php
DB::transaction(function () use ($paymentId) {
    // Pessimistic lock — other requests wait until this transaction completes
    $payment = PaymobPayment::where('id', $paymentId)->lockForUpdate()->first();

    // Idempotency check INSIDE the lock
    if ($payment->isPaid()) {
        return; // Duplicate webhook — safe to ignore
    }

    // Process payment...
});
```

### PCI-DSS Compliance

- **No raw card numbers** stored anywhere in the system
- Card tokens are **encrypted at rest** (AES-256-CBC)
- `paymob_card_token` and `token` columns are in `$hidden` array — never exposed in JSON responses
- Card details are entered on **Paymob's hosted page** (not our backend)
- Only token + masked PAN + last 4 digits are stored

### Amount Verification

```php
// Before processing, verify Paymob sent the correct amount
if ((int)$payload['amount_cents'] !== (int)$payment->amount_cents) {
    $payment->markAsFailed("Security violation: amount mismatch");
    return;
}
if (strtoupper($payload['currency']) !== strtoupper($payment->currency)) {
    $payment->markAsFailed("Security violation: currency mismatch");
    return;
}
```

---

## 12. DATABASE SCHEMA

### `paymob_payments` Table

```sql
CREATE TABLE paymob_payments (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id              BIGINT UNSIGNED NOT NULL,
  user_id               BIGINT UNSIGNED NOT NULL,
  internal_order_id     VARCHAR(255) UNIQUE,      -- "ORD-42-1707753600123456"
  paymob_order_id       VARCHAR(255),             -- Paymob's order ID
  paymob_intention_id   VARCHAR(255),             -- Intention API ID (pi_test_...)
  paymob_transaction_id VARCHAR(255),             -- Transaction ID from webhook
  special_reference     VARCHAR(255),             -- Unique ref for Paymob
  amount_cents          INT NOT NULL,             -- 15000 = EGP 150.00
  currency              VARCHAR(10) DEFAULT 'EGP',
  payment_method        VARCHAR(20) NOT NULL,     -- 'CARD' or 'WALLET'
  flow                  VARCHAR(20) NOT NULL,     -- 'classic_iframe', 'unified_3ds', 'moto'
  save_card_requested   BOOLEAN DEFAULT FALSE,
  moto_attempts         INT DEFAULT 0,
  moto_attempted_at     TIMESTAMP NULL,
  is_fallback_from_moto BOOLEAN DEFAULT FALSE,
  integration_id        VARCHAR(50),              -- Which Paymob integration was used
  status                VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, FAILED, REFUNDED
  billing_data          JSON,
  paymob_response       JSON,                     -- Full Paymob response for audit
  error_message         TEXT NULL,
  paid_at               TIMESTAMP NULL,
  created_at            TIMESTAMP,
  updated_at            TIMESTAMP,

  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_paymob_order_id (paymob_order_id),
  INDEX idx_status (status),
  INDEX idx_special_reference (special_reference),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### `payment_methods` Table

```sql
CREATE TABLE payment_methods (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             BIGINT UNSIGNED NOT NULL,
  type                VARCHAR(20) DEFAULT 'card',
  card_last_four      VARCHAR(4),
  card_brand          VARCHAR(20),               -- 'visa', 'mastercard', 'amex'
  card_holder_name    VARCHAR(255),
  token               TEXT,                      -- Legacy (redirects to paymob_card_token)
  paymob_card_token   TEXT,                      -- AES-256-CBC encrypted token
  token_fingerprint   VARCHAR(64),               -- SHA-256 hash for dedup
  token_type          VARCHAR(30),               -- 'paymob_saved_card'
  status              VARCHAR(20) DEFAULT 'active',
  invalidated_reason  TEXT NULL,
  invalidated_at      TIMESTAMP NULL,
  is_default          BOOLEAN DEFAULT FALSE,
  is_verified         BOOLEAN DEFAULT FALSE,
  expires_at          TIMESTAMP NULL,
  created_at          TIMESTAMP,
  updated_at          TIMESTAMP,
  deleted_at          TIMESTAMP NULL,            -- Soft delete for audit trail

  INDEX idx_user_id (user_id),
  INDEX idx_token_fingerprint (token_fingerprint),
  INDEX idx_is_default (is_default),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 13. API ENDPOINTS REFERENCE

### Payment Endpoints (Authenticated)

| Method | Route                                              | Controller Method          | Purpose                                               |
| ------ | -------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `POST` | `/api/v1/payments/paymob/pre-check`                | `preCheckPayment`          | Pre-validate payment capability (optional, for UX)    |
| `POST` | `/api/v1/payments/paymob/initiate`                 | `initiatePayment`          | Start new card/wallet payment (routes to MOTO or 3DS) |
| `POST` | `/api/v1/payments/paymob/initiate-with-saved-card` | `initiateSavedCardPayment` | Start saved card payment (direct MOTO entry point)    |
| `GET`  | `/api/v1/payments/status/{paymentId}`              | `checkStatus`              | Poll payment status (READ-ONLY)                       |
| `GET`  | `/api/v1/order/{orderId}/status`                   | `getPaymentStatus`         | Legacy status endpoint                                |

### Webhook Endpoints (Public — HMAC protected)

| Method | Route                      | Controller Method   | Purpose                                    |
| ------ | -------------------------- | ------------------- | ------------------------------------------ |
| `POST` | `/api/v1/paymob/processed` | `processedCallback` | Receive payment/token webhooks from Paymob |
| `GET`  | `/api/v1/payment/response` | `responseCallback`  | UX-only redirect (never mutates DB)        |

### Payment Methods CRUD (Authenticated)

| Method   | Route                                  | Controller Method | Purpose                  |
| -------- | -------------------------------------- | ----------------- | ------------------------ |
| `GET`    | `/api/v1/payment-methods`              | `index`           | List all saved cards     |
| `PUT`    | `/api/v1/payment-methods/{id}/default` | `setDefault`      | Set card as default      |
| `DELETE` | `/api/v1/payment-methods/{id}`         | `destroy`         | Soft-delete a saved card |

---

## 14. FILE MAP — EVERY FILE AND ITS JOB

### Backend (Laravel)

| File                                             | Lines | Purpose                                                                                                                     |
| ------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/Api/PaymentController.php` | ~1600 | Main orchestrator — initiatePayment, processedCallback, checkStatus, MOTO flow, webhook handling                            |
| `app/Services/PaymobService.php`                 | ~1034 | Paymob API wrapper — authenticate, createIntention, createMotoIntention, payWithSavedCardMoto, verifyHmac, extractCardToken |
| `app/Services/PaymentDecisionService.php`        | ~199  | 8-rule decision tree — decides MOTO vs Unified 3DS                                                                          |
| `app/Services/PaymentTokenService.php`           | ~148  | Card token lifecycle — shouldSaveCardToken, saveCardToken, dedup, fingerprint                                               |
| `app/Services/PaymentConfirmationService.php`    | ~120  | Atomic payment outcome handler — confirmPayment (5 steps), failPayment (4 steps)                                            |
| `app/Models/PaymobPayment.php`                   | ~180  | Payment model — state machine, transitions, scopes                                                                          |
| `app/Models/PaymentMethod.php`                   | ~312  | Saved card model — encryption mutators, soft deletes, findOrRestoreDeleted                                                  |
| `config/payments.php`                            | ~20   | Payment configuration — thresholds, feature flags                                                                           |
| `routes/api.php`                                 | N/A   | API route definitions for all payment endpoints                                                                             |

### Frontend (React Native / Expo)

| File                              | Lines | Purpose                                                                            |
| --------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `app/checkout/payment.tsx`        | ~540  | Step 2 — Payment type selection (Card/COD), saved card toggle, card selector       |
| `app/checkout/confirmation.tsx`   | ~1046 | Step 3 — Order review, delivery slot, place order, payment initiation orchestrator |
| `app/payment-webview.tsx`         | ~250  | WebView for 3DS/Unified Checkout — URL interception, polling after redirect        |
| `app/profile/payment-methods.tsx` | ~500  | Profile — Manage saved cards (list, set default, delete)                           |
| `app/profile/payment.tsx`         | ~226  | Profile — Payment info page (available methods, how it works)                      |
| `components/SavedCardsList.tsx`   | ~220  | Reusable saved card selector with radio buttons and brand colors                   |
| `services/paymentMethodsApi.ts`   | ~200  | API client — all payment API calls + polling engine                                |

---

## 15. ENVIRONMENT CONFIGURATION

### `.env` Variables

```bash
# ── Paymob Core ──
PAYMOB_API_KEY=ZXlKaGJHY2lPaUpJVX...       # API key from Paymob Dashboard
PAYMOB_SECRET_KEY=egy_sk_test_...            # Secret key for Intention API (v1)
PAYMOB_PUBLIC_KEY=egy_pk_test_...            # Public key for client-side
PAYMOB_HMAC_SECRET=A1B2C3D4E5F6...          # HMAC secret for webhook verification

# ── Integration IDs ──
PAYMOB_INTEGRATION_ID=5084814               # Card/3DS (Unified Checkout)
PAYMOB_WALLET_INTEGRATION_ID=5084831        # Mobile Wallet (Vodafone Cash, etc.)
PAYMOB_MOTO_INTEGRATION_ID=5511054          # MOTO (Server-to-server, saved card)
PAYMOB_IFRAME_ID=919973                     # Legacy hosted page

# ── URLs ──
PAYMOB_CALLBACK_URL=https://your-domain.com/api/v1/paymob/processed
PAYMOB_REDIRECT_URL=elbaraka://payment-return    # Deep link back to app

# ── Feature Flags ──
PAYMENT_ENABLE_MOTO=true
PAYMENT_ENABLE_SAVED_CARDS=true
PAYMENT_ENABLE_UNIFIED=true
PAYMENT_FORCE_3DS_NEW_USERS=false
PAYMENT_HIGH_VALUE_THRESHOLD=200000          # 2000 EGP in cents
```

---

## 16. PAYMOB DASHBOARD CONFIGURATION

### Required Setup

1. **Card Integration (5084814)**
   - Transaction processed callback URL: `https://your-domain.com/api/v1/paymob/processed`
   - Transaction response callback URL: `https://your-domain.com/api/v1/payment/response`

2. **MOTO Integration (5511054)**
   - Same callback URLs as above
   - **Risk team approval required** for production MOTO (contact Paymob support)
   - Test MOTO integration will always trigger 3DS with test cards

3. **Wallet Integration (5084831)**
   - Same callback URLs

4. **HMAC Configuration**
   - Generate HMAC secret in Dashboard → Developers → HMAC
   - Copy to `PAYMOB_HMAC_SECRET` in `.env`

---

## 17. FRONTEND PAYMENT SCREENS

### Step 2: Payment Method Selection (`checkout/payment.tsx`)

**UI Features:**

- **Card/Cash toggle** — Premium card-style buttons with brand icons, checkmark badge on active
- **Saved card toggle** — Switch to toggle between new card and saved card mode
- **Saved cards list** — Radio selection with brand-colored strips (Visa blue, MC red, Amex blue)
- **Save card checkbox** — Opt-in to save new card for future use
- **Security badges** — "PCI-DSS compliant • 256-bit encryption" and "Cards encrypted and securely stored"
- **Disabled state** — Continue button disabled when saved card mode is on but no card selected
- **COD features list** — Checklist of COD benefits

### Step 3: Order Confirmation (`checkout/confirmation.tsx`)

**Payment Logic:**

1. Creates order via API
2. Routes to MOTO or Unified Checkout based on backend response
3. MOTO → navigates to order-success with polling
4. Unified 3DS → navigates to payment-webview with iframe URL
5. COD → navigates directly to order-success

### Profile: Payment Methods (`profile/payment-methods.tsx`)

**UI Features:**

- **Card list** — Premium card items with brand-colored icon strips, default ribbon, verified/expired/unverified badges
- **Actions** — "Set as Default" (green pill) and "Delete" (red pill) buttons
- **Empty state** — Step-by-step guide on how to save a card (3 numbered steps)
- **Security note** — "All cards encrypted with AES-256-CBC"
- **Skeleton loading** — Shimmer effect while loading
- **Pull-to-refresh** — Refresh card list

---

## 18. COMPLETE TEST SCENARIOS

### Scenario 1: New Card Payment — Success

```
Given: User has no saved cards
When:  User selects Card → enters new card details → completes 3DS
Then:  Order status = confirmed, payment status = completed
       Card NOT saved (save_card was false)
       Cart is cleared
       User navigated to success screen
```

### Scenario 2: New Card Payment — Save Card

```
Given: User has no saved cards, checks "Save this card"
When:  User completes payment with card 4111 1111 1111 1111
Then:  Order confirmed + card saved to payment_methods table
       paymob_card_token = AES-256-CBC encrypted
       token_fingerprint = SHA-256 of raw token
       is_verified = true, is_default = true (first card)
       card_last_four = "1111", card_brand = "visa"
```

### Scenario 3: Saved Card Payment — MOTO Success (Production)

```
Given: User has saved Visa •••• 1111, amount < 2000 EGP, no recent failures
When:  User selects saved card → taps Pay
Then:  Decision engine returns MOTO
       MOTO Intention created with integration 5511054
       Server-to-server pay request sent
       Payment succeeds instantly (no redirect)
       User navigated directly to success screen
```

### Scenario 4: Saved Card Payment — MOTO → 3DS Fallback

```
Given: User has saved card, MOTO attempted
When:  Paymob returns requires_redirection: true (bank requires 3DS)
Then:  payment.is_fallback_from_moto = true
       payment.flow changed from 'moto' to 'unified_3ds'
       Unified Checkout created with card_tokens (card pre-filled)
       User redirected to Paymob checkout → completes 3DS
       Webhook confirms payment
```

### Scenario 5: Saved Card Payment — MOTO Failure

```
Given: User has saved card
When:  MOTO pay request returns success: false
Then:  Payment marked as FAILED
       Error message stored from Paymob response
       User sees payment failure screen
       Stock restored to inventory
```

### Scenario 6: High-Value Transaction Forces 3DS

```
Given: User has saved card, order amount = EGP 3,000 (300,000 cents)
When:  Decision engine evaluates
Then:  Rule 4 fires: amount > high_value_threshold (200,000)
       Flow = unified_3ds (NOT moto)
       User redirected to Paymob for full 3DS verification
```

### Scenario 7: Recent Failures Force 3DS

```
Given: User had 2 failed payments in last 30 days, has saved card
When:  Decision engine evaluates
Then:  Rule 5 fires: recent failures >= threshold (2)
       Flow = unified_3ds (NOT moto)
       User must complete fresh 3DS verification
```

### Scenario 8: New User Forced to 3DS

```
Given: force_3ds_for_new_users = true, user has < 2 completed orders, has saved card
When:  Decision engine evaluates
Then:  Rule 7 fires: new user policy
       Flow = unified_3ds (NOT moto)
```

### Scenario 9: Duplicate Webhook (Idempotency)

```
Given: Payment already marked as PAID
When:  Paymob sends duplicate TRANSACTION webhook
Then:  Webhook handler acquires lock → checks isPaid() → returns 200 OK
       No duplicate processing, no double cart clear, no duplicate notifications
```

### Scenario 10: HMAC Verification Failure

```
Given: Webhook arrives with invalid/tampered HMAC
When:  verifyHmac() calculates SHA-512 and compares
Then:  hash_equals() returns false
       403 Forbidden returned to sender
       Payment NOT processed — status stays PENDING
```

### Scenario 11: Amount Mismatch Attack

```
Given: Attacker sends webhook with amount_cents = 100 (instead of 15000)
When:  Webhook handler compares amounts before lock
Then:  Mismatch detected → payment marked FAILED
       Error: "Security violation: amount mismatch"
       Order marked as failed
```

### Scenario 12: Currency Mismatch Attack

```
Given: Webhook payload has currency = "USD" but payment expects "EGP"
When:  Webhook handler compares currencies
Then:  Mismatch detected → payment marked FAILED
       Error: "Security violation: currency mismatch"
```

### Scenario 13: Token Webhook Before Transaction Webhook (Cache Bridge)

```
Given: User opted to save card
When:  TOKEN webhook arrives first → Transaction webhook arrives second
Then:  TOKEN webhook: Cache::put("paymob_token_webhook:{orderId}", tokenData, 30min)
       TRANSACTION webhook: Confirms payment → Cache::pull() retrieves token
       Token saved to payment_methods via PaymentTokenService
```

### Scenario 14: Token Save Failure — Payment Still Succeeds

```
Given: Token extraction fails (unexpected format) or encryption error
When:  saveCardToken() throws exception
Then:  Exception caught and logged
       Payment confirmation NOT affected — order is still PAID
       Card simply not saved — user can save it next time
```

### Scenario 15: Duplicate Card Token (Same Card Saved Twice)

```
Given: User already has Visa •••• 1111 saved
When:  User pays with same card and checks "Save"
Then:  SHA-256 fingerprint matches existing record
       Deduplication: skip save (no duplicate created)
       Payment succeeds normally
```

### Scenario 16: Restored Soft-Deleted Card

```
Given: User previously deleted Visa •••• 1111
When:  User pays with same card and checks "Save"
Then:  findOrRestoreDeleted() finds trashed record by fingerprint
       Trashed record restored (deleted_at = null)
       Token refreshed with new encrypted value
       No unique constraint violation
```

### Scenario 17: APP_KEY Rotation — Graceful Degradation

```
Given: APP_KEY changed after card was saved
When:  User tries to pay with saved card
Then:  Decryption fails → getPaymobCardTokenAttribute() returns null
       Card's isActive() returns false (token invalid)
       Decision engine detects inactive card → routes to unified_3ds
       User enters card details fresh → new token saved with new key
```

### Scenario 18: Paymob is_capture Quirk (Unified Checkout)

```
Given: Payment successful, but webhook has is_capture=false at top level
When:  Webhook handler evaluates
Then:  Deep check: data.migs_order.status === 'CAPTURED' ✅
       is_capture overridden to true
       Payment confirmed normally (not stuck as "authorized")
```

### Scenario 19: Cash on Delivery

```
Given: User selects Cash payment
When:  User taps Place Order
Then:  Order created with status = 'processing'
       No Paymob interaction, no webhooks
       User navigated directly to success screen
       No payment record in paymob_payments table
```

### Scenario 20: App Crash During Payment

```
Given: User opened WebView, payment processing
When:  App crashes / user kills app
Then:  Payment stays PENDING in database
       Webhook arrives → payment confirmed/failed regardless of app state
       User reopens app → order screen shows actual status
       User can retry if payment failed
```

### Scenario 21: Wallet Payment

```
Given: User selects Wallet (Vodafone Cash, etc.)
When:  Payment initiated
Then:  Classic iframe flow used (not Intention API)
       Integration ID = 5084831 (wallet)
       No card tokenization (wallets can't be tokenized)
       Webhook confirmation same as card payments
```

### Scenario 22: WebView URL Interception

```
Given: Payment WebView is open
When:  Paymob redirects to elbaraka://payment-return
Then:  handleShouldStartLoadWithRequest() intercepts the URL
       Returns false (prevents loading deep link in WebView)
       Triggers polling immediately
       Shows "Verifying payment..." overlay
```

### Scenario 23: Polling Timeout

```
Given: Webhook hasn't arrived after 32 seconds (2s initial delay + 15 attempts × 2s)
When:  Polling reaches max 15 attempts
Then:  Polling stops
       Alert: "Payment is still being processed. Check your orders."
       User navigated to home screen
       (Webhook will eventually arrive and confirm payment)
```

### Scenario 24: Set Default Card

```
Given: User has 2 saved cards, Card A is default
When:  User taps "Set as Default" on Card B
Then:  API: PUT /payment-methods/{B}/default
       Card A: is_default = false
       Card B: is_default = true
       Atomic transaction (no race condition)
```

### Scenario 25: Delete Card — Default Reassignment

```
Given: User has 2 cards, Card A (default) and Card B
When:  User deletes Card A
Then:  Card A: soft-deleted (deleted_at = now)
       Card B: automatically set as new default
       API returns new_default info in response
```

### Scenario 26: Expired Card Blocked from MOTO

```
Given: User has saved card that expired last month
When:  Decision engine evaluates
Then:  Rule 2 fires: card is inactive (expired)
       Flow = unified_3ds (NOT moto)
       User must enter new card details
```

### Scenario 27: Pre-Check Payment (Optional UX Enhancement)

```
Given: User is on checkout, hasn't created order yet
When:  Frontend calls POST /payments/paymob/pre-check
Then:  Backend authenticates with Paymob, registers temp order
       Result cached 30 minutes under payment_precheck_{userId}
       Returns iframe_url for instant checkout readiness
       If Paymob is down → returns 503 "Payment service temporarily unavailable"
```

### Scenario 28: Concurrent Webhooks (Race Condition)

```
Given: Paymob sends same webhook twice (network retry)
When:  Both hit processedCallback() simultaneously
Then:  First request: acquires lockForUpdate() → processes payment → commits
       Second request: waits for lock → acquires lock → isPaid() = true → returns 200 OK
       No double processing, no duplicate cart clearing
```

### Scenario 29: Auth-but-Not-Captured (Intermediate State)

```
Given: Payment successful (success=true) but is_capture=false AND is_auth=true
       AND Paymob Unified Checkout quirk check also returns false
When:  Webhook handler evaluates
Then:  Payment stays PENDING with reason "Authorized but not yet captured"
       Order stays in current status (not confirmed)
       Manual capture required in Paymob Dashboard
       Next webhook (after capture) will transition to PAID
```

### Scenario 30: MOTO Disabled Feature Flag

```
Given: config payments.enable_moto = false, user has saved card
When:  Decision engine evaluates
Then:  Rule 6 fires: MOTO feature disabled
       Flow = unified_3ds (customer redirected to enter card details)
       Saved card NOT used for server-to-server payment
```

### Scenario 31: Classic iFrame Fallback

```
Given: config payments.enable_unified_checkout = false
When:  Decision engine evaluates
Then:  Rule 3 fires: Unified Checkout disabled
       Flow = classic_iframe (legacy hosted page)
       Uses iFrame integration ID (919973)
```

### Scenario 32: Direct Saved Card Endpoint

```
Given: User calls POST /payments/paymob/initiate-with-saved-card with payment_method_id
When:  initiateSavedCardPayment() is called
Then:  Bypasses decision engine → always uses MOTO flow
       Direct entry point for explicit saved card payments
       Same MOTO flow as Scenario 3 but without decision tree evaluation
```

---

## 19. TROUBLESHOOTING GUIDE

### Payment stuck in PENDING

1. **Check webhook delivery:** Open Paymob Dashboard → Transactions → find the transaction → check webhook delivery status
2. **Check callback URL:** Ensure the Transaction processed callback URL is set correctly on the integration in Paymob Dashboard
3. **Check server logs:** `storage/logs/laravel.log` — search for the order ID or transaction ID
4. **Manual reconciliation:** If webhook was delivered but not processed, check for HMAC errors or exceptions
5. **Paymob test mode:** Test transactions may have delayed webhooks (up to 30s)

### Card not saving despite checkbox checked

1. **Check both webhooks arrived:** Search logs for "TOKEN" webhook and "TRANSACTION" webhook
2. **Token webhook might be missing:** Paymob must send TOKEN webhook — check Dashboard webhook delivery
3. **Cache bridge:** If TOKEN webhook arrived but cache expired (> 30 min delay), token data is lost
4. **save_card_requested:** Verify the payment record has `save_card_requested = true`
5. **Token extraction:** Check if token data structure matches expected format

### MOTO always falls back to 3DS

1. **Test environment:** Test cards ALWAYS trigger 3DS — this is expected behavior
2. **Production:** Contact Paymob Risk team to activate live MOTO on your integration
3. **Decision engine:** Check which rule is firing — add logging to `PaymentDecisionService`
4. **Integration ID:** Verify `PAYMOB_MOTO_INTEGRATION_ID` is set correctly

### "unmatched_item_prices" error (HTTP 406)

1. **Items total must equal amount:** Sum of all (item.amount × item.quantity) must exactly equal the intention amount
2. **Include delivery fee + tax:** These must be separate line items
3. **Rounding adjustment:** If there's a 1-cent rounding difference, add an "Adjustment" line item

### WebView not detecting redirect

1. **Deep link scheme:** Verify `elbaraka://payment-return` matches `PAYMOB_REDIRECT_URL` in `.env`
2. **URL interception:** `handleShouldStartLoadWithRequest()` checks for `elbaraka://` prefix
3. **Dev fallback:** In dev, also checks for ngrok/localhost URLs
4. **WebView loading:** Ensure `javaScriptEnabled` and `domStorageEnabled` are true

### Encryption error on card usage

1. **APP_KEY rotation:** If `APP_KEY` was changed, all existing encrypted tokens become invalid
2. **Graceful degradation:** Card returns `null` token → `isActive()` = false → falls back to 3DS
3. **Fix:** Customer must re-enter card details and save again with new key

---

## 20. GLOSSARY

| Term                                     | Definition                                                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **3DS (3D Secure)**                      | Bank verification protocol — customer enters OTP from their bank to confirm payment                                                 |
| **AES-256-CBC**                          | Symmetric encryption algorithm used to encrypt card tokens at rest                                                                  |
| **Card Token**                           | A random string representing a saved card — can charge the card again without knowing the real number                               |
| **CIT (Customer Initiated Transaction)** | Payment where the customer is present and interacts (3DS, card entry)                                                               |
| **Deep Link**                            | `elbaraka://payment-return` — URL scheme that opens the El Baraka app from a browser                                                |
| **Fingerprint**                          | SHA-256 hash of the raw card token — used for deduplication without comparing encrypted values                                      |
| **HMAC**                                 | Hash-based Message Authentication Code — proves webhook is from Paymob (not forged)                                                 |
| **Idempotent**                           | Can be safely called multiple times with the same result — duplicate webhooks don't cause double processing                         |
| **Intention API**                        | Paymob's V1 API for creating payment sessions (`POST /v1/intention/`)                                                               |
| **Integration ID**                       | Paymob identifier for a specific payment method configuration (card, wallet, MOTO, etc.)                                            |
| **Lockbox (pessimistic lock)**           | `SELECT ... FOR UPDATE` — prevents other database transactions from reading/writing the row until the current transaction completes |
| **MIGS**                                 | MasterCard Internet Gateway Service — underlying processor used by some banks                                                       |
| **MIT (Merchant Initiated Transaction)** | Payment without customer interaction — uses MOTO integration                                                                        |
| **MOTO**                                 | Mail Order / Telephone Order — server-to-server payment with no customer UI                                                         |
| **Paymob**                               | Egyptian payment gateway at `accept.paymob.com` — handles card, wallet, and MOTO payments                                           |
| **PCI-DSS**                              | Payment Card Industry Data Security Standard — security requirements for handling card data                                         |
| **Pessimistic Locking**                  | Database strategy where a row is locked before reading to prevent concurrent modifications                                          |
| **Polling**                              | Frontend repeatedly checks payment status via GET request until a terminal state is reached                                         |
| **Reconciliation**                       | Scheduled process to match local payment records with Paymob's actual status                                                        |
| **SHA-256**                              | Cryptographic hash function — used for token fingerprints (one-way, cannot be reversed)                                             |
| **SHA-512**                              | Cryptographic hash function — used for HMAC webhook verification                                                                    |
| **Soft Delete**                          | Record marked as deleted (deleted_at timestamp) but not actually removed from database                                              |
| **State Machine**                        | Enforced status transitions: PENDING→PAID/FAILED, PAID→REFUNDED — prevents illegal state changes                                    |
| **Token Webhook**                        | Paymob's separate webhook sent when a card is tokenized (type: "TOKEN")                                                             |
| **Transaction Webhook**                  | Paymob's main webhook sent after a payment attempt (type: "TRANSACTION")                                                            |
| **Unified Checkout**                     | Paymob's hosted payment page — customer enters card details on Paymob's domain (not ours)                                           |
| **WebView**                              | In-app browser component that loads Paymob's checkout page                                                                          |

---

## APPENDIX A: PAYMOB API ENDPOINTS USED

| API                     | Method | URL                                                | Purpose                                           |
| ----------------------- | ------ | -------------------------------------------------- | ------------------------------------------------- |
| Authenticate (legacy)   | POST   | `/api/auth/tokens`                                 | Get auth token for legacy APIs                    |
| Register Order (legacy) | POST   | `/api/ecommerce/orders`                            | Register order for legacy flow                    |
| Payment Key (legacy)    | POST   | `/api/acceptance/payment_keys`                     | Generate payment key for legacy flow              |
| **Create Intention**    | POST   | `/v1/intention/`                                   | Create payment session (Unified Checkout or MOTO) |
| **Pay with Token**      | POST   | `/api/acceptance/payments/pay`                     | Server-to-server MOTO payment with saved card     |
| Get Intention Status    | GET    | `/v1/intentions/{id}`                              | Manual status check (reconciliation)              |
| Unified Checkout URL    | GET    | `/unifiedcheckout/?publicKey=...&clientSecret=...` | Frontend checkout page                            |

## APPENDIX B: INTEGRATION IDS

| ID        | Name     | Type               | Use Case                                                              |
| --------- | -------- | ------------------ | --------------------------------------------------------------------- |
| `5084814` | Card/3DS | Unified Checkout   | New card payments with 3DS verification                               |
| `5511054` | MOTO     | Server-to-server   | Saved card one-click payments (requires Risk approval for production) |
| `5084831` | Wallet   | Classic iframe     | Mobile wallet payments (Vodafone Cash, etc.)                          |
| `919973`  | iFrame   | Legacy hosted page | Backward compatibility                                                |

## APPENDIX C: ENVIRONMENT-SPECIFIC BEHAVIOR

| Aspect               | Test Environment                      | Production Environment          |
| -------------------- | ------------------------------------- | ------------------------------- |
| MOTO with test cards | Always triggers 3DS fallback          | True one-click (no redirect)    |
| Card numbers         | Use `4111 1111 1111 1111` (Visa test) | Real card numbers               |
| 3DS verification     | ACS Emulator (auto-approve)           | Real bank OTP via SMS           |
| MOTO integration     | Test `5511054`                        | Live integration ID from Paymob |
| Webhooks             | May have 5-30s delay                  | Near-instant (< 2s typically)   |
| Transaction limits   | None                                  | Subject to merchant agreement   |
| Risk team approval   | Not required                          | Required for MOTO activation    |

---

**END OF DOCUMENT**

_This document covers the complete payment system implementation for El Baraka, including all 4 payment flows, 32 test scenarios, security measures, database schemas, API references, and troubleshooting guides. It is designed as an enterprise-ready reference for implementing or auditing the payment tokenization system._
