# 🔍 CHECKOUT FLOW ANALYSIS & TODO LIST

**Date**: January 22, 2026  
**Analyst**: Senior Payments & Checkout Engineer (15+ YOE)  
**Project**: ElBaraka Hypermarket - Enterprise Payment Recovery

---

## 📋 EXECUTIVE SUMMARY

### ✅ WHAT WORKS

1. **Database Schema** ✅
   - Order status ENUMs now include `'pending_payment'` and `'paid'`
   - Migration successfully applied
2. **Basic Order Creation** ✅
   - Orders created before Paymob redirect
   - Order number generated correctly
   - Order items snapshot captured

3. **Paymob Integration** ✅
   - SSL timeout fixed (30s timeout + retry)
   - HMAC verification implemented
   - Payment initiation working

4. **Payment Recovery Infrastructure** ✅ (NEW)
   - AsyncStorage persistence layer created
   - Payment recovery screen created
   - User-friendly error messages created
   - App lifecycle hooks added

---

## ❌ WHAT IS BROKEN

### 🔴 CRITICAL ISSUES

#### **1. WRONG ORDER STATUS ON CREATION**

**Location**: `backend/app/Services/OrderService.php:73`

```php
// CURRENT (WRONG)
'status' => 'pending',

// SHOULD BE
'status' => $paymentMethod === 'cash_on_delivery'
    ? 'pending'
    : 'pending_payment',
```

**Impact**: Orders created with `'pending'` instead of `'pending_payment'` for card payments, breaking recovery logic.

---

#### **2. CART CLEARED TOO EARLY (RACE CONDITION)**

**Location**: `backend/app/Services/OrderService.php:127-133`

```php
// CURRENT (PROBLEMATIC)
if ($paymentMethod === 'cash_on_delivery') {
    $this->cartService->clearCart($cart);
}
// Card payment: cart NOT cleared here (GOOD)
```

**BUT ALSO**:
**Location**: `frontend/app/checkout/confirmation.tsx:147`

```tsx
// CURRENT (WRONG)
} else {
    // COD - refresh cart and navigate to success
    await fetchCart(); // ❌ This tries to fetch cleared cart
    router.replace({
        pathname: "/order-success" as any,
        params: {...}
    });
}
```

**Impact**: Frontend tries to fetch cart immediately after backend clears it, causing UI flash/empty cart display.

---

#### **3. WRONG PAYMENT STATUS IN CALLBACK**

**Location**: `backend/app/Http/Controllers/Api/PaymentController.php:329-332`

```php
// CURRENT (WRONG)
$order->update([
    'payment_status' => 'completed', // ❌ Should be 'paid'
    'status' => 'confirmed',
]);
```

**Should Be**:

```php
$order->update([
    'payment_status' => 'paid', // ✅ Matches ENUM
    'status' => 'confirmed',
]);
```

**Impact**: Database has `'paid'` status but code writes `'completed'`, causing data truncation warning.

---

#### **4. NO PENDING PAYMENT SAVE BEFORE REDIRECT**

**Location**: `frontend/app/checkout/confirmation.tsx:153-160`

```tsx
// CURRENT (MISSING)
if (paymentResponse.success && paymentResponse.data) {
  // Navigate to Paymob payment gateway
  router.replace({
    pathname: "/payment" as any,
    params: {
      iframeUrl: paymentResponse.data.iframe_url,
      orderId: orderId.toString(),
    },
  });
}
```

**Should Have**:

```tsx
// ✅ BEFORE redirect
await savePendingPayment({
    orderId,
    orderNumber: response.data.order.order_number,
    total: cart?.total || 0,
    paymentAttemptId: paymentResponse.data.payment_id,
    timestamp: Date.now(),
    iframeUrl: paymentResponse.data.iframe_url,
});

router.replace({...});
```

**Impact**: App kill mid-payment = lost user, no recovery possible.

---

#### **5. NO APP LIFECYCLE MONITORING**

**Location**: `frontend/app/_layout.tsx` (MISSING)

**Current State**: No AppState listener, no pending payment check on app resume.

**Should Have**:

```tsx
useEffect(() => {
  const checkPendingPaymentOnResume = async () => {
    const isPending = await hasPendingPayment();
    if (isPending && pathname !== "/payment-recovery") {
      router.replace("/payment-recovery");
    }
  };

  // Check on mount
  checkPendingPaymentOnResume();

  // Check when app comes to foreground
  const subscription = AppState.addEventListener("change", (nextAppState) => {
    if (nextAppState === "active") {
      checkPendingPaymentOnResume();
    }
  });

  return () => subscription.remove();
}, [pathname]);
```

