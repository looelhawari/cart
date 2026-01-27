<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\PaymobPayment;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Cart;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║       MANUAL WEBHOOK SIMULATION FOR ORDER 80                      ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

$orderId = 80;

// Get order and payment
$order = Order::find($orderId);
$payment = PaymobPayment::where('order_id', $orderId)->first();

if (!$order || !$payment) {
    echo "❌ Order or payment not found\n";
    exit(1);
}

echo "Current State:\n";
echo "  Order Status: {$order->status}\n";
echo "  Payment Status: {$order->payment_status}\n";
echo "  Paymob Status: {$payment->status}\n";
echo "  Transaction ID: " . ($payment->transaction_id ?? 'NULL') . "\n\n";

echo "═══════════════════════════════════════════════════════════════════\n";
echo "Simulating successful webhook processing...\n";
echo "═══════════════════════════════════════════════════════════════════\n\n";

try {
    DB::transaction(function () use ($order, $payment) {
        $transactionId = 'MANUAL-TXN-' . time();

        // Update Paymob payment
        $payment->update([
            'status' => 'PAID',
            'transaction_id' => $transactionId,
            'paid_at' => now(),
            'paymob_response' => ['manual_completion' => true],
        ]);

        // Create payment transaction
        PaymentTransaction::create([
            'order_id' => $order->id,
            'transaction_id' => $transactionId,
            'payment_method' => 'card',
            'amount' => $order->total,
            'status' => 'completed',
            'gateway_response' => ['manual_completion' => true],
            'processed_at' => now(),
        ]);

        // Update order
        $order->update([
            'status' => 'confirmed',
            'payment_status' => 'completed',
        ]);

        // Clear cart
        $cart = Cart::where('user_id', $order->user_id)->first();
        if ($cart) {
            $cart->items()->delete();
            $cart->delete();
            echo "✅ Cart cleared (user_id: {$order->user_id})\n";
        } else {
            echo "ℹ️  No cart found to clear\n";
        }
    });

    echo "✅ Payment processed successfully!\n\n";

    // Reload and show final state
    $order->refresh();
    $payment->refresh();

    echo "Final State:\n";
    echo "  Order Status: {$order->status}\n";
    echo "  Payment Status: {$order->payment_status}\n";
    echo "  Paymob Status: {$payment->status}\n";
    echo "  Transaction ID: {$payment->transaction_id}\n\n";

    echo "╔══════════════════════════════════════════════════════════════════╗\n";
    echo "║       ✅ PAYMENT COMPLETED - POLLING SHOULD STOP NOW              ║\n";
    echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

    echo "Next API call to /api/v1/payments/order/80/status will return:\n";
    echo "  - status: PAID\n";
    echo "  - payment_status: completed\n";
    echo "  - order_status: confirmed\n\n";

    echo "Frontend will detect this and stop polling immediately.\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
