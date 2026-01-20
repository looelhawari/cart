# Paymob Payment Integration - Testing Guide

## ✅ Implementation Complete

The Paymob payment gateway integration is now fully implemented and ready for testing.

## 🔧 Prerequisites

### 1. Backend Setup

Ensure the following are complete:

```bash
# 1. Database migration (creates paymob_payments table)
cd backend
php artisan migrate

# 2. Verify .env has Paymob credentials
cat .env | grep PAYMOB
```

Expected output:

```
PAYMOB_API_KEY=ZXlKaGJHY2lP...
PAYMOB_HMAC_SECRET=3B7D14636C7FBAE5D45EC797AEDF8F15
PAYMOB_IFRAME_ID=919973
PAYMOB_CARD_INTEGRATION_ID=5084814
PAYMOB_WALLET_INTEGRATION_ID=5084831
```

### 2. Frontend Setup

```bash
# 1. Install react-native-webview package
cd frontend
npx expo install react-native-webview

# 2. Verify package installed
cat package.json | grep react-native-webview
```

### 3. Start Both Servers

```bash
# Terminal 1: Backend server
cd backend
php artisan serve

# Terminal 2: Frontend app
cd frontend
npx expo start
```

---

## 📱 Testing Flow

### Step 1: Create an Order

1. **Add products to cart**
2. **Go to checkout**
3. **Select delivery address**
4. **Select delivery date/time**
5. **Choose payment method: "Credit/Debit Card"**
6. **Review and place order**

### Step 2: Payment Initiation

When you tap "Place Order":

✅ **Expected Behavior:**

- Order is created in database
- Backend calls Paymob API (3-step flow)
- Payment record created with status `PENDING`
- App navigates to `/payment` screen
- WebView loads Paymob iframe

⚠️ **Watch For:**

- Loading indicator appears
- No errors in console
- WebView displays payment form

### Step 3: Payment Form

**Test Card Details (Paymob Sandbox):**

```
Card Number: 4987654321098769
CVV: 123
Expiry: Any future date (e.g., 12/25)
Cardholder Name: Test User
```

✅ **Expected Behavior:**

- Form accepts test card details
- "Pay Now" button is enabled
- No validation errors

### Step 4: Payment Processing

After clicking "Pay Now":

✅ **Expected Backend Flow:**

1. **Paymob processes payment**
2. **Paymob sends callback to: `POST /api/v1/paymob/processed`**
3. **Backend verifies HMAC signature**
4. **Payment status updated: `PENDING` → `PAID`**
5. **Order status updated**

Check Laravel logs:

```bash
tail -f backend/storage/logs/laravel.log
```

Look for:

```
Paymob processed callback received
HMAC verification: passed
Payment marked as PAID
```

✅ **Expected Frontend Flow:**

1. **WebView detects redirect to `/payment/response`**
2. **Frontend waits 3 seconds (for backend callback)**
3. **Frontend polls: `GET /api/v1/payments/order/{orderId}/status`**
4. **Status returned: `PAID`**
5. **Success alert shown**
6. **Cart cleared**
7. **Navigate to order success screen**

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Successful Payment

**Steps:**

1. Complete checkout with card payment
2. Enter test card: `4987654321098769`
3. Complete payment
4. Wait for success message

**Expected:**

- Payment status: `PAID`
- Order status updated
- Cart cleared
- Redirected to order success
- Payment record in database

**Verify Database:**

```sql
-- Check payment record
SELECT * FROM paymob_payments WHERE order_id = [ORDER_ID];

-- Should show:
-- status: PAID
-- paymob_transaction_id: [NUMBER]
-- amount_cents: [ORDER TOTAL × 100]
-- payment_method: CARD

-- Check order
SELECT * FROM orders WHERE id = [ORDER_ID];

-- Should show:
-- payment_status: paid
```

---

### ❌ Scenario 2: Failed Payment

**Steps:**

1. Start payment flow
2. Cancel or close payment iframe
3. Observe behavior

**Expected:**

- Payment status: `PENDING` (not updated)
- User can retry
- No cart cleared
- Error alert shown

---

### 🔄 Scenario 3: Network Error

**Steps:**

1. Turn off backend server mid-payment
2. Observe error handling

**Expected:**

- Error alert shown
- User returned to checkout
- Order remains unpaid
- Can retry later

---

## 🔍 Debugging

### Check Backend Logs

```bash
# Real-time log monitoring
tail -f backend/storage/logs/laravel.log

# Check for errors
grep ERROR backend/storage/logs/laravel.log
```

### Check Payment Status API

```bash
# Test payment status endpoint
curl -X GET \
  http://localhost:8000/api/v1/payments/order/[ORDER_ID]/status \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -H "Accept: application/json"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "status": "PAID",
    "payment_method": "CARD",
    "amount_egp": 150.0,
    "transaction_id": "12345678",
    "created_at": "2026-01-20T10:30:00Z"
  }
}
```

### Test Paymob Callback Manually

