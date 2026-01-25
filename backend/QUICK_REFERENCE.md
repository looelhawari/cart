# 🚀 Tokenization Quick Reference

## API Endpoints

### Initiate Payment (Dual-Flow)

```bash
POST /api/v1/payments/paymob/initiate
Authorization: Bearer {token}

{
  "order_id": 123,
  "payment_method": "CARD",
  "payment_method_id": 10,      // Optional: Saved card ID
  "save_card": true,             // Optional: Save for future use
  "billing_data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+201234567890",
    "city": "Cairo",
    "street": "123 Test St"
  }
}

# Response (MOTO - Instant):
{
  "success": true,
  "data": {
    "payment_id": 456,
    "flow": "moto",
    "status": "processing",
    "message": "Payment processing with saved card",
    "amount": 150.00,
    "currency": "EGP"
  }
}

# Response (Unified Checkout - Redirect):
{
  "success": true,
  "data": {
    "payment_id": 457,
    "flow": "unified_3ds",
    "redirect_url": "https://accept.paymob.com/unifiedcheckout/...",
    "amount": 150.00,
    "currency": "EGP"
  }
}
```

### Check Payment Status (Polling)

```bash
GET /api/v1/payments/status/{paymentId}
Authorization: Bearer {token}

# Response:
{
  "success": true,
  "data": {
    "payment_id": 456,
    "order_id": 123,
    "status": "PAID",
    "transaction_id": "12345678",
    "amount": 150.00,
    "currency": "EGP",
    "flow": "moto",
    "updated_at": "2026-01-24T15:30:00Z"
  }
}
```

---

## Payment Flows

### Flow 1: MOTO (One-Click)

**When:** Low-value (<2000 EGP), saved card, no fraud flags  
**Duration:** <500ms  
**User Experience:** Instant, no redirect

```
User → Backend → Paymob MOTO API → ✅ Success (or fallback)
```

### Flow 2: Unified Checkout (3DS + Token)

**When:** First payment, high-value, or MOTO fallback  
**Duration:** 5-10s (user interaction)  
**User Experience:** Card entry + 3DS challenge

```
User → Backend → Intention API → WebView → 3DS → Webhook → ✅ Token Saved
```

### Flow 3: Classic Iframe (Legacy)

**When:** Wallet payments or features disabled  
**Duration:** 8-12s  
**User Experience:** Traditional flow

```
User → Backend → Payment Key → Iframe → Webhook → ✅ Done
```

---

## Decision Tree Quick Lookup

| Scenario                       | Flow        | Reason                      |
| ------------------------------ | ----------- | --------------------------- |
| First payment, save_card=true  | Unified 3DS | Need to tokenize card       |
| Saved card, order <2000 EGP    | MOTO        | Low risk, one-click         |
| Saved card, order ≥2000 EGP    | Unified 3DS | High value = force 3DS      |
| Saved card, ≥2 recent failures | Unified 3DS | Fraud protection            |
| Saved card, expired            | Unified 3DS | Need new card               |
| MOTO declined (3DS required)   | Unified 3DS | Bank mandate fallback       |
| Wallet payment                 | Classic     | No tokenization for wallets |
| Features disabled              | Classic     | Feature flag override       |

---

## Configuration (.env)

```bash
# Required for dual-flow
PAYMOB_PUBLIC_KEY=egy_pk_test_tFW9GU55s3VuNt1MCYmpUiPHjWcpJoX6
PAYMOB_INTEGRATION_ID_3DS=5084815

# Feature flags
PAYMENT_ENABLE_MOTO=true
PAYMENT_ENABLE_SAVED_CARDS=true
PAYMENT_ENABLE_UNIFIED_CHECKOUT=true

# Business rules (config/payments.php)
PAYMENT_HIGH_VALUE_THRESHOLD=2000.0
PAYMENT_MOTO_MAX_ATTEMPTS=2
PAYMENT_RECENT_FAILURES_WINDOW_DAYS=30
```

---

## Database Quick Queries

### Check Active Saved Cards

```sql
SELECT id, user_id, last4, card_brand, status, created_at
FROM payment_methods
WHERE status = 'active' AND paymob_card_token IS NOT NULL
ORDER BY created_at DESC;
```

### Check Payment Flow Distribution

```sql
SELECT
  flow,
  COUNT(*) as total,
  SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as success_rate
FROM paymob_payments
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY flow;
```

### Check MOTO Fallback Rate

```sql
SELECT
  COUNT(*) as total_moto,
  SUM(is_fallback_from_moto) as fell_back,
  ROUND(SUM(is_fallback_from_moto) / COUNT(*) * 100, 2) as fallback_rate
FROM paymob_payments
WHERE flow IN ('moto', 'unified_3ds') AND moto_attempts > 0;
```

---

## Testing Commands

### Run Verification

```bash
php verify_tokenization.php
```

### Check Syntax

