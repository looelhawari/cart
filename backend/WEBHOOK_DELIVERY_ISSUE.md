# Webhook Delivery Issue - Development Environment

## Problem Identified

**Paymob webhooks are not being delivered** because the backend is running on localhost, which is not accessible from the internet.

### Evidence

```
ORDER #80:
  Status: pending_payment
  Payment Status: pending
  Paymob Status: PENDING
  Transaction ID: NULL  ← Webhook never received
```

### Why This Happens

1. Backend runs on `http://localhost:8000` (not publicly accessible)
2. Paymob tries to send webhook to configured URL
3. If URL is localhost/127.0.0.1, webhook fails to deliver
4. Payment stays PENDING forever
5. Frontend polls for 30 seconds then shows timeout message

## Solutions

### Option 1: Expose Localhost (Testing)

**Using ngrok:**

```bash
# Install ngrok: https://ngrok.com/download

# Expose port 8000
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Configure in Paymob dashboard:
#   Webhook URL: https://abc123.ngrok.io/api/v1/paymob/processed
```

**Using localtunnel:**

```bash
# Install
npm install -g localtunnel

# Expose port 8000
lt --port 8000

# Copy the URL and configure in Paymob
```

**After configuring:**

1. Update Paymob dashboard with tunnel URL
2. Place new order
3. Complete payment
4. Webhook will be delivered
5. Frontend will detect `payment_status=completed` and stop polling

---

### Option 2: Manual Webhook Simulation (Current Testing)

**For order #80 (already completed manually):**

```bash
php complete_order_80.php
```

**For future orders:**

```bash
# Replace 81 with actual order ID
php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

\$orderId = 81; // Change this

DB::transaction(function () use (\$orderId) {
    \$order = App\Models\Order::find(\$orderId);
    \$payment = App\Models\PaymobPayment::where('order_id', \$orderId)->first();

    \$txnId = 'MANUAL-' . time();

    \$payment->update([
        'status' => 'PAID',
        'transaction_id' => \$txnId,
        'paid_at' => now(),
    ]);

    App\Models\PaymentTransaction::create([
        'order_id' => \$orderId,
        'transaction_id' => \$txnId,
        'payment_method' => 'card',
        'amount' => \$order->total,
        'status' => 'completed',
        'processed_at' => now(),
    ]);

    \$order->update([
        'status' => 'confirmed',
        'payment_status' => 'completed',
    ]);

    \$cart = App\Models\Cart::where('user_id', \$order->user_id)->first();
    if (\$cart) {
        \$cart->items()->delete();
        \$cart->delete();
    }
});

echo 'Payment completed for order #' . \$orderId . \"\n\";
"
```

---

### Option 3: Production Deployment

**Deploy backend to production:**

- Use real server with public IP/domain
- Configure Paymob webhook URL: `https://yourdomain.com/api/v1/paymob/processed`
- Webhooks will be delivered automatically

---

### Option 4: Mock Webhook Endpoint (Testing)

**Create test endpoint to manually trigger webhook:**

Add to `routes/api.php`:

```php
// Testing only - remove in production
Route::post('test/complete-payment/{orderId}', function ($orderId) {
    $order = \App\Models\Order::find($orderId);
    $payment = \App\Models\PaymobPayment::where('order_id', $orderId)->first();

    if (!$order || !$payment) {
        return response()->json(['error' => 'Not found'], 404);
    }

    DB::transaction(function () use ($order, $payment) {
        $txnId = 'TEST-' . time();

        $payment->update([
            'status' => 'PAID',
            'transaction_id' => $txnId,
            'paid_at' => now(),
        ]);

        \App\Models\PaymentTransaction::create([
            'order_id' => $order->id,
            'transaction_id' => $txnId,
            'payment_method' => 'card',
            'amount' => $order->total,
            'status' => 'completed',
            'processed_at' => now(),
        ]);

        $order->update([
            'status' => 'confirmed',
            'payment_status' => 'completed',
        ]);

        $cart = \App\Models\Cart::where('user_id', $order->user_id)->first();
        if ($cart) {
            $cart->items()->delete();
            $cart->delete();
        }
    });

    return response()->json([
        'success' => true,
        'message' => 'Payment completed',
        'order_id' => $orderId,
    ]);
});
```

**Usage:**

```bash
# In another terminal, after seeing "Approved" in app:
curl -X POST http://localhost:8000/api/v1/test/complete-payment/80

# Frontend will detect completion on next poll and stop
```

---

## Recommended Approach

**For current development:**

1. ✅ Use **Option 4** (mock webhook endpoint) - easiest for testing
2. Add test endpoint to routes
3. When payment shows "Approved", call test endpoint manually
4. Frontend will detect completion and stop polling

**For production:**

1. Deploy backend to real server with public URL
2. Configure Paymob webhook URL in dashboard
3. Webhooks will be delivered automatically
4. Remove test endpoint

---

## Verification

After completing payment (any method above):

```bash
# Check status API response
curl http://localhost:8000/api/v1/payments/order/80/status

# Should return:
{
  "success": true,
  "data": {
    "status": "PAID",
    "payment_status": "completed",  ← Frontend detects this
    "order_status": "confirmed"
  }
}
```

Frontend polling will see `payment_status === "completed"` and stop immediately.

---

## Status

✅ **Order #80 manually completed** - Frontend should stop polling now  
⚠️ **Future orders need webhook configuration** - Choose solution above
