<?php

namespace App\Services;

use App\Models\Address;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AddressService
{
    public function __construct(private GeoHelper $geoHelper)
    {
    }

    /**
     * Create an address owned by the authenticated user and apply the same
     * default-address and geocoding behavior used by the address API.
     */
    public function createForUser(User $user, array $data): Address
    {
        $address = DB::transaction(function () use ($user, $data) {
            $address = $user->addresses()->create($data);

            if (($data['is_default'] ?? false) || $user->addresses()->count() === 1) {
                $address->setAsDefault();
            }

            return $address->refresh();
        });

        $this->stampNewAddressLocation($address);

        return $address->refresh()->load('deliveryZone');
    }

    public function updateAddress(Address $address, array $data, bool $coordinatesChanged = false, bool $setDefault = false): Address
    {
        $address->update($data);

        if ($address->hasCoordinates()) {
            if ($coordinatesChanged) {
                $this->reverseGeocodeAndStamp($address);
            }

            $this->geoHelper->autoAssignZone($address);
        } else {
            $this->geocodeAndAssignZone($address);
        }

        if ($setDefault) {
            $address->setAsDefault();
        }

        return $address->refresh()->load('deliveryZone');
    }

    private function stampNewAddressLocation(Address $address): void
    {
        if (! $address->hasCoordinates()) {
            $this->geocodeAndAssignZone($address);
            return;
        }

        $this->reverseGeocodeAndStamp($address);
        $this->geoHelper->autoAssignZone($address);
    }

    private function geocodeAndAssignZone(Address $address): void
    {
        $result = $this->geoHelper->geocodeFromAddressFields($address);

        if (! $result || ! isset($result['latitude'], $result['longitude'])) {
            return;
        }

        $address->update([
            'latitude' => $result['latitude'],
            'longitude' => $result['longitude'],
            'formatted_address' => $address->formatted_address ?: ($result['formatted_address'] ?? null),
            'place_id' => $address->place_id ?: ($result['place_id'] ?? null),
        ]);

        $this->geoHelper->autoAssignZone($address);
    }

    /**
     * When coordinates are supplied, server-side reverse-geocode owns the
     * canonical formatted address so text and map pin cannot drift apart.
     */
    private function reverseGeocodeAndStamp(Address $address): void
    {
        try {
            $result = $this->geoHelper->reverseGeocode(
                (float) $address->latitude,
                (float) $address->longitude
            );
        } catch (\Throwable) {
            $result = null;
        }

        if (! $result || empty($result['formatted_address'])) {
            return;
        }

        $address->forceFill([
            'formatted_address' => $result['formatted_address'],
            'place_id' => $result['place_id'] ?? $address->place_id,
        ])->save();
    }
}
