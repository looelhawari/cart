# 🔐 Paymob Payment Gateway - Complete Testing Guide

**ElBaraka Hypermarket - Payment Integration Documentation**

**Last Updated:** January 20, 2026  
**Integration Status:** ✅ Fully Implemented & Ready for Testing  
**Environment:** Sandbox (Test Mode)

---

## 📚 Table of Contents

1. [Quick Start](#-quick-start)
2. [What Was Implemented](#-what-was-implemented)
3. [Environment Setup](#-environment-setup)
4. [Testing Checklist](#-testing-checklist)
5. [Detailed Test Scenarios](#-detailed-test-scenarios)
6. [API Endpoints Reference](#-api-endpoints-reference)
7. [Debugging Guide](#-debugging-guide)
8. [Production Deployment](#-production-deployment)

---

## 🚀 Quick Start

### Prerequisites Check

```bash
# 1. Verify backend server is running
curl http://localhost:8000/api/v1/categories
# Should return: {"success":true,"data":{...}}

# 2. Verify frontend is running
# Open Expo app - should see home screen

# 3. Check Paymob credentials are configured
cd backend
cat .env | grep PAYMOB
```

**Expected Output:**

```
PAYMOB_API_KEY=ZXlKaGJHY2lP...
PAYMOB_HMAC_SECRET=3B7D14636C7FBAE5D45EC797AEDF8F15
PAYMOB_IFRAME_ID=919973
PAYMOB_CARD_INTEGRATION_ID=5084814
PAYMOB_WALLET_INTEGRATION_ID=5084831
```

### 30-Second Test

1. **Login to app** (use test account or register)
2. **Add any product to cart**
3. **Go to Checkout → Address → Payment**
4. **Select "Credit/Debit Card"**
5. **Click "Place Order"**
6. **In payment form, use test card:**
   - Card: `4987654321098769`
   - CVV: `123`
   - Expiry: `12/25`
7. **Click "Pay Now"**
8. **Wait for success message** ✅

---

## 🏗️ What Was Implemented

### Backend Components (Laravel)

#### 1. **Database Migration**

**File:** `backend/database/migrations/xxxx_create_paymob_payments_table.php`

Creates `paymob_payments` table with columns:

- `id` (primary key)
- `order_id` (foreign key to orders)
- `internal_order_id` (unique identifier: ORD-{id}-{timestamp})
- `paymob_order_id` (Paymob's order ID)
- `paymob_transaction_id` (transaction reference)
- `amount_cents` (payment amount in cents)
- `currency` (EGP)
- `payment_method` (CARD or WALLET)
- `integration_id` (Paymob integration ID)
- `status` (PENDING, PAID, FAILED, REFUNDED)
- `billing_data` (JSON - customer info)
- `payment_token` (Paymob payment key)
- `paymob_response` (JSON - full callback data)
- `timestamps`

**Run Migration:**

```bash
cd backend
php artisan migrate
```

#### 2. **Paymob Model**

**File:** `backend/app/Models/PaymobPayment.php`

Eloquent model with:

- Relationship to Order model
- JSON casting for billing_data and paymob_response
- Fillable fields for mass assignment

#### 3. **Paymob Service**

**File:** `backend/app/Services/PaymobService.php`

Handles 3-step Paymob flow:

```php
// Step 1: Authentication
authenticate() → returns auth_token

// Step 2: Order Registration
registerOrder($authToken, $amountCents, $orderId, $items) → returns paymob_order_id

// Step 3: Payment Key Generation
generatePaymentKey($authToken, $amount, $orderId, $billingData, $method) → returns payment_token

// Helper: Get iframe URL
getIframeUrl($paymentToken) → returns iframe URL for WebView

// Security: HMAC Verification
verifyHmac($data, $receivedHmac) → returns true/false
```

#### 4. **Payment Controller**

**File:** `backend/app/Http/Controllers/Api/PaymentController.php`

**Methods:**

1. `initiatePayment(Request)` - Creates payment session
2. `processedCallback(Request)` - Handles Paymob callback
3. `responseCallback(Request)` - Handles browser redirect
4. `getPaymentStatus($orderId)` - Returns payment status

#### 5. **API Routes**

**File:** `backend/routes/api.php`

```php
// Protected routes (requires auth)
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('payments')->group(function () {
        Route::post('/paymob/initiate', [PaymentController::class, 'initiatePayment']);
        Route::get('/order/{orderId}/status', [PaymentController::class, 'getPaymentStatus']);
    });
});

// Public routes (webhooks - no auth required)
Route::post('paymob/processed', [PaymentController::class, 'processedCallback']);
Route::get('payment/response', [PaymentController::class, 'responseCallback']);
```

---

### Frontend Components (React Native)

#### 1. **Paymob API Service**

**File:** `frontend/services/api/paymentsApi.ts`

```typescript
// Initiate payment
initiatePayment(orderId, paymentMethod, billingData)
  → returns { payment_token, iframe_url }

// Check payment status
getPaymentStatus(orderId)
  → returns { status: 'PAID' | 'PENDING' | 'FAILED' }
```

#### 2. **Payment WebView Component**

**File:** `frontend/components/PaymentWebView.tsx`

Features:

- Loads Paymob iframe in WebView
- Monitors URL changes for success/failure
- Handles payment callbacks
- Auto-refreshes cart on success
- Error handling with user feedback

#### 3. **Payment Screen**

**File:** `frontend/app/payment.tsx`

Dedicated screen for payment flow:

- Receives iframe URL from checkout
- Renders PaymentWebView component
- Handles success → navigate to order success
- Handles failure → show alert, allow retry

#### 4. **Checkout Confirmation**

**File:** `frontend/app/checkout/confirmation.tsx`

Updated to:

- Detect payment method (COD vs Card)
- For card payments: initiate Paymob flow
- Navigate to payment screen with iframe URL
- For COD: create order directly

#### 5. **Zustand Store Updates**

**File:** `frontend/store/index.ts`

Added cart management:

- `fetchCart()` - Refresh cart from backend
- Called after successful payment to clear cart

---

## ⚙️ Environment Setup

### Step 1: Backend Configuration

#### A. Install Dependencies (Already Done)

```bash
cd backend
composer install
```

#### B. Configure Environment Variables

**File:** `backend/.env`

```env
# Paymob Sandbox Credentials
PAYMOB_API_KEY=ZXlKaGJHY2lP...
PAYMOB_HMAC_SECRET=3B7D14636C7FBAE5D45EC797AEDF8F15
PAYMOB_IFRAME_ID=919973
PAYMOB_CARD_INTEGRATION_ID=5084814
PAYMOB_WALLET_INTEGRATION_ID=5084831
```

**⚠️ IMPORTANT:** Never commit `.env` file to Git!

#### C. Run Database Migration

```bash
php artisan migrate

# Verify table created
php artisan tinker
>>> \DB::table('paymob_payments')->count()
# Should return: 0 (empty table, no errors)
```

#### D. Start Laravel Server

```bash
php artisan serve
# Server running on: http://127.0.0.1:8000
```

Keep this terminal open.

---

### Step 2: Frontend Configuration

#### A. Install WebView Package

```bash
cd frontend
npm install react-native-webview --legacy-peer-deps
# or
npx expo install react-native-webview
```

#### B. Verify Installation

```bash
cat package.json | grep react-native-webview
# Should show: "react-native-webview": "^13.15.0"
```

#### C. Start Expo Server

```bash
npx expo start
```

#### D. Open App

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code for physical device

---

## ✅ Testing Checklist

### Pre-Test Verification

- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend app running (Expo)
- [ ] Can login to app
- [ ] Can add products to cart
- [ ] `paymob_payments` table exists in database
- [ ] WebView package installed

### Test Flow Checklist

#### Part 1: Order Creation

- [ ] Add product to cart
- [ ] Navigate to cart screen
- [ ] Click "Checkout"
- [ ] Select delivery address (or add new)
- [ ] Select delivery date/time slot
- [ ] Proceed to payment selection

#### Part 2: Payment Method Selection

- [ ] See two payment options: "Cash on Delivery" and "Credit/Debit Card"
- [ ] Select "Credit/Debit Card"
- [ ] Click "Continue to Payment"

#### Part 3: Order Confirmation

- [ ] Review order summary
- [ ] See total amount
- [ ] Click "Place Order" button
- [ ] Loading indicator appears

#### Part 4: Payment Screen

- [ ] Payment screen loads with WebView
- [ ] Paymob payment form displayed
- [ ] Can see amount to be charged
- [ ] Form fields are interactive

#### Part 5: Payment Form Submission

- [ ] Enter test card number: `4987654321098769`
- [ ] Enter CVV: `123`
- [ ] Enter expiry: `12/25`
- [ ] Enter name: `Test User`
- [ ] Click "Pay Now"
- [ ] Wait for processing

#### Part 6: Payment Success

- [ ] Success message appears
- [ ] Navigate to order success screen
- [ ] Cart is cleared (empty)
- [ ] Can see order details

#### Part 7: Backend Verification

- [ ] Check payment record in database
- [ ] Payment status is `PAID`
- [ ] Order status updated to `paid`
- [ ] Transaction ID populated

---

## 🧪 Detailed Test Scenarios

### ✅ Scenario 1: Successful Card Payment (Happy Path)

**Objective:** Test complete payment flow from cart to success.

**Steps:**

1. **Setup:**

   ```bash
   # Ensure servers running
   # Backend: http://localhost:8000
   # Frontend: Expo app open
   ```

2. **Login/Register:**
   - Open app
   - Login or create account
   - Verify you're on home screen

3. **Add to Cart:**
   - Browse products
   - Add 2-3 products to cart
   - Go to cart screen
   - Verify total amount

4. **Checkout - Address:**
   - Click "Checkout"
   - Select existing address OR add new:
     ```
     Name: John Doe
     Phone: +201234567890
     Address: 123 Main St, Cairo
     ```
   - Click "Continue"

5. **Checkout - Delivery:**
   - Select delivery date (tomorrow)
   - Select time slot (10 AM - 12 PM)
   - Click "Continue"

6. **Checkout - Payment:**
   - Select "Credit/Debit Card"
   - Click "Continue to Payment"

7. **Order Review:**
   - Verify order summary
   - Verify total amount
   - Click "Place Order"

8. **Payment Form:**
   - Wait for WebView to load (2-3 seconds)
   - Verify Paymob form appears
   - Fill form:
     - **Card Number:** `4987654321098769`
     - **CVV:** `123`
     - **Expiry:** `12/25`
     - **Name:** `Test User`
   - Click "Pay Now"

9. **Success:**
   - Wait for payment processing (5-10 seconds)
   - Should see success message
   - App navigates to order success screen
   - Cart badge shows 0 items

**Expected Results:**

✅ **Frontend:**

- Payment completed successfully
- Order confirmation shown
- Cart cleared
- Order appears in "My Orders"

✅ **Backend:**
Check database:

```sql
-- Find your order
SELECT * FROM orders ORDER BY id DESC LIMIT 1;

-- Check payment
SELECT * FROM paymob_payments WHERE order_id = [YOUR_ORDER_ID];

-- Expected payment record:
-- status: PAID
-- paymob_transaction_id: [NUMBER]
-- amount_cents: [TOTAL × 100]
-- payment_method: CARD
```

✅ **Laravel Logs:**

```bash
tail -f backend/storage/logs/laravel.log
```

Look for:

```
[timestamp] Paymob processed callback received
[timestamp] Order: ORD-XX-XXXXXXX
[timestamp] HMAC verification: passed
[timestamp] Payment marked as PAID
```

---

### ❌ Scenario 2: Payment Cancellation

**Objective:** Test user canceling payment.

**Steps:**

1. Follow Scenario 1 steps 1-8
2. When payment form loads, click "Cancel" or close WebView
3. Observe behavior

**Expected Results:**

- User returned to checkout/payment selection
- Order remains in "pending payment" status
- Cart NOT cleared
- Can retry payment
- Payment record status: `PENDING`

**Verify:**

```sql
SELECT status FROM paymob_payments WHERE order_id = [ORDER_ID];
-- Should show: PENDING
```

---

### ❌ Scenario 3: Invalid Card Details

**Objective:** Test form validation.

**Steps:**

1. Follow Scenario 1 steps 1-8
2. Enter invalid card: `1111111111111111`
3. Click "Pay Now"

**Expected Results:**

- Paymob shows error: "Invalid card number"
- Payment NOT processed
- User can correct and retry
- No backend callback received

---

### ⚠️ Scenario 4: Network Timeout

**Objective:** Test network error handling.

**Steps:**

1. Start payment flow
2. **Stop backend server** during payment:
   ```bash
   # In backend terminal, press Ctrl+C
   ```
3. Try to complete payment

**Expected Results:**

- Frontend shows error: "Connection error"
- Payment status remains `PENDING`
- User can retry when connection restored
- No data corruption

**Recovery:**

```bash
# Restart backend
php artisan serve

# User can retry payment for same order
```

---

### 🔄 Scenario 5: Duplicate Payment Prevention

**Objective:** Ensure order can't be paid twice.

**Steps:**

1. Complete successful payment (Scenario 1)
2. Try to access payment URL again for same order
3. Or try to initiate payment again

**Expected Results:**

- Backend returns error: "Order already paid"
- HTTP 400 response
- Frontend shows: "This order has already been paid"
- No second payment created

**Verify:**

```sql
SELECT COUNT(*) FROM paymob_payments
WHERE order_id = [ORDER_ID] AND status = 'PAID';
-- Should be: 1 (not 2)
```

---

### 🔐 Scenario 6: HMAC Verification

**Objective:** Test security - reject tampered callbacks.

**Steps:**

1. **Manually send callback with wrong HMAC:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/paymob/processed \
     -H "Content-Type: application/json" \
     -d '{
       "obj": {
         "order": {"id": 99999, "merchant_order_id": "ORD-1-123"},
         "amount_cents": 10000,
         "success": true,
         "id": 123456,
         "pending": false
       },
       "hmac": "INVALID_HMAC_12345"
     }'
   ```

**Expected Results:**

- HTTP 400 response
- Error: "HMAC verification failed"
- Payment status NOT updated
- Laravel log shows: "HMAC mismatch"

**Verify Security:**

```bash
grep "HMAC" backend/storage/logs/laravel.log
# Should see: "HMAC verification failed"
```

---

## 📡 API Endpoints Reference

### 1. Initiate Payment

**POST** `/api/v1/payments/paymob/initiate`

**Headers:**

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**

```json
{
  "order_id": 123,
  "payment_method": "CARD",
  "billing_data": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone_number": "+201234567890",
    "city": "Cairo",
    "street": "123 Main St"
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "payment_id": 456,
    "payment_token": "ZXlKMGVYQWlPaUpL...",
    "iframe_url": "https://accept.paymob.com/api/acceptance/iframes/919973?payment_token=...",
    "amount": 150.5,
    "currency": "EGP"
  }
}
```

**Error (422):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "order_id": ["The order id field is required."]
  }
}
```

---

### 2. Get Payment Status

**GET** `/api/v1/payments/order/{orderId}/status`

**Headers:**

```
Authorization: Bearer {access_token}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "PAID",
    "payment_method": "CARD",
    "amount_egp": 150.5,
    "transaction_id": "12345678",
    "created_at": "2026-01-20T10:30:00Z"
  }
}
```

**Response (404):**

```json
{
  "success": false,
  "message": "Payment not found for this order"
}
```

---

### 3. Paymob Processed Callback (Webhook)

**POST** `/api/v1/paymob/processed`

**No authentication required** (public webhook)

**Request Body (from Paymob):**

```json
{
  "obj": {
    "id": 123456789,
    "pending": false,
    "amount_cents": 15050,
    "success": true,
    "is_auth": false,
    "is_capture": false,
    "is_standalone_payment": true,
    "is_voided": false,
    "is_refunded": false,
    "is_3d_secure": true,
    "integration_id": 5084814,
    "profile_id": 1042752,
    "has_parent_transaction": false,
    "order": {
      "id": 987654,
      "created_at": "2026-01-20T10:29:00.000000Z",
      "amount_cents": 15050,
      "currency": "EGP",
      "merchant_order_id": "ORD-123-1737369000"
    },
    "created_at": "2026-01-20T10:30:00.000000Z",
    "currency": "EGP",
    "source_data": {
      "type": "card",
      "pan": "8769",
      "sub_type": "MasterCard"
    }
  },
  "type": "TRANSACTION",
  "hmac": "3a7c8e9f2b1d..."
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Payment callback processed successfully"
}
```

**Error (400):**

```json
{
  "success": false,
  "message": "HMAC verification failed"
}
```

---

### 4. Payment Response Callback (Browser Redirect)

**GET** `/api/v1/payment/response?success=true&...`

**Query Parameters:**

- `success` (boolean)
- `merchant_order_id` (string)
- Other Paymob params

**Response:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Payment Processing</title>
  </head>
  <body>
    <h1>Processing payment...</h1>
    <script>
      setTimeout(() => {
        window.location.href = "myapp://payment/success";
      }, 2000);
    </script>
  </body>
</html>
```

---

## 🔍 Debugging Guide

### Check Backend Logs

```bash
# Real-time monitoring
tail -f backend/storage/logs/laravel.log

# Search for errors
grep ERROR backend/storage/logs/laravel.log

# Filter payment-related logs
grep -i paymob backend/storage/logs/laravel.log

# Check HMAC verification
grep -i hmac backend/storage/logs/laravel.log
```

---

### Database Queries for Debugging

```sql
-- Check latest payments
SELECT
  id,
  order_id,
  internal_order_id,
  amount_cents/100 as amount_egp,
  payment_method,
  status,
  created_at
FROM paymob_payments
ORDER BY id DESC
LIMIT 10;

-- Find pending payments
SELECT * FROM paymob_payments
WHERE status = 'PENDING'
ORDER BY created_at DESC;

-- Check payment for specific order
SELECT * FROM paymob_payments
WHERE order_id = 123;

-- Check if order has multiple payments
SELECT order_id, COUNT(*) as payment_count
FROM paymob_payments
GROUP BY order_id
HAVING COUNT(*) > 1;

-- Check orders with payment issues
SELECT o.id, o.order_number, o.total, o.payment_status, p.status as paymob_status
FROM orders o
LEFT JOIN paymob_payments p ON o.id = p.order_id
WHERE o.payment_status != 'paid';
```

---

### Test API Endpoints with cURL

#### Test Initiate Payment

```bash
# 1. Get auth token first
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Copy access_token from response

# 2. Initiate payment
curl -X POST http://localhost:8000/api/v1/payments/paymob/initiate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "payment_method": "CARD",
    "billing_data": {
      "first_name": "Test",
      "last_name": "User",
      "email": "test@example.com",
      "phone_number": "+201234567890",
      "city": "Cairo",
      "street": "Test Street"
    }
  }'
```

#### Test Get Payment Status

```bash
curl -X GET http://localhost:8000/api/v1/payments/order/1/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Frontend Debugging

#### Check WebView Loading

```typescript
// In PaymentWebView.tsx, add console logs:
onNavigationStateChange={(navState) => {
  console.log('WebView URL:', navState.url);
  console.log('Can go back:', navState.canGoBack);
  console.log('Loading:', navState.loading);
  // ... rest of code
}}
```

#### Check API Calls

```typescript
// In paymentsApi.ts, log requests:
export const initiatePayment = async (...) => {
  console.log('Initiating payment:', { orderId, paymentMethod });
  const response = await apiRequest(...);
  console.log('Payment initiated:', response);
  return response;
};
```

#### Check Store State

```typescript
// In any component:
import { useStore } from "@/store";

const PaymentScreen = () => {
  const cart = useStore((state) => state.cart);
  console.log("Cart state:", cart);
  // ...
};
```

---

### Common Issues & Solutions

#### Issue 1: "HMAC verification failed"

**Cause:** Callback data modified or wrong secret

**Solution:**

```bash
# Verify HMAC secret in .env
cat backend/.env | grep PAYMOB_HMAC_SECRET

# Should match: 3B7D14636C7FBAE5D45EC797AEDF8F15

# If wrong, update and restart server
php artisan config:clear
php artisan serve
```

---

#### Issue 2: "Payment not found"

**Cause:** Order ID mismatch or payment not created

**Solution:**

```sql
-- Check if payment exists
SELECT * FROM paymob_payments WHERE order_id = [ORDER_ID];

-- If empty, check if initiate endpoint was called
-- Check Laravel logs for errors
```

---

#### Issue 3: WebView not loading

**Cause:** Package not installed or wrong URL

**Solution:**

```bash
# Reinstall package
cd frontend
rm -rf node_modules package-lock.json
npm install
npx expo install react-native-webview

# Restart Expo
npx expo start --clear
```

---

#### Issue 4: "Order already paid"

**Cause:** Trying to pay same order twice

**Solution:**
This is expected behavior. If you need to test again:

```sql
-- Delete payment record (ONLY IN TESTING)
DELETE FROM paymob_payments WHERE order_id = [ORDER_ID];

-- Reset order payment status
UPDATE orders SET payment_status = 'pending' WHERE id = [ORDER_ID];
```

---

#### Issue 5: Backend "500 Internal Server Error"

**Cause:** Various - check logs

**Solution:**

```bash
# Check Laravel logs
tail -50 backend/storage/logs/laravel.log

# Common fixes:
php artisan config:clear
php artisan cache:clear
php artisan route:clear

# Restart server
php artisan serve
```

---

## 🚀 Production Deployment

### ⚠️ Before Going Live

#### 1. Update to Production Credentials

**File:** `backend/.env`

```env
# PRODUCTION CREDENTIALS (get from Paymob dashboard)
PAYMOB_API_KEY=your_production_api_key
PAYMOB_HMAC_SECRET=your_production_hmac_secret
PAYMOB_IFRAME_ID=your_production_iframe_id
PAYMOB_CARD_INTEGRATION_ID=your_production_card_integration
PAYMOB_WALLET_INTEGRATION_ID=your_production_wallet_integration

# Set app to production
APP_ENV=production
APP_DEBUG=false
```

#### 2. Update Webhook URLs in Paymob Dashboard

Login to Paymob → Developers → Webhooks

**Add these URLs:**

```
Processed Callback:
https://api.elbaraka.com/api/v1/paymob/processed

Response Callback:
https://api.elbaraka.com/api/v1/payment/response
```

#### 3. Enable HTTPS

Ensure your backend has SSL certificate:

```
https://api.elbaraka.com (✅ required)
http://api.elbaraka.com (❌ not allowed)
```

#### 4. Test Production Integration

Use Paymob's **LIVE TEST CARD** first:

```
Card: (Get from Paymob dashboard)
CVV: 123
Expiry: 12/26
```

Process test transaction of 1 EGP before full launch.

#### 5. Monitor Production

```bash
# Set up log monitoring
tail -f /var/log/laravel/production.log

# Use monitoring service (recommended):
# - Sentry for error tracking
# - New Relic for performance
# - DataDog for infrastructure
```

---

## 📊 Test Results Template

```markdown
## Payment Integration Test Report

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Sandbox/Production

### Test Results

| Scenario             | Status | Notes |
| -------------------- | ------ | ----- |
| Successful Payment   | ✅/❌  |       |
| Payment Cancellation | ✅/❌  |       |
| Invalid Card         | ✅/❌  |       |
| Network Timeout      | ✅/❌  |       |
| Duplicate Prevention | ✅/❌  |       |
| HMAC Security        | ✅/❌  |       |

### Issues Found

1. [Issue description]
   - **Severity:** Critical/High/Medium/Low
   - **Steps to reproduce:**
   - **Expected:**
   - **Actual:**

### Performance

- Average payment time: X seconds
- WebView load time: Y seconds
- Backend response time: Z ms

### Recommendations

- [ ] Item 1
- [ ] Item 2
```

---

## 📞 Support & Resources

### Paymob Documentation

- API Docs: https://docs.paymob.com/
- Dashboard: https://accept.paymob.com/portal2/en/home
- Support: support@paymob.com

### Project Files

- Backend Service: `backend/app/Services/PaymobService.php`
- Backend Controller: `backend/app/Http/Controllers/Api/PaymentController.php`
- Frontend API: `frontend/services/api/paymentsApi.ts`
- Frontend Component: `frontend/components/PaymentWebView.tsx`

### Testing Credentials (Sandbox)

**Test Card:**

```
Card Number: 4987654321098769
CVV: 123
Expiry: Any future date (12/25)
Name: Test User
```

**Important:** These cards only work in sandbox mode with sandbox API keys.

---

## ✅ Final Checklist

Before marking integration as complete:

- [ ] All 6 test scenarios pass
- [ ] Database properly stores payment records
- [ ] HMAC verification working
- [ ] Cart clears after payment
- [ ] Order status updates correctly
- [ ] WebView loads and displays form
- [ ] Success/failure flows work
- [ ] Logs show no errors
- [ ] Can retry failed payments
- [ ] Duplicate payments prevented
- [ ] Production credentials ready (when deploying)

---

**Last Updated:** January 20, 2026  
**Review Status:** ✅ Ready for Testing  
**Next Review:** Before Production Deployment

---

_This guide covers everything you need to test the Paymob payment integration. For questions or issues, check the debugging section or contact the development team._
