<?php
/**
 * Seed 100 test users for k6 load testing.
 * Run: php seed-test-users.php
 */
require __DIR__ . '/../unibackend/vendor/autoload.php';
$app = require_once __DIR__ . '/../unibackend/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\Address;
use Illuminate\Support\Facades\Hash;

$password = Hash::make('Test@12345');

echo "Seeding 100 test users for k6 load testing...\n";

$created = 0;
for ($i = 1; $i <= 100; $i++) {
    $email = "k6test{$i}@loadtest.com";

    $user = User::firstOrCreate(
        ['email' => $email],
        [
            'first_name' => "K6User",
            'last_name'  => "Test{$i}",
            'email'      => $email,
            'phone'      => "+201" . str_pad($i, 9, '0', STR_PAD_LEFT),
            'password'   => $password,
            'role'       => 'customer',
            'language'   => $i % 2 === 0 ? 'ar' : 'en',
            'is_active'  => true,
            'is_verified' => true,
            'email_verified_at' => now(),
        ]
    );

    // Create a default address if the user doesn't have one
    if ($user->wasRecentlyCreated) {
        $created++;
        Address::create([
            'user_id'          => $user->id,
            'label'            => 'Home',
            'street'           => "{$i} Test Street",
            'building'         => "Building {$i}",
            'floor'            => (string)($i % 10),
            'apartment'        => (string)($i),
            'city'             => 'Cairo',
            'area'             => 'Maadi',
            'latitude'         => 30.0444 + ($i * 0.0001),
            'longitude'        => 31.2357 + ($i * 0.0001),
            'delivery_zone_id' => (($i - 1) % 3) + 1,
            'is_default'       => true,
        ]);
    }
}

echo "Done! Created {$created} new users (100 total available).\n";
echo "Credentials: k6test{1..100}@loadtest.com / Test@12345\n";
