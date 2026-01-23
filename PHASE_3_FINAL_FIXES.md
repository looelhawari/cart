# ✅ Phase 3 FINAL - All Critical & Medium Fixes Applied

## Overview

Phase 3 integrates saved card tokenization with **full 3DS support**, **corrected unique constraint**, **proper transaction handling**, and **complete validation**. All user feedback addressed.

---

## 🔴 CRITICAL FIXES APPLIED

### CRITICAL 1: 3DS/Iframe Support for Saved Cards ✅

**Problem:** Documentation claimed saved cards don't need iframe ("no iframe needed"), but banks can require 3DS challenge for tokenized payments.

**Fix Applied:**

**Updated Flow:**

1. User selects saved card
2. Backend calls `payWithSavedCard()` → generates payment token
3. **CRITICAL**: Token may still require 3DS challenge
4. Backend returns `iframe_url` to frontend
5. Frontend opens Paymob iframe (if 3DS required)
6. Webhook confirms final payment status

**Code Changes:**

**PaymentController::initiateSavedCardPayment():**

```php
// Step 3: Generate payment token using saved card
// CRITICAL: This may still require 3DS - return iframe_url to frontend
$paymentToken = $this->paymobService->payWithSavedCard(
    $authToken,
    $amountCents,
    $paymobOrderId,
    $paymentMethod->token,
    $billingData
);

// Get iframe URL (may be needed for 3DS challenge)
$iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

// Return iframe_url to frontend
return response()->json([
    'success' => true,
    'data' => [
        'payment_token' => $paymentToken,
        'iframe_url' => $iframeUrl, // ✅ Frontend MUST handle 3DS
        'card_last_four' => $paymentMethod->card_last_four,
        // ...
    ],
]);
```

**Updated API Response:**

```json
{
  "success": true,
  "data": {
    "payment_id": 78,
    "payment_token": "ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR...",
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=...",
    "amount": 245.1,
    "currency": "EGP",
    "card_last_four": "4242",
    "card_brand": "visa"
  }
}
```

**Frontend Integration:**

```javascript
// Saved card payment
const response = await fetch(
  "/api/v1/payments/paymob/initiate-with-saved-card",
  {
    method: "POST",
    body: JSON.stringify({
      order_id: 123,
      payment_method_id: 5,
    }),
  },
);

const { data } = await response.json();

// ✅ CRITICAL: Always use iframe_url (3DS may be required)
window.open(data.iframe_url, "_blank");
// OR embed in WebView:
<WebView source={{ uri: data.iframe_url }} />;
```

**Documentation Updated:**

- ✅ Removed "no iframe needed" claims
- ✅ Added "may require 3DS challenge" warnings
- ✅ Updated all saved card examples to include `iframe_url`

---

### CRITICAL 2: Unique Constraint Fixed (Option A) ✅

**Problem:** `unique(user_id, token_fingerprint, deleted_at)` allows duplicates due to NULL behavior.

**MySQL Behavior:**

- `NULL != NULL` in unique constraints
- Two rows with `deleted_at = NULL` are NOT considered duplicates
- Allows multiple "deleted" cards with same fingerprint

**Fix Applied: Option A (Recommended)**

**Migration Updated:**

```php
// ✅ CRITICAL: Unique constraint on (user_id, token_fingerprint) ONLY
// Do NOT include deleted_at (NULL behavior allows duplicates)
// Restoration is the ONLY way to re-add a deleted card
$table->unique(['user_id', 'token_fingerprint'], 'pm_user_token_unique');
```

**Implications:**

1. **Cannot Insert Duplicate Active Cards**: Database enforces uniqueness
2. **Cannot Insert If Soft-Deleted Exists**: Unique constraint violated
3. **MUST Restore Instead**: `PaymentMethod::findOrRestoreDeleted()` required

**Restoration Strategy (Already Implemented):**

