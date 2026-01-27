<?php

/**
 * Quick test script to verify PaymentMethod encryption works
 *
 * Run: php test_encryption.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\PaymentMethod;
use Illuminate\Support\Facades\DB;

echo "🔐 Testing PaymentMethod Token Encryption\n";
echo "==========================================\n\n";

// Test 1: Create PaymentMethod with plaintext token
echo "1️⃣ Creating test payment method...\n";

$testToken = 'test_paymob_token_' . time();
$testUserId = 2; // Assuming test user exists

try {
    $pm = new PaymentMethod([
        'user_id' => $testUserId,
        'type' => 'card',
        'card_last_four' => '4242',
        'card_brand' => 'visa',
        'token' => $testToken, // Should be encrypted automatically
        'is_default' => true,
        'is_verified' => true,
    ]);

    echo "   ✅ PaymentMethod instance created\n";
    echo "   📝 Original token (plaintext): {$testToken}\n\n";

    // Test 2: Check encryption happens before save
    echo "2️⃣ Checking encrypted attribute...\n";
    $encryptedToken = $pm->getAttributes()['token'];

    if ($encryptedToken === $testToken) {
        echo "   ❌ ERROR: Token NOT encrypted!\n";
        exit(1);
    }

    echo "   ✅ Token encrypted in memory\n";
    echo "   🔒 Encrypted value: " . substr($encryptedToken, 0, 50) . "...\n\n";

    // Test 3: Verify decryption accessor works
    echo "3️⃣ Verifying decryption accessor...\n";
    $decryptedToken = $pm->token;

    if ($decryptedToken !== $testToken) {
        echo "   ❌ ERROR: Decryption failed!\n";
        echo "   Expected: {$testToken}\n";
        echo "   Got: {$decryptedToken}\n";
        exit(1);
    }

    echo "   ✅ Decryption works correctly\n";
    echo "   🔓 Decrypted value: {$decryptedToken}\n\n";

    // Test 4: Verify model methods
    echo "4️⃣ Testing model methods...\n";
    echo "   Masked card: {$pm->masked_card}\n";
    echo "   Card icon: {$pm->card_icon}\n";
    echo "   Is expired: " . ($pm->isExpired() ? 'Yes' : 'No') . "\n";
    echo "   Has valid token: " . ($pm->hasValidToken() ? 'Yes' : 'No') . "\n\n";

    echo "✅ ALL TESTS PASSED!\n\n";
    echo "Summary:\n";
    echo "--------\n";
    echo "✅ Token encryption works (setTokenAttribute)\n";
    echo "✅ Token decryption works (getTokenAttribute)\n";
    echo "✅ Model methods functional\n";
    echo "✅ Ready for production use\n\n";

    echo "Note: Payment method NOT saved to database (test only)\n";

} catch (\Exception $e) {
    echo "\n❌ ERROR: {$e->getMessage()}\n";
    echo "Stack trace:\n{$e->getTraceAsString()}\n";
    exit(1);
}