```bash
# Simulate Paymob callback (for testing)
curl -X POST \
  http://localhost:8000/api/v1/paymob/processed \
  -H "Content-Type: application/json" \
  -d '{
    "obj": {
      "order": {
        "id": [PAYMOB_ORDER_ID],
        "merchant_order_id": "ORD-[NUMBER]"
      },
      "amount_cents": 15000,
      "success": true,
      "id": [TRANSACTION_ID],
      "pending": false
    },
    "hmac": "[CALCULATED_HMAC]"
  }'
```

**Note:** You need to calculate the correct HMAC for this to work.

---

## 🎯 Payment Methods

### Online Card Payment (MIGS)

**Integration ID:** `5084814`

**Test Card:**

```
Card: 4987654321098769
CVV: 123
Expiry: 12/25
```

**Use Case:** Credit/debit card payments

---

### Mobile Wallet (Optional)

**Integration ID:** `5084831`

**Test Wallet:** Use Paymob sandbox wallet

**To Enable:**

1. Update `confirmation.tsx`:
   ```typescript
   payment_method: "WALLET"; // Instead of "CARD"
   ```

---

## 🚨 Common Issues

### Issue 1: "HMAC verification failed"

**Cause:** HMAC secret mismatch or incorrect data

**Fix:**

1. Verify `PAYMOB_HMAC_SECRET` in `.env`
2. Check secret matches Paymob dashboard
3. Ensure no extra spaces in `.env`

---

### Issue 2: Payment stuck in "PENDING"

**Cause:** Callback not received or failed

**Fix:**

1. Check Laravel logs for callback
2. Verify callback URL is accessible
3. Check HMAC verification passed
4. Ensure order exists in database

---

### Issue 3: WebView not loading

**Cause:** react-native-webview not installed

**Fix:**

```bash
cd frontend
npx expo install react-native-webview
```

---

### Issue 4: "Order not found"

**Cause:** Order ID mismatch

**Fix:**

1. Check order created successfully
2. Verify order ID passed to payment
3. Check database for order record

---

## 📊 Database Verification

### Check Payment Records

```sql
-- All payments
SELECT * FROM paymob_payments ORDER BY created_at DESC LIMIT 10;

-- Payments by status
SELECT status, COUNT(*) FROM paymob_payments GROUP BY status;

-- Failed payments
SELECT * FROM paymob_payments WHERE status = 'FAILED';

-- Pending payments (older than 30 minutes)
SELECT * FROM paymob_payments
WHERE status = 'PENDING'
AND created_at < NOW() - INTERVAL 30 MINUTE;
```

### Check Order Payment Status

```sql
-- Orders with payment details
SELECT
  o.id,
  o.order_number,
  o.total,
  o.payment_status,
  p.status as payment_status,
  p.paymob_transaction_id,
  p.created_at as payment_date
FROM orders o
LEFT JOIN paymob_payments p ON o.id = p.order_id
WHERE o.payment_method = 'card'
ORDER BY o.created_at DESC;
```

---

## ✅ Success Checklist

Before going to production:

- [ ] Migration run successfully
- [ ] react-native-webview installed
- [ ] Backend server running
- [ ] Frontend app running
- [ ] Test card payment completes
- [ ] Success alert shown
- [ ] Cart cleared after payment
- [ ] Order status updated to paid
- [ ] Payment record created in database
- [ ] Callback logs appear in Laravel log
- [ ] HMAC verification passes
- [ ] WebView loads correctly
- [ ] Cancel payment works
- [ ] Error handling tested
- [ ] Network error handling tested

---

## 🎬 Ready for Production

Once all tests pass, update to **production credentials**:

1. **Get production credentials from Paymob dashboard**
2. **Update backend/.env:**
   ```env
   PAYMOB_API_KEY=[PRODUCTION_API_KEY]
   PAYMOB_HMAC_SECRET=[PRODUCTION_HMAC_SECRET]
   PAYMOB_IFRAME_ID=[PRODUCTION_IFRAME_ID]
   PAYMOB_CARD_INTEGRATION_ID=[PRODUCTION_CARD_ID]
   PAYMOB_WALLET_INTEGRATION_ID=[PRODUCTION_WALLET_ID]
   ```
3. **Test with real card (small amount)**
4. **Monitor for 24 hours**
5. **Enable for all users**

---

## 📞 Support

If you encounter issues:

1. Check Laravel logs: `backend/storage/logs/laravel.log`
2. Check browser console in WebView
3. Verify Paymob dashboard for transaction status
4. Check database for payment records
5. Consult `PAYMOB_INTEGRATION_COMPLETE.md` for detailed docs

---

## 🎉 Integration Complete!

Your Paymob payment gateway is now fully integrated and ready for testing. Follow this guide to verify everything works correctly.

**Payment Flow:**

1. User completes checkout
2. Order created → Payment initiated
3. WebView opens Paymob iframe
4. User enters card details
5. Paymob processes payment
6. Callback updates backend
7. Frontend polls status
8. Success → Cart cleared → Order success screen

Happy testing! 🚀