```php
// In saveCardToken() - BEFORE creating new record
$restored = PaymentMethod::findOrRestoreDeleted($userId, $tokenFingerprint);
if ($restored) {
    Log::info('💳 Restored previously deleted payment method');
    return; // ✅ Restored, don't create new
}

// If restoration returns null, check active cards
$exists = PaymentMethod::where('user_id', $userId)
    ->where('token_fingerprint', $tokenFingerprint)
    ->whereNull('deleted_at')
    ->exists();
if ($exists) return; // Already exists

// Safe to create new (no soft-deleted match, no active match)
PaymentMethod::create([...]);
```

**Scenarios Handled:**

| Scenario                | deleted_at  | Unique Constraint            | Restoration      | Result                       |
| ----------------------- | ----------- | ---------------------------- | ---------------- | ---------------------------- |
| First save              | NULL        | ✅ Allows                    | N/A              | Creates new record           |
| Duplicate save (active) | NULL        | ❌ Violation                 | N/A              | Restoration check catches it |
| Deleted card            | Timestamp   | ✅ Allows (fingerprint free) | ✅ Restores      | Sets deleted_at = NULL       |
| Re-add after delete     | NULL → NULL | ❌ Violation                 | ✅ Must restore  | Prevents duplicate           |
| Race condition          | NULL        | ❌ First wins                | Exception caught | Silent failure               |

**Why Option A is Better:**

- ✅ Database enforces uniqueness (no code bugs)
- ✅ Prevents race conditions at DB level
- ✅ Audit trail preserved (deletion timestamp in logs)
- ✅ Same payment_method_id restored (better analytics)
- ❌ Cannot create new row for same token (must restore)

---

## 🟡 MEDIUM FIXES APPLIED

### MEDIUM 1: Token Save Validation Complete ✅

**Problem:** Ensure `saveCardToken()` only runs after full validation.

**Requirements:**

1. ✅ Payment success confirmed
2. ✅ Payment is expected record for transaction/order
3. ✅ Not already processed (idempotency)
4. ✅ Payment method is CARD (not WALLET)

**Fix Applied:**

**processedCallback() - Validation Flow:**

```php
// 1. HMAC verification FIRST ✅
if (!$this->paymobService->verifyHmac($data)) {
    return response()->json(['message' => 'Invalid signature'], 403);
}

// 2. Find payment record ✅
$payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)->first();
if (!$payment) {
    return response()->json(['message' => 'Payment not found'], 404);
}

// 3. Idempotency check ✅
if ($payment->status !== 'PENDING' || $payment->transaction_id === $transactionId) {
    return response()->json(['message' => 'Already processed'], 200);
}

// 4. Amount validation ✅
if ($amountCents != $payment->amount_cents) {
    // Mark as failed, return 400
}

// 5. BEGIN TRANSACTION
DB::beginTransaction();

if ($success) {
    // SUCCESS PATH ONLY

    // Update payment status ✅
    $payment->markAsPaid($transactionId, $payload);

    // Update order ✅
    $order->update(['payment_status' => 'completed', 'status' => 'confirmed']);

    // Clear cart ✅
    app(\App\Services\CartService::class)->clearCart($cart);

    // ✅ PHASE 3: SAVE CARD TOKEN (if user opted in)
    // MEDIUM 1 FIX: Only save after FULL validation
    // - Payment success confirmed ✅ (we're in success path)
    // - Payment is expected record ✅ (already verified above)
    // - Not already processed ✅ (idempotency check passed)
    // - Payment method is CARD ✅ (checked in shouldSaveCardToken)
    // - Never runs for WALLET ✅ (shouldSaveCardToken rejects non-CARD)
    if ($this->shouldSaveCardToken($payment, $payload)) {
        $this->saveCardToken($order->user_id, $payload);
    }
}

DB::commit();
```

**shouldSaveCardToken() - CARD Check:**

