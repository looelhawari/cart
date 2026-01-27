<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Get first user
$user = App\Models\User::first();

if (!$user) {
    echo "No users found in database\n";
    exit(1);
}

// Create a test token
$token = $user->createToken('wallet-test')->plainTextToken;

echo "User: {$user->email}\n";
echo "Token: {$token}\n\n";

// Test the wallet endpoint
$url = 'http://localhost:8000/api/v1/wallet';
$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Content-Type: application/json',
        "Authorization: Bearer {$token}",
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status: {$httpCode}\n";
echo "Response: {$response}\n";
