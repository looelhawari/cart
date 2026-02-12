<?php
/**
 * Backfill coordinates for addresses that have no lat/lng.
 * Run with: php artisan tinker < backfill_address_coords.php
 */

use App\Models\Address;
use App\Services\GeoHelper;

$geoHelper = app(GeoHelper::class);
$addresses = Address::whereNull('latitude')->orWhereNull('longitude')->get();

echo "Found {$addresses->count()} addresses without coordinates.\n";

foreach ($addresses as $address) {
    echo "ID {$address->id}: {$address->street}, {$address->area}, {$address->city} ... ";

    $result = $geoHelper->geocodeFromAddressFields($address);

    if ($result && isset($result['latitude'], $result['longitude'])) {
        $address->update([
            'latitude' => $result['latitude'],
            'longitude' => $result['longitude'],
            'formatted_address' => $address->formatted_address ?: ($result['formatted_address'] ?? null),
            'place_id' => $address->place_id ?: ($result['place_id'] ?? null),
        ]);

        $geoHelper->autoAssignZone($address);
        $address->refresh();

        echo "OK -> lat:{$result['latitude']}, lng:{$result['longitude']}, zone:{$address->delivery_zone_id}\n";
    } else {
        echo "FAILED (could not geocode)\n";
    }

    // Be polite to Nominatim — 1 request per second
    sleep(1);
}

echo "Done.\n";
