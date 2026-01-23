<?php
/**
 * Quick payment completion helper for development/testing
 *
 * Usage: php test_complete.php <order_id>
 * Example: php test_complete.php 81
 */

if (php_sapi_name() !== 'cli') {
    die("This script must be run from command line\n");
}

$orderId = $argv[1] ?? null;

if (!$orderId || !is_numeric($orderId)) {
    echo "╔══════════════════════════════════════════════════════════════════╗\n";
    echo "║       Manual Payment Completion - Testing Tool                   ║\n";
    echo "╚══════════════════════════════════════════════════════════════════╝\n\n";
    echo "Usage: php test_complete.php <order_id>\n";
    echo "Example: php test_complete.php 81\n\n";
    exit(1);
}

echo "╔══════════════════════════════════════════════════════════════════╗\n";
echo "║       Completing Payment for Order #{$orderId}                        \n";
echo "╚══════════════════════════════════════════════════════════════════╝\n\n";

$url = "http://localhost:8000/api/v1/test/complete-payment/{$orderId}";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

echo "Calling: POST {$url}\n\n";

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "❌ cURL Error: {$curlError}\n";
    echo "   Make sure Laravel backend is running on http://localhost:8000\n";
    exit(1);
}

echo "HTTP Status: {$httpCode}\n";
echo "Response:\n";
echo str_repeat("─", 70) . "\n";

$decoded = json_decode($response, true);
if ($decoded) {
    echo json_encode($decoded, JSON_PRETTY_PRINT) . "\n";
} else {
    echo $response . "\n";
}

echo str_repeat("─", 70) . "\n\n";

if ($httpCode === 200) {
    echo "✅ SUCCESS - Payment completed!\n\n";
    echo "Frontend will detect this on next poll (within 3 seconds) and:\n";
    echo "  1. Stop polling immediately\n";
    echo "  2. Navigate to success screen\n";
    echo "  3. Cart will be cleared\n\n";
} elseif ($httpCode === 400) {
    echo "⚠️  Payment already processed or invalid state\n";
    echo "   Run: php check_order_{$orderId}.php for current status\n\n";
} elseif ($httpCode === 404) {
    echo "❌ Order not found\n";
    echo "   Check order ID is correct\n\n";
} else {
    echo "❌ Unexpected error\n\n";
}
