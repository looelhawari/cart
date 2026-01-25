# 🧪 Complete Testing Guide - Dual-Flow Tokenization System

## 🚀 Quick Start Testing (5 minutes)

### Step 1: Start Backend

```powershell
cd backend
php artisan serve
# Backend running on http://127.0.0.1:8000
```

### Step 2: Start Frontend

```powershell
cd frontend
npm start
# or
npx expo start
```

### Step 3: Quick Test - MOTO Payment

1. **Open app** in Expo Go or simulator
2. **Add item** to cart
3. **Go to checkout** → Select payment method
4. **Select "Saved Cards"** (if you have any saved)
5. **Enter CVV**: `100`
6. **Click "Place Order"**

**Expected Result** ⚡:

- NO WebView appears
- Navigate directly to success screen
- Shows "Processing Payment..." (2-4 seconds)
- Updates to "Payment Confirmed!" ✅
- **Total time: ~5 seconds**

---

## 📋 Complete Test Scenarios

### Test 1: First-Time Card Payment (Unified Checkout + Tokenization)

**Goal**: Test 3DS authentication and card saving

**Steps**:

1. Add item to cart → Go to checkout
2. Select "New Card" payment method
3. Fill in test card:
   ```
   Card Number: 5123450000000008
   CVV: 100
   Expiry: 12/28
   ```
4. ✅ **Enable "Save this card"** toggle
5. Click "Place Order"

**Expected Flow**:

```
Place Order
  ↓
WebView opens (3DS authentication)
  ↓
Top banner shows: "Checking payment status..."
  ↓
Complete 3DS challenge
  ↓
Polling detects: "Status: PAID"
  ↓
Auto-navigate to success screen ✅
  ↓
Card saved to profile!
```

**What to Check**:

- ✅ WebView loads without errors
- ✅ Polling banner visible at top
- ✅ 3DS authentication completes
- ✅ Automatic redirect on success
- ✅ Card appears in "Saved Cards" list

**Console Logs to Watch**:

```javascript
[Confirmation] Flow type: unified_checkout
[PaymentWebView] Starting payment status polling...
[PaymentWebView] Payment status: PENDING
[PaymentWebView] Payment status: PAID
[PaymentWebView] ✅ Payment successful!
```

---

### Test 2: MOTO Instant Payment (Saved Card - THE FAST ONE!)

**Goal**: Test sub-5 second checkout

**Prerequisites**: Complete Test 1 first to have a saved card

**Steps**:

1. Add item to cart → Go to checkout
2. Select "Saved Cards" payment method
3. Select your previously saved card
4. Enter CVV: `100`
5. Click "Place Order"
6. **Start timer!** ⏱️

**Expected Flow**:

```
Place Order
  ↓
Immediate success screen (NO WebView!)
  ↓
Shows "Processing Payment..." with spinner
  ↓
Background polling (every 2 seconds)
  ↓
"Payment Confirmed!" appears (2-4 seconds)
  ↓
Total: ~5 seconds ✅
```

**What to Check**:

- ✅ NO WebView appears
- ✅ Success screen shows immediately
- ✅ Processing spinner visible
- ✅ Confirms within 5 seconds
- ✅ Green checkmark appears

**Console Logs to Watch**:

```javascript
[Confirmation] Flow type: moto
[Confirmation] Navigating to order-success with polling=true
[OrderSuccess] Starting payment status polling...
[OrderSuccess] Payment status: PENDING
[OrderSuccess] Payment status: PAID
[OrderSuccess] ✅ Payment confirmed!
```

**Performance Check**:

- ⚡ Total time should be: **3-5 seconds**
- Compare to old system: **Was 30-45 seconds**
- **Improvement: ~85% faster!**

---

### Test 3: MOTO Fallback to 3DS

**Goal**: Test automatic fallback when bank requires 3DS

**Note**: This happens automatically if the bank decides MOTO needs 3DS

**Steps**:

1. Use saved card
2. Backend detects 3DS requirement
3. System falls back to WebView

**Expected Flow**:

```
Place Order with saved card
  ↓
Backend: "MOTO declined, 3DS required"
  ↓
Response: { flow: "unified_checkout", redirect_url: "..." }
  ↓
WebView opens (same as Test 1)
  ↓
Complete 3DS → Success ✅
```

**What to Check**:

