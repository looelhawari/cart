Perfect — this is **exactly** the right moment to lock this down properly.
I’ll do **two things** for you, very clearly and professionally:

1. **Explain the CORRECT full order + payment flow** (so *you* are 100% confident what is right vs wrong)
2. Give you a **SUPER-PROMPT (enterprise-grade)** you can paste directly to the agent to fix **everything**:

   * DB fields not updating
   * Paymob verification mismatch
   * Order tab + order details
   * Reorder button logic
   * UI/UX + redirections
   * All failure / success scenarios
   * Zero ambiguity, zero “thinking”, zero assumptions

This is **Amazon / Noon / Talabat level**, not startup-level guessing.

---

# PART 1 — THE CORRECT REAL-WORLD FLOW (VERY IMPORTANT)

## 🔑 Golden Rule (memorize this)

> **Orders are created BEFORE payment, but are NOT considered real until payment is VERIFIED.**

### This means:

* ✅ Order row exists in DB
* ❌ Order is NOT “confirmed”
* ❌ Order is NOT shown as completed
* ❌ Order is NOT fulfilled
* ❌ Order is NOT revenue

---

## 🧭 CORRECT ORDER + PAYMENT STATE MACHINE (YOUR SCHEMA ADAPTED)

### Orders table (`orders.status`)

You **must** treat these states differently:

| status              | Meaning                        | Visible to user? |
| ------------------- | ------------------------------ | ---------------- |
| `pending`           | COD order waiting confirmation | Yes              |
| `pending_payment` ❗ | Card order waiting for Paymob  | ⚠️ Limited       |
| `confirmed`         | Paid & verified                | Yes              |
| `preparing`         | Store preparing                | Yes              |
| `out_for_delivery`  | Courier                        | Yes              |
| `delivered`         | Completed                      | Yes              |
| `failed`            | Payment failed                 | ⚠️ Only if retry |
| `cancelled`         | User/admin cancelled           | Yes              |

⚠️ **You are currently missing `pending_payment` in `orders.status` → THIS IS A ROOT BUG**

---

### Payment truth source

> **Paymob webhook is the ONLY source of truth**

Not:

* frontend redirect
* iframe success screen
* user closing app

---

## 🧾 What MUST happen in DB (this answers your bug)

### When user clicks **Place Order (Card)**

1. Create order:

```sql
orders.status = 'pending_payment'
orders.payment_status = 'pending'
```

2. Create:

```sql
paymob_payments.status = 'PENDING'
payment_transactions.status = 'pending'
```

3. Redirect to Paymob iframe

✅ **THIS IS CORRECT**

---

### When Paymob confirms payment (SANDBOX OR LIVE)

👉 **ONLY via CALLBACK / WEBHOOK**

You MUST update **ALL THREE**:

#### 1️⃣ paymob_payments

```sql
status = 'PAID'
transaction_id = <paymob_txn_id>
paid_at = NOW()
```

#### 2️⃣ payment_transactions

```sql
status = 'completed'
processed_at = NOW()
gateway_response = FULL_PAYMOB_RESPONSE
```

#### 3️⃣ orders  ❗❗❗

```sql
status = 'confirmed'
payment_status = 'completed'
```

🚨 **If order is paid in Paymob sandbox but these fields are NOT updated → YOUR WEBHOOK LOGIC IS BROKEN**

This is NOT optional.

---

### When payment FAILS / 3DS fails / cancelled

You MUST do:

```sql
orders.status = 'failed'
orders.payment_status = 'failed'
paymob_payments.status = 'FAILED'
payment_transactions.status = 'failed'
```

AND:

* ❌ DO NOT delete order
* ❌ DO NOT clear cart
* ✅ Allow retry

---

# PART 2 — REORDER & VIEW ORDER LOGIC (THIS WAS BUGGY)

## 🔁 Reorder button — WHEN TO SHOW

Show **Reorder** button ONLY if:

```txt
orders.status IN ('delivered', 'cancelled', 'failed')
```

❌ Do NOT show reorder for:

* pending_payment
* confirmed
* preparing
* out_for_delivery

### What Reorder does:

* Creates NEW cart
* Copies order_items → cart_items
* DOES NOT duplicate the order

---

## 👁️ View Order button — WHAT IT SHOWS

**View Order page MUST show:**

### Header

* Order number
* Status (human readable)
* Payment status
* Created date

### Items

* Product name
* Price snapshot
* Quantity
* Subtotal

### Payment

* Method (COD / Card)
* Status (Pending / Paid / Failed)
* If failed → “Retry Payment” CTA

### Delivery

* Address snapshot
* Time slot
* Notes

### Actions (dynamic)

| Condition       | Action        |
| --------------- | ------------- |
| pending_payment | Retry Payment |
| failed          | Retry Payment |
| confirmed+      | Track Order   |
| delivered       | Reorder       |

