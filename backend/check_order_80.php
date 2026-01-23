<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║          ORDER 80 - DATABASE STATUS CHECK                         ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

// Check order
$order = DB::table('orders')->where('id', 80)->first();

if ($order) {
    echo "ORDER #80:\n";
    echo "  Order Number: {$order->order_number}\n";
    echo "  Status: {$order->status}\n";
    echo "  Payment Status: {$order->payment_status}\n";
    echo "  Total: {$order->total} EGP\n";
    echo "  Created: {$order->created_at}\n";
    echo "  Updated: {$order->updated_at}\n\n";
} else {
    echo "❌ Order #80 not found\n\n";
}

// Check Paymob payment
$payment = DB::table('paymob_payments')->where('order_id', 80)->first();

if ($payment) {
    echo "PAYMOB PAYMENT:\n";
    echo "  Status: {$payment->status}\n";
    echo "  Paymob Order ID: {$payment->paymob_order_id}\n";
    echo "  Transaction ID: " . ($payment->transaction_id ?? 'NULL') . "\n";
    echo "  Amount: {$payment->amount_cents} cents\n";
    echo "  Updated: {$payment->updated_at}\n\n";
} else {
    echo "❌ Paymob payment not found\n\n";
}

// Check payment transactions
$transactions = DB::table('payment_transactions')->where('order_id', 80)->get();

if ($transactions->count() > 0) {
    echo "PAYMENT TRANSACTIONS ({$transactions->count()}):\n";
    foreach ($transactions as $txn) {
        echo "  - Transaction ID: {$txn->transaction_id}\n";
        echo "    Status: {$txn->status}\n";
        echo "    Amount: {$txn->amount} EGP\n";
        echo "    Processed: {$txn->processed_at}\n\n";
    }
} else {
    echo "ℹ️  No payment transactions found\n\n";
}

// Check webhook logs
$webhookLogs = DB::table('logs')
    ->where('message', 'LIKE', '%webhook%')
    ->where('message', 'LIKE', '%80%')
    ->orWhere('context', 'LIKE', '%order_id":80%')
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

if ($webhookLogs->count() > 0) {
    echo "RECENT WEBHOOK LOGS:\n";
    foreach ($webhookLogs as $log) {
        echo "  - [{$log->created_at}] {$log->message}\n";
    }
    echo "\n";
}

echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║          DIAGNOSIS                                                ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

if ($order && $payment) {
    if ($payment->status === 'PENDING') {
        echo "❌ ISSUE: Paymob status is still PENDING\n";
        echo "   This means the webhook has NOT been received from Paymob\n\n";
        echo "   Possible causes:\n";
        echo "   1. Paymob webhook not configured correctly\n";
        echo "   2. Webhook URL not accessible\n";
        echo "   3. Webhook delivery delayed\n";
        echo "   4. HMAC verification failing\n\n";
    } elseif ($payment->status === 'PAID') {
        echo "✅ Paymob status: PAID\n";
        if ($order->payment_status === 'completed') {
            echo "✅ Order payment status: completed\n";
            echo "   Payment is successful! Frontend should stop polling.\n\n";
        } else {
            echo "⚠️  Order payment status: {$order->payment_status}\n";
            echo "   Webhook processed Paymob but didn't update order.\n\n";
        }
    }

    if ($transactions->count() === 0) {
        echo "⚠️  No payment transactions recorded\n";
        echo "   This confirms webhook hasn't processed successfully.\n\n";
    }
}

echo "═══════════════════════════════════════════════════════════════════\n";
