<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Get tables from database
$dbTables = collect(DB::select('SHOW TABLES'))
    ->map(fn($table) => current((array)$table))
    ->sort()
    ->values()
    ->toArray();

// Tables from SQL file (extracted manually from grep results)
$sqlTables = [
    'activity_log',
    'activity_logs',
    'addresses',
    'admin_logs',
    'cache',
    'cache_locks',
    'carts',
    'cart_items',
    'categories',
    'complaints',
    'complaint_attachments',
    'complaint_messages',
    'delivery_zones',
    'device_tokens',
    'failed_jobs',
    'favorites',
    'jobs',
    'job_batches',
    'migrations',
    'notifications',
    'orders',
    'order_items',
    'order_status_history',
    'otps',
    'password_reset_tokens',
    'payment_methods',
    'payment_transactions',
    'paymob_payments',
    'pending_registrations',
    'personal_access_tokens',
    'products',
    'product_categories',
    'promotions',
    'promotion_categories',
    'promotion_products',
    'promo_codes',
    'promo_code_bogo_rules',
    'promo_code_categories',
    'promo_code_products',
    'promo_code_usage',
    'refund_locks',
    'reviews',
    'sessions',
    'settings',
    'support_tickets',
    'ticket_messages',
    'users',
    'user_settings',
    'user_wallets',
    'wallet_transactions',
];

sort($sqlTables);

echo "=== DATABASE TABLES ===\n";
echo "Total: " . count($dbTables) . "\n";
print_r($dbTables);

echo "\n=== SQL FILE TABLES ===\n";
echo "Total: " . count($sqlTables) . "\n";
print_r($sqlTables);

echo "\n=== MISSING IN DATABASE ===\n";
$missing = array_diff($sqlTables, $dbTables);
if (empty($missing)) {
    echo "None - All tables exist!\n";
} else {
    print_r(array_values($missing));
}

echo "\n=== EXTRA IN DATABASE (not in SQL file) ===\n";
$extra = array_diff($dbTables, $sqlTables);
if (empty($extra)) {
    echo "None\n";
} else {
    print_r(array_values($extra));
}
