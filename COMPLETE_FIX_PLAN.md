# 🔥 COMPLETE CHECKOUT DISASTER - ROOT CAUSES & FIXES

**Date**: January 22, 2026  
**Status**: ALL ROOT CAUSES IDENTIFIED  
**Priority**: P0 - PRODUCTION BLOCKING

---

## ✅ **ROOT CAUSE IDENTIFIED**

### **The Cart Merge Disaster**

**What's Happening:**

1. User previously logged in → Had 10 items in cart → Logged out
2. User came back (guest or new session) → Added 2 items (bread)
3. Frontend shows 2 items in guest cart (18 EGP subtotal)
4. User places order → Backend merges guest cart WITH old 10-item cart
5. Order created with ALL 12 items (623 EGP subtotal)
6. Paymob charged 710.22 EGP (623 + 20 delivery + 87.22 tax)
7. Frontend still shows 2 items because it hasn't refreshed after merge

**Code Location:**

```php
// backend/app/Services/CartService.php lines 18-45
public function getCart(?int $userId = null, ?string $sessionId = null): Cart
{
    if ($userId) {
        $cart = Cart::where('user_id', $userId)->first();  // Gets OLD cart with 10 items

        if ($sessionId) {
            $guestCart = Cart::where('session_id', $sessionId)
                ->whereNull('user_id')
                ->first();  // Gets GUEST cart with 2 items

            if ($guestCart) {
                if ($cart) {
                    $this->mergeCarts($guestCart, $cart);  // ← DISASTER: Merges into old cart!
                    $guestCart->delete();
                }
            }
        }
    }
}
```

**Why This Is WRONG:**

- User thinks they're ordering 2 items
- Backend silently merges with abandoned cart
- User gets charged for items they didn't intend to buy
- Frontend never knows about the merge

---

## 🚨 **ALL IDENTIFIED BUGS**

### **Bug #1: Silent Cart Merge** ❌ P0

**Impact**: User charged for abandoned items  
**Fix**: Clear old cart before merge OR show merge confirmation

### **Bug #2: Frontend Not Refreshed After Merge** ❌ P0

**Impact**: Frontend shows wrong cart during checkout  
**Fix**: Fetch cart after order creation to show merged cart

### **Bug #3: Infinite Retry Loop** ❌ P0

**Impact**: User cannot exit payment flow  
**Fix**: Add max retries, detect user cancel

### **Bug #4: Missing payment_status='completed'** ❌ P1

**Impact**: Webhook cannot update order status  
**Fix**: Add to ENUM, use in callback

### **Bug #5: Cart Not Cleared After Success** ❌ P1

**Impact**: User sees old items after checkout  
**Fix**: Verify webhook clears correct cart

### **Bug #6: Pending Orders Shown in Orders Tab** ❌ P2

**Impact**: Confusing UX  
**Fix**: Filter by status

---

## ✅ **COMPREHENSIVE FIX PLAN**

### **Phase 1: STOP SILENT MERGE (CRITICAL - 30 min)**

**Option A: Clear old cart before new session**

```php
// When user logs in with guest cart
if ($userId && $sessionId) {
    // Clear any existing user cart
    $oldCart = Cart::where('user_id', $userId)->first();
    if ($oldCart) {
        $oldCart->items()->delete();
        $oldCart->delete();
    }

    // Convert guest cart to user cart (no merge)
    $guestCart = Cart::where('session_id', $sessionId)->first();
    if ($guestCart) {
        $guestCart->update(['user_id' => $userId, 'session_id' => null]);
        return $guestCart;
    }
}
```

**Option B: Ask user before merge**

```typescript
// Frontend: After login, check for cart merge
const response = await api.checkCartMerge();
if (response.hasOldCart && response.hasGuestCart) {
  Alert.alert(
    "Cart Items Found",
    `You have ${oldCount} items from previous session. Merge with current ${newCount} items?`,
    [
      { text: "Clear Old Cart", onPress: () => clearOldCart() },
      { text: "Merge", onPress: () => mergeCarts() },
    ],
  );
}
```

**Option C: Always use latest cart (RECOMMENDED)**

```php
// When user has both carts, keep only the most recently updated one
if ($userId && $sessionId) {
    $userCart = Cart::where('user_id', $userId)->first();
    $guestCart = Cart::where('session_id', $sessionId)->first();

    if ($userCart && $guestCart) {
        // Compare timestamps
        if ($guestCart->updated_at->isAfter($userCart->updated_at)) {
            // Guest cart is newer - clear old user cart
            $userCart->items()->delete();
            $userCart->delete();
            // Convert guest cart to user cart
            $guestCart->update(['user_id' => $userId, 'session_id' => null]);
            return $guestCart;
        } else {
            // User cart is newer - delete guest cart
            $guestCart->items()->delete();
            $guestCart->delete();
            return $userCart;
        }
    }
}
```

---

### **Phase 2: FIX INFINITE RETRY (CRITICAL - 20 min)**

```typescript
// frontend/components/PaymentWebView.tsx
const [retryCount, setRetryCount] = useState(0);
const [userCancelled, setUserCancelled] = useState(false);
const MAX_RETRIES = 10; // 10 retries × 3s = 30 seconds max

const handleNavigationStateChange = async (navState: any) => {
    // ...existing success/failure logic...

    else if (status === "PENDING") {
        if (userCancelled) {
            // User clicked X - stop polling
            return;
        }

        if (retryCount >= MAX_RETRIES) {
            // Max retries reached - show recovery
            Alert.alert(
                "Payment Verification",
                "Payment is taking longer than expected. Check Orders tab for status.",
                [
                    { text: "View Orders", onPress: () => router.replace("/(tabs)/orders") },
                    { text: "Go Home", onPress: () => router.replace("/(tabs)") },
                ]
            );
            return;
        }

        setRetryCount(prev => prev + 1);
        setTimeout(() => handleNavigationStateChange(navState), 3000);
    }
};

const handleClose = () => {
    setUserCancelled(true);  // Stop polling
    clearPendingPayment();
    router.back();
};
```

