# Tokenization Implementation - Testing Guide

## ✅ Implementation Complete

All backend infrastructure for dual-flow payment tokenization is now complete and verified.

## 🎯 What Was Implemented

### Phase 1: Infrastructure (Completed ✅)

- ✅ Database migrations for tokenization columns
- ✅ Paymob configuration (Intention API + MOTO)
- ✅ PaymobService extended with 3 new APIs
- ✅ PaymentDecisionService with business rules
- ✅ Model updates (PaymentMethod + PaymobPayment)

### Phase 2: Controller Integration (Completed ✅)

- ✅ Dual-flow routing in `initiatePayment()`
- ✅ MOTO handler for one-click payments
- ✅ Unified Checkout handler for 3DS + tokenization
- ✅ Classic flow fallback for backward compatibility
- ✅ Payment status polling endpoint
- ✅ Webhook token extraction updated

## 🔄 Payment Flow Decision Tree

```
User clicks "Pay Now"
     |
     v
Is it a WALLET payment?
     |
     +--YES--> Classic Iframe Flow (no changes)
     |
     +--NO---> Is it a CARD payment?
                    |
                    v
               Dual-flow enabled in config?
                    |
                    +--NO--> Classic Iframe Flow
                    |
                    +--YES--> Has saved card?
                                   |
                                   +--NO--> Unified Checkout (3DS + Save Token)
                                   |
                                   +--YES--> Check business rules:
                                                  |
                                                  +-- High value (>2000 EGP)? --> Unified Checkout
                                                  +-- Recent failures (≥2)? --> Unified Checkout
                                                  +-- Card expired? --> Unified Checkout
                                                  +-- Otherwise --> MOTO (One-Click)
                                                                      |
                                                                      +-- Success? --> Done ✅
                                                                      +-- Requires 3DS? --> Fallback to Unified Checkout
```

## 📝 Testing Scenarios

### Scenario 1: First Payment (New User)

**Expected Flow:** Unified Checkout with tokenization

```bash
POST /api/v1/payments/paymob/initiate
{
  "order_id": 123,
  "payment_method": "CARD",
  "save_card": true,
  "billing_data": { ... }
}
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "payment_id": 456,
        "flow": "unified_3ds",
        "redirect_url": "https://accept.paymob.com/unifiedcheckout/?publicKey=...",
        "amount": 150.0,
        "currency": "EGP"
    }
}
```

**What Happens:**

1. Backend creates Paymob Intention
2. Returns Unified Checkout URL
3. User enters card in WebView
4. Completes 3DS authentication
5. Paymob webhook fires with token object
6. Backend saves token to `payment_methods.paymob_card_token`

**Verification:**

```sql
-- Check payment record
SELECT id, flow, paymob_intention_id, status
FROM paymob_payments
WHERE id = 456;

-- Check saved card (after webhook)
SELECT id, user_id, last4, card_brand, paymob_card_token, status, token_type
FROM payment_methods
WHERE user_id = [USER_ID]
ORDER BY created_at DESC LIMIT 1;
```

---

### Scenario 2: Low-Value Repeat Payment (<2000 EGP)

**Expected Flow:** MOTO (one-click, no user interaction)

```bash
POST /api/v1/payments/paymob/initiate
{
  "order_id": 124,
  "payment_method": "CARD",
  "payment_method_id": 10,  // <-- Saved card ID
  "billing_data": { ... }
}
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "payment_id": 457,
        "flow": "moto",
        "status": "processing",
        "message": "Payment processing with saved card",
        "amount": 89.99,
        "currency": "EGP"
    }
}
```

**What Happens:**

1. Backend calls `PaymentDecisionService::decidePaymentFlow()`
2. Decision: "moto" (low value + no fraud flags)
3. Backend calls `PaymobService::payWithSavedCardMoto()`
4. Payment succeeds server-to-server (no redirect)
5. User sees success immediately

**Verification:**

```sql
SELECT id, flow, moto_attempts, is_fallback_from_moto, status, paymob_transaction_id
FROM paymob_payments
WHERE id = 457;

-- Expected: flow='moto', moto_attempts=1, status='PAID'
```

---

### Scenario 3: High-Value Payment (>2000 EGP) with Saved Card

**Expected Flow:** Unified Checkout (force 3DS for security)

