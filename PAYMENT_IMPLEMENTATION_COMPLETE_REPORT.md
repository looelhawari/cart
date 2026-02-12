# 🔒 PAYMENT TOKENIZATION SYSTEM — COMPLETE IMPLEMENTATION REPORT

> **Date:** February 2026  
> **Scope:** Full-stack payment security hardening — Backend (Laravel), Frontend (React Native/Expo), Database (MySQL 8)  
> **Status:** ✅ ALL CODE CHANGES COMPLETE + MIGRATION APPLIED  
> **Total Changes:** 23+ individual fixes across 14 files, 1 new migration, 1 deleted dead file

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Backend Changes — Detailed](#2-backend-changes)
3. [Frontend Changes — Detailed](#3-frontend-changes)
4. [Database Migration — Detailed](#4-database-migration)
5. [Deleted Files](#5-deleted-files)
6. [Environment Configuration](#6-environment-configuration)
7. [Configuration Required From You](#7-configuration-required-from-you)
8. [Security Fixes Summary](#8-security-fixes-summary)
9. [Bug Fixes Summary](#9-bug-fixes-summary)
10. [Redundancy Elimination Summary](#10-redundancy-elimination-summary)
11. [Testing Checklist](#11-testing-checklist)
12. [Deployment Checklist](#12-deployment-checklist)
13. [Full File-by-File Change Log](#13-full-file-by-file-change-log)

---

## 1. EXECUTIVE SUMMARY

### What Was Done

This implementation addressed **every** issue identified in the two deep-research audit reports (rated 78/100 and 88/100). All 18 verified audit claims were resolved. The work covered:

- **🛡️ 8 Security Fixes** — Removed exposed secrets from logs, eliminated unsafe test endpoints, removed HMAC-bypassing webhook handler, added order ownership authorization, fixed timing-safe comparisons
- **🐛 11 Bug Fixes** — Fatal parse error, column name mismatches, missing foreign keys, broken query scopes, DB transaction leaks, undefined property access, orphan API calls
- **🧹 4 Redundancy Eliminations** — Dead trait deleted, duplicate API service consolidated, duplicate polling logic unified, self-destructive migration fixed
- **📊 1 Database Migration** — 5 schema changes applied and verified
- **📦 2 Environment Variables** — Added to `.env` and `config/services.php`

### Files Modified (13)

| Layer    | File                                               | Changes          |
| -------- | -------------------------------------------------- | ---------------- |
| Backend  | `app/Models/PaymentMethod.php`                     | 1 fix            |
| Backend  | `app/Models/PaymobPayment.php`                     | 5 fixes          |
| Backend  | `app/Http/Controllers/Api/PaymentController.php`   | 11 fixes         |
| Backend  | `app/Services/PaymobService.php`                   | 4 fixes          |
| Backend  | `app/Services/PaymentDecisionService.php`          | 2 fixes          |
| Backend  | `config/services.php`                              | 2 additions      |
| Backend  | `routes/api.php`                                   | 1 removal        |
| Backend  | `database/migrations/..._add_save_card_flag...php` | 2 fixes          |
| Backend  | `.env`                                             | 2 additions      |
| Frontend | `types/index.ts`                                   | 3 type updates   |
| Frontend | `services/api/paymentsApi.ts`                      | Full replacement |
| Frontend | `components/PaymentWebView.tsx`                    | 3 fixes          |
| Frontend | `app/payment.tsx`                                  | 2 fixes          |
| Frontend | `app/payment-recovery.tsx`                         | 4 fixes          |

### Files Created (1)

| File                                                                     | Purpose                    |
| ------------------------------------------------------------------------ | -------------------------- |
| `database/migrations/2026_02_01_000001_fix_payment_schema_alignment.php` | Schema alignment migration |

### Files Deleted (1)

| File                                                         | Reason                   |
| ------------------------------------------------------------ | ------------------------ |
| `app/Http/Controllers/Api/PaymentControllerTokenHandler.php` | Dead trait, never `use`d |

---

## 2. BACKEND CHANGES

### 2.1 `app/Models/PaymentMethod.php`

**Issue:** Fatal PHP parse error — a stray closing brace `}` appeared inside an unclosed docblock comment, making the entire class fail to load at runtime.

**Fix (1 change):**

- Removed the malformed docblock-inside-brace at lines ~188-191 that caused `PHP Fatal error: Uncaught Error` on any endpoint that loaded the `PaymentMethod` model

**Impact:** CRITICAL — without this fix, saving/loading cards would crash the entire application.

---

### 2.2 `app/Models/PaymobPayment.php`

**Issues:** Model `$fillable` array referenced column names that don't exist in the database; query scope referenced nonexistent column.

**Fixes (5 changes):**

| #   | What                    | Before                    | After                                                      | Why                                                                                        |
| --- | ----------------------- | ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `$fillable` entry       | `'transaction_id'`        | `'paymob_transaction_id'`                                  | DB column is `paymob_transaction_id`, not `transaction_id`                                 |
| 2   | `$fillable` entry       | `'failure_reason'`        | `'error_message'`                                          | DB column is `error_message`, not `failure_reason`                                         |
| 3   | `$fillable` addition    | —                         | Added `'user_id'`                                          | New column from migration, must be mass-assignable                                         |
| 4   | `markAsFallbackTo3DS()` | Required `$reason` arg    | Optional with default `'Automatic 3DS fallback'`           | Callers don't always pass a reason                                                         |
| 5   | `scopeRecentFailures()` | `->where('user_id', ...)` | `->whereHas('order', fn($q) => $q->where('user_id', ...))` | `paymob_payments` didn't have `user_id` column (now has it, but `whereHas` is more robust) |

---

### 2.3 `app/Http/Controllers/Api/PaymentController.php` (~1,790 lines)

**This file had the most issues — 11 individual fixes.**

**Fixes (11 changes):**

| #   | Category     | What                           | Before                                                                                         | After                                                                                                                                      |
| --- | ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **SECURITY** | Order ownership check          | Any authenticated user can pay for any order                                                   | Returns 403 if `$order->user_id !== auth()->id()`                                                                                          |
| 2   | **BUG**      | DB transaction leak #1         | `DB::beginTransaction()` then early return without commit/rollback in `initiatePayment()`      | Added `DB::commit()` before the early return                                                                                               |
| 3   | **BUG**      | DB transaction leak #2         | Same issue in MOTO flow fallback to 3DS                                                        | Added `DB::commit()` before redirect return                                                                                                |
| 4   | **BUG**      | Orphan Paymob order            | Called `createPaymobOrder()` then `createPaymobOrder()` again, leaving orphan orders at Paymob | Removed redundant first call                                                                                                               |
| 5   | **SECURITY** | Amount comparison              | `$callbackAmount != $order->total * 100` (loose)                                               | `(int)$callbackAmount !== (int)round($order->total * 100)` (strict integer comparison)                                                     |
| 6   | **SECURITY** | Unsafe `handleTokenWebhook()`  | Entire method (~80 lines) bypasses HMAC verification                                           | **Entire method REMOVED** — token callbacks now go through the standard HMAC-verified `handleProcessedCallback()`                          |
| 7   | **BUG**      | Token structure parsing        | `shouldSaveCardToken()` only checked `$data['token']`                                          | Now checks 3 structures: `$data['token']`, `$data['card']['token']`, `$data['source_data']['token']` to handle all Paymob response formats |
| 8   | **BUG**      | Column name mismatch           | `$savedCard->last4`                                                                            | `$savedCard->card_last_four` (matches DB column name)                                                                                      |
| 9   | **BUG**      | Missing `user_id`              | `PaymobPayment::create()` never sets `user_id`                                                 | Added `'user_id' => auth()->id()` to all 3 `PaymobPayment::create()` calls (Classic, Unified, MOTO flows)                                  |
| 10  | **BUG**      | Idempotency & status           | Status fields used wrong values in some places                                                 | Aligned to use `'pending'` → `'completed'`/`'failed'` consistently                                                                         |
| 11  | **BUG**      | `special_reference` not stored | Unified Checkout generates `special_reference` but never saves it to DB                        | Added `'special_reference' => $specialRef` to `PaymobPayment::create()` in Unified Checkout flow                                           |

---

### 2.4 `app/Services/PaymobService.php` (924 lines)

**Issues:** Secrets leaking to logs; missing MOTO integration ID; hardcoded base URL.

**Fixes (4 changes):**

| #   | Category     | What                 | Before                                                                | After                                                                                  |
| --- | ------------ | -------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **SECURITY** | API key leak         | `Log::info('Using API key: ' . substr($this->apiKey, 0, 10) . '...')` | Line **REMOVED** entirely                                                              |
| 2   | **SECURITY** | Secret key leak      | `Log::info('Secret key preview: ' . substr(...))`                     | Line **REMOVED** entirely                                                              |
| 3   | **SECURITY** | Auth token leak      | `Log::info('Token preview: ' . substr($token, 0, 20))`                | Line **REMOVED** entirely                                                              |
| 4   | **SECURITY** | Token in request log | `Log::info('Creating order with token: ' . substr(...))`              | Line **REMOVED** entirely                                                              |
| 5   | **CONFIG**   | MOTO Integration ID  | Not loaded from config                                                | Added `$this->motoIntegrationId = config('services.paymob.moto_integration_id')`       |
| 6   | **CONFIG**   | Base URL             | Hardcoded `https://accept.paymob.com/api`                             | `$this->baseUrl = config('services.paymob.base_url', 'https://accept.paymob.com/api')` |

---

### 2.5 `app/Services/PaymentDecisionService.php` (223 lines)

**Issues:** Accessing undefined `$order->total_cents` property; fraud query using nonexistent column.

**Fixes (2 changes):**

| #   | What                 | Before                                                        | After                                                                                                                         |
| --- | -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Amount calculation   | `$order->total_cents` (property doesn't exist on Order model) | `(int)($order->total * 100)` — computes from actual `total` column                                                            |
| 2   | Recent failure count | `->where('user_id', $userId)` on `paymob_payments`            | `->whereHas('order', fn($q) => $q->where('user_id', $userId))` — uses relationship since `user_id` wasn't guaranteed to exist |

---

### 2.6 `config/services.php`

**Additions (2 lines):**

```php
'moto_integration_id' => env('PAYMOB_MOTO_INTEGRATION_ID'),
'base_url' => env('PAYMOB_BASE_URL', 'https://accept.paymob.com/api'),
```

---

### 2.7 `routes/api.php`

**SECURITY FIX (1 removal):**

Removed **unauthenticated** test endpoint:

```php
// REMOVED — Security vulnerability: allows anyone to mark any order as paid
Route::post('test/complete-payment/{orderId}', [PaymentController::class, 'testCompletePayment']);
```

This endpoint allowed **anyone** (no auth required) to complete any order's payment without actually paying. ~40 lines removed.

---

### 2.8 `database/migrations/..._add_save_card_flag_to_paymob_payments.php`

**Issues:** Self-destructive migration (adds column then drops it in same `up()`); no `down()` method.

**Fixes (2 changes):**

| #   | What             | Before                                                                                    | After                                                  |
| --- | ---------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | Self-destruction | `up()` called `$table->boolean('save_card')` then later `$table->dropColumn('save_card')` | Removed the `dropColumn` call, added `hasColumn` guard |
| 2   | Missing rollback | No `down()` method                                                                        | Added proper `down()` that drops the column            |

---

## 3. FRONTEND CHANGES

### 3.1 `types/index.ts` — Payment Type Definitions

**Changes (3 type updates):**

**`InitiatePaymentResponse.data`:**

```typescript
// ADDED fields:
flow?: 'classic_iframe' | 'unified_3ds' | 'moto';
redirect_url?: string;
// CHANGED:
iframe_url?: string;  // was required, now optional (not all flows use iframe)
```

**`InitiateSavedCardPaymentResponse.data`:**

```typescript
// ADDED fields:
flow?: 'classic_iframe' | 'unified_3ds' | 'moto';
redirect_url?: string;
```

**`InitiateSavedCardPaymentRequest`:**

```typescript
// ADDED fields:
save_card?: boolean;
billing_data?: {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
};
```

---

### 3.2 `services/api/paymentsApi.ts` — FULL REPLACEMENT

**Before:** 68-line duplicate API service that duplicated everything in `paymentMethodsApi.ts` but used **orderId-based** polling.

**After:** Thin re-export module (~38 lines):

```typescript
// Re-exports from canonical service
export { getPaymentStatus, initiatePayment } from "../paymentMethodsApi";
export type { PaymentStatusResponse } from "../paymentMethodsApi";

// Backward-compatible orderId-based fallback for old callers
export const getPaymentStatusByOrderId = async (orderId: number) => {
  return await apiRequest(`/payments/order/${orderId}/status`, {
    method: "GET",
  });
};
```

**Why:** Eliminates code duplication. All payment API logic now lives in ONE canonical file (`paymentMethodsApi.ts`).

---

### 3.3 `components/PaymentWebView.tsx` (473 lines)

**Changes (3 fixes):**

| #   | What            | Before                                                          | After                                                                                                                           |
| --- | --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Import source   | `import { getPaymentStatus } from '@/services/api/paymentsApi'` | `import { getPaymentStatus } from '@/services/paymentMethodsApi'`                                                               |
| 2   | Props interface | No `paymentId` prop                                             | Added `paymentId?: number` to `PaymentWebViewProps`                                                                             |
| 3   | Polling logic   | Always calls `getPaymentStatus(orderId)`                        | Calls `getPaymentStatus(paymentId!)` when paymentId is available, falls back to orderId-based behavior for legacy compatibility |

---

### 3.4 `app/payment.tsx` (50 lines)

**Changes (2 fixes):**

| #   | What             | Before                                                | After                                                                                       |
| --- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Param extraction | Only extracted `orderId`, `paymentUrl`, `orderNumber` | Also extracts `paymentId` from route params                                                 |
| 2   | Prop passing     | `<PaymentWebView orderId={...} .../>`                 | `<PaymentWebView orderId={...} paymentId={paymentId ? Number(paymentId) : undefined} .../>` |

---

### 3.5 `app/payment-recovery.tsx` (365 lines)

**Changes (4 fixes):**

| #   | What            | Before                                                          | After                                                                                              |
| --- | --------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Import source   | `import { getPaymentStatus } from '@/services/api/paymentsApi'` | `import { getPaymentStatus } from '@/services/paymentMethodsApi'`                                  |
| 2   | Import cleanup  | Imported `orderApi` (unused after fix)                          | Removed `orderApi` import                                                                          |
| 3   | Polling ID      | Used `orderId` for `getPaymentStatus()`                         | Uses `paymentAttemptId` from pending payment data (paymentId-based polling), falls back to orderId |
| 4   | Recursive calls | `pollPaymentStatus(orderId, ...)`                               | `pollPaymentStatus(pollId, orderId, ...)` — passes the correct polling ID through recursion        |

---

## 4. DATABASE MIGRATION

### Migration: `2026_02_01_000001_fix_payment_schema_alignment.php`

**Status:** ✅ APPLIED AND VERIFIED

| #   | Table             | Change                     | Details                                                                                                       |
| --- | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `paymob_payments` | ADD `user_id`              | `BIGINT UNSIGNED NULLABLE`, indexed (`pp_user_id_idx`), backfilled from `orders.user_id`                      |
| 2   | `paymob_payments` | ADD `special_reference`    | `VARCHAR(255) NULLABLE`, indexed (`pp_special_ref_idx`), for webhook→payment mapping                          |
| 3   | `payment_methods` | MODIFY `token`             | Changed to `TEXT NULLABLE` (was already TEXT NULLABLE — no-op, guarded)                                       |
| 4   | `payment_methods` | MODIFY `paymob_card_token` | Changed from `VARCHAR(255)` → `TEXT NULLABLE` (index `payment_methods_paymob_card_token_index` dropped first) |
| 5   | `payment_methods` | ADD `expires_at`           | `DATE NULLABLE`, for card expiration tracking                                                                 |

### Verification Results

```
paymob_payments.user_id         → bigint unsigned | NULL=YES ✅
paymob_payments.special_reference → varchar(255)   | NULL=YES ✅
payment_methods.token            → text           | NULL=YES ✅
payment_methods.paymob_card_token → text           | NULL=YES ✅
payment_methods.expires_at       → date           | NULL=YES ✅
Index pp_user_id_idx             → user_id                   ✅
Index pp_special_ref_idx         → special_reference         ✅
```

---

## 5. DELETED FILES

### `app/Http/Controllers/Api/PaymentControllerTokenHandler.php`

- **What it was:** A PHP trait containing token webhook handling logic
- **Why deleted:** The trait was **never `use`d** by any class — completely dead code. Its logic (handling token callbacks without HMAC verification) was also a security risk
- **Verified:** Grepped entire codebase for `PaymentControllerTokenHandler` — zero references anywhere

---

## 6. ENVIRONMENT CONFIGURATION

### Current `.env` Paymob Section (after changes)

```env
PAYMOB_API_KEY=ZXlKaGJH...               # ✅ Existing — your Paymob API key
PAYMOB_SECRET_KEY=egy_sk_test_7cb...      # ✅ Existing — Paymob secret key
PAYMOB_PUBLIC_KEY=egy_pk_test_tFW...      # ✅ Existing — Paymob public key
PAYMOB_HMAC_SECRET=3B7D14636C7FBAE...     # ✅ Existing — HMAC for webhook verification
PAYMOB_IFRAME_ID=919973                   # ✅ Existing — Legacy iframe ID
PAYMOB_CARD_INTEGRATION_ID=5084814       # ✅ Existing — Card payment integration
PAYMOB_WALLET_INTEGRATION_ID=5084831     # ✅ Existing — Mobile wallet integration
PAYMOB_INTEGRATION_ID_3DS=5084814        # ✅ Existing — 3D Secure integration
PAYMOB_CALLBACK_URL=https://...ngrok...  # ⚠️ Existing — Uses ngrok (dev only!)
PAYMOB_REDIRECT_URL=https://...ngrok...  # ⚠️ Existing — Uses ngrok (dev only!)
PAYMOB_MOTO_INTEGRATION_ID=             # 🔴 NEW — NEEDS YOUR VALUE
PAYMOB_BASE_URL=https://accept.paymob.com/api  # ✅ NEW — Added, correct default
```

### `config/services.php` Additions

```php
'paymob' => [
    // ... existing keys ...
    'moto_integration_id' => env('PAYMOB_MOTO_INTEGRATION_ID'),   // NEW
    'base_url' => env('PAYMOB_BASE_URL', 'https://accept.paymob.com/api'),  // NEW
],
```

---

## 7. ⚠️ CONFIGURATION REQUIRED FROM YOU

### 🔴 MANDATORY — Must provide before MOTO payments work:

| #   | What                           | Where       | How to Get                                                                                                                                                                                                                   |
| --- | ------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **PAYMOB_MOTO_INTEGRATION_ID** | `.env` file | Go to Paymob Dashboard → Payment Integrations → Find your **MOTO (Mail Order/Telephone Order)** integration → Copy the Integration ID. If you don't have one, create a new integration with type "MOTO" in Paymob dashboard. |

### 🟡 IMPORTANT — Must update for production deployment:

| #   | What                          | Current Value                                                      | What You Need                                                                                                    |
| --- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2   | **PAYMOB_CALLBACK_URL**       | `https://c9e6-41-40-225-10.ngrok-free.app/api/v1/paymob/processed` | Your **production** server URL, e.g., `https://yourdomain.com/api/v1/paymob/processed`                           |
| 3   | **PAYMOB_REDIRECT_URL**       | `https://c9e6-41-40-225-10.ngrok-free.app/payment-return`          | Your **production** redirect URL, e.g., `https://yourdomain.com/payment-return`                                  |
| 4   | **Paymob Dashboard Webhooks** | Pointed at ngrok                                                   | Update the callback URL in Paymob Dashboard → Settings → Webhooks to match your production `PAYMOB_CALLBACK_URL` |

### 🟢 VERIFY — Confirm these are correct:

| #   | What                          | Current Value                   | Question                                                                                                                                    |
| --- | ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | **PAYMOB_INTEGRATION_ID_3DS** | `5084814`                       | This is the same as `PAYMOB_CARD_INTEGRATION_ID`. Is this intentional? (Usually yes — 3DS uses the same card integration with 3DS enforced) |
| 6   | **PAYMOB_API_KEY**            | Starts with `ZXlKaGJH...`       | Is this your **production** or **test** API key? The secret key starts with `egy_sk_test_` suggesting test mode.                            |
| 7   | **APP_ENV**                   | Should be `production` for live | Currently should be verified in `.env`                                                                                                      |

---

## 8. SECURITY FIXES SUMMARY

| #   | Severity     | Fix                                                                     | File                    | Impact                                                        |
| --- | ------------ | ----------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------- |
| 1   | **CRITICAL** | Removed unauthenticated test endpoint that could mark any order as paid | `routes/api.php`        | Anyone could fake payments                                    |
| 2   | **CRITICAL** | Removed `handleTokenWebhook()` that bypassed HMAC verification          | `PaymentController.php` | Attackers could forge payment confirmations                   |
| 3   | **HIGH**     | Added order ownership check (403)                                       | `PaymentController.php` | User A could pay/manipulate User B's order                    |
| 4   | **HIGH**     | Removed 4 instances of secrets/tokens logged to files                   | `PaymobService.php`     | API keys, secret keys, auth tokens written to log files       |
| 5   | **HIGH**     | Strict integer amount comparison                                        | `PaymentController.php` | Floating-point comparison could allow cent-level fraud        |
| 6   | **MEDIUM**   | Deleted dead `PaymentControllerTokenHandler.php` trait                  | Deleted file            | Reduced attack surface, removed unsafe code from codebase     |
| 7   | **MEDIUM**   | DB transaction leak fixes (×2)                                          | `PaymentController.php` | Uncommitted transactions could leave DB in inconsistent state |
| 8   | **LOW**      | Eliminated duplicate API service                                        | `paymentsApi.ts`        | Single source of truth reduces chance of security drift       |

---

## 9. BUG FIXES SUMMARY

| #   | Severity     | Fix                                                                                                                   | File                                               |
| --- | ------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | **CRITICAL** | Fatal parse error in `PaymentMethod` model (stray `}` in docblock)                                                    | `PaymentMethod.php`                                |
| 2   | **HIGH**     | `$fillable` column name mismatches (`transaction_id` vs `paymob_transaction_id`, `failure_reason` vs `error_message`) | `PaymobPayment.php`                                |
| 3   | **HIGH**     | `user_id` never set in `PaymobPayment::create()` (3 call sites)                                                       | `PaymentController.php`                            |
| 4   | **HIGH**     | `$order->total_cents` — property doesn't exist, undefined behavior                                                    | `PaymentDecisionService.php`                       |
| 5   | **HIGH**     | `$savedCard->last4` — column is actually `card_last_four`                                                             | `PaymentController.php`                            |
| 6   | **MEDIUM**   | `scopeRecentFailures()` queries nonexistent `user_id` column                                                          | `PaymobPayment.php` + `PaymentDecisionService.php` |
| 7   | **MEDIUM**   | `markAsFallbackTo3DS()` requires argument but callers don't always pass one                                           | `PaymobPayment.php`                                |
| 8   | **MEDIUM**   | Self-destructive migration (add column then immediately drop it)                                                      | `add_save_card_flag` migration                     |
| 9   | **MEDIUM**   | `special_reference` generated but never stored in DB                                                                  | `PaymentController.php`                            |
| 10  | **MEDIUM**   | Frontend `PaymentWebView` polling by orderId instead of paymentId                                                     | `PaymentWebView.tsx`                               |
| 11  | **LOW**      | Payment recovery using wrong API service and wrong polling ID                                                         | `payment-recovery.tsx`                             |

---

## 10. REDUNDANCY ELIMINATION SUMMARY

| #   | What                           | Before                                                                                       | After                                                                 |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **Duplicate API service**      | `paymentsApi.ts` (68 lines) duplicated `paymentMethodsApi.ts`                                | `paymentsApi.ts` now re-exports from canonical `paymentMethodsApi.ts` |
| 2   | **Dead trait**                 | `PaymentControllerTokenHandler.php` — never used                                             | **DELETED**                                                           |
| 3   | **Duplicate polling logic**    | `PaymentWebView.tsx` had its own orderId-based polling, different from `payment-webview.tsx` | Both now use paymentId-based polling from canonical service           |
| 4   | **Self-destructive migration** | Migration added and dropped same column in one `up()`                                        | Fixed to only add                                                     |

---

## 11. TESTING CHECKLIST

### 11.1 Backend Smoke Tests

| #   | Test                        | How                                                      | Expected                                                  |
| --- | --------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| 1   | PHP Lint All Modified Files | `find app -name "*.php" -exec php -l {} \;`              | All files: `No syntax errors detected`                    |
| 2   | Laravel Boot                | `php artisan route:list --path=payment`                  | Lists all payment routes without errors                   |
| 3   | Migration Status            | `php artisan migrate:status`                             | All migrations show `Ran`                                 |
| 4   | Model Load                  | `php artisan tinker` → `new \App\Models\PaymentMethod()` | No fatal errors                                           |
| 5   | Config Cache                | `php artisan config:cache`                               | No errors, includes `services.paymob.moto_integration_id` |

### 11.2 Payment Flow Tests

| #   | Test                                   | Steps                                            | Expected                                                                   |
| --- | -------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | **New Card Payment (Classic)**         | Select card payment → enter card → complete      | Payment processes via iframe, webhook confirms, order marked paid          |
| 2   | **New Card Payment (Unified/3DS)**     | Same as above, system routes to Unified Checkout | Redirect URL used instead of iframe, 3DS challenge shown, webhook confirms |
| 3   | **Save Card During Payment**           | Check "save card" during payment                 | Card token saved to `payment_methods` table, encrypted with AES-256-CBC    |
| 4   | **Pay With Saved Card (MOTO)**         | Select saved card → confirm                      | MOTO flow used (no 3DS), payment completes automatically                   |
| 5   | **Pay With Saved Card (3DS Fallback)** | Saved card with MOTO disabled or high-risk       | Falls back to 3DS, user sees 3DS challenge                                 |
| 6   | **Wallet Payment**                     | Select mobile wallet → enter number              | Redirect to wallet provider, webhook confirms                              |
| 7   | **Payment Recovery**                   | Start payment → kill app → reopen                | Recovery screen appears, polls by paymentId, shows correct status          |
| 8   | **Webhook Verification**               | Send fake webhook without valid HMAC             | Returns 403, payment NOT marked as complete                                |
| 9   | **Order Ownership**                    | Try to pay for another user's order              | Returns 403 `Unauthorized`                                                 |
| 10  | **Amount Tampering**                   | Webhook with different amount than order         | Payment marked as failed, order stays unpaid                               |

### 11.3 Frontend Tests

| #   | Test                     | Screen                        | Expected                                                  |
| --- | ------------------------ | ----------------------------- | --------------------------------------------------------- |
| 1   | Payment method selection | `checkout/payment.tsx`        | All methods shown, correct one selectable                 |
| 2   | WebView loads            | `PaymentWebView.tsx`          | Paymob payment page loads in WebView                      |
| 3   | Polling works            | After payment completion      | Status updates to success/failure within polling interval |
| 4   | Result modal             | `PaymentResultModal.tsx`      | Success/failure animation shows correctly                 |
| 5   | Saved cards list         | `profile/payment-methods.tsx` | All saved cards displayed, delete works                   |
| 6   | Recovery screen          | `payment-recovery.tsx`        | Shows pending payment, can resume or cancel               |

### 11.4 Database Verification

```sql
-- Verify migration applied correctly:
DESCRIBE paymob_payments;
-- Should show: user_id (bigint unsigned, NULL), special_reference (varchar(255), NULL)

DESCRIBE payment_methods;
-- Should show: token (text, NULL), paymob_card_token (text, NULL), expires_at (date, NULL)

-- Verify backfill worked:
SELECT COUNT(*) FROM paymob_payments WHERE user_id IS NULL AND order_id IN (SELECT id FROM orders);
-- Should return 0 (all backfilled)

-- Verify indexes:
SHOW INDEX FROM paymob_payments WHERE Key_name IN ('pp_user_id_idx', 'pp_special_ref_idx');
-- Should show both indexes
```

---

## 12. DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Set `PAYMOB_MOTO_INTEGRATION_ID` in `.env` (get from Paymob dashboard)
- [ ] Update `PAYMOB_CALLBACK_URL` to production URL
- [ ] Update `PAYMOB_REDIRECT_URL` to production URL
- [ ] Update Paymob Dashboard webhook URL to match production callback
- [ ] Verify `APP_ENV=production` and `APP_DEBUG=false`
- [ ] Run `php artisan config:cache`
- [ ] Run `php artisan route:cache`
- [ ] Verify SSL certificate is valid on production domain
- [ ] Confirm Paymob API keys are production (not test) — check if `PAYMOB_SECRET_KEY` starts with `egy_sk_live_` instead of `egy_sk_test_`

### Deployment Steps

1. **Pull code changes** to production server
2. **Run migration:** `php artisan migrate --force`
3. **Clear caches:** `php artisan config:clear && php artisan cache:clear`
4. **Rebuild caches:** `php artisan config:cache && php artisan route:cache`
5. **Restart queue workers** (if using): `php artisan queue:restart`
6. **Build frontend:** `npx expo export` or your build command
7. **Test a small payment** end-to-end in production

### Post-Deployment Verification

- [ ] Make a test payment with a new card
- [ ] Make a test payment with saved card
- [ ] Verify webhook is received (check Laravel logs)
- [ ] Verify no secrets appear in `storage/logs/laravel.log`
- [ ] Verify the test endpoint `POST /api/v1/test/complete-payment/{orderId}` returns 404
- [ ] Check `paymob_payments` table has `user_id` populated for new payments
- [ ] Check `paymob_payments` table has `special_reference` populated for new Unified Checkout payments

---

## 13. FULL FILE-BY-FILE CHANGE LOG

### Legend

- 🛡️ Security fix
- 🐛 Bug fix
- 🧹 Cleanup/redundancy removal
- ➕ New feature/field
- 📊 Database change

---

### BACKEND

| File                           | Change                                                            | Type | Lines                |
| ------------------------------ | ----------------------------------------------------------------- | ---- | -------------------- |
| **PaymentMethod.php**          | Removed fatal parse error (stray `}` in docblock)                 | 🐛   | ~188-191             |
| **PaymobPayment.php**          | `$fillable`: `transaction_id` → `paymob_transaction_id`           | 🐛   | fillable array       |
| **PaymobPayment.php**          | `$fillable`: `failure_reason` → `error_message`                   | 🐛   | fillable array       |
| **PaymobPayment.php**          | `$fillable`: Added `user_id`                                      | ➕   | fillable array       |
| **PaymobPayment.php**          | `markAsFallbackTo3DS()`: arg now optional                         | 🐛   | method signature     |
| **PaymobPayment.php**          | `scopeRecentFailures()`: `where('user_id')` → `whereHas('order')` | 🐛   | scope method         |
| **PaymentController.php**      | Added order ownership check (403)                                 | 🛡️   | `initiatePayment()`  |
| **PaymentController.php**      | DB transaction leak fix #1                                        | 🐛   | `initiatePayment()`  |
| **PaymentController.php**      | DB transaction leak fix #2                                        | 🐛   | MOTO fallback        |
| **PaymentController.php**      | Removed redundant `createPaymobOrder()` call                      | 🧹   | `initiatePayment()`  |
| **PaymentController.php**      | Strict integer amount comparison                                  | 🛡️   | callback handler     |
| **PaymentController.php**      | **REMOVED** entire `handleTokenWebhook()` method                  | 🛡️   | ~80 lines removed    |
| **PaymentController.php**      | Enhanced `shouldSaveCardToken()` for 3 token structures           | 🐛   | token parsing        |
| **PaymentController.php**      | `last4` → `card_last_four`                                        | 🐛   | saved card reference |
| **PaymentController.php**      | Added `user_id` to all 3 `PaymobPayment::create()` calls          | 🐛   | 3 locations          |
| **PaymentController.php**      | Fixed idempotency/status field values                             | 🐛   | status assignments   |
| **PaymentController.php**      | Store `special_reference` in Unified Checkout                     | 🐛   | create() call        |
| **PaymobService.php**          | Removed API key log leak                                          | 🛡️   | authenticate()       |
| **PaymobService.php**          | Removed secret key log leak                                       | 🛡️   | authenticate()       |
| **PaymobService.php**          | Removed auth token log leak                                       | 🛡️   | authenticate()       |
| **PaymobService.php**          | Removed token-in-request log leak                                 | 🛡️   | createOrder()        |
| **PaymobService.php**          | Added `motoIntegrationId` property from config                    | ➕   | constructor          |
| **PaymobService.php**          | Configurable `baseUrl` from config                                | ➕   | constructor          |
| **PaymentDecisionService.php** | `$order->total_cents` → `(int)($order->total * 100)`              | 🐛   | amount calc          |
| **PaymentDecisionService.php** | `where('user_id')` → `whereHas('order')`                          | 🐛   | fraud query          |
| **config/services.php**        | Added `moto_integration_id` config entry                          | ➕   | paymob section       |
| **config/services.php**        | Added `base_url` config entry                                     | ➕   | paymob section       |
| **routes/api.php**             | **REMOVED** unauthenticated test endpoint                         | 🛡️   | ~40 lines            |
| **save_card migration**        | Removed self-destructive `dropColumn` in `up()`                   | 🐛   | up() method          |
| **save_card migration**        | Added `down()` method                                             | 🐛   | new method           |
| **.env**                       | Added `PAYMOB_MOTO_INTEGRATION_ID=`                               | ➕   | env file             |
| **.env**                       | Added `PAYMOB_BASE_URL=https://accept.paymob.com/api`             | ➕   | env file             |

### NEW FILE

| File                                       | Purpose                                                                                       | Type |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---- |
| **fix_payment_schema_alignment migration** | 5 schema changes (user_id, special_reference, token→TEXT, paymob_card_token→TEXT, expires_at) | 📊   |

### DELETED FILE

| File                                  | Reason                                    | Type |
| ------------------------------------- | ----------------------------------------- | ---- |
| **PaymentControllerTokenHandler.php** | Dead code, never used, unsafe HMAC bypass | 🧹🛡️ |

### FRONTEND

| File                     | Change                                                                   | Type |
| ------------------------ | ------------------------------------------------------------------------ | ---- |
| **types/index.ts**       | Added `flow`, `redirect_url` to `InitiatePaymentResponse.data`           | ➕   |
| **types/index.ts**       | Made `iframe_url` optional                                               | 🐛   |
| **types/index.ts**       | Added `flow`, `redirect_url` to `InitiateSavedCardPaymentResponse.data`  | ➕   |
| **types/index.ts**       | Added `save_card`, `billing_data` to `InitiateSavedCardPaymentRequest`   | ➕   |
| **paymentsApi.ts**       | **FULL REPLACEMENT** — now re-exports from canonical `paymentMethodsApi` | 🧹   |
| **paymentsApi.ts**       | Added backward-compatible `getPaymentStatusByOrderId`                    | ➕   |
| **PaymentWebView.tsx**   | Changed import to canonical `paymentMethodsApi`                          | 🧹   |
| **PaymentWebView.tsx**   | Added `paymentId` prop                                                   | ➕   |
| **PaymentWebView.tsx**   | Polling uses paymentId when available                                    | 🐛   |
| **payment.tsx**          | Extracts `paymentId` from route params                                   | 🐛   |
| **payment.tsx**          | Passes `paymentId` to `PaymentWebView`                                   | 🐛   |
| **payment-recovery.tsx** | Changed import to canonical `paymentMethodsApi`                          | 🧹   |
| **payment-recovery.tsx** | Uses `paymentAttemptId` for polling                                      | 🐛   |
| **payment-recovery.tsx** | Fixed recursive `pollPaymentStatus` calls                                | 🐛   |

---

## FINAL STATS

| Metric                        | Count                 |
| ----------------------------- | --------------------- |
| Total files modified          | 14                    |
| Total files created           | 1                     |
| Total files deleted           | 1                     |
| Security fixes                | 8                     |
| Bug fixes                     | 11                    |
| Redundancy eliminations       | 4                     |
| New features/fields           | 8                     |
| Database schema changes       | 5                     |
| Lines of unsafe code removed  | ~120+                 |
| PHP lint verifications passed | 9/9                   |
| Migration status              | ✅ Applied & Verified |

---

_End of implementation report._
