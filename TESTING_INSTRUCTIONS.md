# 🧪 Payment Flow Testing Instructions

## ✅ **FIXES APPLIED - READY FOR TESTING**

### What Was Fixed:

1. ✅ **Auto-redirect after payment success** - No more manual X button clicking
2. ✅ **Better error handling** - Helpful guidance if payment verification fails
3. ✅ **Enhanced debugging** - Added comprehensive logging to trace issues

### What Needs Testing:

1. ⏳ **Payment success flow** - Verify auto-redirect works
2. ⏳ **Cart totals accuracy** - Verify subtotal matches between UI and database
3. ⏳ **Cart clearing** - Verify cart empties after successful payment

---

## 📝 **TEST SCENARIO 1: Complete Payment Flow**

### Steps:

```
1. Open app and login
2. Add 1-2 items to cart
3. Note the cart subtotal (e.g., 81.56 EGP)
4. Go to checkout
5. Select "Card" payment method
6. Fill in delivery details
7. Click "Place Order"
```

### Expected Behavior:

```
✅ Redirects to Paymob payment page
✅ Shows correct total amount in Paymob
✅ Complete payment successfully
✅ Paymob shows "Approved" message
✅ App auto-navigates to success screen (within 3 seconds)
✅ Success screen shows order number
✅ Cart is empty
```

### What to Check:

- [ ] Does Paymob show correct amount?
- [ ] Does app auto-redirect after approval?
- [ ] Do you see success screen?
- [ ] Is cart empty after success?

---

## 📝 **TEST SCENARIO 2: Cart Totals Verification**

### Steps:

```
1. Clear cart completely
2. Add ONE item worth 10-20 EGP
3. Check cart screen total
4. Place order with card
5. Check Laravel logs
```

### Check Laravel Logs For:

```bash
# In backend/storage/logs/laravel.log
# Look for these logs:

🛒 CART TOTALS CALCULATION
{
  "cart_id": 123,
  "items": [
    {
      "product_id": "ABC123",
      "product_name": "Test Product",
      "quantity": 1,
      "price": 10.00,
      "subtotal": 10.00
    }
  ],
  "calculated_subtotal": 10.00
}

💰 ORDER CREATION - Cart Totals Debug
{
  "cart_id": 123,
  "cart_totals": {
    "subtotal": 10.00,
    "delivery_fee": 20.00,
    "tax": 4.20,
    "total": 34.20
  },
  "cart_items": [...]
}
```

### What to Compare:

- [ ] Cart UI subtotal matches log subtotal
- [ ] Order total = subtotal + delivery (20) + tax (14%)
- [ ] Paymob charge matches order total

---

## 📝 **TEST SCENARIO 3: Cart Clearing After Payment**

### Steps:

```
1. Add items to cart
2. Complete payment successfully
3. Check Laravel logs for cart clearing
4. Check cart screen
5. Pull down to refresh cart
```

### Check Laravel Logs For:

```bash
🗑️ CLEARING CART AFTER PAYMENT
{
  "cart_id": 123,
  "user_id": 456,
  "items_count_before": 3
}

✅ CART CLEARED
{
  "cart_id": 123,
  "items_count_after": 0
}
```

### Expected Behavior:

```
✅ Backend logs show cart cleared (items_count_after: 0)
✅ Frontend cart screen shows "Cart is empty"
✅ Pull-to-refresh still shows empty cart
```

### What to Check:

- [ ] Do logs show cart clearing?
- [ ] Is cart empty in UI?
- [ ] Does refresh keep cart empty?

---

## 🐛 **IF ISSUES OCCUR**

### Issue: Auto-redirect not working

**Check:**

- Does Paymob show "Approved" message?
- Look at React Native logs for URL changes
- Check if `isPaymobSuccess` condition is triggered

**Debug:**

```
Open React Native debugger
Look for console logs:
"Processing Paymob success: ..."
"Payment verified: PAID"
```

### Issue: Wrong subtotal

**Check:**

1. Open `backend/storage/logs/laravel.log`
2. Search for "CART TOTALS CALCULATION"
3. Compare:
   - Cart UI subtotal
   - Log calculated_subtotal
   - Product prices in items array

**Possible Causes:**

- Product prices stored in cents (multiply by 100)
- Frontend dividing by 100 incorrectly
- Wrong product selected in cart

### Issue: Cart not clearing

**Check:**

1. Search Laravel logs for "CLEARING CART AFTER PAYMENT"
2. If not found → Callback never executed
3. If found but count is still > 0 → Database issue
4. If count = 0 but UI shows items → Frontend cache issue

**Debug:**

```bash
# Check if callback was called
grep "CLEARING CART" backend/storage/logs/laravel.log

# Check frontend console
# Look for: "Cart fetched: ..."
```

---

## 📋 **REPORTING RESULTS**

### When Reporting Back, Include:

**Test 1 Results:**

```
✅/❌ Auto-redirect worked
✅/❌ Success screen shown
✅/❌ Cart cleared
```

**Test 2 Results:**

```
Cart UI subtotal: ___ EGP
Laravel log subtotal: ___ EGP
Order total: ___ EGP
Paymob charge: ___ EGP
✅/❌ All amounts match
```

**Test 3 Results:**

```
✅/❌ Logs show cart clearing
✅/❌ Cart empty in UI
✅/❌ Refresh keeps cart empty
```

**Laravel Logs:**

```
Paste relevant log entries from:
backend/storage/logs/laravel.log

Search for:
- "CART TOTALS CALCULATION"
- "ORDER CREATION - Cart Totals Debug"
- "CLEARING CART AFTER PAYMENT"
```

**React Native Logs:**

```
Paste relevant console logs from:
- Metro bundler terminal
- React Native debugger

Look for:
- "Cart fetched: ..."
- "Processing Paymob success: ..."
```

---

## 🎯 **SUCCESS CRITERIA**

All of these should be ✅ after testing:

- [ ] Payment redirects to Paymob
- [ ] Paymob shows correct amount (matching cart total)
- [ ] After payment approval, app auto-redirects (no manual X click)
- [ ] Success screen shows order confirmation
- [ ] Cart is completely empty after success
- [ ] Cart totals match between UI and backend
- [ ] Laravel logs show correct calculations
- [ ] No errors in React Native console

---

## 💡 **TIPS**

1. **Clear app cache before testing:**

   ```
   - Close app completely
   - Clear React Native cache
   - Restart app
   ```

2. **Monitor logs in real-time:**

   ```bash
   # Terminal 1: Watch Laravel logs
   cd backend
   tail -f storage/logs/laravel.log

   # Terminal 2: Watch React Native logs
   npx expo start
   ```

3. **Test with simple cart first:**
   - Use 1 item only
   - Known price (e.g., 10 EGP)
   - This makes debugging easier

4. **Document everything:**
   - Screenshot cart totals
   - Screenshot Paymob payment page
   - Screenshot success screen
   - Copy all relevant logs

---

**Ready to test!** 🚀

Start with Test 1 (complete payment flow) and report back the results.
