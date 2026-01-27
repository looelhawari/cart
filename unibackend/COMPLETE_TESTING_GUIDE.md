# Complete Payment Testing Setup - Production-Ready Flow

## ✅ Current Status (Verified)

- ✅ ngrok running: `https://eda0fc6b3e9d.ngrok-free.app` → `http://localhost:8000`
- ✅ Laravel backend running on port 8000
- ✅ HMAC secret configured in `.env`

---

## 🚨 CRITICAL STEPS - Do These Now

### Step 1: Configure Paymob Webhook URL ⚠️ REQUIRED

**You MUST configure this in Paymob dashboard:**

1. **Login to Paymob Dashboard:**
    - Go to: https://accept.paymob.com/portal2/en/login (or sandbox URL)
    - Login with your credentials

2. **Navigate to Webhooks:**
    - Dashboard → Settings → Webhooks
    - OR: Integration Settings → Webhooks

3. **Set Webhook URL:**

    ```
    Transaction Processed Callback:
    https://eda0fc6b3e9d.ngrok-free.app/api/v1/paymob/processed
    ```

4. **Save Changes**

**⚠️ Without this step, webhooks won't be delivered and payments will timeout!**

---

### Step 2: Verify Frontend API Configuration

**Check where your React Native app is calling:**

**Option A: Testing on Android Emulator (same machine as backend)**

- Frontend can use: `http://10.0.2.2:8000` (emulator alias for host)
- OR use ngrok URL: `https://eda0fc6b3e9d.ngrok-free.app`

**Option B: Testing on Physical Device**

- Frontend MUST use ngrok URL: `https://eda0fc6b3e9d.ngrok-free.app`
- Cannot use `localhost` (different network)

**To verify/update:**

```bash
# Check current API base URL
cd frontend
grep -r "baseURL\|BASE_URL\|API_URL" services/
```

**If using localhost, update to ngrok URL:**

File: `frontend/services/api/apiClient.ts` (or similar)

```typescript
// BEFORE (localhost - only works on emulator)
const API_BASE_URL = "http://localhost:8000/api/v1";

// AFTER (ngrok - works everywhere)
const API_BASE_URL = "https://eda0fc6b3e9d.ngrok-free.app/api/v1";
```

**Then rebuild app:**

```bash
cd frontend
npm start -- --reset-cache
```

---

### Step 3: Test ngrok Connection

**Verify ngrok is accessible:**

```powershell
# Test from another terminal
Invoke-WebRequest -Uri "https://eda0fc6b3e9d.ngrok-free.app/api/v1/health" -Method GET
```