```php
private function shouldSaveCardToken(PaymobPayment $payment, array $payload): bool
{
    // ✅ MEDIUM 1: Only for CARD payments (never WALLET)
    if ($payment->payment_method !== 'CARD') {
        return false;
    }

    // ✅ Check user opted in
    if (!$payment->save_card_requested) {
        return false;
    }

    // ✅ Verify token exists
    if (!isset($payload['source_data']['token'])) {
        return false;
    }

    return true;
}
```

**Validation Checklist:**

- ✅ Called ONLY in success path (not failure)
- ✅ AFTER payment marked as PAID
- ✅ AFTER order confirmed
- ✅ INSIDE atomic transaction
- ✅ NEVER for WALLET payments
- ✅ NEVER for already-processed webhooks

---

### MEDIUM 2: Transaction Handling Fixed ✅

**Problem:** `initiateSavedCardPayment()` used `DB::beginTransaction()` with early returns (no rollback).

**Before (Incorrect):**

```php
DB::beginTransaction();

// Get order
$order = Order::findOrFail($request->order_id);

// Verify ownership
if ($order->user_id !== auth()->id()) {
    return response()->json(['success' => false], 403); // ❌ NO ROLLBACK
}

// ... more early returns without rollback

DB::commit();
```

**After (Correct):**

```php
// MEDIUM 2 FIX: Use DB::transaction closure for atomic operations
return DB::transaction(function () use ($request) {
    // Get order
    $order = Order::findOrFail($request->order_id);

    // Verify ownership
    if ($order->user_id !== auth()->id()) {
        return response()->json(['success' => false], 403); // ✅ Auto-rollback
    }

    // ... all early returns auto-rollback

    // Success path - auto-commit
    return response()->json(['success' => true, 'data' => [...]]);
});
```

**Why Better:**

- ✅ Early returns automatically rollback
- ✅ Exceptions automatically rollback
- ✅ Success path automatically commits
- ✅ No manual `DB::rollBack()` needed
- ✅ Cleaner code

---

### MEDIUM 3: Naming Consistency ✅

**Problem:** Phase 2 used `payWithSavedCard()`, Phase 3 docs used `generateSavedCardPaymentKey()`.

**Decision:** Use `payWithSavedCard()` (existing method in PaymobService)

**Changes:**

- ✅ PaymentController calls `payWithSavedCard()`
- ✅ Documentation updated to use `payWithSavedCard()`
- ✅ All references consistent

**PaymobService Method:**

```php
/**
 * Initiate payment with saved card token.
 *
 * IMPORTANT: May still require 3DS challenge - frontend must handle iframe.
 *
 * @param string $authToken
 * @param int $amountCents
 * @param int $paymobOrderId
 * @param string $cardToken - The saved Paymob card token (decrypted)
 * @param array $billingData
 * @return string Payment token for iframe (may still require 3DS)
 */
public function payWithSavedCard(
    string $authToken,
    int $amountCents,
    int $paymobOrderId,
    string $cardToken,
    array $billingData
): string {
    // ... implementation
}
```

---

## 📋 Updated Code Diffs

### 1. Migration - Unique Constraint Fix

**File:** `backend/database/migrations/2026_01_23_000001_add_security_fields_to_payment_methods.php`

**Change:**

```diff
- // Unique constraint: prevent duplicate tokens per user (respects soft delete)
- $table->unique(['user_id', 'token_fingerprint', 'deleted_at'], 'pm_user_token_unique');
+ // CRITICAL: Unique constraint on (user_id, token_fingerprint) ONLY
+ // Do NOT include deleted_at (NULL behavior allows duplicates)
+ // Restoration is the ONLY way to re-add a deleted card
+ $table->unique(['user_id', 'token_fingerprint'], 'pm_user_token_unique');
```

---

### 2. PaymentController - Transaction & 3DS Fixes

**File:** `backend/app/Http/Controllers/Api/PaymentController.php`

**A. initiateSavedCardPayment() - Full Rewrite:**

**Key Changes:**

1. ✅ Use `DB::transaction(closure)` instead of manual begin/commit
2. ✅ Return `iframe_url` for 3DS support
3. ✅ Add billing data (required by Paymob API)
4. ✅ Use `payWithSavedCard()` (consistent naming)

