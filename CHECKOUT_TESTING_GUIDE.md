# 🧪 ElBaraka Checkout Flow - Complete Testing Guide

## 📋 Prerequisites Setup

### 1. Database Setup

```bash
# Import base database schema
cd backend
mysql -u root -p elbaraka < ../elbaraka_database.sql

# Run Phase 1 & 2 migrations
php artisan migrate

# Verify tables exist
php artisan tinker
>> \DB::table('users')->count()
>> \DB::table('addresses')->count()
>> \DB::table('promo_codes')->count()
>> exit
```

### 2. Seed Test Data

```bash
# Seed promo codes
php artisan db:seed --class=PromoCodeSeeder

# Seed addresses (requires user to exist first)
php artisan db:seed --class=AddressSeeder
```

### 3. Paymob Configuration

Update `.env` with your Paymob credentials:

```env
PAYMOB_API_KEY=your_api_key_here
PAYMOB_INTEGRATION_ID=your_integration_id_here
PAYMOB_IFRAME_ID=your_iframe_id_here
PAYMOB_HMAC_SECRET=your_hmac_secret_here
PAYMOB_CURRENCY=EGP
```

**How to get Paymob credentials:**

1. Sign up at [https://accept.paymob.com](https://accept.paymob.com)
2. Go to Settings → Account Info → API Keys
3. Copy API Key
4. Go to Settings → Payment Integrations
5. Create integration → Get Integration ID and iFrame ID
6. Go to Settings → Security → Get HMAC Secret

---

## 🛒 Complete Checkout Flow Testing

### Step 1: Create User Account

**API Endpoint**: `POST /api/v1/auth/register`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "phone": "+201234567890",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "language": "en"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {...},
    "requires_verification": true
  }
}
```

**Next**: Verify email with OTP (check logs or database for OTP)

---

### Step 2: Verify Email

**API Endpoint**: `POST /api/v1/auth/verify-email`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

---

### Step 3: Login

**API Endpoint**: `POST /api/v1/auth/login`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "user": {...},
    "token": "1|xxxxxxxxxxxxxx",
    "token_type": "Bearer"
  }
}
```

**Save the token** for subsequent requests!

---

### Step 4: Add Products to Cart

**API Endpoint**: `POST /api/v1/cart/items`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/cart/items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "6221155000019",
    "quantity": 2
  }'
```

**Repeat** for multiple products to reach different price thresholds.

---

### Step 5: Get Checkout Addresses

**API Endpoint**: `GET /api/v1/checkout/addresses`

**Request**:

```bash
curl -X GET http://10.0.2.2:8000/api/v1/checkout/addresses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "addresses": [
      {
        "id": 1,
        "label": "Home",
        "street": "123 Main Street...",
        "city": "Cairo",
        "is_default": true
      }
    ]
  }
}
```

---

### Step 6: Validate Promo Code (Optional)

**API Endpoint**: `POST /api/v1/checkout/validate-promo`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/checkout/validate-promo \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "promo_code": "WELCOME10",
    "order_total": 150.00
  }'
```

**Test Scenarios**:

- ✅ Valid: `WELCOME10` (10% off, min 50 EGP)
- ✅ Valid: `SAVE20` (20% off, min 100 EGP)
- ❌ Invalid: `EXPIRED` (expired promo)
- ❌ Invalid: `WELCOME10` with 30 EGP total (below minimum)

---

### Step 7: Create Order

**API Endpoint**: `POST /api/v1/orders`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_address_id": 1,
    "payment_method": "card",
    "delivery_date": "2026-01-25",
    "delivery_time_slot": "10:00 AM - 12:00 PM",
    "promo_code": "WELCOME10",
    "notes": "Please call before delivery"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "order_number": "ORD-20260121-XXXXXX",
      "status": "pending",
      "total": 135.0,
      "discount": 15.0
    }
  }
}
```

**Save the `order_id`** for payment!

---

### Step 8: Check Wallet Balance

**API Endpoint**: `GET /api/v1/wallet`

**Request**:

```bash
curl -X GET http://10.0.2.2:8000/api/v1/wallet \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "balance": 0.0,
    "total_credited": 0.0,
    "total_debited": 0.0,
    "transactions": []
  }
}
```

**Note**: New users have 0 balance. Wallet credits only come from refunds.

---

### Step 9: Get Payment Options

**API Endpoint**: `GET /api/v1/checkout/payment-options/{orderId}`

**Request**:

```bash
curl -X GET http://10.0.2.2:8000/api/v1/checkout/payment-options/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response**:

