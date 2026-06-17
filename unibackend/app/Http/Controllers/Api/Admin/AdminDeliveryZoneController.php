<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use App\Services\DeliveryZoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminDeliveryZoneController extends Controller
{
    private DeliveryZoneService $zoneService;

    public function __construct(DeliveryZoneService $zoneService)
    {
        $this->zoneService = $zoneService;
    }

    /**
     * List all delivery zones with stats.
     */
    public function index(Request $request): JsonResponse
    {
        $zones = $this->zoneService->getAllZones($request->all());

        return response()->json([
            'success' => true,
            'data'    => $zones,
        ]);
    }

    /**
     * Get single zone with full details.
     */
    public function show(int $id): JsonResponse
    {
        $zone = DeliveryZone::withTrashed()
            ->withCount(['orders as active_orders_count' => fn($q) =>
                $q->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ])
            ->withCount('orders as total_orders_count')
            ->withCount('addresses as addresses_count')
            ->withCount('drivers as drivers_count')
            ->with('schedules')
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $zone,
        ]);
    }

    /**
     * Create new delivery zone.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'                    => 'required|string|max:255',
            'name_ar'                 => 'nullable|string|max:255',
            'description'             => 'nullable|string',
            'city'                    => 'required|string|max:100',
            'area'                    => 'nullable|string|max:255',
            'polygon_coordinates'     => 'required|array|min:3',
            'polygon_coordinates.*.lat' => 'required|numeric|between:-90,90',
            'polygon_coordinates.*.lng' => 'required|numeric|between:-180,180',
            'center_lat'              => 'nullable|numeric|between:-90,90',
            'center_lng'              => 'nullable|numeric|between:-180,180',
            'color'                   => 'nullable|string|max:7',
            'opacity'                 => 'nullable|numeric|between:0,1',
            'delivery_fee'            => 'required|numeric|min:0',
            'minimum_order'           => 'nullable|numeric|min:0',
            'estimated_delivery_time' => 'nullable|string|max:100',
            'max_delivery_time_minutes' => 'nullable|integer|min:1',
            'surge_multiplier'        => 'nullable|numeric|min:1|max:10',
            'max_concurrent_orders'   => 'nullable|integer|min:1',
            'sort_order'              => 'nullable|integer|min:0',
            'is_active'               => 'nullable|boolean',
            'schedules'               => 'nullable|array',
            'schedules.*.day_of_week' => 'required_with:schedules|integer|between:0,6',
            'schedules.*.start_time'  => 'required_with:schedules|date_format:H:i',
            'schedules.*.end_time'    => 'required_with:schedules|date_format:H:i|after:schedules.*.start_time',
            'schedules.*.is_active'   => 'nullable|boolean',
            'schedules.*.surge_multiplier' => 'nullable|numeric|min:1|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $zone = $this->zoneService->createZone($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Delivery zone created successfully',
                'data'    => $zone->fresh(['schedules']),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create delivery zone',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update delivery zone.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $zone = DeliveryZone::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'                    => 'sometimes|string|max:255',
            'name_ar'                 => 'nullable|string|max:255',
            'description'             => 'nullable|string',
            'city'                    => 'sometimes|string|max:100',
            'area'                    => 'nullable|string|max:255',
            'polygon_coordinates'     => 'sometimes|array|min:3',
            'polygon_coordinates.*.lat' => 'required_with:polygon_coordinates|numeric|between:-90,90',
            'polygon_coordinates.*.lng' => 'required_with:polygon_coordinates|numeric|between:-180,180',
            'center_lat'              => 'nullable|numeric|between:-90,90',
            'center_lng'              => 'nullable|numeric|between:-180,180',
            'color'                   => 'nullable|string|max:7',
            'opacity'                 => 'nullable|numeric|between:0,1',
            'delivery_fee'            => 'sometimes|numeric|min:0',
            'minimum_order'           => 'nullable|numeric|min:0',
            'estimated_delivery_time' => 'nullable|string|max:100',
            'max_delivery_time_minutes' => 'nullable|integer|min:1',
            'surge_multiplier'        => 'nullable|numeric|min:1|max:10',
            'max_concurrent_orders'   => 'nullable|integer|min:1',
            'sort_order'              => 'nullable|integer|min:0',
            'is_active'               => 'nullable|boolean',
            'schedules'               => 'nullable|array',
            'schedules.*.day_of_week' => 'required_with:schedules|integer|between:0,6',
            'schedules.*.start_time'  => 'required_with:schedules|date_format:H:i',
            'schedules.*.end_time'    => 'required_with:schedules|date_format:H:i',
            'schedules.*.is_active'   => 'nullable|boolean',
            'schedules.*.surge_multiplier' => 'nullable|numeric|min:1|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            $zone = $this->zoneService->updateZone($zone, $validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Delivery zone updated successfully',
                'data'    => $zone->fresh(['schedules']),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update delivery zone',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete delivery zone (soft delete).
     */
    public function destroy(int $id): JsonResponse
    {
        $zone = DeliveryZone::findOrFail($id);

        try {
            $this->zoneService->deleteZone($zone);

            return response()->json([
                'success' => true,
                'message' => 'Delivery zone deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Toggle zone active/inactive.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $zone = DeliveryZone::findOrFail($id);
        $zone = $this->zoneService->toggleZoneStatus($zone);

        return response()->json([
            'success' => true,
            'message' => 'Zone status toggled',
            'data'    => ['is_active' => $zone->is_active],
        ]);
    }

    /**
     * Get zone analytics.
     */
    public function analytics(Request $request, int $id): JsonResponse
    {
        $zone = DeliveryZone::findOrFail($id);

        $analytics = $this->zoneService->getZoneAnalytics(
            $zone,
            $request->input('date_from'),
            $request->input('date_to'),
        );

        return response()->json([
            'success' => true,
            'data'    => $analytics,
        ]);
    }

    /**
     * Dashboard overview for all zones.
     */
    public function dashboard(): JsonResponse
    {
        $overview = $this->zoneService->getDashboardOverview();

        return response()->json([
            'success' => true,
            'data'    => $overview,
        ]);
    }

    /**
     * Check which zone a coordinate belongs to (admin testing tool).
     */
    public function checkCoordinate(Request $request): JsonResponse
    {
        $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $zone = DeliveryZone::findZoneForCoordinates(
            $request->latitude,
            $request->longitude
        );

        return response()->json([
            'success' => true,
            'data'    => [
                'zone' => $zone,
                'coordinates' => [
                    'lat' => $request->latitude,
                    'lng' => $request->longitude,
                ],
                'is_covered' => $zone !== null,
            ],
        ]);
    }

    /**
     * Bulk update zone order (sort_order).
     *
     * Cache invalidation (Slice 3): the customer-facing zone list is ordered
     * by sort_order, so reordering must purge the cached payload too.
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'zones'              => 'required|array',
            'zones.*.id'         => 'required|exists:delivery_zones,id',
            'zones.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($request->zones as $item) {
            DeliveryZone::where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        foreach (DeliveryZoneService::ZONE_CACHE_KEYS as $key) {
            \Illuminate\Support\Facades\Cache::forget($key);
        }
        app(\App\Services\ContentVersionService::class)->touch('map', 'updated', null);

        return response()->json([
            'success' => true,
            'message' => 'Zone order updated',
        ]);
    }
}
