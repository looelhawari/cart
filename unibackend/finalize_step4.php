<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "╔════════════════════════════════════════════════════════════════╗\n";
echo "║          STEP 4 FINAL - ENUM STANDARDIZATION                   ║\n";
echo "╚════════════════════════════════════════════════════════════════╝\n\n";

echo "Step 1: Checking for existing 'paid' values...\n\n";

$paidCount = DB::table('orders')->where('payment_status', 'paid')->count();

if ($paidCount > 0) {
    echo "  ⚠️  Found {$paidCount} orders with payment_status='paid'\n";
    echo "  Converting to 'completed'...\n";

    DB::table('orders')
        ->where('payment_status', 'paid')
        ->update(['payment_status' => 'completed']);

    echo "  ✅ Migrated {$paidCount} orders from 'paid' to 'completed'\n\n";
} else {
    echo "  ✅ No orders with 'paid' status found\n\n";
}

echo "Step 2: Updating payment_status ENUM to remove 'paid'...\n\n";

try {
    DB::statement("ALTER TABLE `orders`
        MODIFY COLUMN `payment_status` ENUM(
            'pending',
            'completed',
            'failed',
            'refunded'
        ) DEFAULT 'pending'");

    echo "  ✅ Enum updated successfully\n\n";
} catch (\Exception $e) {
    echo "  ❌ FAILED: {$e->getMessage()}\n\n";
    exit(1);
}

echo "Step 3: Verifying final enum values...\n\n";

$result = DB::select("SHOW COLUMNS FROM orders WHERE Field = 'payment_status'");
echo "  payment_status Type: {$result[0]->Type}\n\n";

echo "Step 4: Testing write operations...\n\n";

try {
    // Try to write 'paid' - should FAIL
    try {
        DB::statement("UPDATE orders SET payment_status = 'paid' WHERE id = 1");
        echo "  ❌ ERROR: Can still write 'paid' (should have been removed!)\n";
        exit(1);
    } catch (\Exception $e) {
        echo "  ✅ Cannot write 'paid' (correctly removed from enum)\n";
    }

    // Try to write 'completed' - should SUCCEED
    DB::statement("UPDATE orders SET payment_status = 'completed' WHERE id = 1");
    echo "  ✅ Can write 'completed'\n\n";

} catch (\Exception $e) {
    echo "  ❌ FAILED: {$e->getMessage()}\n\n";
    exit(1);
}

echo "═══════════════════════════════════════════════════════════════\n";
echo "  FINAL ENUM VALUES\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "orders.payment_status:\n";
echo "  ✅ pending\n";
echo "  ✅ completed  ← ONLY success value\n";
echo "  ✅ failed\n";
echo "  ✅ refunded\n";
echo "  ❌ paid       ← REMOVED\n\n";

echo "═══════════════════════════════════════════════════════════════\n";
echo "  STANDARDIZATION COMPLETE\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "Single source of truth: 'completed' = payment successful\n";
echo "Paymob tables can use 'PAID', but orders.payment_status uses 'completed' only\n\n";