**Expected:** Laravel responds (even if 404, means it's connected)

**If you get ngrok warning page:**

- This is normal for free ngrok
- Click "Visit Site" to continue
- Paymob webhooks will work fine

---

## 📋 Complete Pre-Flight Checklist

Before testing, verify ALL these:

### Backend

- [x] Laravel running on port 8000 ✅
- [x] HMAC secret configured ✅
- [x] ngrok tunnel active ✅
- [ ] **Paymob webhook URL configured** ⚠️ DO THIS NOW
- [ ] Database accessible
- [ ] `.env` has all Paymob credentials

### Frontend

- [ ] App built and running
- [ ] API base URL correct (localhost OR ngrok)
- [ ] Device/emulator can reach backend
- [ ] Test API call works

### Paymob Configuration

- [ ] **Webhook URL set to ngrok** ⚠️ CRITICAL
- [ ] Sandbox mode enabled (for testing)
- [ ] API keys correct in backend `.env`
- [ ] HMAC secret matches

---

## 🧪 Testing Flow (After Setup Complete)

### Test Case 1: Happy Path - Successful Payment ✅

**Steps:**

1. Open app
2. Add items to cart (Total: ~200 EGP)
3. Go to checkout
4. Select delivery address & time
5. Choose **Card Payment**
6. Place order → Note order ID from logs (e.g., Order #82)
7. Complete payment in Paymob with test card
8. See "Approved" screen in Paymob
9. **Wait 3-10 seconds**

**Expected Behavior:**

- ✅ "Processing payment..." appears
- ✅ Paymob sends webhook to ngrok
- ✅ ngrok forwards to Laravel
- ✅ Laravel logs: "🔔 Paymob webhook received"
- ✅ Database updated: `payment_status = 'completed'`
- ✅ Frontend polls and detects completion
- ✅ **Automatically navigates to success screen**
- ✅ Cart is cleared
- ✅ No timeout, no manual intervention!

**Verify:**

```bash
# Check Laravel logs
tail -20 storage/logs/laravel.log

# Should see:
# [INFO] 🔔 Paymob webhook received
# [INFO] ✅ Webhook processed successfully
```

```bash
# Check database
php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
\$o = DB::table('orders')->where('id', 82)->first();
\$p = DB::table('paymob_payments')->where('order_id', 82)->first();
echo 'Order: ' . \$o->status . ' / ' . \$o->payment_status . '\n';
echo 'Paymob: ' . \$p->status . ' (Txn: ' . \$p->transaction_id . ')\n';
"

# Expected:
# Order: confirmed / completed
# Paymob: PAID (Txn: 123456789)
```

---

### Test Case 2: Payment Failure ✅

**Steps:**

1. Place order
2. Use declined test card OR cancel payment
3. See "Failed" in Paymob

**Expected:**

- ✅ Webhook received for failure
- ✅ Order status: `failed`
- ✅ Payment status: `failed`
- ✅ Cart preserved (not cleared)
- ✅ User can retry

---

### Test Case 3: User Cancels Payment ✅

**Steps:**

1. Place order
2. Open Paymob payment
3. Click "Cancel" or close page

**Expected:**

- ✅ Frontend polls for 30 seconds
- ✅ Shows "Verifying Payment" timeout message
- ✅ User can retry or go back
- ✅ Cart preserved

---

### Test Case 4: Duplicate Webhook (Idempotency) ✅

**Automatic test** - Paymob sometimes sends webhooks twice.

**Expected:**

- ✅ First webhook: Processes successfully
- ✅ Second webhook: Returns 200 OK, no duplicate processing
- ✅ No double cart clearing
- ✅ No duplicate transactions

**Verify in logs:**

```
[INFO] 🔔 Paymob webhook received
[INFO] ✅ Webhook processed successfully
[INFO] 🔔 Paymob webhook received (duplicate)
[INFO] ℹ️  Idempotency: Already processed, returning success
```

---

### Test Case 5: Amount Mismatch (Security) ✅

**This is automatically validated** - if Paymob sends different amount than order total.

**Expected:**

- ✅ Webhook rejected with 400 error
- ✅ Order marked as failed (security violation)
- ✅ Logged as security issue

---

### Test Case 6: Cart Modification After Order ✅

**Steps:**

1. Add item to cart (100 EGP)
2. Place order → Creates order with total 128.50 EGP (with fees)
3. Before paying, modify cart in another session (add items → 500 EGP)
4. Complete payment for original order

**Expected:**

- ✅ Order total stays 128.50 EGP (snapshot preserved)
- ✅ Paymob charges 128.50 EGP (not 500)
- ✅ Payment completes successfully
- ✅ Cart cleared after payment

---

## 🐛 Troubleshooting

### Issue: Webhook Not Received

**Check:**

```bash
# 1. Verify ngrok is running
# Look for: Forwarding https://eda0fc6b3e9d.ngrok-free.app -> http://localhost:8000

# 2. Test ngrok endpoint
Invoke-WebRequest -Uri "https://eda0fc6b3e9d.ngrok-free.app/api/v1/health"

# 3. Check Laravel logs
tail -f storage/logs/laravel.log
# Should see webhook logs after payment
```

**Solutions:**

- ✅ Verify Paymob webhook URL is correct
- ✅ Make sure ngrok didn't restart (URL changes on free plan)
- ✅ Check Laravel is running on port 8000
- ✅ Verify HMAC secret is correct

---

### Issue: Frontend Can't Reach Backend

**Symptoms:**

- API calls fail
- Can't place order
- Network errors

**Check:**

```bash
# From your computer (where frontend runs)
curl https://eda0fc6b3e9d.ngrok-free.app/api/v1/health

# OR
Invoke-WebRequest -Uri "https://eda0fc6b3e9d.ngrok-free.app/api/v1/health"
```

**Solutions:**

- ✅ Update frontend API base URL to ngrok URL
- ✅ Rebuild React Native app
- ✅ Clear cache: `npm start -- --reset-cache`

---

### Issue: HMAC Verification Failed

**Logs show:**

```
[ERROR] 🚫 SECURITY: Invalid HMAC signature
```

**Solutions:**

- ✅ Verify HMAC secret in `.env` matches Paymob dashboard
- ✅ Check no extra spaces in `.env` file
- ✅ Restart Laravel after changing `.env`

---

### Issue: Polling Continues After Payment

**Check:**

1. Did webhook arrive?

    ```bash
    tail -20 storage/logs/laravel.log | grep webhook
    ```

2. Check database status:
    ```bash
    php check_order_82.php  # Replace with your order ID
    ```

**If webhook arrived but status still PENDING:**

- ✅ Check for errors in Laravel logs
- ✅ Verify database transaction committed
- ✅ Check HMAC verification passed

**If webhook didn't arrive:**

- ✅ Verify Paymob webhook URL configured
- ✅ Check ngrok is running
- ✅ Test ngrok endpoint accessibility

---

## ✅ Success Criteria (All Must Pass)

### Automated Webhook Flow

- [ ] Place order → Payment approved → Webhook arrives within 10 seconds
- [ ] No manual `php test_complete.php` needed
- [ ] Frontend automatically detects completion
- [ ] Navigates to success screen
- [ ] Cart cleared

### All Test Scenarios Pass

- [ ] Happy path: Payment succeeds
- [ ] Failure: Payment declined, cart preserved
- [ ] Cancellation: User can retry
- [ ] Idempotency: Duplicate webhooks handled safely
- [ ] Security: Amount mismatches rejected
- [ ] Snapshot: Cart changes don't affect order total

### Production Readiness

- [ ] No test endpoints used (`test_complete.php` not needed)
- [ ] Real webhook delivery tested
- [ ] HMAC verification working
- [ ] Error handling tested
- [ ] Logs show clear webhook processing

---

## 🎯 Next Steps

### 1. Configure Paymob Webhook NOW ⚠️

```
URL: https://eda0fc6b3e9d.ngrok-free.app/api/v1/paymob/processed
```

### 2. Update Frontend API URL (if needed)

```typescript
const API_BASE_URL = "https://eda0fc6b3e9d.ngrok-free.app/api/v1";
```

### 3. Run Complete Test

```bash
# 1. Start Laravel
cd backend
php artisan serve

# 2. Start ngrok (already running ✅)
# https://eda0fc6b3e9d.ngrok-free.app

# 3. Start React Native
cd frontend
npm start

# 4. Place order and test!
```

### 4. Monitor Logs

```bash
# Terminal 1: Laravel logs
cd backend
tail -f storage/logs/laravel.log

# Terminal 2: Watch for webhook
# You should see:
# [INFO] 🔔 Paymob webhook received
# [INFO] ✅ Webhook processed successfully
```

---

## 🎉 When Everything Works

You'll see this beautiful flow:

```
Place Order
    ↓
Complete Payment (Paymob shows "Approved")
    ↓
"Processing payment..." (3-10 seconds)
    ↓
Webhook arrives → Laravel logs: 🔔 Webhook received
    ↓
Database updated → payment_status = 'completed'
    ↓
Frontend detects completion
    ↓
✅ Navigate to Success Screen
    ↓
🎊 Order confirmed, cart cleared!
```

**No manual intervention. No timeouts. Just works!** 🚀

---

## ⚠️ Remember

- **ngrok URL changes** when you restart ngrok (free plan)
- **Update Paymob webhook** if ngrok URL changes
- **Remove test endpoint** (`test_complete.php` route) before production
- **Use real domain** in production (not ngrok)

---

## Status

- ✅ Backend ready
- ✅ ngrok running
- ⚠️ **CONFIGURE PAYMOB WEBHOOK** ← Do this now!
- ⚠️ Verify frontend API URL
- 🧪 Ready to test after webhook configured

Once you configure the Paymob webhook URL, you're 100% ready to test the complete production-like payment flow! 🎯
