<?php
/**
 * Quick Order Status Check
 *
 * Usage: php check_order.php 84
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$orderId = $argv[1] ?? 84;

echo "\n";
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║   ORDER STATUS CHECK - ORDER #{$orderId}                      \n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

// Get order
$order = DB::table('orders')->find($orderId);

if (!$order) {
    echo "❌ Order #{$orderId} not found\n\n";
    exit(1);
}

echo "ORDER DETAILS:\n";
echo "─────────────────────────────────────────────────────────────────\n";
echo "Order Number: {$order->order_number}\n";
echo "Status: {$order->status}\n";
echo "Payment Status: {$order->payment_status}\n";
echo "Total: {$order->total} EGP\n";
echo "Created: {$order->created_at}\n";
echo "\n";

// Get Paymob payment
$payment = DB::table('paymob_payments')->where('order_id', $orderId)->first();

if ($payment) {
    echo "PAYMOB PAYMENT:\n";
    echo "─────────────────────────────────────────────────────────────────\n";
    echo "Status: {$payment->status}\n";
    echo "Paymob Order ID: {$payment->paymob_order_id}\n";
    echo "Transaction ID: " . ($payment->transaction_id ?? 'NULL') . "\n";
    echo "Amount: " . ($payment->amount_cents / 100) . " EGP\n";
    echo "Created: {$payment->created_at}\n";
    echo "\n";
} else {
    echo "⚠️ No Paymob payment found\n\n";
}

// Get transactions
$transactions = DB::table('payment_transactions')->where('order_id', $orderId)->get();

if ($transactions->isNotEmpty()) {
    echo "PAYMENT TRANSACTIONS:\n";
    echo "─────────────────────────────────────────────────────────────────\n";
    foreach ($transactions as $tx) {
        echo "ID: {$tx->id}\n";
        echo "Status: {$tx->status}\n";
        echo "Transaction ID: {$tx->transaction_id}\n";
        echo "Amount: {$tx->amount} EGP\n";
        echo "Processed: {$tx->processed_at}\n";
        echo "\n";
    }
} else {
    echo "⚠️ No payment transactions found\n\n";
}

// Get cart
$cart = DB::table('carts')->where('user_id', $order->user_id)->first();

if ($cart) {
    $cartItems = DB::table('cart_items')->where('cart_id', $cart->id)->count();
    echo "CART STATUS:\n";
    echo "─────────────────────────────────────────────────────────────────\n";
    echo "Cart ID: {$cart->id}\n";
    echo "Items: {$cartItems}\n";
    echo "Status: " . ($cartItems > 0 ? "⚠️ NOT CLEARED" : "✅ CLEARED") . "\n";
    echo "\n";
} else {
    echo "⚠️ No cart found\n\n";
}

// Status Summary
echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║   STATUS SUMMARY                                              \n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

if ($order->payment_status === 'completed' && $order->status === 'confirmed') {
    echo "✅ PAYMENT SUCCESSFUL\n";
    echo "✅ Order confirmed and ready for processing\n";
} elseif ($order->payment_status === 'pending') {
    echo "⏳ PAYMENT PENDING\n";
    echo "⚠️ Waiting for webhook from Paymob\n";
    echo "\nPossible reasons:\n";
    echo "1. Webhook not yet received\n";
    echo "2. HMAC verification failed (check logs)\n";
    echo "3. Payment still processing at Paymob\n";
} elseif ($order->payment_status === 'failed') {
    echo "❌ PAYMENT FAILED\n";
    echo "❌ Order marked as failed\n";
} else {
    echo "⚠️ UNKNOWN STATUS: {$order->payment_status}\n";
}

echo "\n";