```json
{
  "success": true,
  "data": {
    "order_total": 135.0,
    "wallet_balance": 0.0,
    "can_pay_with_wallet": false,
    "can_pay_partially": false,
    "payment_options": [
      {
        "method": "card",
        "label": "Credit/Debit Card",
        "amount": 135.0
      },
      {
        "method": "cash_on_delivery",
        "label": "Cash on Delivery",
        "amount": 135.0
      }
    ]
  }
}
```

---

### Step 10: Process Payment

#### Option A: Card Payment (Paymob)

**API Endpoint**: `POST /api/v1/checkout/process-payment`

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/checkout/process-payment \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "payment_method": "card",
    "billing_data": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com",
      "phone_number": "+201234567890",
      "apartment": "301",
      "floor": "3",
      "street": "Main Street",
      "building": "Building A",
      "shipping_method": "PKG",
      "postal_code": "11371",
      "city": "Cairo",
      "country": "Egypt",
      "state": "Cairo"
    }
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/...",
    "payment_token": "ZXlKaGJHY2..."
  }
}
```

**Next Steps**:

1. Open `iframe_url` in WebView (mobile) or browser (web)
2. Enter test card details:
   - Card Number: `4987654321098769`
   - CVV: `123`
   - Expiry: Any future date
3. Complete payment
4. Paymob will callback to `/api/v1/paymob/processed`
5. Order status updates to `confirmed`

#### Option B: Cash on Delivery

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/checkout/process-payment \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "payment_method": "cash_on_delivery"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Order confirmed for cash on delivery",
  "data": {
    "payment_method": "cash_on_delivery",
    "status": "confirmed"
  }
}
```

#### Option C: Wallet Payment (After Refund)

**Prerequisite**: User must have wallet balance (from previous refund)

**Request**:

```bash
curl -X POST http://10.0.2.2:8000/api/v1/checkout/process-payment \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "payment_method": "wallet"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment completed using wallet",
  "data": {
    "payment_method": "wallet",
    "amount_paid": 135.0
  }
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: First-Time Customer (No Wallet Balance)

1. Register → Verify → Login ✅
2. Add 200 EGP worth of products ✅
3. Apply `FIRST50` promo (50 EGP off) ✅
4. Create order (Total: 150 EGP after discount)
5. Check payment options → Only card & COD available
6. Pay with card → Get Paymob iframe
7. Complete payment → Order confirmed ✅

**Expected**: Order paid with card, wallet balance still 0

---

### Scenario 2: Wallet-First Payment

1. **Setup**: Cancel previous order to get wallet credit
   ```bash
   curl -X POST http://10.0.2.2:8000/api/v1/orders/1/cancel \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"reason": "Changed my mind"}'
   ```
2. Check wallet → Should have 150 EGP credited
3. Create new order (Total: 100 EGP)
4. Check payment options → Wallet shows as available
5. Process payment with method: `wallet`
6. **Expected**: Order paid entirely with wallet, balance now 50 EGP

---

### Scenario 3: Partial Wallet + Card Payment

1. **Setup**: Wallet balance = 50 EGP (from previous scenario)
2. Create new order (Total: 200 EGP)
3. Check payment options → Shows partial wallet option
   ```json
   {
     "method": "wallet_and_card",
     "label": "Wallet (50 EGP) + Card (150 EGP)",
     "wallet_amount": 50.0,
     "card_amount": 150.0
   }
   ```
4. Process payment with method: `card`
5. **Expected**:
   - Wallet debited 50 EGP
   - Paymob iframe for 150 EGP
   - After card payment: Order confirmed, wallet balance = 0

---

### Scenario 4: Promo Code Validation Tests

#### Test 1: Valid Promo

```bash
# WELCOME10: 10% off, min 50 EGP, max discount 20 EGP
Order Total: 150 EGP
Expected Discount: 15 EGP (10% of 150)
```

#### Test 2: Promo with Maximum Discount

```bash
# WELCOME10: max discount 20 EGP
Order Total: 500 EGP
Expected Discount: 20 EGP (capped at maximum)
```

#### Test 3: Minimum Purchase Not Met

```bash
# SAVE20: min 100 EGP required
Order Total: 80 EGP
Expected: Error "Minimum purchase of 100 EGP required"
```

#### Test 4: Expired Promo

```bash
# EXPIRED: valid_until in the past
Expected: Error "Promo code has expired"
```

#### Test 5: Usage Limit Reached

```bash
# Use WELCOME10 twice (usage_per_user = 1)
Expected: Error "Promo code usage limit reached"
```

---

## 🔧 Troubleshooting

### Issue: Addresses Not Showing

**Check**:

```bash
php artisan tinker
>> \App\Models\Address::where('user_id', 1)->get()
```

**Fix**:

```bash
php artisan db:seed --class=AddressSeeder
```

---

### Issue: Wallet Shows 500 Error

**Check Backend Logs**:

```bash
tail -f storage/logs/laravel.log
```

**Common Cause**: Old wallet columns in controller

**Fix**: Ensure `WalletController::index()` uses computed attributes (✅ Fixed in Phase 2)

---

### Issue: Paymob Payment Fails

**Verify Environment**:

```bash
php artisan tinker
>> config('paymob.api_key')
>> config('paymob.integration_id')
```

**Test Paymob Auth**:

```bash
curl -X POST https://accept.paymob.com/api/auth/tokens \
  -H "Content-Type: application/json" \
  -d '{"api_key": "YOUR_API_KEY"}'