```bash
POST /api/v1/payments/paymob/initiate
{
  "order_id": 125,
  "payment_method": "CARD",
  "payment_method_id": 10,
  "billing_data": { ... }
}
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "payment_id": 458,
        "flow": "unified_3ds",
        "redirect_url": "https://accept.paymob.com/unifiedcheckout/?publicKey=...",
        "amount": 2500.0,
        "currency": "EGP"
    }
}
```

**What Happens:**

1. Decision service detects high value
2. Routes to Unified Checkout instead of MOTO
3. Saved card is pre-filled in UI
4. User completes 3DS authentication
5. Payment succeeds with extra security

**Logs to Check:**

```
💡 Payment flow decision made
  flow: unified_3ds
  reason: High-value order requires 3DS authentication (2500.00 >= 2000.00 EGP threshold)
```

---

### Scenario 4: MOTO Requires 3DS (Bank Mandate)

**Expected Flow:** MOTO → Fallback to Unified Checkout

**What Happens:**

1. Backend attempts MOTO
2. Paymob returns `use_redirection: true` (bank requires 3DS)
3. Backend automatically calls `initiateUnifiedCheckout()` with same card
4. Returns redirect URL to frontend
5. User completes 3DS challenge
6. Payment succeeds

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "payment_id": 459,
        "flow": "unified_3ds",
        "redirect_url": "https://accept.paymob.com/unifiedcheckout/...",
        "amount": 150.0,
        "currency": "EGP"
    }
}
```

**Verification:**

```sql
SELECT id, flow, moto_attempts, is_fallback_from_moto, paymob_intention_id
FROM paymob_payments
WHERE id = 459;

-- Expected: flow='unified_3ds', moto_attempts=1, is_fallback_from_moto=1
```

**Logs to Check:**

```
💳 MOTO: Attempting one-click payment
⚠️ MOTO: 3DS required, falling back to Unified Checkout
🔐 Unified Checkout: Creating Intention
```

---

### Scenario 5: Wallet Payment (No Changes)

**Expected Flow:** Classic iframe (existing behavior)

```bash
POST /api/v1/payments/paymob/initiate
{
  "order_id": 126,
  "payment_method": "WALLET",
  "billing_data": { ... }
}
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "payment_id": 460,
        "flow": "classic_iframe",
        "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/...",
        "amount": 200.0,
        "currency": "EGP"
    }
}
```

---

## 🔍 Monitoring & Debugging

### Key Log Messages

**Decision Tree:**

```
💡 Payment flow decision made
  order_id: 123
  flow: moto | unified_3ds | classic_iframe
  reason: [Business rule explanation]
  has_saved_card: true/false
```

**MOTO Success:**

```
💳 MOTO: Attempting one-click payment
✅ MOTO: Payment successful
  payment_id: 457
  transaction_id: 12345678
```

**MOTO Fallback:**

```
💳 MOTO: Attempting one-click payment
⚠️ MOTO: 3DS required, falling back to Unified Checkout
🔐 Unified Checkout: Creating Intention
```

**Token Extraction:**

```
✅ Card token extracted from Intention webhook
  token_preview: 3860b03322...
  last4: 4242
  brand: visa
```

### Database Queries

**Check Payment Flows Distribution:**

```sql
SELECT flow, COUNT(*) as count,
       SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as successful
FROM paymob_payments
WHERE created_at >= NOW() - INTERVAL 7 DAY
GROUP BY flow;
```

**Check MOTO Success Rate:**

```sql
SELECT
  COUNT(*) as total_moto_attempts,
  SUM(CASE WHEN status = 'PAID' AND NOT is_fallback_from_moto THEN 1 ELSE 0 END) as direct_success,
  SUM(CASE WHEN is_fallback_from_moto THEN 1 ELSE 0 END) as fell_back_to_3ds,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
FROM paymob_payments
WHERE flow = 'moto' OR is_fallback_from_moto = 1;
```

**Check Saved Cards:**

```sql
SELECT
  status,
  token_type,
  COUNT(*) as count,
  COUNT(CASE WHEN paymob_card_token IS NOT NULL THEN 1 END) as with_token
FROM payment_methods
GROUP BY status, token_type;
```

**Check Token Encryption:**

```sql
-- This should show encrypted data (gibberish)
SELECT id, paymob_card_token, last4
FROM payment_methods
WHERE status = 'active' LIMIT 1;

