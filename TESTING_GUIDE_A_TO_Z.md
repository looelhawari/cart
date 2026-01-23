# 🧪 Complete Testing Guide: Saved Cards Payment Flow

**Purpose**: Step-by-step guide to test the entire saved cards implementation  
**Status**: Ready to test - all code complete  
**Time Required**: 30-45 minutes for full test suite

---

## 🚀 Pre-Testing Setup

### Step 1: Start Your Backend (Laravel)

```powershell
# In terminal 1
cd "C:\Users\Kareem H\Music\Track\BBB\backend"
php artisan serve
```

**Expected Output**:

```
Laravel development server started: http://127.0.0.1:8000
```

**Verify Backend**:

- Open browser: http://127.0.0.1:8000
- Should see Laravel welcome page or your API endpoint

---

### Step 2: Start Your Frontend (Expo)

```powershell
# In terminal 2
cd "C:\Users\Kareem H\Music\Track\BBB\frontend"
npx expo start --clear
```

**Expected Output**:

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Verify Frontend**:

- Press `a` for Android emulator (if installed)
- Or scan QR code with Expo Go app on phone
- App should launch and show your home screen

---

### Step 3: Verify You're Logged In

**Check Auth Status**:

1. Open app
2. If you see login screen → Login with your test account
3. Navigate to Profile tab
4. Should see your user info (name, email)

**If Not Logged In**:

- Tap "Login"
- Enter credentials
- Should navigate to home screen

**Verify Auth Token Exists**:

```powershell
# Optional: Check AsyncStorage (for debugging)
# This verifies auth token is stored
```

---

## 🧪 Test Suite: Saved Cards Payment Flow

---

## TEST 1: First Card Payment (Save New Card)

**Objective**: Test saving a card during first payment

### Steps:

**1.1 Add Items to Cart**

- Go to home screen
- Tap any product
- Tap "Add to Cart"
- Verify: Cart badge shows "1"

**1.2 Go to Checkout**

- Tap Cart icon (bottom tab)
- Tap "Checkout" or "Proceed to Checkout"
- Should navigate to address selection

**1.3 Select Delivery Address**

- Select an existing address (or add new one)
- Tap "Continue" or "Next"
- Should navigate to Payment Method screen

**1.4 Select Card Payment**

- You should see:
  - ⚪ Card (tap this)
  - ⚪ Cash on Delivery

**Expected After Selecting Card**:

```
✅ Card payment selected (highlighted)
✅ You see description: "Secure Card Payment"
✅ You see checkbox: ☑️ "Save this card for future purchases"
✅ NO "Use saved card" toggle (you have no saved cards yet)
```

**1.5 Enable Save Card**

- ✅ **Check the box**: "Save this card for future purchases"
- This is CRITICAL - without this, card won't be saved

**1.6 Continue to Confirmation**

- Tap "Continue"
- Should navigate to Order Confirmation screen
- You should see:
  - Delivery date selector
  - Time slot selector
  - Order summary (items, total)
  - Payment method: Card

**1.7 Place Order**

- Select delivery date (e.g., Tomorrow)
- Select time slot
- ✅ Accept terms & conditions
- Tap "Place Order" or "Confirm Order"

**Expected**:

```
✅ Loading spinner appears
✅ Navigate to PaymentWebView screen (3DS iframe)
```

**1.8 Complete 3DS Authentication**

**You should see**: Paymob payment iframe loading

**IMPORTANT - Test Card Numbers**:

For Paymob SANDBOX (test environment):

```
Card Number:  4987 6543 2109 8769
Expiry:       12/25 (any future date)
CVV:          123
Name:         Test User
```

**If using Paymob PRODUCTION**:

- Use a real card (will be charged)
- OR ask Paymob for test cards

**Steps in Iframe**:

