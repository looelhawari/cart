# Quick Testing Guide - Manual Payment Completion

## Problem

Paymob webhooks can't reach localhost during development, so payments stay PENDING forever.

## Solution

Use the test endpoint to manually complete payments after they show "Approved" in the app.

---

## How to Use

### Step 1: Place Order & Pay

1. Place order in app (e.g., Order #81)
2. Complete payment in Paymob
3. See "Approved" screen
4. Note the order ID from the polling logs

### Step 2: Complete Payment Manually

**In PowerShell:**

```powershell
# Replace 81 with your actual order ID
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/test/complete-payment/81" -Method POST
```

**Or create a simple test file:**

```bash
cd backend
php test_complete.php 81
```

Create `test_complete.php`:

```php
<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$orderId = $argv[1] ?? null;

if (!$orderId) {
    echo "Usage: php test_complete.php <order_id>\n";
    exit(1);
}

$ch = curl_init("http://localhost:8000/api/v1/test/complete-payment/{$orderId}");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP {$httpCode}\n";
echo $response . "\n";
```

### Step 3: Frontend Stops Polling

Within 3 seconds (next poll), the frontend will:

1. Call `/api/v1/payments/order/81/status`
2. Receive `payment_status: "completed"`
3. Stop polling immediately
4. Navigate to success screen

---

## Example Workflow

```
1. User places order #81 at 16:50:00
2. User completes payment in Paymob at 16:50:15
3. App shows "Processing payment..." and starts polling
4. Polling continues (status still PENDING):
   16:50:18 → PENDING
   16:50:21 → PENDING
   16:50:24 → PENDING

5. Developer runs manual completion at 16:50:26:
   php test_complete.php 81

6. Next poll at 16:50:27:
   Status: PAID ✅
   Payment Status: completed ✅

7. Frontend stops polling immediately
8. User sees success screen
```

---

## Troubleshooting

**"Payment already processed" error:**

- Payment was already completed
- Check: `php check_order_80.php` (replace with your order ID)

**"Order not found" error:**

- Wrong order ID
- Check recent orders: `SELECT id, order_number, payment_status FROM orders ORDER BY id DESC LIMIT 10;`

**Still polling after completion:**

- Frontend code not updated - rebuild React Native app
- API response missing fields - check backend updated correctly

---

## For Production

**⚠️ IMPORTANT:** Remove this test endpoint before deploying to production!

In `routes/api.php`, delete:

```php
// TESTING ONLY - Manual webhook completion (remove in production)
Route::post('test/complete-payment/{orderId}', ...);
```

Configure real Paymob webhook:

1. Deploy backend to public server
2. Go to Paymob dashboard
3. Set webhook URL: `https://yourdomain.com/api/v1/paymob/processed`
4. Webhooks will be delivered automatically

---

## Status

✅ **Test endpoint added** - Ready for local testing  
⚠️ **Remove before production** - Use real webhooks in production