-- To decrypt in code:
-- $card = PaymentMethod::find(1);
-- $decrypted = $card->paymob_card_token; // Auto-decrypted by accessor
```

---

## 🧪 Manual Testing Steps

### 1. Test Tokenization (First Payment)

```bash
# Create an order
POST /api/v1/orders
{
  "items": [...],
  "delivery_address_id": 123
}

# Initiate payment with save_card=true
POST /api/v1/payments/paymob/initiate
{
  "order_id": <ORDER_ID>,
  "payment_method": "CARD",
  "save_card": true,
  "billing_data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+201234567890",
    "city": "Cairo",
    "street": "123 Test St"
  }
}

# Open the redirect_url in browser/WebView
# Complete payment with test card: 4242424242424242
# Wait for webhook callback

# Check if token saved
GET /api/v1/payment-methods
# Should see new card with last4=4242
```

### 2. Test MOTO (Repeat Payment)

```bash
# Create another order (low value <2000 EGP)
POST /api/v1/orders
{
  "items": [{"product_id": 1, "quantity": 1}],  # Total: ~100 EGP
  "delivery_address_id": 123
}

# Initiate with saved card
POST /api/v1/payments/paymob/initiate
{
  "order_id": <ORDER_ID>,
  "payment_method": "CARD",
  "payment_method_id": <SAVED_CARD_ID>,
  "billing_data": { ... }
}

# Expected: Instant success, flow='moto', no redirect
# Check logs for "MOTO: Payment successful"
```

### 3. Test High-Value 3DS

```bash
# Create high-value order (>2000 EGP)
POST /api/v1/orders
{
  "items": [{"product_id": 5, "quantity": 10}],  # Total: ~2500 EGP
  "delivery_address_id": 123
}

# Initiate with saved card
POST /api/v1/payments/paymob/initiate
{
  "order_id": <ORDER_ID>,
  "payment_method": "CARD",
  "payment_method_id": <SAVED_CARD_ID>,
  "billing_data": { ... }
}

# Expected: Redirect URL returned, flow='unified_3ds'
# Logs should show: "High-value order requires 3DS authentication"
```

---

## 🔐 Security Verification

### 1. Token Encryption

```bash
# Check database directly
mysql -u root -p elbaraka -e "SELECT id, paymob_card_token FROM payment_methods LIMIT 1;"
# Should see encrypted data like: eyJpdiI6Ik...

# Laravel tinker
php artisan tinker
>>> $card = App\Models\PaymentMethod::first();
>>> $card->paymob_card_token; // Should auto-decrypt to real token
```

### 2. HMAC Verification

```bash
# Monitor webhook logs
tail -f storage/logs/laravel.log | grep "HMAC"

# Should see on every webhook:
# ✅ HMAC signature verified
# NOT: ❌ HMAC verification failed
```

### 3. Amount Validation

```bash
# Monitor callback processing
tail -f storage/logs/laravel.log | grep "Amount"

# Should never see:
# ❌ SECURITY: Amount mismatch detected
```

---

## 📊 Performance Metrics

**MOTO Benefits:**

- ⚡ **0 redirects** (vs 2 redirects in classic flow)
- ⚡ **~500ms payment time** (vs ~5-10s with user interaction)
- ⚡ **Better conversion** (no abandoned checkouts)

**Expected Success Rates:**

- MOTO direct success: **60-80%** (low-risk cards)
- MOTO fallback to 3DS: **15-30%** (bank requires 3DS)
- MOTO failure: **5-10%** (expired cards, fraud)

---

## 🚨 Troubleshooting

### Issue: "Card token not saved after payment"

**Check:**

1. Webhook received? `SELECT * FROM paymob_payments WHERE status='PAID' ORDER BY created_at DESC LIMIT 1;`
2. Webhook has token object? Check logs for "has_token_object: true"
3. Token extraction succeeded? Check logs for "Card token extracted from Intention webhook"
4. Database column exists? `SHOW COLUMNS FROM payment_methods LIKE 'paymob_card_token';`

**Fix:**

```bash
# Ensure migrations run
php artisan migrate

