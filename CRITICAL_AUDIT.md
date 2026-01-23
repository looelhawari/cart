# 🚨 CRITICAL PAYMENT FLOW AUDIT - DISASTER ANALYSIS

**Date**: January 22, 2026  
**Engineer**: Principal Backend & Checkout Engineer  
**Status**: PRODUCTION BLOCKING - MULTIPLE CRITICAL BUGS

---

## 🔥 **CRITICAL BUGS IDENTIFIED**

### **Bug #1: MASSIVE PRICE MISMATCH** ❌ **P0 - DATA CORRUPTION**

**Evidence from Screenshots:**

- Cart Screen: 18.00 EGP subtotal (8 + 10 = 18)
- Cart Screen: 40.52 EGP total (18 + 20 delivery + 2.52 tax)
- Paymob Screen: **710.22 EGP** ← **17.5x HIGHER!!!**

**Evidence from Laravel Logs:**

```
Order 21: amount_cents = 72846 = 728.46 EGP
Order 22: amount_cents = 72846 = 728.46 EGP
Order 23: amount_cents = 79002 = 790.02 EGP
Order 24: amount_cents = 79002 = 790.02 EGP
```

**Root Cause:**
Line 182 in PaymentController.php:

```php
$amountCents = (int) ($order->total * 100);
```

This means `$order->total` in database = **710 EGP** when it should be **40.52 EGP**

**Impact:**

- Users are being charged 17x MORE than their cart total
- Orders table has WRONG totals saved
- This is FRAUD/BILLING ERROR - PRODUCTION BLOCKING

---

### **Bug #2: Order Saved BEFORE Payment** ❌ **P0 - FLOW VIOLATION**

**Evidence:**
User reports: "In the database before even the user pays, order is saved with the total showed in Paymob (710)"

**Current Flow:**

```
1. User clicks "Place Order"
2. createOrder() creates order in DB with WRONG total
3. initiatePayment() reads order total
4. User sees Paymob with WRONG amount
```

**Correct Flow (per flow.md):**

```
1. User clicks "Place Order"
2. Create order with status = 'pending_payment' ← THIS IS CORRECT
3. Initiate payment with CORRECT total
4. Webhook updates order after verification
```

**Impact:**

- Database has abandoned orders with wrong totals
- Cannot trust order totals
- Cannot reconcile payments

---

### **Bug #3: Infinite Retry Loop** ❌ **P0 - UX BREAKING**

**Evidence from User:**

```
When payment declined/cancelled, keeps retrying:
- Clicked X to close Paymob
- Still polling /api/v1/payments/order/46/status every 6 seconds
- Continued for 4+ minutes non-stop
```

**Root Cause:**
PaymentWebView.tsx line 106:

```typescript
else {
  // Still pending - poll again after delay
  console.log("Payment still pending, polling again...");
  setTimeout(() => handleNavigationStateChange(navState), 3000);
}
```

**Problem:**

- No max retry limit
- No check if user closed WebView
- No check if payment actually failed
- Recursive setTimeout with NO EXIT CONDITION

**Impact:**

- Battery drain
- Network spam
- User cannot escape payment flow
- Orders stuck in pending_payment forever

---

### **Bug #4: Cart Not Cleared** ❌ **P1 - DATA INCONSISTENCY**

**Evidence:** User reports cart still shows items after successful payment

**Expected Behavior:**

- Payment callback should clear cart
- Frontend should refresh cart after success

**Current Implementation:**

- Callback clears cart (lines 337-347 in PaymentController.php)
- Frontend calls fetchCart() after success (line 68 in PaymentWebView.tsx)

**Likely Cause:**

- Callback not executing (webhook URL wrong?)
- Frontend not waiting for backend
- Cache issue

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **The Total Calculation Chain**

Let me trace how the total is calculated:

1. **Cart Calculation** (CartService.php lines 175-210):

```php
$subtotal = 0;
foreach ($cart->items as $item) {
    $subtotal += $item->price * $item->quantity;
}
// Returns: subtotal, delivery_fee, tax, total
```

2. **Order Creation** (OrderService.php lines 40-85):

```php
$cartTotals = $this->cartService->calculateTotals($cart);
$order = Order::create([
    'subtotal' => $cartTotals['subtotal'],  // ← Should be 18.00
    'total' => $total,  // ← Should be 40.52
]);
```

3. **Payment Initiation** (PaymentController.php line 182):

```php
$amountCents = (int) ($order->total * 100);  // ← Gets 710 instead of 40.52!
```

**HYPOTHESIS:**
The `$order->total` in database is **WRONG** at creation time.

**Possible Causes:**

1. ❌ Cart items have wrong prices in database
2. ❌ CartService calculation is wrong
3. ❌ Tax/delivery calculation is multiplying instead of adding
4. ❌ Frontend sending wrong data to createOrder
5. ✅ **MOST LIKELY**: Price stored in cents but calculated as EGP

---

## 🎯 **INVESTIGATION NEEDED**

### **Query 1: Check Latest Order**

```sql
SELECT
    id, order_number,
    subtotal, delivery_fee, tax, discount, total,
    payment_method, status, payment_status
FROM orders
WHERE id = 46  -- The problematic order from logs
```

### **Query 2: Check Cart Items for That User**