---

### **Phase 3: ADD payment_status='completed' (HIGH - 15 min)**

```sql
-- Migration
ALTER TABLE orders
MODIFY COLUMN payment_status
ENUM('pending', 'paid', 'failed', 'completed', 'refunded');
```

```php
// backend/app/Http/Controllers/Api/PaymentController.php
// Line 337
$order->update([
    'payment_status' => 'completed',  // Instead of 'paid'
    'status' => 'confirmed',
]);
```

---

### **Phase 4: FIX CART REFRESH (MEDIUM - 20 min)**

```typescript
// frontend/app/checkout/confirmation.tsx
// After creating order, IMMEDIATELY fetch cart to see merged items
const handlePlaceOrder = async () => {
    // Create order
    const response = await createOrder({...});
    const orderId = response.data.order.id;

    // CRITICAL: Fetch cart to see if backend merged items
    await fetchCart();

    // Now check if cart total matches what user expects
    const currentCartTotal = cart?.total || 0;
    const expectedTotal = 40.52;  // What user saw before clicking

    if (Math.abs(currentCartTotal - expectedTotal) > 1) {
        // Cart was merged! Warn user
        Alert.alert(
            "Cart Updated",
            `Your cart has been updated to ${currentCartTotal} EGP. Previous items were added.`,
            [
                { text: "Cancel Order", onPress: () => cancelOrder(orderId) },
                { text: "Continue", onPress: () => proceedToPayment(orderId) },
            ]
        );
        return;
    }

    // Proceed with payment
    await initiatePayment(orderId);
};
```

---

### **Phase 5: WEBHOOK & CALLBACK FIXES (MEDIUM - 30 min)**

**Task 5.1**: Verify callback updates all tables

```php
// backend/app/Http/Controllers/Api/PaymentController.php
if ($success && $transactionId) {
    DB::beginTransaction();

    // 1. Update paymob_payments
    $payment->markAsPaid($transactionId, $data);

    // 2. Update payment_transactions (if exists)
    $transaction = PaymentTransaction::where('payment_id', $payment->id)->first();
    if ($transaction) {
        $transaction->update([
            'status' => 'completed',
            'processed_at' => now(),
            'gateway_response' => json_encode($data),
        ]);
    }

    // 3. Update orders
    $order->update([
        'status' => 'confirmed',
        'payment_status' => 'completed',
    ]);

    // 4. Clear cart
    $cart = Cart::where('user_id', $order->user_id)->first();
    if ($cart) {
        $cart->items()->delete();
        $cart->delete();
    }

    DB::commit();
}
```

**Task 5.2**: Handle failures properly

```php
else {
    DB::beginTransaction();

    $errorMessage = $data['data']['message'] ?? 'Payment failed';

    // 1. Update paymob_payments
    $payment->markAsFailed($errorMessage, $data);

    // 2. Update orders
    $order->update([
        'status' => 'failed',
        'payment_status' => 'failed',
    ]);

    // DO NOT clear cart - allow retry

    DB::commit();
}
```

---

### **Phase 6: ORDERS UI FILTERING (LOW - 15 min)**

```typescript
// frontend/services/api/orderApi.ts
export const getOrders = async () => {
  const response = await api.get("/orders");

  // Filter out pending_payment orders (unless coming from retry)
  const visibleStatuses = [
    "confirmed",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  const filteredOrders = response.data.orders.filter((o) =>
    visibleStatuses.includes(o.status),
  );

  return { ...response, data: { orders: filteredOrders } };
};
```

---

## 📋 **IMPLEMENTATION ORDER**

1. ✅ **[DONE]** Identify root cause
2. 🔴 **[NOW]** Fix cart merge strategy (Option C recommended)
3. 🔴 **[NOW]** Fix infinite retry loop
4. 🟡 **[NEXT]** Add payment_status='completed' migration
5. 🟡 **[NEXT]** Fix cart refresh after order creation
6. 🟢 **[LATER]** Improve webhook callback
7. 🟢 **[LATER]** Filter orders UI

---

## 🎯 **EXPECTED FLOW AFTER FIX**

### **Scenario 1: New Session**

```
1. User logs in → Has old cart with 10 items (updated 2 days ago)
2. User adds 2 new items → Guest cart with 2 items (updated now)
3. Backend compares: Guest cart is newer
4. Backend clears old cart, keeps guest cart (2 items)
5. User sees correct total: 18 + 20 + 2.52 = 40.52 EGP
6. Paymob charges 40.52 EGP ✅
```

### **Scenario 2: Payment Success**

```
1. User completes payment
2. Paymob webhook fires
3. Backend updates: status=confirmed, payment_status=completed
4. Backend clears cart
5. Frontend fetches cart → empty
6. Frontend navigates to success screen
```

### **Scenario 3: Payment Failure**

```
1. User cancels payment or card declined
2. Paymob webhook fires with failure
3. Backend updates: status=failed, payment_status=failed
4. Backend KEEPS cart (for retry)
5. Frontend shows "Retry Payment" button
6. Max 10 retries × 3s = 30 seconds polling
7. If max reached → Show recovery screen
```

---

**READY TO IMPLEMENT!** 🚀
