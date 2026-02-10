<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Services\DeliveryZoneService;
use App\Services\GeoHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Customer-facing delivery zone controller.
 * Used by mobile app for zone validation, delivery fee preview, etc.
 */
class DeliveryZoneController extends Controller
{
    private DeliveryZoneService $zoneService;
    private GeoHelper $geoHelper;

    public function __construct(DeliveryZoneService $zoneService, GeoHelper $geoHelper)
    {
        $this->zoneService = $zoneService;
        $this->geoHelper = $geoHelper;
    }

    /**
     * Get all active delivery zones (for map display).
     * Returns zones with polygon data for customer-facing map overlay.
     */
    public function index(): JsonResponse
    {
        $zones = DeliveryZone::active()
            ->withPolygon()
            ->ordered()
            ->get()
            ->map(fn($zone) => [
                'id'                     => $zone->id,
                'name'                   => $zone->name,
                'name_ar'                => $zone->name_ar,
                'city'                   => $zone->city,
                'area'                   => $zone->area,
                'polygon_coordinates'    => $zone->polygon_coordinates,
                'center_lat'             => $zone->center_lat,
                'center_lng'             => $zone->center_lng,
                'color'                  => $zone->color,
                'opacity'                => $zone->opacity,
                'delivery_fee'           => $zone->getEffectiveDeliveryFee(),
                'minimum_order'          => (float) $zone->minimum_order,
                'estimated_delivery_time' => $zone->estimated_delivery_time,
            ]);

        return response()->json([
            'success' => true,
            'data'    => $zones,
        ]);
    }

    /**
     * Check if coordinates are within a delivery zone.
     * Returns zone info with delivery fee, or "not covered" message.
     */
    public function checkCoverage(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $zoneInfo = $this->geoHelper->findZone($request->latitude, $request->longitude);

        if (!$zoneInfo) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'is_covered'   => false,
                    'message'      => 'Sorry, we do not deliver to this area yet.',
                    'message_ar'   => 'عذرًا، لا نقوم بالتوصيل إلى هذه المنطقة حاليًا.',
                    'zone'         => null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'is_covered'   => true,
                'zone'         => $zoneInfo,
            ],
        ]);
    }

    /**
     * Calculate delivery fee for a specific address during checkout.
     * Takes coordinates + subtotal to determine zone fee and minimum order.
     */
    public function calculateDeliveryFee(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'subtotal'  => 'nullable|numeric|min:0',
        ]);

        $result = $this->zoneService->calculateDeliveryFee(
            $request->latitude,
            $request->longitude,
            $request->input('subtotal', 0)
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * Validate a delivery address before order placement.
     * Returns whether the address is in a serviceable zone.
     */
    public function validateAddress(Request $request): JsonResponse
    {
        $request->validate([
            'address_id' => 'required|exists:addresses,id',
        ]);

        $address = $request->user()
            ->addresses()
            ->findOrFail($request->address_id);

        $validation = $this->geoHelper->validateDeliveryAddress($address);

        return response()->json([
            'success' => true,
            'data'    => $validation,
        ]);
    }

    /**
     * Reverse geocode coordinates into address components.
     * Used by mobile map picker to auto-fill address form.
     */
    public function reverseGeocode(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $result = $this->geoHelper->reverseGeocode($request->latitude, $request->longitude);

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to determine address for these coordinates',
            ], 404);
        }

        // Also check zone coverage
        $zoneInfo = $this->geoHelper->findZone($request->latitude, $request->longitude);

        return response()->json([
            'success' => true,
            'data'    => [
                'address'    => $result,
                'is_covered' => $zoneInfo !== null,
                'zone'       => $zoneInfo,
            ],
        ]);
    }
}
