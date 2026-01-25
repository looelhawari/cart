# Frontend Testing Guide - Dual-Flow Tokenization

This guide outlines how to test the dual-flow payment system with MOTO instant payments and 3DS authentication.

## Overview

The system now supports two payment flows:

1. **MOTO Flow**: Instant one-click payments for saved cards (no redirect)
2. **Unified Checkout Flow**: 3DS authentication with tokenization (redirect to WebView)

## Testing Prerequisites

1. **Backend Running**: Ensure backend is running on ngrok
2. **Ngrok Setup**: Your ngrok URL should be configured in `.env`
3. **Paymob Test Cards**: Use test cards from Paymob documentation
4. **App Running**: Start Expo app with `npm start`

## Test Scenarios

### Scenario 1: New Card Payment (Unified Checkout)

**Expected Flow**: Unified Checkout → 3DS WebView → Polling → Success

**Steps**:

1. Add item to cart
2. Go to checkout
3. Select "New Card" payment method
4. Fill in test card details:
    - Card: `5123450000000008` (Mastercard 3DS)
    - CVV: `100`
    - Expiry: Any future date
5. Enable "Save this card" toggle
6. Place order

**Expected Behavior**:

- ✅ Redirected to WebView with 3DS authentication
- ✅ Polling indicator shows at top: "Checking payment status..."
- ✅ Complete 3DS challenge
- ✅ Polling detects PAID status
- ✅ Automatically redirected to order success screen
- ✅ Card saved to profile for future use

**Logs to Check**:

```
[Confirmation] Flow type: unified_checkout
[Confirmation] Navigating to WebView with paymentId
[PaymentWebView] Starting payment status polling...
[PaymentWebView] Payment status: PENDING
[PaymentWebView] Payment status: PAID
[PaymentWebView] ✅ Payment successful!
```

---

### Scenario 2: MOTO Instant Payment (Saved Card)

**Expected Flow**: Instant payment → Direct to success → Background polling → Confirmed

**Steps**:

1. Add item to cart
2. Go to checkout
3. Select "Saved Cards" payment method
4. Select your previously saved card
5. Enter CVV
6. Place order

**Expected Behavior**:

- ✅ NO WebView shown (instant payment)
- ✅ Immediately redirected to order success screen
- ✅ Shows "Processing Payment..." with spinner
- ✅ Background polling detects PAID status within 2-4 seconds
- ✅ UI updates to "Payment Confirmed!"
- ✅ Can view order details

**Logs to Check**:

```
[Confirmation] Flow type: moto
[Confirmation] Navigating to order-success with polling=true
[OrderSuccess] Starting payment status polling...
[OrderSuccess] Payment status: PENDING
[OrderSuccess] Payment status: PAID
[OrderSuccess] ✅ Payment confirmed!
```

**Performance Check**:

- Total time from "Place Order" to "Payment Confirmed": **< 5 seconds**
- No WebView delay
- No user interaction required

---

### Scenario 3: MOTO Fallback to 3DS

**Expected Flow**: MOTO attempted → Bank requires 3DS → Redirected to WebView → Polling → Success

**Setup**: Backend decides to fallback to 3DS (happens automatically if bank requires it)

**Steps**:

1. Add item to cart
2. Use saved card
3. Place order

**Expected Behavior**:

- ✅ Backend detects 3DS requirement
- ✅ Response includes `flow: "unified_checkout"` instead of `moto`
- ✅ Redirected to WebView (not instant success)
- ✅ Complete 3DS authentication
- ✅ Polling confirms payment
- ✅ Redirected to success screen

**Logs to Check**:

```
[Confirmation] Expected MOTO but got: unified_checkout
[Confirmation] Fallback to 3DS - navigating to WebView
[PaymentWebView] Starting payment status polling...
```

---

### Scenario 4: Payment Failure

**Expected Flow**: Payment failed → Polling detects failure → Error message

**Steps**:

1. Use a card that will fail (check Paymob docs for test cards)
2. Complete checkout process

**Expected Behavior**:

- ✅ WebView shows error (if 3DS flow)
- ✅ Polling detects FAILED status
- ✅ Alert shown: "Payment Failed"
- ✅ User redirected back to payment screen

**For MOTO failure**:

- ✅ Order success screen shows error icon
- ✅ "Payment Failed" message
- ✅ "Try Again" button shown instead of "Continue Shopping"

---

### Scenario 5: Polling Timeout

**Expected Flow**: Payment stuck → 60 seconds timeout → Verification message

**Setup**: Simulate webhook delay (disable webhook in backend temporarily)

**Steps**:

1. Start any payment
2. Wait 60 seconds (polling max attempts)

**Expected Behavior**:

- ✅ Polling runs for 30 attempts x 2 seconds = 60 seconds
- ✅ Alert shown: "We are still processing your payment. Please check your orders."
- ✅ User redirected to home screen
- ✅ Can check order status manually

**Logs to Check**:

```
[PaymentWebView] Polling attempt 1/30...
[PaymentWebView] Polling attempt 30/30...
[PaymentWebView] ⏱️ Payment verification timeout
```

---

### Scenario 6: Classic Iframe (Legacy)

**Expected Flow**: Classic iframe → WebView → Polling → Success

**Setup**: Use a payment method that triggers classic iframe (older integration)