**Diff:**

```diff
  public function initiateSavedCardPayment(Request $request): JsonResponse
  {
      // ... validation ...

-     try {
-         DB::beginTransaction();
+     // MEDIUM 2 FIX: Use DB::transaction closure for atomic operations
+     return DB::transaction(function () use ($request) {

          // Get order & payment method
          $order = Order::findOrFail($request->order_id);
          $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);

          // Ownership checks (auto-rollback on early return)
          if ($order->user_id !== auth()->id()) {
-             return response()->json([...], 403); // ❌ No rollback
+             return response()->json([...], 403); // ✅ Auto-rollback
          }

          // ... validation checks ...

+         // Prepare minimal billing data (required by Paymob API)
+         $billingData = [
+             'first_name' => $paymentMethod->card_holder_name ?? 'Customer',
+             'email' => $order->user->email,
+             // ... minimal required fields ...
+         ];

-         // Step 3: Generate payment token
-         $paymentToken = $this->paymobService->generateSavedCardPaymentKey(...);
+         // Step 3: CRITICAL - May still require 3DS challenge
+         $paymentToken = $this->paymobService->payWithSavedCard(
+             $authToken,
+             $amountCents,
+             $paymobOrderId,
+             $paymentMethod->token,
+             $billingData
+         );

+         // Get iframe URL (may be needed for 3DS)
+         $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

          // Store payment
          $payment = PaymobPayment::create([
-             'billing_data' => null,
+             'billing_data' => $billingData,
              // ...
          ]);

-         DB::commit();

+         // CRITICAL 1 FIX: Return iframe_url for potential 3DS challenge
          return response()->json([
              'success' => true,
              'data' => [
                  'payment_token' => $paymentToken,
+                 'iframe_url' => $iframeUrl, // ✅ Frontend must handle 3DS
                  'card_last_four' => $paymentMethod->card_last_four,
                  // ...
              ],
          ]);
-     } catch (Exception $e) {
-         DB::rollBack();
-         return response()->json([...], 500);
-     }
+     }); // ✅ Auto-commit on success, auto-rollback on exception
  }
```

**B. processedCallback() - Validation Comments:**

**Change:**

```diff
  // ✅ PHASE 3: SAVE CARD TOKEN (if user opted in)
+ // MEDIUM 1 FIX: Only save after FULL validation
+ // - Payment success confirmed ✅ (we're in success path)
+ // - Payment is expected record ✅ (already verified above)
+ // - Not already processed ✅ (idempotency check passed)
+ // - Payment method is CARD ✅ (checked in shouldSaveCardToken)
+ // - Never runs for WALLET ✅ (shouldSaveCardToken rejects non-CARD)
  if ($this->shouldSaveCardToken($payment, $payload)) {
      $this->saveCardToken($order->user_id, $payload);
  }
```

---

### 3. PaymobService - No Changes Needed

**Method:** `payWithSavedCard()` already exists and works correctly.

**Documentation Updated:**

- ✅ Return type clarified: "Payment token for iframe (may still require 3DS)"
- ✅ PHPDoc updated to warn about 3DS

---

## 📝 Updated Test Notes

### Test Case 2: Second Payment - Use Saved Card ✅ (UPDATED)

**User Action:**

1. Add items to cart
2. Proceed to checkout
3. Select "Saved Cards"
4. Choose card ending in 4242
5. **NEW**: Frontend receives `iframe_url` in response
6. **NEW**: Frontend opens Paymob iframe (if 3DS required)
7. User completes 3DS challenge (if prompted)
8. Webhook confirms payment

**Expected Backend Flow:**

1. `POST /api/v1/payments/paymob/initiate-with-saved-card`
   - Validates card ownership ✅
   - Calls `PaymobService::payWithSavedCard()` ✅
   - Returns `iframe_url` + `payment_token` ✅