# Check Paymob tokenization enabled
# Settings > Account > Features > Card on File: ENABLED
```

---

### Issue: "MOTO always fails"

**Check:**

1. Integration ID correct? `.env` has `PAYMOB_CARD_INTEGRATION_ID`
2. Card token valid? Check `payment_methods.status = 'active'`
3. Paymob MOTO enabled? Contact Paymob support

**Debug:**

```bash
# Check MOTO response
tail -f storage/logs/laravel.log | grep "MOTO"

# Look for:
# ❌ MOTO: Payment failed
#   error: [Paymob error message]
```

---

### Issue: "Decision service routing to wrong flow"

**Check Business Rules:**

```bash
# Enable verbose logging
tail -f storage/logs/laravel.log | grep "Payment flow decision"

# Should show:
# flow: moto | unified_3ds
# reason: [Clear explanation]
```

**Adjust Thresholds:**
Edit `backend/config/payments.php`:

```php
'high_value_threshold_egp' => 2000.0,  // Adjust this
'moto_max_attempts' => 2,
'recent_failures_window_days' => 30,
```

---

## 📱 Frontend Integration (Next Steps)

### Polling Implementation

```typescript
// In payment WebView screen
const pollPaymentStatus = async (paymentId: number) => {
    const maxAttempts = 30; // 60 seconds (2s intervals)
    let attempts = 0;

    const interval = setInterval(async () => {
        try {
            const response = await fetch(
                `/api/v1/payments/status/${paymentId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );

            const data = await response.json();

            if (data.data.status === "PAID") {
                clearInterval(interval);
                navigation.navigate("OrderSuccess", {
                    orderId: data.data.order_id,
                });
            }

            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                showError("Payment verification timeout");
            }
        } catch (error) {
            console.error("Polling error:", error);
        }
    }, 2000);
};
```

### MOTO Flow (No Redirect)

```typescript
const handlePayment = async () => {
    const response = await initiatePayment(orderId, savedCardId);

    if (response.data.flow === "moto") {
        // No redirect needed, start polling immediately
        pollPaymentStatus(response.data.payment_id);
        showLoader("Processing payment...");
    } else {
        // Unified Checkout - open WebView
        openWebView(response.data.redirect_url);
        pollPaymentStatus(response.data.payment_id); // Poll in background
    }
};
```

---

## ✅ Verification Checklist

Run this before going to production:

```bash
# 1. Run verification script
php verify_tokenization.php

# 2. Check all tests pass
vendor/bin/phpunit tests/Feature/PaymentTest.php

# 3. Verify .env configuration
grep "PAYMOB_" .env | grep -v "^#"

# 4. Check database migrations
php artisan migrate:status | grep paymob

# 5. Test each flow manually
# [ ] First payment with save_card=true
# [ ] Repeat payment with MOTO
# [ ] High-value payment with 3DS
# [ ] Wallet payment (no changes)

# 6. Monitor production logs for 24 hours
tail -f storage/logs/laravel.log | grep -E "MOTO|Unified|Decision"
```

---

## 📞 Support

**Paymob Documentation:**

- Intention API: https://docs.paymob.com/docs/intention-api
- MOTO API: https://docs.paymob.com/docs/moto-payments
- Tokenization: https://docs.paymob.com/docs/card-on-file

**Internal Contacts:**

- Backend Lead: Check payment flow logic
- DevOps: Ensure webhook URL accessible
- QA: Run test scenarios above

**Common Paymob Errors:**

- `DECLINED`: Bank declined card
- `INSUFFICIENT_FUNDS`: Low balance
- `3DS_REQUIRED`: MOTO fallback triggered (expected behavior)
- `INVALID_TOKEN`: Card token expired/revoked

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ First payments save tokens to `payment_methods.paymob_card_token`
2. ✅ Repeat payments complete in <1 second (MOTO)
3. ✅ Logs show "💡 Payment flow decision made" with correct reasoning
4. ✅ No "❌ HMAC verification failed" errors
5. ✅ High-value orders route to Unified Checkout
6. ✅ Database shows mix of flows: `moto`, `unified_3ds`, `classic_iframe`
7. ✅ Users report "instant payment" experience for saved cards

---

**Implementation Status:** 🟢 COMPLETE (Backend)  
**Remaining:** 🟡 Frontend polling integration  
**Estimated Effort:** 2-3 hours (frontend only)