**Expected Behavior**:

- ✅ Redirected to WebView with iframe
- ✅ Polling indicator shows
- ✅ Complete payment in iframe
- ✅ Polling detects PAID status
- ✅ Redirected to success screen

---

## UI/UX Validation

### Payment WebView Screen

**Elements to Check**:

- ✅ Top polling indicator visible
- ✅ Shows current status: "Checking payment status...", "Verifying payment...", etc.
- ✅ Loading spinner during 3DS
- ✅ Smooth transitions
- ✅ No ngrok warning page shown

### Order Success Screen (MOTO)

**Elements to Check**:

- ✅ Processing state: Spinner + "Processing Payment..."
- ✅ Confirmed state: Checkmark + "Payment Confirmed!"
- ✅ Failed state: Error icon + "Payment Failed"
- ✅ Proper button labels based on state
- ✅ Order details still visible during polling

### Confirmation Screen

**Elements to Check**:

- ✅ "Use Saved Card" toggle works
- ✅ Saved cards list displays correctly
- ✅ CVV input for saved cards
- ✅ "Save this card" checkbox for new cards
- ✅ Loading indicator during payment initiation

---

## Network Inspection

### Check API Calls

**1. Initiate Payment**: `POST /api/v1/payments/paymob/initiate`

**Request (New Card)**:

```json
{
    "order_id": 123,
    "amount": 500.0
}
```

**Request (Saved Card)**:

```json
{
    "order_id": 123,
    "amount": 500.0,
    "payment_method_id": 456
}
```

**Response (MOTO)**:

```json
{
    "success": true,
    "data": {
        "payment_id": 789,
        "flow": "moto",
        "redirect_url": null
    }
}
```

**Response (3DS)**:

```json
{
    "success": true,
    "data": {
        "payment_id": 789,
        "flow": "unified_checkout",
        "redirect_url": "https://accept.paymob.com/..."
    }
}
```

**2. Poll Status**: `GET /api/v1/payments/status/789`

**Response**:

```json
{
    "success": true,
    "data": {
        "payment_id": 789,
        "status": "PAID",
        "transaction_id": "12345_XXXX1234",
        "flow": "moto"
    }
}
```

---

## Performance Benchmarks

### MOTO Instant Payment

- **Target**: < 5 seconds total
- **Breakdown**:
    - API call: < 1s
    - Navigation: < 0.5s
    - First poll: 0s (immediate)
    - Webhook processing: 1-2s
    - Second poll: 2s
    - UI update: < 0.5s

### Unified Checkout 3DS

- **Target**: < 30 seconds total
- **Breakdown**:
    - API call: < 1s
    - WebView load: 2-3s
    - User 3DS input: 10-20s
    - Webhook processing: 1-2s
    - Polling detection: 2-4s
    - Navigation: < 0.5s

---

## Error Cases to Test

### Network Errors

1. **No Internet**: Should show error alert
2. **Slow Connection**: Polling should retry
3. **Backend Down**: Should fail gracefully

### Invalid Data

1. **Invalid Card**: Should show validation error
2. **Expired Card**: Should fail on Paymob side
3. **Insufficient Funds**: Should fail with appropriate message

### Edge Cases

1. **Multiple Rapid Clicks**: Should prevent duplicate payments
2. **App Backgrounding**: Polling should resume on return
3. **Webhook Delay**: Polling should wait up to 60 seconds

---

## Debugging Tools

### Console Logs

Enable detailed logging in both screens:

```typescript
console.log("[Confirmation] Payment initiated:", paymentData);
console.log("[PaymentWebView] Polling status:", status);
console.log("[OrderSuccess] Payment confirmed:", result);
```

### Network Tab

Use React Native Debugger to inspect:

- API requests/responses
- Polling intervals
- Webhook timing

### State Inspection

Check component state:

- `paymentStatus`: 'processing' | 'confirmed' | 'failed'
- `pollingStatus`: Status message shown to user
- `isPolling`: Boolean flag to prevent duplicate polls

---

## Success Criteria

✅ **MOTO payments complete in < 5 seconds**
✅ **No reliance on redirect URLs for success detection**
✅ **Polling works reliably for both flows**
✅ **Proper error handling and user feedback**
✅ **Smooth UI transitions**
✅ **Cards are saved correctly**
✅ **Fallback to 3DS works seamlessly**

---

## Common Issues & Solutions

### Issue: WebView shows ngrok warning

**Solution**: Check `ngrok-skip-browser-warning` header is set

### Issue: Polling never completes

**Solution**: Check webhook URL is accessible, verify backend logs

### Issue: MOTO not triggered for saved cards

**Solution**: Verify `payment_method_id` is sent in request, check backend decision tree

### Issue: Payment succeeds but shows as failed

**Solution**: Check webhook is updating payment status correctly

### Issue: Duplicate payments

**Solution**: Add loading state to prevent multiple button clicks

---

## Next Steps After Testing

1. **Document any bugs found**
2. **Update error messages based on user feedback**
3. **Optimize polling intervals if needed**
4. **Add analytics tracking for flow metrics**
5. **Test on both iOS and Android**
6. **Verify production Paymob integration**

---

**Note**: This testing should be done in **development environment** first before deploying to production. Always use Paymob test cards during testing.