---

## 🧾 Orders Tab (VERY IMPORTANT UX)

### Orders list should:

* ❌ NOT show `pending_payment` by default
* ❌ NOT show abandoned orders
* ✅ Show:

  * confirmed
  * preparing
  * out_for_delivery
  * delivered
  * cancelled

### Exception:

If user comes from **payment failure recovery** → show that order.

---

# PART 3 — THE SUPER PROMPT (PASTE THIS TO THE AGENT)

Below is **THE PROMPT**.
Do **NOT edit**, do **NOT shorten**, do **NOT simplify**.

---

## 🔥 SUPER PROMPT — CHECKOUT + ORDER FLOW (ENTERPRISE GRADE)

> You are a **Principal Backend & Checkout Engineer (15+ years)** specializing in **hypermarket e-commerce systems** (Amazon, Noon, Talabat, Carrefour).
> You are auditing and fixing a **Paymob-integrated checkout & order system**.
> Your job is NOT to guess, assume, or redesign — but to **verify, diagnose, and fix** the existing implementation to be **100% correct, consistent, and production-grade**.

---

### 🚫 STRICT RULES (NON-NEGOTIABLE)

* DO NOT assume anything works
* DO NOT skip verification
* DO NOT invent flows
* DO NOT clear carts incorrectly
* DO NOT mark orders paid from frontend redirects
* Paymob **webhook is the ONLY source of truth**
* Follow this prompt **step by step**

---

## PHASE 1 — CURRENT STATE AUDIT (MANDATORY FIRST STEP)

1. Trace **full checkout flow**:

   * Cart → Checkout → Place Order → Paymob → Callback → Order update

2. Inspect ALL related logic:

   * Order creation
   * Paymob order registration
   * Payment token generation
   * Callback + webhook handlers
   * DB updates for:

     * `orders`
     * `paymob_payments`
     * `payment_transactions`

3. Verify:

   * Which DB fields are updated on **PAID**
   * Which fields are updated on **FAILED**
   * Whether sandbox payments actually update DB

4. Output:

```md
### CURRENT STATE ANALYSIS
- What works
- What is broken
- Missing updates
- Inconsistent states
- Security / logic gaps
```

---

## PHASE 2 — CANONICAL ORDER & PAYMENT STATE MACHINE

Implement and enforce the **ONLY correct flow**:

### Order creation (Card):

```txt
orders.status = pending_payment
orders.payment_status = pending
```

### Payment success (Paymob webhook ONLY):

```txt
paymob_payments.status = PAID
payment_transactions.status = completed
orders.status = confirmed
orders.payment_status = completed
```

### Payment failure / cancel:

```txt
paymob_payments.status = FAILED
payment_transactions.status = failed
orders.status = failed
orders.payment_status = failed
```

❗ No other path is allowed.

---

## PHASE 3 — DB FIELD FIXES (CRITICAL)

* Add `pending_payment` to `orders.status` ENUM if missing
* Ensure enum values match **exactly** across:

  * orders
  * payment_transactions
  * paymob_payments
* Ensure **sandbox success updates DB** (currently broken)

---

## PHASE 4 — UI / UX FLOW (AMAZON-LEVEL)

### Orders Tab

* Do NOT show `pending_payment` by default
* Show only meaningful orders
* Preserve failed orders only for retry context

### View Order Page

Must show:

* Order meta
* Items snapshot
* Payment status
* Retry button ONLY if failed / pending_payment

### Reorder Button

Show ONLY if:

```txt
status IN (delivered, cancelled, failed)
```

Reorder:

* Creates new cart
* Does NOT duplicate order

---

## PHASE 5 — FAILURE & RECOVERY HANDLING

Handle ALL cases:

* App closed during payment
* 3DS failure
* Bank decline
* Network loss
* User cancellation
* Webhook delay

Rules:

* Cart is NEVER cleared unless payment = completed
* Orders are NEVER deleted automatically
* Retry uses SAME order

---

## PHASE 6 — FINAL VERIFICATION CHECKLIST

Provide:

* ✅ Success flow test
* ✅ Failure flow test
* ✅ Retry flow test
* ✅ App kill recovery
* ✅ Sandbox verification proof
* ✅ DB before/after snapshots

---

## FINAL OUTPUT REQUIRED

1. Detailed audit summary
2. Fix to-do list (priority ordered)
3. Exact code / DB changes
4. Confirmation that:

```txt
Paid in Paymob === Paid in DB
```

---

# FINAL NOTE (FROM ME TO YOU)

What you’re building now is **hard stuff**.
Payments + orders are where **90% of apps fail**.

If you finish **this flow correctly**, you have:

* A real hypermarket backend
* A production-grade checkout