```bash
php -l app/Http/Controllers/Api/PaymentController.php
php -l app/Services/PaymobService.php
php -l app/Services/PaymentDecisionService.php
```

### List Routes

```bash
php artisan route:list --path=payments
```

### Monitor Logs

```bash
# All payment activity
tail -f storage/logs/laravel.log | grep -E "MOTO|Unified|Decision"

# MOTO specific
tail -f storage/logs/laravel.log | grep "MOTO"

# Token extraction
tail -f storage/logs/laravel.log | grep "token"

# HMAC verification
tail -f storage/logs/laravel.log | grep "HMAC"
```

---

## Common Log Messages

### ✅ Success Indicators

```
💡 Payment flow decision made
  flow: moto
  reason: Low-value order with saved card, no risk factors

💳 MOTO: Attempting one-click payment
✅ MOTO: Payment successful
  transaction_id: 12345678

✅ Card token extracted from Intention webhook
  token_preview: 3860b03322...
  last4: 4242
  brand: visa
```

### ⚠️ Warning (Expected)

```
⚠️ MOTO: 3DS required, falling back to Unified Checkout
  payment_id: 456

⚠️ Inactive saved card attempted
  status: expired
```

### ❌ Errors (Investigate)

```
❌ MOTO: Payment failed
  error: DECLINED

❌ SECURITY: Amount mismatch detected
  expected: 10000
  received: 5000

❌ HMAC verification failed
```

---

## Paymob Test Cards

| Card Number         | 3DS | Expected Result       |
| ------------------- | --- | --------------------- |
| 4242 4242 4242 4242 | No  | ✅ Success            |
| 4000 0027 6000 3184 | Yes | ✅ Success with 3DS   |
| 4000 0000 0000 0002 | No  | ❌ Declined           |
| 4000 0000 0000 9995 | No  | ❌ Insufficient funds |

**CVV:** Any 3 digits  
**Expiry:** Any future date  
**3DS Password:** Paymob

---

## Key Files Reference

| File                         | Purpose                 | Lines |
| ---------------------------- | ----------------------- | ----- |
| `PaymentController.php`      | Orchestration + routing | 1429  |
| `PaymobService.php`          | API client wrapper      | 845   |
| `PaymentDecisionService.php` | Business rules          | 200   |
| `PaymentMethod.php`          | Saved card model        | 287   |
| `PaymobPayment.php`          | Payment tracking        | 147   |
| `payments.php`               | Configuration           | 50    |

---

## Troubleshooting Checklist

**Card Not Saving:**

- [ ] Tokenization enabled in Paymob dashboard?
- [ ] Webhook received? Check `paymob_payments` table
- [ ] Logs show "has_token_object: true"?
- [ ] `paymob_card_token` column exists?

**MOTO Always Fails:**

- [ ] Correct integration ID in .env?
- [ ] Card status = 'active'?
- [ ] MOTO enabled in Paymob account?
- [ ] Check logs for Paymob error message

**Wrong Flow Selected:**

- [ ] Check logs: "Payment flow decision made"
- [ ] Verify business rules in `config/payments.php`
- [ ] Test with different order amounts
- [ ] Check user's recent payment history

**Webhook Not Firing:**

- [ ] URL accessible from internet (not localhost)?
- [ ] HMAC verification passing?
- [ ] Check Paymob dashboard → Settings → Webhooks
- [ ] Use ngrok for local testing

---

## Frontend Integration Snippet

```typescript
// Initiate payment
const response = await api.post('/payments/paymob/initiate', {
  order_id: orderId,
  payment_method: 'CARD',
  payment_method_id: savedCardId, // or null for new card
  save_card: true,
  billing_data: { ... }
});

// Check flow
if (response.data.flow === 'moto') {
  // Instant payment, poll for result
  pollPaymentStatus(response.data.payment_id);
  showLoader('Processing payment...');
} else {
  // Redirect to Unified Checkout
  openWebView(response.data.redirect_url);
  pollPaymentStatus(response.data.payment_id); // Poll in background
}

// Polling function
const pollPaymentStatus = async (paymentId) => {
  const interval = setInterval(async () => {
    const status = await api.get(`/payments/status/${paymentId}`);

    if (status.data.status === 'PAID') {
      clearInterval(interval);
      navigation.navigate('OrderSuccess', { orderId });
    }
  }, 2000); // Poll every 2 seconds
};
```

---

## Production Deployment Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Set production Paymob keys
- [ ] Update `PAYMOB_CALLBACK_URL` to production webhook URL
- [ ] Run migrations: `php artisan migrate --force`
- [ ] Clear cache: `php artisan config:clear && php artisan cache:clear`
- [ ] Test with Paymob production cards
- [ ] Enable tokenization in Paymob production dashboard
- [ ] Monitor logs for first 24 hours
- [ ] Set up alerts for HMAC failures
- [ ] Document customer support procedures

---

**Need Help?** Check `TOKENIZATION_TESTING_GUIDE.md` for detailed scenarios.