```sql
SELECT
    ci.id, ci.cart_id, ci.product_id,
    ci.quantity, ci.price,
    (ci.price * ci.quantity) as item_subtotal,
    p.name_en, p.price as product_price
FROM cart_items ci
LEFT JOIN products p ON ci.product_id = p.barcode
WHERE ci.cart_id IN (
    SELECT id FROM carts WHERE user_id = (
        SELECT user_id FROM orders WHERE id = 46
    )
)
```

### **Query 3: Check Product Prices**

```sql
SELECT barcode, name_en, price, sale_price
FROM products
WHERE barcode IN ('product_id_from_screenshots')
```

---

## ✅ **FIX STRATEGY** (Priority Ordered)

### **Phase 1: STOP THE BLEEDING** (Immediate - 30 min)

**Task 1.1**: Add emergency logging to trace calculation

- [x] Already added to CartService (lines with emoji)
- [x] Already added to OrderService
- [ ] Need to actually trigger and read logs

**Task 1.2**: Find the exact point where total becomes wrong

- [ ] Query database for order 46
- [ ] Check cart_items prices
- [ ] Compare with product prices
- [ ] Identify if prices are in cents vs EGP

**Task 1.3**: Fix the infinite retry loop

- [ ] Add max retry count (10 retries = 1 minute)
- [ ] Add exit condition when user closes WebView
- [ ] Stop polling when status = FAILED
- [ ] Clear pending payment on user cancel

---

### **Phase 2: FIX CALCULATION** (Critical - 1 hour)

**Scenario A: Prices in cents, calculated as EGP**

```php
// If product.price = 800 (cents) but treated as 8.00 EGP
// FIX: Divide by 100 when storing in cart_items
$cartItem->price = $product->price / 100;
```

**Scenario B: Cart calculation multiplying by 100**

```php
// If someone multiplied by 100 somewhere
// FIX: Remove the multiplication
```

**Scenario C: Frontend sending wrong data**

```typescript
// If frontend multiplying totals
// FIX: Send raw cart data, let backend calculate
```

---

### **Phase 3: FIX WEBHOOK & RETRY** (Critical - 1 hour)

**Task 3.1**: Fix infinite retry

```typescript
// In PaymentWebView.tsx
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 10;

if (status === "PENDING") {
  if (retryCount < MAX_RETRIES) {
    setRetryCount((prev) => prev + 1);
    setTimeout(() => handleNavigationStateChange(navState), 3000);
  } else {
    // Show recovery screen
    Alert.alert("Payment Verification", "Taking longer than expected...");
  }
}
```

**Task 3.2**: Add user cancel detection

```typescript
const handleClose = () => {
  // Clear pending payment
  clearPendingPayment();
  // Stop all retries
  setProcessing(false);
  // Go back
  router.back();
};
```

**Task 3.3**: Add payment_status = 'completed' to ENUM

```sql
ALTER TABLE orders
MODIFY COLUMN payment_status
ENUM('pending', 'paid', 'failed', 'completed', 'refunded');
```

---

### **Phase 4: FIX WEBHOOK CALLBACK** (High - 30 min)

**Task 4.1**: Verify webhook URL is correct

- Check Paymob dashboard webhook configuration
- Test webhook locally with ngrok/expose

**Task 4.2**: Add webhook retry logic

- Paymob may call webhook multiple times
- Handle idempotency

**Task 4.3**: Fix payment_status enum values

```php
// In processedCallback
$order->update([
    'payment_status' => 'completed',  // ← Add to ENUM
    'status' => 'confirmed',
]);
```

---

### **Phase 5: FIX ORDERS UI** (Medium - 30 min)

**Task 5.1**: Filter out pending_payment orders

```typescript
// In orders list
const visibleStatuses = [
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
const filteredOrders = orders.filter((o) => visibleStatuses.includes(o.status));
```

**Task 5.2**: Add retry payment for failed orders

```typescript
if (order.status === "failed" || order.status === "pending_payment") {
  // Show "Retry Payment" button
}
```

---

## 📊 **EXPECTED OUTCOMES AFTER FIX**

### **Correct Flow:**

```
1. Cart: 18.00 EGP subtotal
2. Checkout: 40.52 EGP total (18 + 20 + 2.52)
3. Order Created: subtotal=18.00, total=40.52, status=pending_payment
4. Paymob: 40.52 EGP (4052 cents)
5. User Pays: Success
6. Webhook: Updates order to status=confirmed, payment_status=completed
7. Frontend: Navigates to success, cart cleared
8. Database: Order total = 40.52, cart items = 0
```

### **Failed Payment Flow:**

```
1-4: Same as above
5. User Cancels/Declines
6. Webhook: Updates order to status=failed, payment_status=failed
7. Frontend: Shows retry option, max 10 attempts, then recovery screen
8. Database: Order preserved for retry
```

---

## 🚨 **CRITICAL QUESTIONS FOR USER**

1. **Are product prices stored in cents or EGP?**
   - Check `products` table `price` column
   - Example: Is bread 8.00 or 800?

2. **What's in the orders table for order 46?**

   ```sql
   SELECT * FROM orders WHERE id = 46;
   ```

3. **What's the Paymob webhook URL configured?**
   - Check Paymob dashboard
   - Should be: `https://your-domain.com/api/v1/payments/paymob/callback`

4. **Has any payment actually succeeded?**
   - Check if webhook ever executed
   - Look for "Payment marked as paid" in logs

---

**NEXT IMMEDIATE ACTION:**  
Query database for order 46 to see the actual stored total value and trace back to cart calculation.