**Impact**: User kills app during payment → recovery screen never appears → order lost.

---

#### **6. PAYMENT FAILURE REDIRECTS INCORRECTLY**

**Location**: `frontend/components/PaymentWebView.tsx:83-96`

```tsx
// CURRENT (WRONG)
} else if (status === "FAILED") {
    const errorMsg = "Payment failed. Please try again.";
    Alert.alert("Payment Failed", errorMsg, [
        {
            text: "OK",
            onPress: () => {
                onFailure?.(errorMsg);
                router.back(); // ❌ Goes nowhere useful
            },
        },
    ]);
}
```

**Should Be**:

```tsx
// Use user-friendly error mapping
const errorInfo = mapPaymentError(statusResponse.data?.error_message);

Alert.alert(errorInfo.title, errorInfo.message, [
  {
    text: "Retry Payment",
    onPress: () => {
      router.replace({
        pathname: "/checkout/confirmation",
        params: { orderId, retry: "true" },
      });
    },
  },
  {
    text: "View Order",
    onPress: () => router.replace(`/orders/${orderId}`),
  },
]);
```

**Impact**: User sees failure → clicks OK → goes back to... nowhere → cart lost → confusion.

---

#### **7. NO CLEAR ON SUCCESS IN WEBVIEW**

**Location**: `frontend/components/PaymentWebView.tsx:66`

```tsx
// CURRENT (MISSING)
if (status === "PAID") {
    // Clear cart after successful payment
    await fetchCart(); // Just fetches, doesn't clear pending payment

    Alert.alert(...);
}
```

**Should Have**:

```tsx
if (status === "PAID") {
    await clearPendingPayment(); // ✅ Clear AsyncStorage
    await fetchCart();

    Alert.alert(...);
}
```

**Impact**: Pending payment lingers in AsyncStorage → user opens app later → recovery screen appears unnecessarily.

---

### 🟡 MEDIUM ISSUES

#### **8. NO STACK SCREEN ROUTES FOR RECOVERY**

**Location**: `frontend/app/_layout.tsx`

**Missing Routes**:

```tsx
<Stack.Screen name="payment" options={{ headerShown: false }} />
<Stack.Screen name="payment-recovery" options={{ headerShown: false }} />
<Stack.Screen name="order-success" options={{ headerShown: false }} />
```

**Impact**: Navigation to these screens may fail or not preserve navigation stack.

---

#### **9. MISSING RETRY IMPORTS IN CONFIRMATION**

**Location**: `frontend/app/checkout/confirmation.tsx`

**Missing**:

```tsx
import { savePendingPayment } from "@/services/payment/paymentRecovery";
```

**Impact**: Code can't call savePendingPayment() → compile error.

---

#### **10. MISSING ERROR MAPPING IMPORTS IN WEBVIEW**

**Location**: `frontend/components/PaymentWebView.tsx`

**Missing**:

```tsx
import { clearPendingPayment } from "@/services/payment/paymentRecovery";
import { mapPaymentError } from "@/services/payment/paymentMessages";
```

**Impact**: User sees technical errors, no friendly messages, can't clear pending payment.

---

## 🧾 COMPREHENSIVE TODO LIST

### **A. CART & STATE PERSISTENCE (CRITICAL)** 🔴

---

#### **TODO-A1**: Fix Order Status on Creation

**Priority**: CRITICAL  
**File**: `backend/app/Services/OrderService.php`  
**Line**: 73

**What's Wrong**:
Orders created with `'pending'` for all payment methods. Should be `'pending_payment'` for card.

**What to Change**:

```php
// Change line 73 from:
'status' => 'pending',

// To:
'status' => $paymentMethod === 'cash_on_delivery'
    ? 'pending'
    : 'pending_payment',
```

**Expected Behavior**:

- COD order → status = `'pending'`
- Card order → status = `'pending_payment'`
- Callback confirms payment → status = `'confirmed'`

---

#### **TODO-A2**: Fix Payment Status in Callback

**Priority**: CRITICAL  
**File**: `backend/app/Http/Controllers/Api/PaymentController.php`  
**Line**: 329-332

**What's Wrong**:
Code writes `'completed'` but ENUM expects `'paid'`.

**What to Change**:

```php
// Change line 330 from:
'payment_status' => 'completed',

// To:
'payment_status' => 'paid',
```