1. Wait for iframe to load (shows Paymob form)
2. Enter card details above
3. Tap "Pay" or "Submit"
4. If 3DS required: Enter OTP (usually "123456" in sandbox)
5. Wait for redirect

**Expected Redirect**:

```
✅ URL changes to /payment/callback or /payment/success
✅ Console logs: "3DS flow completed - routing to order confirmation"
✅ Console logs: "WARNING: Payment may still be processing on backend"
✅ Navigate to Order Success screen
```

**1.9 Verify Order Success Screen**

**You should see**:

```
✅ Green checkmark icon
✅ "Order Placed Successfully!"
✅ Order number (e.g., ORD-12345)
✅ NEW: "If you paid by card, your payment is being confirmed..."
✅ Delivery date and time
✅ "View Order Details" button
✅ "Continue Shopping" button
```

**1.10 Verify Payment Processed (Backend)**

**Wait 5-10 seconds** for webhook to process

**Option A - Check Order Details**:

1. Tap "View Order Details"
2. Check order status
3. **Expected**: Status should be "Confirmed" or "Payment Confirmed" (not "Pending")

**Option B - Check Database**:

```sql
-- In your database
SELECT * FROM orders WHERE id = <order_id> ORDER BY id DESC LIMIT 1;
-- payment_status should be 'payment_confirmed'

SELECT * FROM payment_methods WHERE user_id = <your_user_id>;
-- Should have 1 row (your saved card)
```

**1.11 Verify Card Was Saved**

**Navigate to Payment Methods**:

1. Go to Profile tab
2. Tap "Payment Methods" (should be in menu)
3. **Expected**:

```
✅ You see 1 saved card
✅ Card shows: "Visa •••• 8769" (or your card)
✅ Badge shows: "DEFAULT" (blue)
✅ Expiry shows: "12/25"
✅ Card has green checkmark or enabled state
✅ Two buttons visible: "Set Default" + "Delete"
```

---

## TEST 2: Pay with Saved Card

**Objective**: Test paying with previously saved card

### Steps:

**2.1 Add New Items to Cart**

- Go back to home
- Add different products to cart

**2.2 Go to Checkout → Address → Payment**

- Follow same steps as Test 1.1-1.3
- Get to Payment Method screen

**2.3 Toggle "Use Saved Card"**

**NEW: You should now see**:

```
✅ Toggle switch: "Use saved card" (OFF by default)
✅ Toggle it ON
```

**Expected After Toggle ON**:

```
✅ Toggle turns blue/active
✅ List of saved cards appears
✅ You see your card: "Visa •••• 8769"
✅ Card has "DEFAULT" badge
✅ Card is auto-selected (blue border)
✅ NO "Save this card" checkbox (not needed for saved cards)
```

**2.4 Verify Card Selection**

- Your saved card should be selected automatically
- If you had multiple cards, you could tap to select different one

**2.5 Continue to Confirmation**

- Tap "Continue"
- Should navigate to Order Confirmation
- **Expected**: Same as before (date, time, summary)

**2.6 Place Order with Saved Card**

- Select delivery date & time
- Accept terms
- Tap "Place Order"

**Expected**:

```
✅ Navigate to PaymentWebView (3DS iframe)
✅ You do NOT need to re-enter card details
✅ Iframe may auto-complete (if no 3DS required)
✅ OR show 3DS challenge (verify with OTP)
```

**IMPORTANT**: Even saved cards MAY require 3DS occasionally (bank security)

**2.7 Complete 3DS (If Shown)**

- If OTP screen appears, enter "123456" (sandbox)
- If auto-redirects, great!

**2.8 Verify Order Success**

- Should land on Order Success screen
- Same disclaimer message appears
- Check order details → status confirmed

**2.9 Verify NO Duplicate Card Saved**

- Go back to Profile → Payment Methods
- **Expected**: Still only 1 card (not duplicated)

---

## TEST 3: Payment Methods Management

**Objective**: Test card management features

### Test 3.1: View All Saved Cards

