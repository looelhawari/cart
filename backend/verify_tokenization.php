<?php

/**
 * Tokenization Verification Script
 *
 * Run this script to verify the tokenization implementation is working correctly.
 *
 * Usage: php verify_tokenization.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\PaymentMethod;
use App\Models\PaymobPayment;
use App\Services\PaymobService;
use App\Services\PaymentDecisionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "\n";
echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║  🔍 TOKENIZATION VERIFICATION SCRIPT                            ║\n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

$allPassed = true;

// Test 1: Database Schema
echo "📊 TEST 1: Database Schema\n";
echo str_repeat("-", 70) . "\n";

$schemaTests = [
    'payment_methods.paymob_card_token' => Schema::hasColumn('payment_methods', 'paymob_card_token'),
    'payment_methods.token_type' => Schema::hasColumn('payment_methods', 'token_type'),
    'payment_methods.status' => Schema::hasColumn('payment_methods', 'status'),
    'paymob_payments.flow' => Schema::hasColumn('paymob_payments', 'flow'),
    'paymob_payments.paymob_intention_id' => Schema::hasColumn('paymob_payments', 'paymob_intention_id'),
    'paymob_payments.moto_attempts' => Schema::hasColumn('paymob_payments', 'moto_attempts'),
    'paymob_payments.is_fallback_from_moto' => Schema::hasColumn('paymob_payments', 'is_fallback_from_moto'),
];

foreach ($schemaTests as $column => $exists) {
    if ($exists) {
        echo "  ✅ Column exists: {$column}\n";
    } else {
        echo "  ❌ Column missing: {$column}\n";
        $allPassed = false;
    }
}

// Check if payment_token was removed
$paymentTokenExists = Schema::hasColumn('paymob_payments', 'payment_token');
if (!$paymentTokenExists) {
    echo "  ✅ Legacy column removed: paymob_payments.payment_token\n";
} else {
    echo "  ⚠️  Legacy column still exists: paymob_payments.payment_token (should be removed)\n";
}

echo "\n";

// Test 2: Configuration
echo "⚙️  TEST 2: Configuration\n";
echo str_repeat("-", 70) . "\n";

$configTests = [
    'PAYMOB_PUBLIC_KEY' => config('services.paymob.public_key'),
    'PAYMOB_INTEGRATION_ID_3DS' => config('services.paymob.integration_id_3ds'),
    'PAYMENT_ENABLE_MOTO' => config('payments.enable_moto'),
    'PAYMENT_ENABLE_SAVED_CARDS' => config('payments.enable_saved_cards'),
    'PAYMENT_ENABLE_UNIFIED' => config('payments.enable_unified_checkout'),
];

foreach ($configTests as $key => $value) {
    if ($value) {
        $displayValue = is_bool($value) ? ($value ? 'true' : 'false') : substr($value, 0, 20) . '...';
        echo "  ✅ Config set: {$key} = {$displayValue}\n";
    } else {
        echo "  ❌ Config missing or false: {$key}\n";
        if (strpos($key, 'PAYMOB_') === 0) {
            $allPassed = false; // Required configs
        }
    }
}

echo "\n";

// Test 3: Services
echo "🔧 TEST 3: Services\n";
echo str_repeat("-", 70) . "\n";

try {
    $paymobService = app(PaymobService::class);
    echo "  ✅ PaymobService instantiated\n";

    // Check new methods exist
    $methods = ['createIntention', 'payWithSavedCardMoto', 'extractCardTokenFromIntention'];
    foreach ($methods as $method) {
        if (method_exists($paymobService, $method)) {
            echo "  ✅ Method exists: PaymobService::{$method}()\n";
        } else {
            echo "  ❌ Method missing: PaymobService::{$method}()\n";
            $allPassed = false;
        }
    }
} catch (Exception $e) {
    echo "  ❌ PaymobService instantiation failed: {$e->getMessage()}\n";
    $allPassed = false;
}

try {
    $decisionService = app(PaymentDecisionService::class);
    echo "  ✅ PaymentDecisionService instantiated\n";

    if (method_exists($decisionService, 'decidePaymentFlow')) {
        echo "  ✅ Method exists: PaymentDecisionService::decidePaymentFlow()\n";
    } else {
        echo "  ❌ Method missing: PaymentDecisionService::decidePaymentFlow()\n";
        $allPassed = false;
    }
} catch (Exception $e) {
    echo "  ❌ PaymentDecisionService instantiation failed: {$e->getMessage()}\n";
    $allPassed = false;
}

echo "\n";

// Test 4: Model Updates
echo "📦 TEST 4: Model Updates\n";
echo str_repeat("-", 70) . "\n";

try {
    $paymentMethod = new PaymentMethod();

    if (in_array('paymob_card_token', $paymentMethod->getFillable())) {
        echo "  ✅ PaymentMethod fillable: paymob_card_token\n";
    } else {
        echo "  ❌ PaymentMethod fillable missing: paymob_card_token\n";
        $allPassed = false;
    }

    if (method_exists($paymentMethod, 'isActive')) {
        echo "  ✅ PaymentMethod method: isActive()\n";
    } else {
        echo "  ❌ PaymentMethod method missing: isActive()\n";
        $allPassed = false;
    }
} catch (Exception $e) {
    echo "  ❌ PaymentMethod check failed: {$e->getMessage()}\n";
    $allPassed = false;
}

try {
    $paymobPayment = new PaymobPayment();

    $requiredFields = ['flow', 'paymob_intention_id', 'moto_attempts', 'is_fallback_from_moto'];
    foreach ($requiredFields as $field) {
        if (in_array($field, $paymobPayment->getFillable())) {
            echo "  ✅ PaymobPayment fillable: {$field}\n";
        } else {
            echo "  ❌ PaymobPayment fillable missing: {$field}\n";
            $allPassed = false;
        }
    }

    if (method_exists($paymobPayment, 'markMotoAttempted')) {
        echo "  ✅ PaymobPayment method: markMotoAttempted()\n";
    } else {
        echo "  ❌ PaymobPayment method missing: markMotoAttempted()\n";
        $allPassed = false;
    }
} catch (Exception $e) {
    echo "  ❌ PaymobPayment check failed: {$e->getMessage()}\n";
    $allPassed = false;
}

echo "\n";

// Test 5: Data Integrity
echo "💾 TEST 5: Data Integrity\n";
echo str_repeat("-", 70) . "\n";

$invalidCards = PaymentMethod::where('status', 'invalid')
    ->whereNotNull('invalidated_at')
    ->count();

if ($invalidCards > 0) {
    echo "  ✅ Old cards invalidated: {$invalidCards} records\n";
} else {
    echo "  ℹ️  No old cards found (fresh database or already cleaned)\n";
}

$activeCards = PaymentMethod::where('status', 'active')
    ->whereNotNull('paymob_card_token')
    ->count();

if ($activeCards > 0) {
    echo "  ✅ Active cards with new token: {$activeCards} records\n";
} else {
    echo "  ℹ️  No active cards with paymob_card_token yet (expected before first payment)\n";
}

echo "\n";

// Test 6: Routes
echo "🛣️  TEST 6: Routes\n";
echo str_repeat("-", 70) . "\n";

$routes = \Route::getRoutes();
$requiredRoutes = [
    'api/v1/payments/status/{paymentId}' => 'GET',
    'api/v1/payments/paymob/initiate' => 'POST',
    'api/v1/paymob/processed' => 'POST',
];

foreach ($requiredRoutes as $uri => $method) {
    $found = false;
    foreach ($routes as $route) {
        if (str_contains($route->uri(), $uri) && in_array($method, $route->methods())) {
            $found = true;
            break;
        }
    }

    if ($found) {
        echo "  ✅ Route exists: {$method} {$uri}\n";
    } else {
        echo "  ❌ Route missing: {$method} {$uri}\n";
        $allPassed = false;
    }
}

echo "\n";

// Final Summary
echo "╔══════════════════════════════════════════════════════════════════╗\n";
if ($allPassed) {
    echo "║  ✅ ALL TESTS PASSED - Ready for production testing!           ║\n";
} else {
    echo "║  ❌ SOME TESTS FAILED - Review errors above                    ║\n";
}
echo "╚══════════════════════════════════════════════════════════════════╝\n";

echo "\n";
echo "📋 NEXT STEPS:\n";
echo "  1. Test payment flow with 'save card' enabled\n";
echo "  2. Verify webhook receives token object from Paymob\n";
echo "  3. Check payment_methods table for paymob_card_token\n";
echo "  4. Test repeat payment with saved card (should attempt MOTO)\n";
echo "  5. Monitor logs for decision tree output\n";
echo "\n";

exit($allPassed ? 0 : 1);