**Expected Behavior**:

- Payment success → `payment_status='paid'`, `status='confirmed'`
- No more database truncation warnings

---

#### **TODO-A3**: Remove Premature Cart Fetch on COD Success

**Priority**: MEDIUM  
**File**: `frontend/app/checkout/confirmation.tsx`  
**Line**: 167-176

**What's Wrong**:
`await fetchCart()` called immediately after backend cleared cart → empty cart flash.

**What to Change**:

```tsx
// Remove lines 167-168:
} else {
    // COD - refresh cart and navigate to success
    await fetchCart(); // ❌ DELETE THIS

// Keep navigation only:
} else {
    // COD - navigate to success
    router.replace({
        pathname: "/order-success" as any,
        params: {...}
    });
}
```

**Expected Behavior**:

- COD success → immediate navigation to success screen
- Success screen loads → user sees order details
- Cart already cleared by backend → no need to fetch

---

### **B. ORDER LIFECYCLE (CRITICAL)** 🔴

---

#### **TODO-B1**: Add Pending Payment Save Before Redirect

**Priority**: CRITICAL  
**File**: `frontend/app/checkout/confirmation.tsx`  
**Line**: 25 (imports), 153-160 (logic)

**What's Wrong**:
No AsyncStorage save before Paymob redirect → app kill = lost order.

**What to Change**:

**Step 1 - Add Import**:

```tsx
// Add to line 25 (after other imports):
import { savePendingPayment } from "@/services/payment/paymentRecovery";
```

**Step 2 - Save Before Redirect**:

```tsx
// BEFORE line 153 (router.replace), add:
// CRITICAL: Save to AsyncStorage BEFORE redirect
await savePendingPayment({
    orderId,
    orderNumber: response.data.order.order_number,
    total: cart?.total || 0,
    paymentAttemptId: paymentResponse.data.payment_id,
    timestamp: Date.now(),
    iframeUrl: paymentResponse.data.iframe_url,
});

// Then redirect
router.replace({...});
```

**Expected Behavior**:

- User clicks "Place Order"
- Order created → AsyncStorage saved
- App redirects to Paymob
- App killed mid-payment → recovery screen on restart

---

#### **TODO-B2**: Handle Retry Parameter in Confirmation

**Priority**: HIGH  
**File**: `frontend/app/checkout/confirmation.tsx`  
**Line**: 114-180 (handlePlaceOrder function)

**What's Wrong**:
No logic to detect retry scenario (user clicked "Retry Payment" after failure).

**What to Change**:

**Step 1 - Detect Retry**:

```tsx
// Add to top of handlePlaceOrder():
const isRetry = params.retry === "true";
const retryOrderId = params.orderId ? parseInt(params.orderId as string) : null;
```

**Step 2 - Skip Order Creation on Retry**:

```tsx
// Wrap createOrder call:
let orderId: number;

if (isRetry && retryOrderId) {
    // Retry existing order
    orderId = retryOrderId;
} else {
    // Create new order
    const response = await createOrder({...});
    orderId = response.data.order.id;
}

// Continue with payment initiation...
```

**Expected Behavior**:

- First attempt → creates order
- Retry → reuses existing order ID
- No duplicate orders

---

### **C. PAYMOB FLOW** 🟡

---

#### **TODO-C1**: Add Error Mapping to WebView

**Priority**: HIGH  
**File**: `frontend/components/PaymentWebView.tsx`  
**Line**: 18 (imports), 83-96 (failure handling)

**What's Wrong**:
Generic "Payment failed" message instead of user-friendly errors.

**What to Change**:

**Step 1 - Add Imports**:

```tsx
// Add to line 18:
import { mapPaymentError } from "@/services/payment/paymentMessages";
import { clearPendingPayment } from "@/services/payment/paymentRecovery";
```

**Step 2 - Replace Failure Alert**:

```tsx
// Replace lines 83-96 with:
} else if (status === "FAILED") {
    await clearPendingPayment();

    const errorInfo = mapPaymentError(
        statusResponse.data?.error_message || "Payment failed"
    );

    Alert.alert(errorInfo.title, errorInfo.message, [
        {
            text: "Retry Payment",
            onPress: () => {
                router.replace({
                    pathname: "/checkout/confirmation",
                    params: { orderId: orderId.toString(), retry: "true" }
                });
            },
        },
        {
            text: "View Order",
            onPress: () => router.replace(`/orders/${orderId}`)
        },
    ]);
}
```

**Expected Behavior**:

