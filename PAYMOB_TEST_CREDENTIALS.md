# Paymob Test Credentials & Testing Guide

## 🔐 Test Card Credentials

### Test Credit Card (Successful Payment)

```
Card Number: 4987 6543 2109 8765
Cardholder Name: Test User
Expiry Date: 05/25
CVV: 123
```

### Alternative Test Cards

#### Visa Cards

```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVV: Any 3 digits (e.g., 123)
```

```
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: Any 3 digits
```

#### Mastercard

```
Card Number: 5555 5555 5555 4444
Expiry: Any future date
CVV: Any 3 digits
```

#### Failed Payment Test Card

```
Card Number: 4000 0000 0000 0002
Expiry: Any future date
CVV: Any 3 digits
Note: This card will trigger a payment decline
```

---

## 🧪 Testing Scenarios

### 1. **Successful Payment Flow**

1. Add items to cart
2. Proceed to checkout
3. Select delivery address
4. Choose "Credit/Debit Card" payment
5. Enter test card: **4987 6543 2109 8765**
6. Enter name, expiry **05/25**, CVV **123**
7. Continue to confirmation
8. Select delivery date and time slot
9. Place order
10. Complete payment on Paymob page
11. Verify order success

### 2. **Cash on Delivery Flow**

1. Add items to cart
2. Proceed to checkout
3. Select delivery address
4. Choose "Cash on Delivery"
5. Continue to confirmation
6. Select delivery date and time slot
7. Place order (no Paymob redirect)
8. Order confirmed immediately

### 3. **Failed Payment Test**

Use card: **4000 0000 0000 0002** to test error handling

---

## 🌐 Paymob Environment

### Test Mode (Current)

- Uses Paymob sandbox/test environment
- No real money charged
- All test cards accepted

### Production Mode

- Requires Paymob account approval
- Real payment processing
- Update API keys in `.env`

---

## ⚙️ Backend Configuration

Check your `.env` file has these Paymob test credentials:

```env
PAYMOB_API_KEY=your_test_api_key
PAYMOB_INTEGRATION_ID=your_test_integration_id
PAYMOB_IFRAME_ID=your_test_iframe_id
PAYMOB_PUBLIC_KEY=your_test_public_key
PAYMOB_SECRET_KEY=your_test_secret_key
PAYMOB_HMAC_SECRET=your_test_hmac_secret
```

**Note:** If you don't have Paymob test credentials yet, you need to:

1. Sign up at https://accept.paymob.com
2. Go to Developers section
3. Get your API keys
4. Enable test mode

---

## 📱 Mobile Testing Notes

### On Real Device

- Ensure backend is accessible (use ngrok if testing locally)
- Update API base URL in frontend config

### On Emulator/Simulator

- Use `10.0.2.2:8000` for Android emulator
- Use `localhost:8000` for iOS simulator

---

## 🐛 Troubleshooting

### Delivery Slots Not Showing

**Issue:** Empty delivery date/time options on confirmation page

**Fix:** Ensure backend returns proper delivery slots structure:

```json
{
  "success": true,
  "data": {
    "delivery_slots": [
      { "slot": "9:00 AM - 12:00 PM", "is_active": true },
      { "slot": "12:00 PM - 3:00 PM", "is_active": true },
      { "slot": "3:00 PM - 6:00 PM", "is_active": true },
      { "slot": "6:00 PM - 9:00 PM", "is_active": true }
    ]
  }
}
```

### Paymob Payment Not Processing

1. Check backend logs for API errors
2. Verify Paymob credentials in `.env`
3. Ensure test mode is enabled
4. Check internet connectivity

### Card Validation Fails

- Card number must be exactly 16 digits
- Expiry in MM/YY format
- CVV must be 3 digits
- All fields required for card payment

---

## 📊 Expected API Flow

### Card Payment

1. **Frontend** → Create order with card details
2. **Backend** → Create order in database
3. **Backend** → Call Paymob API to initiate payment
4. **Backend** → Return iframe URL
5. **Frontend** → Redirect to Paymob payment page
6. **User** → Complete payment on Paymob
7. **Paymob** → Webhook callback to backend
8. **Backend** → Update order status
9. **Frontend** → Show success/failure message

### COD Payment

1. **Frontend** → Create order with COD
2. **Backend** → Create order with "cash_on_delivery" method
3. **Backend** → Set status to "confirmed"
4. **Frontend** → Navigate to success page

---

## ✅ Testing Checklist

- [ ] Backend server running (`php artisan serve`)
- [ ] Frontend app running (`npm start`)
- [ ] Test card numbers work
- [ ] Delivery slots display correctly
- [ ] COD flow completes successfully
- [ ] Card payment redirects to Paymob
- [ ] Order appears in database
- [ ] Payment status updates correctly

---

**Last Updated:** January 21, 2026
**Environment:** Test/Development
