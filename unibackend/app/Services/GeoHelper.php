<?php

namespace App\Services;

use App\Models\DeliveryZone;
use App\Models\Address;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Enterprise GeoHelper Service
 *
 * Handles all geolocation operations:
 * - Reverse geocoding (coordinates → address)
 * - Forward geocoding (address → coordinates)
 * - Zone detection (coordinates → delivery zone)
 * - Distance calculations (Haversine)
 * - Google Maps API integration
 */
class GeoHelper
{
    private ?string $googleApiKey;
    private const CACHE_TTL = 86400; // 24 hours
    private const EARTH_RADIUS_KM = 6371;

    public function __construct()
    {
        $this->googleApiKey = config('services.google.maps_api_key');
    }

    // ─── Zone Detection ──────────────────────────────────────────

    /**
     * Find the delivery zone for given coordinates.
     * Returns zone with calculated delivery fee or null if outside all zones.
     */
    public function findZone(float $lat, float $lng): ?array
    {
        $zone = DeliveryZone::findZoneForCoordinates($lat, $lng);

        if (!$zone) {
            return null;
        }

        return [
            'zone_id' => $zone->id,
            'zone_name' => $zone->name,
            'zone_name_ar' => $zone->name_ar,
            'delivery_fee' => $zone->getEffectiveDeliveryFee(),
            'base_delivery_fee' => (float) $zone->delivery_fee,
            'surge_multiplier' => (float) $zone->surge_multiplier,
            'minimum_order' => (float) $zone->minimum_order,
            'estimated_delivery_time' => $zone->estimated_delivery_time,
            'max_delivery_time_minutes' => $zone->max_delivery_time_minutes,
            'can_accept_orders' => $zone->canAcceptOrders(),
            'distance_from_center_km' => $zone->distanceFromCenter($lat, $lng),
        ];
    }

    /**
     * Validate that a delivery address is within a serviceable zone.
     * Returns validation result with zone info or error details.
     */
    public function validateDeliveryAddress(Address $address): array
    {
        if (!$address->latitude || !$address->longitude) {
            return [
                'valid' => false,
                'reason' => 'no_coordinates',
                'message' => 'Address does not have GPS coordinates. Please update your address with map location.',
                'zone' => null,
            ];
        }

        $zoneInfo = $this->findZone($address->latitude, $address->longitude);

        if (!$zoneInfo) {
            return [
                'valid' => false,
                'reason' => 'outside_delivery_zones',
                'message' => 'Sorry, we do not deliver to this area yet.',
                'zone' => null,
                'coordinates' => [
                    'lat' => $address->latitude,
                    'lng' => $address->longitude,
                ],
            ];
        }

        if (!$zoneInfo['can_accept_orders']) {
            return [
                'valid' => false,
                'reason' => 'zone_at_capacity',
                'message' => 'This area is currently at maximum capacity. Please try again later.',
                'zone' => $zoneInfo,
            ];
        }

        return [
            'valid' => true,
            'reason' => null,
            'message' => null,
            'zone' => $zoneInfo,
        ];
    }

    /**
     * Auto-detect and assign zone for an address based on coordinates.
     */
    public function autoAssignZone(Address $address): ?DeliveryZone
    {
        if (!$address->latitude || !$address->longitude) {
            return null;
        }

        $zone = DeliveryZone::findZoneForCoordinates($address->latitude, $address->longitude);

        if ($zone) {
            $address->update(['delivery_zone_id' => $zone->id]);
        } else {
            $address->update(['delivery_zone_id' => null]);
        }

        return $zone;
    }

    // ─── Google Maps Integration ─────────────────────────────────

    /**
     * Reverse geocode coordinates to a human-readable address.
     */
    public function reverseGeocode(float $lat, float $lng): ?array
    {
        if (!$this->googleApiKey) {
            Log::warning('Google Maps API key not configured');
            return null;
        }

        $cacheKey = "geocode:reverse:{$lat}:{$lng}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($lat, $lng) {
            try {
                $response = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'latlng' => "{$lat},{$lng}",
                    'key' => $this->googleApiKey,
                    'language' => 'en',
                    'result_type' => 'street_address|route|neighborhood|sublocality',
                ]);

                if (!$response->successful()) {
                    Log::error('Google Geocode API failed', ['status' => $response->status()]);
                    return null;
                }

                $data = $response->json();

                if ($data['status'] !== 'OK' || empty($data['results'])) {
                    return null;
                }