- Payment declined → "Your bank declined this transaction. Please check with your bank or try a different card."
- User cancelled → "You cancelled the payment. Your order is still pending if you'd like to try again."
- Timeout → "Connection error. Please check your internet and try again."

---

#### **TODO-C2**: Clear Pending Payment on Success

**Priority**: HIGH  
**File**: `frontend/components/PaymentWebView.tsx`  
**Line**: 66-80

**What's Wrong**:
AsyncStorage never cleared on success → recovery screen appears next app launch.

**What to Change**:

```tsx
// Add AFTER line 67 (if status === "PAID"):
if (status === "PAID") {
    // Clear pending payment from storage
    await clearPendingPayment(); // ✅ ADD THIS

    // Then clear cart
    await fetchCart();

    Alert.alert(...);
}
```

**Expected Behavior**:

- Payment success → AsyncStorage cleared
- User closes app → next launch → no recovery screen
- Clean state

---

### **D. REDIRECTION & UX RECOVERY** 🔴

---

#### **TODO-D1**: Add App Lifecycle Monitoring

**Priority**: CRITICAL  
**File**: `frontend/app/_layout.tsx`  
**Line**: 7 (imports), 32 (useEffect)

**What's Wrong**:
No AppState listener → app resume doesn't trigger payment check.

**What to Change**:

**Step 1 - Add Imports**:

```tsx
// Add to line 7:
import { AppState, AppStateStatus } from "react-native";
import { hasPendingPayment } from "@/services/payment/paymentRecovery";
```

**Step 2 - Add Lifecycle Hook**:

```tsx
// Add AFTER line 32 (after fetchCart useEffect):
// Payment recovery on app resume
useEffect(() => {
  const checkPendingPaymentOnResume = async () => {
    const isPending = await hasPendingPayment();
    if (isPending && pathname !== "/payment-recovery") {
      router.replace("/payment-recovery");
    }
  };

  // Check on mount (cold start)
  checkPendingPaymentOnResume();

  // Check when app comes to foreground
  const subscription = AppState.addEventListener(
    "change",
    (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkPendingPaymentOnResume();
      }
    },
  );

  return () => subscription.remove();
}, [pathname]);
```

**Expected Behavior**:

- User kills app mid-payment
- User restarts app
- App checks AsyncStorage
- Recovery screen appears automatically
- User sees payment status + retry option

---

#### **TODO-D2**: Register Recovery Screen Routes

**Priority**: HIGH  
**File**: `frontend/app/_layout.tsx`  
**Line**: 79 (after <Stack.Screen name="about")

**What's Wrong**:
No Stack.Screen definitions for payment screens → navigation may fail.

**What to Change**:

```tsx
// Add AFTER line 79 (after about screen):
<Stack.Screen
    name="payment"
    options={{ headerShown: false, presentation: "modal" }}
/>
<Stack.Screen
    name="payment-recovery"
    options={{ headerShown: false, gestureEnabled: false }}
/>
<Stack.Screen
    name="order-success"
    options={{ headerShown: false, gestureEnabled: false }}
/>
```

**Expected Behavior**:

- Payment navigation works correctly
- Recovery screen can't be dismissed by swipe
- Success screen can't be dismissed by swipe

---

### **E. VALIDATION & TESTING** 🟢

---

#### **TODO-E1**: Test Complete Recovery Flow

**Priority**: CRITICAL  
**Manual Test**:

```
1. Add items to cart
2. Select card payment
3. Place order
4. Save to AsyncStorage ✅
5. Redirect to Paymob
6. KILL APP (force quit)
7. Restart app
8. App checks AsyncStorage ✅
9. Recovery screen appears ✅
10. Poll payment status
11. Navigate based on result:
    - PAID → success screen
    - FAILED → retry option
    - PENDING → check again
```

**Pass Criteria**:

- ✅ Recovery screen appears on restart
- ✅ Payment status polled correctly
- ✅ Navigation works for all cases

---

#### **TODO-E2**: Test Payment Failure Flow

**Priority**: HIGH  
**Manual Test**:

```
1. Add items to cart
2. Select card payment
3. Place order
4. Use invalid card / decline
5. See user-friendly error ✅
6. Cart still intact ✅
7. Click "Retry Payment"
8. Navigate to confirmation ✅
9. Try different card
10. Success → order confirmed
```

**Pass Criteria**:

- ✅ Friendly error messages
- ✅ Cart preserved
- ✅ Retry doesn't create duplicate order

---

