<?php
/**
 * Seed realistic inventory data for load testing
 * Ensures test products have stock and adds more orders for realistic load
 */
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== CART Realistic Data Seeder ===\n\n";

// 1. Ensure ALL products have stock for load testing
$updated = DB::table('products')
    ->where('stock_quantity', '<', 100)
    ->update([
        'stock_quantity' => DB::raw('FLOOR(100 + RAND() * 900)'),
        'is_in_stock' => true,
        'is_active' => true,
    ]);
echo "1. Restocked {$updated} products to 100-1000 units\n";

// 2. Ensure the specific test barcodes have lots of stock
$testBarcodes = [1230331, 1230739, 1231233, 1231932, 2781433, 2783842, 2852724, 2854528, 2886925, 2888224];
DB::table('products')
    ->whereIn('barcode', $testBarcodes)
    ->update([
        'stock_quantity' => 5000,
        'is_in_stock' => true,
        'is_active' => true,
    ]);
echo "2. Set 5000 stock for " . count($testBarcodes) . " test product barcodes\n";

// 3. Clear any stale carts from previous test runs (keep user carts clean)
$deleted = DB::table('cart_items')
    ->whereIn('cart_id', function($q) {
        $q->select('id')->from('carts')
          ->whereIn('user_id', function($q2) {
              $q2->select('id')->from('users')
                ->where('email', 'like', 'k6test%@loadtest.com');
          });
    })
    ->delete();
echo "3. Cleared {$deleted} stale cart items from test users\n";

// 4. Delete old tokens for test users (prevent token table bloat)
$tokenDeleted = DB::table('personal_access_tokens')
    ->whereIn('tokenable_id', function($q) {
        $q->select('id')->from('users')
          ->where('email', 'like', 'k6test%@loadtest.com');
    })
    ->where('tokenable_type', 'App\Models\User')
    ->delete();
echo "4. Cleaned {$tokenDeleted} stale tokens from test users\n";

// 5. Ensure all test users have addresses with delivery zone
$testUsers = DB::table('users')
    ->where('email', 'like', 'k6test%@loadtest.com')
    ->pluck('id');

$addressCount = 0;
foreach ($testUsers as $userId) {
    $hasAddress = DB::table('addresses')->where('user_id', $userId)->exists();
    if (!$hasAddress) {
        DB::table('addresses')->insert([
            'user_id' => $userId,
            'label' => 'Home',
            'street' => 'Test Street ' . $userId,
            'city' => 'Cairo',
            'area' => 'Maadi',
            'building' => 'B' . rand(1, 99),
            'floor' => rand(1, 10),
            'apartment' => 'A' . rand(1, 20),
            'latitude' => 30.0444 + (rand(-100, 100) / 10000),
            'longitude' => 31.2357 + (rand(-100, 100) / 10000),
            'is_default' => true,
            'delivery_zone_id' => rand(1, 3),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $addressCount++;
    }
}
echo "5. Created {$addressCount} missing addresses for test users\n";

// 6. Verify product availability for each test barcode
echo "\n6. Test product verification:\n";
foreach ($testBarcodes as $bc) {
    $p = DB::table('products')->where('barcode', $bc)->first();
    if ($p) {
        echo "   Barcode {$bc}: stock={$p->stock_quantity}, active={$p->is_active}, in_stock={$p->is_in_stock}\n";
    } else {
        echo "   Barcode {$bc}: NOT FOUND!\n";
    }
}

// 7. Check delivery zones exist
$zones = DB::table('delivery_zones')->get();
echo "\n7. Delivery zones: " . $zones->count() . "\n";
foreach ($zones as $z) {
    echo "   Zone {$z->id}: {$z->name} (fee={$z->delivery_fee}, active={$z->is_active})\n";
}

echo "\n=== Seeding complete! Ready for k6 load testing ===\n";