**Steps**:

1. Profile tab → "Payment Methods"

**Expected**:

```
✅ List shows all your saved cards
✅ Cards sorted: Default first, then others
✅ Each card shows:
   - Card brand icon
   - Masked number: "Visa •••• 8769"
   - Expiry date: "12/25"
   - Badges: DEFAULT, EXPIRED (if expired), UNVERIFIED (if pending)
```

---

### Test 3.2: Add Second Card (Optional)

**Steps**:

1. Make another order (Test 1 steps)
2. Use DIFFERENT test card:
   ```
   Card: 5123 4567 8901 2346
   Expiry: 01/26
   CVV: 123
   ```
3. ✅ Check "Save this card"
4. Complete payment

**Expected**:

- Profile → Payment Methods now shows 2 cards
- First card still has "DEFAULT" badge
- Second card has NO default badge

---

### Test 3.3: Set Different Card as Default

**Steps**:

1. Profile → Payment Methods
2. Find the SECOND card (not default)
3. Tap "Set Default" button

**Expected**:

```
✅ Loading spinner appears
✅ Toast notification: "Default payment method updated"
✅ DEFAULT badge moves to second card
✅ First card loses DEFAULT badge
✅ List re-sorts (new default on top)
```

**Error Cases to Test**:

- If card is expired → Alert: "Cannot set expired card as default"
- If card is unverified → Alert: "Cannot set unverified card as default"

---

### Test 3.4: Delete a Card

**Steps**:

1. Tap "Delete" button on any card
2. Confirmation alert appears:
   ```
   "Delete Payment Method"
   "Are you sure you want to delete this card?"
   [Cancel] [Delete]
   ```
3. Tap "Delete"

**Expected**:

```
✅ Loading spinner
✅ Card disappears from list
✅ Toast: "Payment method deleted"
✅ If deleted card was default → another card becomes default automatically
```

**Special Case**:

- Delete your LAST card → Empty state appears:
  ```
  📄 Icon: "No saved cards"
  "Add a new card to get started"
  ```

---

### Test 3.5: Pull to Refresh

**Steps**:

1. On Payment Methods screen
2. Swipe down from top
3. Release

**Expected**:

```
✅ Refresh spinner appears
✅ List reloads from API
✅ Any backend changes reflected
```

---

## TEST 4: Error Handling & Edge Cases

---

### Test 4.1: Network Error During Payment

**Steps**:

1. Start checkout flow
2. Get to PaymentWebView (3DS iframe)
3. **Turn off WiFi/Mobile data**
4. Wait for error

**Expected**:

```
✅ Alert appears: "Failed to load payment page. Please check your internet connection..."
✅ Two buttons: [Retry] [Cancel]
✅ Tap Retry → re-attempts load
✅ Tap Cancel → goes back to previous screen
```

---

### Test 4.2: 401 Unauthorized (Session Expired)

**Setup**:

```sql
-- Manually expire token in database
UPDATE personal_access_tokens
SET expires_at = NOW() - INTERVAL 1 DAY
WHERE tokenable_id = <your_user_id>;
```

**Steps**:

1. Go to Profile → Payment Methods
2. Try to load cards

**Expected**:

```
✅ API call fails with 401
✅ Auth data cleared automatically
✅ Navigate to Login screen (or logout)
✅ Toast/Alert: "Session expired. Please login again."
```

---

### Test 4.3: Paymob iframe_url Missing

**Steps** (simulate backend error):

1. Temporarily break backend endpoint
2. Try to place order

**Expected**:

```
✅ Alert: "Failed to initiate payment"
✅ Stays on confirmation screen (doesn't navigate)
✅ User can retry or go back
```

---

### Test 4.4: Payment Failed/Cancelled in 3DS

**Steps**:

1. Start payment
2. In Paymob iframe, click "Cancel" or use invalid card
3. Should redirect to /payment/failed URL

