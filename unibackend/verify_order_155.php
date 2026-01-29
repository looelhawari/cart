<?php
// Verify order 155 status update
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$order = \App\Models\Order::find(155);

if ($order) {
    echo "✅ Order Updated Successfully!\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    echo "Order ID: {$order->id}\n";
    echo "Order Number: {$order->order_number}\n";
    echo "Status: {$order->status}\n";
    echo "User ID: {$order->user_id}\n";
    echo "Total: {$order->total} EGP\n";
    echo "Payment Method: {$order->payment_method}\n";
    echo "Updated At: {$order->updated_at}\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
} else {
    echo "❌ Order 155 not found in database\n";
}
