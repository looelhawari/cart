<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║          STEP 4 - DATABASE ENUM VERIFICATION                   ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

echo "Checking enum values for orders table...\n\n";

$columns = DB::select("SHOW COLUMNS FROM orders WHERE Field IN ('status', 'payment_status')");

foreach ($columns as $column) {
    echo "Column: {$column->Field}\n";
    echo "Type:   {$column->Type}\n";

    // Extract enum values
    if (preg_match("/^enum\((.+)\)$/i", $column->Type, $matches)) {
        $values = str_getcsv($matches[1], ',', "'");
        echo "Values:\n";
        foreach ($values as $value) {
            echo "  - {$value}\n";
        }
    }
    echo "\n";
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  REQUIRED ENUM VALUES CHECK\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Get status enum
$statusResult = DB::select("SHOW COLUMNS FROM orders WHERE Field = 'status'");
$statusType = $statusResult[0]->Type;

// Get payment_status enum
$paymentStatusResult = DB::select("SHOW COLUMNS FROM orders WHERE Field = 'payment_status'");
$paymentStatusType = $paymentStatusResult[0]->Type;

echo "STATUS ENUM:\n";
$requiredStatus = ['pending', 'pending_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'failed'];
foreach ($requiredStatus as $status) {
    $exists = stripos($statusType, "'$status'") !== false;
    $icon = $exists ? '✅' : '❌';
    echo "  {$icon} {$status}\n";
}

echo "\nPAYMENT_STATUS ENUM:\n";
$requiredPaymentStatus = ['pending', 'paid', 'completed', 'failed', 'refunded'];
foreach ($requiredPaymentStatus as $status) {
    $exists = stripos($paymentStatusType, "'$status'") !== false;
    $icon = $exists ? '✅' : '❌';
    echo "  {$icon} {$status}\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n\n";

// Test writing each value
echo "Testing write operations...\n\n";

try {
    // Test pending_payment status
    DB::statement("UPDATE orders SET status = 'pending_payment' WHERE id = (SELECT MIN(id) FROM (SELECT id FROM orders LIMIT 1) as temp)");
    echo "✅ Can write status = 'pending_payment'\n";
} catch (\Exception $e) {
    echo "❌ Cannot write status = 'pending_payment': {$e->getMessage()}\n";
}

try {
    // Test paid payment_status
    DB::statement("UPDATE orders SET payment_status = 'paid' WHERE id = (SELECT MIN(id) FROM (SELECT id FROM orders LIMIT 1) as temp)");
    echo "✅ Can write payment_status = 'paid'\n";
} catch (\Exception $e) {
    echo "❌ Cannot write payment_status = 'paid': {$e->getMessage()}\n";
}

try {
    // Test completed payment_status
    DB::statement("UPDATE orders SET payment_status = 'completed' WHERE id = (SELECT MIN(id) FROM (SELECT id FROM orders LIMIT 1) as temp)");
    echo "✅ Can write payment_status = 'completed'\n";
} catch (\Exception $e) {
    echo "❌ Cannot write payment_status = 'completed': {$e->getMessage()}\n";
}

echo "\n═══════════════════════════════════════════════════════════════\n";
echo "  VERIFICATION COMPLETE\n";
echo "═══════════════════════════════════════════════════════════════\n\n";