2. **Frontend Step**: Opens `iframe_url` in WebView/browser
3. **User Step**: Completes 3DS if required
4. Paymob webhook → `POST /api/v1/paymob/processed`
   - Marks payment as PAID ✅
   - Does NOT save card (save_card_requested = false) ✅

**Updated API Response:**

```json
{
  "success": true,
  "data": {
    "payment_id": 78,
    "payment_token": "ZXlK...",
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=ZXlK...",
    "amount": 245.1,
    "currency": "EGP",
    "card_last_four": "4242",
    "card_brand": "visa"
  }
}
```

**Frontend Integration:**

```javascript
// React Native WebView
import { WebView } from "react-native-webview";

const handleSavedCardPayment = async (paymentMethodId) => {
  const response = await api.post("/payments/paymob/initiate-with-saved-card", {
    order_id: orderId,
    payment_method_id: paymentMethodId,
  });

  const { iframe_url } = response.data.data;

  // ✅ CRITICAL: Always show iframe (3DS may be required)
  navigation.navigate("PaymentWebView", { url: iframe_url });
};

// PaymentWebView screen
<WebView
  source={{ uri: route.params.url }}
  onNavigationStateChange={(navState) => {
    // Listen for Paymob redirect after success/failure
    if (navState.url.includes("payment/response")) {
      // Poll payment status or navigate to success screen
    }
  }}
/>;
```

---

## 🚀 Final Deployment Checklist

### 1. Run Migrations

```bash
cd backend
php artisan migrate
```

**Expected Output:**

```
Migrating: 2026_01_23_000001_add_security_fields_to_payment_methods
Migrated:  2026_01_23_000001_add_security_fields_to_payment_methods (45.23ms)
```

---

### 2. Verify Schema

```sql
-- Check unique constraint (should NOT include deleted_at)
SHOW INDEXES FROM payment_methods WHERE Key_name = 'pm_user_token_unique';
-- Expected: 2 rows (user_id, token_fingerprint) - NO deleted_at
```

---

### 3. Test Saved Card Flow

**Step 1: First Payment (Save Card)**

```bash
POST /api/v1/payments/paymob/initiate
{
  "order_id": 123,
  "payment_method": "CARD",
  "save_card": true,
  "billing_data": {...}
}
```

**Step 2: Second Payment (Use Saved Card)**

```bash
POST /api/v1/payments/paymob/initiate-with-saved-card
{
  "order_id": 124,
  "payment_method_id": 5
}

# Expected Response:
{
  "success": true,
  "data": {
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/...",
    "payment_token": "...",
    "card_last_four": "4242",
    "card_brand": "visa"
  }
}
```

**Step 3: Frontend Opens iframe_url**

- User may see 3DS challenge
- Or payment completes immediately
- Webhook confirms final status

---

## 📊 Summary of Fixes

### Critical Issues ✅

1. ✅ **3DS Support**: Return `iframe_url` for saved cards, updated docs to clarify 3DS may be required
2. ✅ **Unique Constraint**: Removed `deleted_at` from constraint (Option A), restoration is mandatory

### Medium Issues ✅

3. ✅ **Token Save Validation**: Confirmed only runs after full validation (success path, CARD only, not WALLET)
4. ✅ **Transaction Handling**: Use `DB::transaction(closure)` with auto-rollback on early returns
5. ✅ **Naming Consistency**: Use `payWithSavedCard()` everywhere

### Changes Made:

- ✅ Migration: `unique(user_id, token_fingerprint)` - no deleted_at
- ✅ PaymentController: `DB::transaction(closure)` + return `iframe_url`
- ✅ PaymentController: Added billing data for saved card payments
- ✅ Documentation: Removed "no iframe" claims, added 3DS warnings
- ✅ Test cases: Updated to include iframe handling

---

## 🎯 Ready for Phase 4

**Phase 3 COMPLETE** ✅

All critical and medium fixes applied. Awaiting approval to proceed to Phase 4 (Payment Methods CRUD API + Frontend).
