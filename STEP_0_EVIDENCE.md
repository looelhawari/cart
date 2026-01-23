# STEP 0 - BASELINE EVIDENCE COLLECTION

## Test Scenario: Reproduce 17x Price Mismatch

### Setup:

1. User has OLD cart with 10 items (from previous session)
2. User adds 2 NEW items in current session
3. Frontend shows 2 items, backend merges to 12 items
4. Order created with wrong total

### Commands to Run:

```bash
# 1. Check current cart state
php debug_order.php

# 2. Watch Laravel logs in real-time
tail -f storage/logs/laravel.log | grep -E "🛒|📦|⚠️|💰|💵|💳|BASELINE"

# 3. Clear old logs (optional)
echo "" > storage/logs/laravel.log

# 4. Simulate order creation (via Postman or app)
# POST /api/v1/orders
# Headers: Authorization: Bearer <token>, X-Session-ID: <guest_session>
# Body: { delivery_address_id, payment_method: "card", delivery_date, delivery_time_slot }

# 5. Check result
php debug_order.php
```

### Expected Log Output (BASELINE - BEFORE FIX):

```
🛒 [BASELINE] CartService::getCart()
  user_id: 1
  session_id: abc-123-guest-session

📦 [BASELINE] Found USER cart
  cart_id: 2
  items: 10
  updated: 2026-01-20 15:30:00  ← OLD CART (2 days old)

⚠️ [BASELINE] BOTH CARTS - MERGING!
  user_cart: { id: 2, items: 10, updated: 2026-01-20 }
  guest_cart: { id: 3, items: 2, updated: 2026-01-22 }  ← NEW CART (today)

💰 [BASELINE] ORDER CREATION - Cart Totals
  cart_id: 2
  cart_totals: { subtotal: 623.00, delivery_fee: 20.00, tax: 87.22, total: 730.22 }
  items_breakdown: [
    { product: "Tomatoes", qty: 3, price: 13.50, subtotal: 40.50 },
    { product: "Apples", qty: 3, price: 22.50, subtotal: 67.50 },
    { product: "Fresh White Bread", qty: 5+1, price: 8.00, subtotal: 48.00 },  ← MERGED!
    { product: "Whole Wheat Bread", qty: 5+1, price: 10.00, subtotal: 60.00 }, ← MERGED!
    ... 8 more old items ...
  ]

💵 [BASELINE] FINAL ORDER TOTALS
  subtotal: 623.00
  delivery_fee: 0.00  ← Why 0? Check calculation
  tax: 87.22
  TOTAL: 710.22

💳 [BASELINE] PAYMENT INITIATION
  order_id: 46
  order_total_EGP: 710.22
  amount_cents: 71022
  PAYMOB_WILL_CHARGE: 710.22 EGP  ← WRONG! Should be ~40 EGP
```

### Evidence to Capture:

| Location              | What User Sees           | What DB Has      | Mismatch? |
| --------------------- | ------------------------ | ---------------- | --------- |
| **Frontend Cart**     | 2 items, 18 EGP subtotal | -                | -         |
| **Frontend Checkout** | 40.52 EGP total          | -                | -         |
| **Database `carts`**  | Cart ID 2 or 3?          | 10 or 12 items?  | ✓ Check   |
| **Database `orders`** | -                        | 710.22 EGP total | ✓ **YES** |
| **Paymob iframe**     | 710.22 EGP charge        | -                | ✓ **YES** |

### Root Cause Proof:

1. **Cart Merge** happens at line 32 in `CartService::getCart()`
2. **Old cart (10 items)** merged with **new cart (2 items)** = **12 items**
3. **Frontend** never refreshed after merge → shows 2 items
4. **Order created** with merged cart (12 items) → 710.22 EGP
5. **Paymob** charged 710.22 EGP

### Comparison Table:

| Step          | User Expectation | Backend Reality        | Delta                   |
| ------------- | ---------------- | ---------------------- | ----------------------- |
| Cart items    | 2 items          | 12 items (after merge) | +10 items               |
| Subtotal      | 18.00 EGP        | 623.00 EGP             | **+605 EGP (33.6x)**    |
| Total         | 40.52 EGP        | 710.22 EGP             | **+669.70 EGP (17.5x)** |
| Paymob charge | 40.52 EGP        | 710.22 EGP             | **+669.70 EGP**         |

---

## Deliverable for Step 0:

✅ **Baseline Evidence Captured**

1. **Log Output**: (paste actual logs from Laravel)
2. **Database Query**: (show cart_items for both carts)
3. **Order Record**: (show orders.subtotal, total for order 46)
4. **Mismatch Confirmed**: Frontend shows X, DB has Y, Paymob charged Z

---

## Next: Step 1 - Implement "Newest Cart Wins"

Once baseline is confirmed, proceed to fix the cart merge logic.