**Expected**:

```
✅ Alert: "Payment Incomplete. The payment process was not completed..."
✅ Tap OK → goes back to checkout
✅ Can retry payment
```

---

## 🔍 Console Logs to Monitor

**While testing, watch your terminal for these logs**:

### Expected Logs in PaymentWebView:

```
[PaymentWebView] Navigation to: https://accept.paymob.com/...
[PaymentWebView] Navigation to: https://yourbackend.com/payment/callback
[PaymentWebView] 3DS flow completed - routing to order confirmation
[PaymentWebView] WARNING: Payment may still be processing on backend
```

### Backend Webhook Logs:

```
Paymob webhook received: order_id=123
Payment verified successfully
Card saved: payment_method_id=1
Order status updated: payment_confirmed
```

---

## ✅ Success Checklist

After completing all tests, verify:

### Phase 5 Features (Saved Cards)

- [ ] Can save card during first payment
- [ ] Saved card appears in Payment Methods
- [ ] Can pay with saved card (no re-entry)
- [ ] Can set default card
- [ ] Can delete cards
- [ ] Default badge shows correctly
- [ ] Pull-to-refresh works
- [ ] Empty state shows when no cards

### Phase 5.5 Stage 1 Features (Hardening)

- [ ] Order success shows disclaimer message
- [ ] Console logs show warnings
- [ ] 401 errors trigger logout
- [ ] Network errors handled gracefully
- [ ] Payment failure shows proper message

---

## 🐛 Common Issues & Fixes

### Issue: "Can't load payment methods - 401 error"

**Cause**: Auth token not working  
**Fix**:

1. Check you're logged in
2. Verify token in AsyncStorage
3. Check backend /api/v1/payment-methods endpoint works

### Issue: "Toggle 'Use saved card' doesn't appear"

**Cause**: No saved cards exist yet  
**Fix**: Complete Test 1 first to save a card

### Issue: "Card not saving after payment"

**Cause**: Webhook not processing or save_card flag not sent  
**Fix**:

1. Verify "Save this card" checkbox was CHECKED
2. Check backend logs for webhook processing
3. Verify payment_methods table in database

### Issue: "3DS iframe not loading"

**Cause**: Network or invalid iframe_url  
**Fix**:

1. Check internet connection
2. Verify backend returns valid iframe_url
3. Check Paymob credentials in backend .env

### Issue: "Order shows 'pending' forever"

**Cause**: Webhook delayed or failed  
**Fix**:

1. Check backend webhook URL is accessible
2. Verify Paymob webhook configured correctly
3. Manually check database: `SELECT * FROM orders WHERE id=X`

---

## 📱 Testing Checklist Summary

**Quick 15-Minute Test** (Essential):

1. ✅ Login
2. ✅ First payment with save card checked
3. ✅ Verify card saved in Payment Methods
4. ✅ Second payment using saved card
5. ✅ Delete card

**Full 45-Minute Test** (Comprehensive):

- All tests above (1-4)
- Error scenarios
- Multiple cards
- Default card switching
- Edge cases

---

## 🎯 What to Report After Testing

**If Everything Works**:
✅ "All tests passed - ready for production"

**If Issues Found**:
For each issue, report:

1. Which test failed (e.g., "Test 2.3")
2. What you expected
3. What actually happened
4. Console logs / errors
5. Screenshots if possible

---

## 🚀 Ready to Start?

**Begin with**:

1. Start backend: `php artisan serve`
2. Start frontend: `npx expo start --clear`
3. Login to app
4. Run Test 1 (First Card Payment)

**Questions to ask yourself after each test**:

- ✅ Did it work as expected?
- ✅ Were there any errors?
- ✅ Did console logs show?
- ✅ Does the UI look correct?

---

**Good luck with testing!** 🎉

If you encounter any specific error, share:

- The error message
- Which test you were running
- Console logs
- I'll help you debug it!
