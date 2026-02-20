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
 * - Reverse geocoding (coordinates → address) via Nominatim/OSM
 * - Forward geocoding (address → coordinates) via Nominatim/OSM
 * - Zone detection (coordinates → delivery zone)
 * - Distance calculations (Haversine)
 * - 100% free — no API keys required
 */
class GeoHelper
{
    private string $nominatimUrl;
    private const CACHE_TTL = 86400; // 24 hours
    private const EARTH_RADIUS_KM = 6371;
    private const USER_AGENT = 'CART-App/1.0 (https://elbaraka.com)';

    public function __construct()
    {
        // Use self-hosted Nominatim if configured, otherwise public server
        $this->nominatimUrl = config('services.nominatim.url', 'https://nominatim.openstreetmap.org');
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
        // If no coordinates, try to geocode from text fields with fallback
        if (!$address->latitude || !$address->longitude) {
            $result = $this->geocodeFromAddressFields($address);

            if ($result && isset($result['latitude'], $result['longitude'])) {
                $address->update([
                    'latitude' => $result['latitude'],
                    'longitude' => $result['longitude'],
                    'formatted_address' => $address->formatted_address ?: ($result['formatted_address'] ?? null),
                    'place_id' => $address->place_id ?: ($result['place_id'] ?? null),
                ]);
                $address->refresh();
            } else {
                return [
                    'valid' => false,
                    'reason' => 'no_coordinates',
                    'message' => 'Could not determine location from address. Please use the map picker.',
                    'zone' => null,
                ];
            }
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

    // ─── Geocode from Address Fields (Fallback Strategy) ──────────

    /**
     * Try geocoding an address using progressively broader text queries.
     * Strategy: full street+area+city → area+city → city only.
     */
    public function geocodeFromAddressFields(Address $address): ?array
    {
        $queries = [];

        // Strategy 1: Full address (street + area + city)
        $full = array_filter([$address->street, $address->area, $address->city, 'Egypt']);
        if (count($full) >= 3) {
            $queries[] = implode(', ', $full);
        }

        // Strategy 2: Area + City (skip possibly vague street)
        if ($address->area && $address->city) {
            $queries[] = implode(', ', [$address->area, $address->city, 'Egypt']);
        }

        // Strategy 3: Just city
        if ($address->city) {
            $queries[] = $address->city . ', Egypt';
        }

        foreach ($queries as $query) {
            $result = $this->forwardGeocode($query);
            if ($result && isset($result['latitude'], $result['longitude'])) {
                return $result;
            }
        }

        return null;
    }

    // ─── Nominatim / OpenStreetMap Integration (Free) ─────────────

    /**
     * Reverse geocode coordinates to a human-readable address.
     * Uses Nominatim (OpenStreetMap) — free, no API key required.
     */
    public function reverseGeocode(float $lat, float $lng): ?array
    {
        $cacheKey = "geocode:reverse:{$lat}:{$lng}";
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($lat, $lng) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => self::USER_AGENT,
                ])->get($this->nominatimUrl . '/reverse', [
                    'format' => 'json',
                    'lat' => $lat,
                    'lon' => $lng,
                    'addressdetails' => 1,
                    'accept-language' => 'en,ar',
                    'zoom' => 18,
                ]);

                if (!$response->successful()) {
                    Log::error('Nominatim reverse geocode failed', ['status' => $response->status()]);
                    return null;
                }

                $data = $response->json();

                if (empty($data) || isset($data['error'])) {
                    return null;
                }

                return [
                    'formatted_address' => $data['display_name'] ?? null,
                    'place_id' => ($data['osm_type'] ?? '') . ':' . ($data['osm_id'] ?? ''),
                    'components' => $this->parseNominatimAddress($data['address'] ?? []),
                ];
            } catch (\Exception $e) {
                Log::error('Reverse geocode failed', ['error' => $e->getMessage()]);
                return null;
            }
        });
    }

    /**
     * Forward geocode an address string to coordinates.
     * Uses Nominatim (OpenStreetMap) — free, no API key required.
     */
    public function forwardGeocode(string $address): ?array
    {
        $cacheKey = 'geocode:forward:' . md5($address);
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($address) {
            try {
                $response = Http::withHeaders([
                    'User-Agent' => self::USER_AGENT,
                ])->get($this->nominatimUrl . '/search', [
                    'format' => 'json',
                    'q' => $address,
                    'limit' => 1,
                    'addressdetails' => 1,
                    'accept-language' => 'en,ar',
                    'countrycodes' => 'eg', // Egypt bias
                ]);

                if (!$response->successful()) {
                    return null;
                }

                $results = $response->json();

                if (empty($results)) {
                    return null;
                }

                $result = $results[0];

                return [
                    'latitude' => (float) $result['lat'],
                    'longitude' => (float) $result['lon'],
                    'formatted_address' => $result['display_name'] ?? null,
                    'place_id' => ($result['osm_type'] ?? '') . ':' . ($result['osm_id'] ?? ''),
                    'components' => $this->parseNominatimAddress($result['address'] ?? []),
                ];
            } catch (\Exception $e) {
                Log::error('Forward geocode failed', ['error' => $e->getMessage()]);
                return null;
            }
        });
    }

    /**
     * Parse Nominatim address object into structured data.
     */
    private function parseNominatimAddress(array $addr): array
    {
        return [
            'street_number' => $addr['house_number'] ?? null,
            'street' => $addr['road'] ?? $addr['pedestrian'] ?? $addr['footway'] ?? null,
            'neighborhood' => $addr['neighbourhood'] ?? $addr['quarter'] ?? $addr['suburb'] ?? null,
            'city' => $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? null,
            'area' => $addr['suburb'] ?? $addr['district'] ?? $addr['county'] ?? null,
            'governorate' => $addr['state'] ?? $addr['governorate'] ?? null,
            'country' => $addr['country'] ?? null,
            'postal_code' => $addr['postcode'] ?? null,
        ];
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