                $result = $data['results'][0];

                return [
                    'formatted_address' => $result['formatted_address'] ?? null,
                    'place_id' => $result['place_id'] ?? null,
                    'components' => $this->parseAddressComponents($result['address_components'] ?? []),
                ];
            } catch (\Exception $e) {
                Log::error('Reverse geocode failed', ['error' => $e->getMessage()]);
                return null;
            }
        });
    }

    /**
     * Forward geocode an address string to coordinates.
     */
    public function forwardGeocode(string $address): ?array
    {
        if (!$this->googleApiKey) {
            return null;
        }

        $cacheKey = 'geocode:forward:' . md5($address);
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($address) {
            try {
                $response = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'address' => $address,
                    'key' => $this->googleApiKey,
                    'region' => 'eg', // Egypt bias
                    'language' => 'en',
                ]);

                if (!$response->successful()) {
                    return null;
                }

                $data = $response->json();

                if ($data['status'] !== 'OK' || empty($data['results'])) {
                    return null;
                }

                $result = $data['results'][0];
                $location = $result['geometry']['location'] ?? null;

                if (!$location) {
                    return null;
                }

                return [
                    'latitude' => $location['lat'],
                    'longitude' => $location['lng'],
                    'formatted_address' => $result['formatted_address'] ?? null,
                    'place_id' => $result['place_id'] ?? null,
                    'components' => $this->parseAddressComponents($result['address_components'] ?? []),
                ];
            } catch (\Exception $e) {
                Log::error('Forward geocode failed', ['error' => $e->getMessage()]);
                return null;
            }
        });
    }

    /**
     * Parse Google Maps address components into structured data.
     */
    private function parseAddressComponents(array $components): array
    {
        $parsed = [
            'street_number' => null,
            'street' => null,
            'neighborhood' => null,
            'city' => null,
            'area' => null,
            'governorate' => null,
            'country' => null,
            'postal_code' => null,
        ];

        foreach ($components as $component) {
            $types = $component['types'] ?? [];

            if (in_array('street_number', $types)) {
                $parsed['street_number'] = $component['long_name'];
            }
            if (in_array('route', $types)) {
                $parsed['street'] = $component['long_name'];
            }
            if (in_array('neighborhood', $types) || in_array('sublocality_level_1', $types)) {
                $parsed['neighborhood'] = $component['long_name'];
            }
            if (in_array('locality', $types)) {
                $parsed['city'] = $component['long_name'];
            }
            if (in_array('sublocality', $types)) {
                $parsed['area'] = $component['long_name'];
            }
            if (in_array('administrative_area_level_1', $types)) {
                $parsed['governorate'] = $component['long_name'];
            }
            if (in_array('country', $types)) {
                $parsed['country'] = $component['long_name'];
            }
            if (in_array('postal_code', $types)) {
                $parsed['postal_code'] = $component['long_name'];
            }
        }

        return $parsed;
    }

    // ─── Distance & Utility ──────────────────────────────────────

    /**
     * Calculate Haversine distance between two points in kilometers.
     */
    public static function haversineDistance(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2
    ): float {
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round(self::EARTH_RADIUS_KM * $c, 2);
    }

    /**
     * Estimate travel time in minutes based on distance (average speed for delivery).
     */
    public static function estimateTravelTime(float $distanceKm, string $vehicleType = 'motorcycle'): int
    {
        // Average speeds in km/h adjusted for city traffic (Cairo/Egypt)
        $speeds = [
            'motorcycle' => 25,
            'car'        => 20,
            'bicycle'    => 12,
        ];

        $speed = $speeds[$vehicleType] ?? 20;
        return (int) ceil(($distanceKm / $speed) * 60);
    }

    /**
     * Get all serviceable zones with delivery info for a coordinate.
     * Used for displaying available zones on mobile app.
     */
    public function getServiceableZones(float $lat, float $lng): array
    {
        $matchingZones = DeliveryZone::findAllZonesForCoordinates($lat, $lng);

        return $matchingZones->map(fn($zone) => [
            'id' => $zone->id,
            'name' => $zone->name,
            'name_ar' => $zone->name_ar,
            'delivery_fee' => $zone->getEffectiveDeliveryFee(),
            'minimum_order' => (float) $zone->minimum_order,
            'estimated_delivery_time' => $zone->estimated_delivery_time,
            'can_accept_orders' => $zone->canAcceptOrders(),
        ])->values()->toArray();
    }
}