- ✅ Seamless transition from MOTO attempt to 3DS
- ✅ User doesn't see error
- ✅ WebView opens automatically
- ✅ Payment completes successfully

**Console Logs**:

```javascript
[Confirmation] Expected MOTO but got: unified_checkout
[Confirmation] Fallback to 3DS - navigating to WebView
```

---

### Test 4: Payment Failure Handling

**Goal**: Test error handling

**Steps**:

1. Use a card that will fail:
   ```
   Card: 5111111111111118
   CVV: 100
   Expiry: 12/28
   ```
2. Complete checkout process

**Expected for 3DS Flow**:

```
WebView opens
  ↓
Polling detects: "Status: FAILED"
  ↓
Alert: "Payment Failed"
  ↓
Navigate back to payment screen
```

**Expected for MOTO Flow**:

```
Success screen appears
  ↓
Polling detects: "Status: FAILED"
  ↓
Shows error icon ❌
  ↓
"Payment Failed" message
  ↓
"Try Again" button
```

**What to Check**:

- ✅ Clear error message shown
- ✅ User can retry payment
- ✅ No app crash
- ✅ Order still accessible

---

### Test 5: Polling Timeout (60 seconds)

**Goal**: Test long polling timeout

**Setup**: Temporarily disable webhook in backend (optional)

**Steps**:

1. Make any payment
2. Wait for full polling cycle

**Expected**:

```
Polling starts
  ↓
Polls every 2 seconds
  ↓
After 30 attempts (60 seconds):
  ↓
Alert: "We are still processing your payment"
  ↓
Navigate to home screen
  ↓
User can check order status manually
```

**What to Check**:

- ✅ Polling doesn't run forever
- ✅ Timeout message is clear
- ✅ App remains stable
- ✅ Order is still created

**Console Logs**:

```javascript
[PaymentWebView] Polling attempt 1/30...
[PaymentWebView] Polling attempt 15/30...
[PaymentWebView] Polling attempt 30/30...
[PaymentWebView] ⏱️ Payment verification timeout
```

---

### Test 6: Network Error Handling

**Goal**: Test offline/poor connection

**Steps**:

1. Start a payment
2. Turn off internet mid-polling
3. Turn internet back on

**Expected**:

- ✅ Polling retries on network error
- ✅ Shows error alert if fails completely
- ✅ Resumes when connection restored
- ✅ No data loss

---

## 🔍 Visual Verification Checklist

### Payment WebView Screen

- [ ] Top polling banner visible
- [ ] Shows: "Checking payment status..."
- [ ] Small spinner on left
- [ ] Status text updates in real-time
- [ ] 3DS iframe loads correctly
- [ ] No "ngrok warning" page
- [ ] Smooth transitions

### Order Success Screen (MOTO)

**Processing State**:

- [ ] Spinner visible
- [ ] "Processing Payment..." text
- [ ] Order details shown
- [ ] Buttons disabled

**Confirmed State**:

- [ ] Green checkmark ✅
- [ ] "Payment Confirmed!" text
- [ ] "View Order Details" button enabled
- [ ] "Continue Shopping" button enabled

**Failed State**:

- [ ] Red error icon ❌
- [ ] "Payment Failed" text
- [ ] "Try Again" button
- [ ] Error message clear

---

## 🌐 API Testing (Backend)

### Test Polling Endpoint

```powershell
# Make a payment first, get payment_id from response
# Then poll status:

curl http://127.0.0.1:8000/api/v1/payments/status/123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "data": {
    "payment_id": 123,
    "order_id": 456,
    "status": "PAID",
    "transaction_id": "12345_XXXX1234",
    "amount": 500.00,
    "currency": "EGP",
    "flow": "moto",
    "updated_at": "2026-01-24 12:34:56"
  }
}
```

### Test Payment Initiation (Saved Card)

```powershell
curl -X POST http://127.0.0.1:8000/api/v1/payments/paymob/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 456,
    "amount": 500.00,
    "payment_method_id": 789
  }'

# Expected MOTO response:
{
  "success": true,
  "data": {
    "payment_id": 123,
    "flow": "moto",
    "redirect_url": null
  }
}

# Expected 3DS response:
{
  "success": true,
  "data": {
    "payment_id": 123,
    "flow": "unified_checkout",
    "redirect_url": "https://accept.paymob.com/..."
  }
}
```

---

