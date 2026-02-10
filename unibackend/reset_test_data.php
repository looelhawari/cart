<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\Order;
use App\Models\User;

$order = Order::find(107);
if (!$order) { echo "Order 107 not found\n"; exit(1); }

// Reset timestamps so ETA is fresh (driver picked up 5 min ago, estimated 30 min delivery)
$order->update([
    'status'                     => 'out_for_delivery',
    'driver_picked_up_at'        => now()->subMinutes(5),
    'estimated_delivery_minutes' => 30,
    'delivery_lat'               => 30.0600,
    'delivery_lng'               => 31.3550,
]);

// Put driver halfway between pickup and delivery
$driver = User::find($order->driver_id);
$driver->update([
    'current_lat'         => 30.0555,
    'current_lng'         => 31.3510,
    'location_updated_at' => now(),
]);

// Fresh location history
DB::table('driver_location_history')->where('order_id', 107)->delete();
$points = [
    ['lat' => 30.0500, 'lng' => 31.3450, 'ago' => 5, 'heading' => 30],
    ['lat' => 30.0520, 'lng' => 31.3470, 'ago' => 4, 'heading' => 35],
    ['lat' => 30.0535, 'lng' => 31.3485, 'ago' => 3, 'heading' => 40],
    ['lat' => 30.0545, 'lng' => 31.3495, 'ago' => 2, 'heading' => 42],
    ['lat' => 30.0555, 'lng' => 31.3510, 'ago' => 0, 'heading' => 45],
];
foreach ($points as $p) {
    DB::table('driver_location_history')->insert([
        'driver_id'   => $driver->id,
        'order_id'    => 107,
        'latitude'    => $p['lat'],
        'longitude'   => $p['lng'],
        'speed'       => rand(20, 40),
        'heading'     => $p['heading'],
        'accuracy'    => 10.0,
        'recorded_at' => now()->subMinutes($p['ago']),
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);
}

echo "=== TEST DATA RESET ===\n";
echo "Order 107: out_for_delivery\n";
echo "Driver picked up: 5 min ago\n";
echo "Estimated delivery: 30 min total → ~25 min remaining\n";
echo "Driver at: (30.0555, 31.3510)\n";
echo "Delivery at: (30.0600, 31.3550)\n";
echo "Distance: ~600m between driver and destination\n\n";

// Now test what API would return
$pickupTime = $order->fresh()->driver_picked_up_at;
$eta = $pickupTime->copy()->addMinutes(30);
$remaining = max(0, (int) now()->diffInMinutes($eta, false));
echo "ETA minutes remaining: {$remaining}\n";
echo "ETA arrival: {$eta->toIso8601String()}\n";
