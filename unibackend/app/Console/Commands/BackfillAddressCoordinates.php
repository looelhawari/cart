<?php

namespace App\Console\Commands;

use App\Models\Address;
use App\Services\GeoHelper;
use Illuminate\Console\Command;

class BackfillAddressCoordinates extends Command
{
    protected $signature = 'addresses:backfill-coords';
    protected $description = 'Geocode addresses that are missing lat/lng coordinates';

    public function handle(GeoHelper $geoHelper): int
    {
        $addresses = Address::whereNull('latitude')->orWhereNull('longitude')->get();

        $this->info("Found {$addresses->count()} addresses without coordinates.");

        $success = 0;
        $failed = 0;

        foreach ($addresses as $address) {
            $this->line("ID {$address->id}: {$address->street}, {$address->area}, {$address->city} ... ", false);

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

                $this->info("OK -> zone: {$address->delivery_zone_id}");
                $success++;
            } else {
                $this->error("FAILED");
                $failed++;
            }

            // Be polite to Nominatim — 1 request per second
            sleep(1);
        }

        $this->newLine();
        $this->info("Done. Success: {$success}, Failed: {$failed}");

        return 0;
    }
}