## 📊 Performance Testing

### Measure MOTO Payment Speed

1. Open browser dev tools
2. Go to Network tab
3. Make MOTO payment
4. Measure time from "Place Order" to "Payment Confirmed"

**Target**: < 5 seconds
**Breakdown**:

- API call: < 1s
- Navigate: < 0.5s
- First poll: 0s (immediate)
- Webhook: 1-2s
- Second poll: 2s
- UI update: < 0.5s

### Measure 3DS Payment Speed

**Target**: < 30 seconds (including user interaction)

---

## 🐛 Debugging Tips

### Enable Detailed Logging

The code already has comprehensive console logs:

```javascript
// Backend (PaymobService.php)
Log::info('[PaymobService] Initiating MOTO payment', [...]);
Log::info('[PaymobService] ✅ MOTO payment successful');

// Frontend
console.log('[Confirmation] Flow type:', flow);
console.log('[PaymentWebView] Polling status:', status);
console.log('[OrderSuccess] Payment confirmed:', result);
```

### Check These Files for Logs

- **Backend**: `storage/logs/laravel.log`
- **Frontend**: Browser/Expo console

### Common Issues

**Issue**: WebView shows ngrok warning

- **Check**: `ngrok-skip-browser-warning` header in WebView
- **File**: payment-webview.tsx line 175

**Issue**: Polling never completes

- **Check**: Webhook URL accessible
- **Check**: Backend logs for webhook receipt
- **Check**: HMAC signature valid

**Issue**: MOTO not triggered

- **Check**: `payment_method_id` is sent in request
- **Check**: Saved card exists in database
- **Check**: Backend decision tree logs

---

## 📱 Device Testing

### iOS

- [ ] Test on iOS simulator
- [ ] Test on real iPhone
- [ ] Check WebView rendering
- [ ] Verify polling works
- [ ] Test 3DS authentication

### Android

- [ ] Test on Android emulator
- [ ] Test on real Android device
- [ ] Check WebView rendering
- [ ] Verify polling works
- [ ] Test 3DS authentication

---

## ✅ Success Criteria

After completing all tests, verify:

- [x] ✅ MOTO payments complete in < 5 seconds
- [x] ✅ 3DS payments work correctly
- [x] ✅ Polling detects status changes
- [x] ✅ No reliance on redirect URLs
- [x] ✅ Cards saved automatically
- [x] ✅ Error handling works
- [x] ✅ Timeout protection works
- [x] ✅ UI transitions smooth
- [x] ✅ No crashes or errors
- [x] ✅ All console logs show correct flow

---

## 🎯 Test Cards Reference

```
✅ MOTO Success:
   Card: 5123450000000008
   CVV: 100
   Expiry: Any future date

✅ 3DS Required:
   Card: 4987654321098769
   CVV: 123
   Expiry: Any future date

❌ Always Fails:
   Card: 5111111111111118
   CVV: 100
   Expiry: Any future date
```

---

## 📝 Testing Checklist

Copy this to track your testing:

```
Backend Tests:
[ ] Payment initiation API works
[ ] Polling endpoint returns correct status
[ ] Webhook updates payment status
[ ] MOTO payment processes
[ ] Unified Checkout returns redirect URL

Frontend Tests:
[ ] New card payment (Test 1)
[ ] MOTO instant payment (Test 2)
[ ] MOTO fallback to 3DS (Test 3)
[ ] Payment failure handling (Test 4)
[ ] Polling timeout (Test 5)
[ ] Network error handling (Test 6)

UI/UX Tests:
[ ] WebView polling banner visible
[ ] Order success processing state
[ ] Order success confirmed state
[ ] Order success failed state
[ ] Smooth transitions
[ ] No crashes

Performance Tests:
[ ] MOTO < 5 seconds
[ ] 3DS < 30 seconds
[ ] Polling interval = 2 seconds
[ ] Timeout at 60 seconds

Device Tests:
[ ] iOS simulator
[ ] Real iPhone
[ ] Android emulator
[ ] Real Android device
```

---

## 🚀 Next Steps After Testing

1. **Fix any bugs found**
2. **Document test results**
3. **Update performance benchmarks**
4. **Prepare for production deployment**
5. **Set up monitoring and alerts**

---

**Happy Testing! 🎉**

If you encounter any issues, check the logs first, then refer to the debugging tips above.
