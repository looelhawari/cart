<?php
/**
 * Pre-Flight Check - Payment System Setup Verification
 * Run this before testing to ensure everything is configured correctly
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║       PAYMENT SYSTEM - PRE-FLIGHT CHECK                          ║\n";
echo "║       All systems must be ✅ before testing                       ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

$allPassed = true;

// ═══════════════════════════════════════════════════════════════════════
// 1. DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════════════════
echo "1. DATABASE CONNECTION\n";
echo str_repeat("─", 70) . "\n";
try {
    DB::connection()->getPdo();
    echo "   ✅ Database connected\n";
    echo "   Database: " . env('DB_DATABASE') . "\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: {$e->getMessage()}\n";
    $allPassed = false;
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 2. REQUIRED TABLES
// ═══════════════════════════════════════════════════════════════════════
echo "2. REQUIRED TABLES\n";
echo str_repeat("─", 70) . "\n";
$requiredTables = [
    'orders',
    'paymob_payments',
    'payment_transactions',
    'carts',
    'cart_items',
];

foreach ($requiredTables as $table) {
    try {
        DB::table($table)->limit(1)->count();
        echo "   ✅ {$table}\n";
    } catch (Exception $e) {
        echo "   ❌ {$table} - MISSING OR INACCESSIBLE\n";
        $allPassed = false;
    }
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 3. PAYMOB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
echo "3. PAYMOB CONFIGURATION\n";
echo str_repeat("─", 70) . "\n";

$paymobConfigs = [
    'PAYMOB_API_KEY' => env('PAYMOB_API_KEY'),
    'PAYMOB_HMAC_SECRET' => env('PAYMOB_HMAC_SECRET'),
    'PAYMOB_IFRAME_ID' => env('PAYMOB_IFRAME_ID'),
    'PAYMOB_CARD_INTEGRATION_ID' => env('PAYMOB_CARD_INTEGRATION_ID'),
];

foreach ($paymobConfigs as $key => $value) {
    if (!empty($value)) {
        echo "   ✅ {$key} configured\n";
    } else {
        echo "   ❌ {$key} - MISSING IN .env\n";
        $allPassed = false;
    }
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 4. LARAVEL SERVER STATUS
// ═══════════════════════════════════════════════════════════════════════
echo "4. LARAVEL SERVER STATUS\n";
echo str_repeat("─", 70) . "\n";

try {
    $ch = curl_init('http://localhost:8000/api/v1/health');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 || $httpCode === 404) {
        echo "   ✅ Laravel server running on http://localhost:8000\n";
    } else {
        echo "   ⚠️  Laravel server responded with HTTP {$httpCode}\n";
        echo "   Make sure: php artisan serve is running\n";
        $allPassed = false;
    }
} catch (Exception $e) {
    echo "   ❌ Cannot reach Laravel server\n";
    echo "   Run: php artisan serve\n";
    $allPassed = false;
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 5. NGROK TUNNEL STATUS
// ═══════════════════════════════════════════════════════════════════════
echo "5. NGROK TUNNEL STATUS\n";
echo str_repeat("─", 70) . "\n";

$ngrokUrl = 'https://eda0fc6b3e9d.ngrok-free.app';

try {
    $ch = curl_init("{$ngrokUrl}/api/v1/health");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 || $httpCode === 404) {
        echo "   ✅ ngrok tunnel active: {$ngrokUrl}\n";
        echo "   ✅ Paymob can reach your server\n";
    } else {
        echo "   ⚠️  ngrok tunnel returned HTTP {$httpCode}\n";
        echo "   This might be the ngrok warning page (click 'Visit Site')\n";
    }
} catch (Exception $e) {
    echo "   ❌ Cannot reach ngrok URL\n";
    echo "   Make sure ngrok is running: ngrok http 8000\n";
    $allPassed = false;
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 6. WEBHOOK ROUTE TEST
// ═══════════════════════════════════════════════════════════════════════
echo "6. WEBHOOK ROUTE AVAILABILITY\n";
echo str_repeat("─", 70) . "\n";

$webhookUrl = 'http://localhost:8000/api/v1/paymob/processed';

try {
    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['test' => true]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // 403 is expected (HMAC verification will fail), but route exists
    if ($httpCode === 403 || $httpCode === 400) {
        echo "   ✅ Webhook endpoint accessible\n";
        echo "   Route: /api/v1/paymob/processed\n";
    } else {
        echo "   ⚠️  Webhook endpoint returned HTTP {$httpCode}\n";
        echo "   Expected 403 (HMAC verification), got {$httpCode}\n";
    }
} catch (Exception $e) {
    echo "   ❌ Webhook endpoint not accessible\n";
    $allPassed = false;
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 7. PAYMENT MODELS CHECK
// ═══════════════════════════════════════════════════════════════════════
echo "7. PAYMENT MODELS\n";
echo str_repeat("─", 70) . "\n";

try {
    $order = new \App\Models\Order();
    echo "   ✅ Order model loaded\n";

    $payment = new \App\Models\PaymobPayment();
    echo "   ✅ PaymobPayment model loaded\n";

    $transaction = new \App\Models\PaymentTransaction();
    echo "   ✅ PaymentTransaction model loaded\n";

    $cart = new \App\Models\Cart();
    echo "   ✅ Cart model loaded\n";
} catch (Exception $e) {
    echo "   ❌ Model loading failed: {$e->getMessage()}\n";
    $allPassed = false;
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// 8. TEST USER CHECK
// ═══════════════════════════════════════════════════════════════════════
echo "8. TEST USER\n";
echo str_repeat("─", 70) . "\n";

try {
    $user = DB::table('users')->where('id', 2)->first();
    if ($user) {
        echo "   ✅ Test user found (ID: 2)\n";
        echo "   Email: {$user->email}\n";
    } else {
        echo "   ⚠️  No test user with ID 2\n";
        echo "   You can create one or login to app with existing user\n";
    }
} catch (Exception $e) {
    echo "   ❌ Cannot check users table\n";
}
echo "\n";

// ═══════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════
echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║       SUMMARY                                                     ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

if ($allPassed) {
    echo "✅ ALL CHECKS PASSED - READY TO TEST!\n\n";
    echo "Next Steps:\n";
    echo "1. Configure Paymob Webhook URL:\n";
    echo "   https://eda0fc6b3e9d.ngrok-free.app/api/v1/paymob/processed\n\n";
    echo "2. Rebuild React Native app (frontend config updated)\n";
    echo "   cd frontend\n";
    echo "   npm start -- --reset-cache\n\n";
    echo "3. Start testing!\n\n";
} else {
    echo "❌ SOME CHECKS FAILED\n\n";
    echo "Fix the issues above before testing.\n";
    echo "Common fixes:\n";
    echo "- Start Laravel: php artisan serve\n";
    echo "- Start ngrok: ngrok http 8000\n";
    echo "- Check .env configuration\n";
    echo "- Run migrations: php artisan migrate\n\n";
}

echo "═══════════════════════════════════════════════════════════════════\n";
echo "\n";

echo "📋 PAYMOB WEBHOOK CONFIGURATION\n";
echo str_repeat("─", 70) . "\n";
echo "Login to Paymob Dashboard and configure:\n\n";
echo "Transaction Processed Callback:\n";
echo "🔗 https://eda0fc6b3e9d.ngrok-free.app/api/v1/paymob/processed\n\n";
echo "This is CRITICAL - webhooks won't work without it!\n";
echo "═══════════════════════════════════════════════════════════════════\n";

exit($allPassed ? 0 : 1);
