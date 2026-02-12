<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

try {
    $user = User::create([
        'first_name' => 'Test',
        'last_name' => 'Driver',
        'email' => 'testdriver_' . time() . '@example.com',
        'phone' => '+201234567890',
        'password' => Hash::make('password'),
        'role' => 'driver',
        'vehicle_type' => 'car',
        'vehicle_plate' => 'ABC123',
        'assigned_zone_id' => 1,
        'is_available' => false,
        'email_verified_at' => now(),
    ]);
    
    echo "Success! Driver created with ID: " . $user->id . "\n";
    echo "Email: " . $user->email . "\n";
    echo "Zone ID: " . $user->assigned_zone_id . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