#### **TODO-E3**: Test App Backgrounding

**Priority**: MEDIUM  
**Manual Test**:

```
1. Place order
2. Redirect to Paymob
3. Switch to another app (don't kill)
4. Return to app
5. AppState triggers check ✅
6. Recovery screen or success screen ✅
```

**Pass Criteria**:

- ✅ AppState listener fires
- ✅ Correct screen appears

---

## 📊 IMPLEMENTATION PRIORITY

### **PHASE 1 - CRITICAL FIXES** (Must fix NOW)

1. ✅ TODO-A1: Fix order status on creation
2. ✅ TODO-A2: Fix payment status in callback
3. ⏳ TODO-B1: Save pending payment before redirect
4. ⏳ TODO-D1: Add app lifecycle monitoring
5. ⏳ TODO-D2: Register recovery screen routes

**Estimated Time**: 30 minutes  
**Risk Level**: LOW (minimal code changes)  
**Impact**: HIGH (enables recovery)

---

### **PHASE 2 - UX IMPROVEMENTS** (Fix next)

1. ⏳ TODO-C1: Add error mapping to WebView
2. ⏳ TODO-C2: Clear pending payment on success
3. ⏳ TODO-B2: Handle retry parameter
4. ⏳ TODO-A3: Remove premature cart fetch

**Estimated Time**: 45 minutes  
**Risk Level**: LOW (existing files)  
**Impact**: MEDIUM (better UX)

---

### **PHASE 3 - VALIDATION** (Final step)

1. ⏳ TODO-E1: Test recovery flow
2. ⏳ TODO-E2: Test failure flow
3. ⏳ TODO-E3: Test backgrounding

**Estimated Time**: 2 hours  
**Risk Level**: NONE (testing only)  
**Impact**: CRITICAL (confirms everything works)

---

## 🎯 SUCCESS CRITERIA

### **BUSINESS RULES VALIDATION**

| Rule                                          | Current Status | After Fix |
| --------------------------------------------- | -------------- | --------- |
| Order created ONCE before redirect            | ✅ YES         | ✅ YES    |
| Order status = pending_payment until callback | ❌ NO          | ✅ YES    |
| Cart preserved on failure                     | ⚠️ PARTIAL     | ✅ YES    |
| Cart preserved on app close                   | ❌ NO          | ✅ YES    |
| Cart cleared ONLY on payment=PAID             | ⚠️ BACKEND YES | ✅ YES    |
| Redirect ≠ payment result                     | ✅ YES         | ✅ YES    |
| Callback is source of truth                   | ✅ YES         | ✅ YES    |

---

## 📁 FILES TO MODIFY

### **Backend (2 files)**

1. ✅ `backend/app/Services/OrderService.php` - Order status fix
2. ✅ `backend/app/Http/Controllers/Api/PaymentController.php` - Payment status fix

### **Frontend (3 files)**

1. ⏳ `frontend/app/checkout/confirmation.tsx` - Save pending payment, retry logic
2. ⏳ `frontend/components/PaymentWebView.tsx` - Error mapping, clear pending
3. ⏳ `frontend/app/_layout.tsx` - AppState listener, routes

### **Already Created (3 files)**

1. ✅ `frontend/services/payment/paymentRecovery.ts` - Persistence layer
2. ✅ `frontend/services/payment/paymentMessages.ts` - Error mapping
3. ✅ `frontend/app/payment-recovery.tsx` - Recovery screen

---

## 🔒 WHAT WE WILL **NOT** CHANGE

- ❌ Checkout flow structure
- ❌ Payment methods
- ❌ Backend architecture
- ❌ Database schema (already fixed)
- ❌ Paymob integration logic
- ❌ Cart service
- ❌ Order service structure

**We are ONLY fixing bugs and adding recovery hooks.**

---

## 📝 NOTES FOR IMPLEMENTATION

1. **Database**: Already fixed ✅
   - `'pending_payment'` added to order status ENUM
   - `'paid'` added to payment_status ENUM

2. **Recovery Infrastructure**: Already created ✅
   - Payment recovery service
   - Recovery screen
   - Error messages

3. **Remaining Work**: Integration only ⏳
   - Hook up existing recovery code
   - Fix status values
   - Add lifecycle listeners
   - Test flows

**Total Estimated Time**: 2-3 hours (including testing)  
**Risk Level**: MINIMAL (mostly wiring existing code)  
**Confidence**: HIGH (infrastructure already proven)

---

**END OF ANALYSIS** 🎯