```

**Expected**: Returns auth token

---

### Issue: Promo Code Not Working

**Check Database**:

```bash
php artisan tinker
>> \App\Models\PromoCode::where('code', 'WELCOME10')->first()
```

**Verify**:

- `is_active = 1`
- `valid_from <= now()`
- `valid_until >= now()`
- `used_count < usage_limit`

---

## 📱 Mobile App Testing

### Android Emulator Setup

1. **API Base URL**: Use `http://10.0.2.2:8000` (points to host machine)
2. **Start Laravel Server**:
   ```bash
   cd backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

### iOS Simulator Setup

1. **API Base URL**: Use `http://localhost:8000` or your Mac's IP
2. **Find Your IP**:
   ```bash
   ifconfig | grep "inet "
   ```

---

## ✅ Test Checklist

### Wallet System

- [ ] Wallet balance shows 0 for new users
- [ ] Wallet credited after order refund
- [ ] Wallet debited when used for payment
- [ ] Wallet transactions listed correctly
- [ ] No duplicate transactions (idempotency works)

### Checkout Flow

- [ ] User addresses loaded
- [ ] Promo codes validated server-side
- [ ] Order summary calculated correctly
- [ ] Delivery slots available
- [ ] Payment options shown based on wallet balance

### Payment Methods

- [ ] Card payment: Paymob iframe loads
- [ ] Card payment: Order confirmed after successful payment
- [ ] COD payment: Order confirmed immediately
- [ ] Wallet payment: Balance deducted, order confirmed
- [ ] Partial wallet + card: Both processed correctly

### Promo Codes

- [ ] Valid promo applies discount
- [ ] Expired promo rejected
- [ ] Minimum purchase enforced
- [ ] Maximum discount applied
- [ ] Usage limits enforced (global & per-user)

### Order Management

- [ ] Orders created with address snapshots
- [ ] Order cancellation triggers refund
- [ ] Order status updates correctly
- [ ] Admin can issue full refunds
- [ ] Admin can issue partial refunds

---

## 📊 Test Data Summary

### Available Promo Codes

| Code      | Type       | Value  | Min Order | Max Discount | Usage/User |
| --------- | ---------- | ------ | --------- | ------------ | ---------- |
| WELCOME10 | percentage | 10%    | 50 EGP    | 20 EGP       | 1          |
| SAVE20    | percentage | 20%    | 100 EGP   | 50 EGP       | 2          |
| FIRST50   | fixed      | 50 EGP | 200 EGP   | -            | 1          |
| SUPER30   | percentage | 30%    | 300 EGP   | 100 EGP      | 1          |
| FLAT25    | fixed      | 25 EGP | 150 EGP   | -            | 5          |
| EXPIRED   | percentage | 50%    | 100 EGP   | 50 EGP       | ❌ Expired |

### Test User Addresses

| Label   | City  | Default |
| ------- | ----- | ------- |
| Home    | Cairo | ✅ Yes  |
| Work    | Cairo | No      |
| Parents | Giza  | No      |

---

## 🎯 Success Criteria

Checkout flow is working correctly when:

1. ✅ User can add products to cart
2. ✅ User can select delivery address
3. ✅ Promo codes validate correctly
4. ✅ Payment options shown based on wallet balance
5. ✅ Card payments redirect to Paymob iframe
6. ✅ Wallet payments complete instantly
7. ✅ COD orders confirmed without payment
8. ✅ Orders store address snapshots
9. ✅ Refunds credit wallet automatically
10. ✅ Admin can process refunds

---

**Last Updated**: January 21, 2026  
**Status**: Phase 2 Complete - Ready for Testing
