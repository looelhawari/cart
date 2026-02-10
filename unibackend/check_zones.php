<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$zones = DB::table('delivery_zones')->get();
echo "Total zones: " . count($zones) . "\n\n";

foreach ($zones as $zone) {
    echo "Zone ID: {$zone->id}\n";
    echo "Name: {$zone->name}\n";
    echo "Has polygon: " . (empty($zone->polygon_coordinates) ? 'NO' : 'YES') . "\n";
    if (!empty($zone->polygon_coordinates)) {
        $coords = json_decode($zone->polygon_coordinates);
        echo "Polygon points: " . count($coords) . "\n";
    }
    echo "Active: " . ($zone->is_active ? 'YES' : 'NO') . "\n";
    echo "---\n";
}
