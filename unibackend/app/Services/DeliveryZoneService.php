<?php

namespace App\Services;

use App\Models\Address;
use App\Models\DeliveryZone;
use App\Models\DeliveryZoneSchedule;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Enterprise Delivery Zone Service
 *
 * Orchestrates all delivery zone business operations:
 * - Zone CRUD with polygon validation
 * - Order zone validation
 * - Zone-based delivery fees
 * - Driver zone assignment
 * - Zone analytics
 */
class DeliveryZoneService
{
    private GeoHelper $geoHelper;

    private const ZONE_CACHE_KEY = 'delivery_zones:active';
    private const ZONE_CACHE_TTL = 300; // 5 minutes

    public function __construct(GeoHelper $geoHelper)
    {
        $this->geoHelper = $geoHelper;
    }

    // ─── Zone CRUD ───────────────────────────────────────────────

    /**
     * Get all delivery zones with statistics.
     */
    public function getAllZones(array $filters = []): \Illuminate\Pagination\LengthAwarePaginator
    {
        $query = DeliveryZone::query()
            ->withCount(['orders as active_orders_count' => function ($q) {
                $q->whereNotIn('status', ['delivered', 'cancelled', 'failed']);
            }])
            ->withCount('orders as total_orders_count')
            ->withCount('addresses as addresses_count')
            ->withCount('drivers as drivers_count');

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_ar', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['city'])) {
            $query->where('city', $filters['city']);
        }

        $sortBy = $filters['sort_by'] ?? 'sort_order';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = min($filters['per_page'] ?? 20, 100);
        return $query->paginate($perPage);
    }

    /**
     * Create a new delivery zone.
     */
    public function createZone(array $data): DeliveryZone
    {
        return DB::transaction(function () use ($data) {
            // Validate polygon if provided
            if (!empty($data['polygon_coordinates'])) {
                $this->validatePolygon($data['polygon_coordinates']);
            }

            $zone = DeliveryZone::create($data);

            // Auto-calculate center from polygon
            if (!empty($data['polygon_coordinates']) && (!isset($data['center_lat']) || !isset($data['center_lng']))) {
                $zone->updateCenterFromPolygon();
                $zone->refresh();
            }

            // Create schedules if provided
            if (!empty($data['schedules'])) {
                $this->syncSchedules($zone, $data['schedules']);
            }

            $this->clearZoneCache();

            Log::info('Delivery zone created', ['zone_id' => $zone->id, 'name' => $zone->name]);

            return $zone;
        });
    }

    /**
     * Update an existing delivery zone.
     */
    public function updateZone(DeliveryZone $zone, array $data): DeliveryZone
    {
        return DB::transaction(function () use ($zone, $data) {
            if (!empty($data['polygon_coordinates'])) {
                $this->validatePolygon($data['polygon_coordinates']);
            }

            $zone->update($data);

            // Auto-recalculate center if polygon changed
            if (isset($data['polygon_coordinates'])) {
                $zone->updateCenterFromPolygon();
            }

            // Sync schedules if provided
            if (isset($data['schedules'])) {
                $this->syncSchedules($zone, $data['schedules']);
            }

            $zone->refresh();
            $this->clearZoneCache();

            Log::info('Delivery zone updated', ['zone_id' => $zone->id, 'name' => $zone->name]);

            return $zone;
        });
    }

    /**
     * Soft delete a delivery zone.
     */
    public function deleteZone(DeliveryZone $zone): bool
    {
        // Check for active orders
        $activeOrders = $zone->orders()
            ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ->count();

        if ($activeOrders > 0) {
            throw new \Exception("Cannot delete zone with {$activeOrders} active orders. Deactivate first.");
        }

        $zone->update(['is_active' => false]);
        $zone->delete();

        $this->clearZoneCache();

        Log::info('Delivery zone deleted', ['zone_id' => $zone->id]);

        return true;
    }

    /**
     * Toggle zone active status.
     */
    public function toggleZoneStatus(DeliveryZone $zone): DeliveryZone
    {
        $zone->update(['is_active' => !$zone->is_active]);
        $this->clearZoneCache();
        return $zone->fresh();
    }

    // ─── Order Integration ───────────────────────────────────────

    /**
     * Validate delivery address zone BEFORE order creation.
     * Called during checkout flow.
     *
     * @throws \Exception if address is not deliverable
     */
    public function validateOrderDelivery(Address $address): array
    {
        $validation = $this->geoHelper->validateDeliveryAddress($address);

        if (!$validation['valid']) {
            throw new \Exception($validation['message']);
        }

        return $validation['zone'];
    }

    /**
     * Calculate zone-based delivery fee for checkout.
     * Replaces the flat fee from store settings.
     */
    public function calculateDeliveryFee(float $lat, float $lng, float $subtotal): array
    {
        $zoneInfo = $this->geoHelper->findZone($lat, $lng);

        if (!$zoneInfo) {
            return [
                'delivery_fee' => 0,
                'zone_id' => null,
                'zone_name' => null,
                'error' => 'Address is outside delivery zones',
                'is_deliverable' => false,
            ];
        }

        // Check minimum order for this zone
        $meetsMinimum = $subtotal >= $zoneInfo['minimum_order'];

        return [
            'delivery_fee' => $zoneInfo['delivery_fee'],
            'zone_id' => $zoneInfo['zone_id'],
            'zone_name' => $zoneInfo['zone_name'],
            'zone_name_ar' => $zoneInfo['zone_name_ar'],
            'minimum_order' => $zoneInfo['minimum_order'],
            'meets_minimum' => $meetsMinimum,
            'estimated_delivery_time' => $zoneInfo['estimated_delivery_time'],
            'is_deliverable' => true,
            'can_accept_orders' => $zoneInfo['can_accept_orders'],
        ];
    }

    /**
     * Snapshot zone data onto an order (called during order creation).
     * These values are IMMUTABLE after order creation.
     */
    public function snapshotZoneToOrder(Order $order, Address $address): void
    {
        if (!$address->latitude || !$address->longitude) {
            return;
        }

        $zone = DeliveryZone::findZoneForCoordinates($address->latitude, $address->longitude);

        $order->update([
            'delivery_zone_id'          => $zone?->id,
            'delivery_lat'              => $address->latitude,
            'delivery_lng'              => $address->longitude,
            'zone_name'                 => $zone?->name,
            'estimated_delivery_minutes' => $zone?->max_delivery_time_minutes,
            'delivery_fee'              => $zone?->delivery_fee ?? $order->delivery_fee,
        ]);
    }

    // ─── Driver Management ───────────────────────────────────────

    /**
     * Find available drivers for a zone.
     */
    public function getAvailableDrivers(int $zoneId): \Illuminate\Support\Collection
    {
        return User::where('role', 'driver')
            ->where('is_active', true)
            ->where('is_available', true)
            ->where(function ($q) use ($zoneId) {
                $q->where('assigned_zone_id', $zoneId)
                  ->orWhereNull('assigned_zone_id');
            })
            ->orderByRaw('CASE WHEN assigned_zone_id = ? THEN 0 ELSE 1 END', [$zoneId])
            ->get();
    }

    /**
     * Assign nearest available driver to an order.
     */
    public function assignDriver(Order $order): ?User
    {
        if (!$order->delivery_zone_id) {
            return null;
        }

        $drivers = $this->getAvailableDrivers($order->delivery_zone_id);

        if ($drivers->isEmpty()) {
            Log::warning('No available drivers for zone', [
                'zone_id' => $order->delivery_zone_id,
                'order_id' => $order->id,
            ]);
            return null;
        }

        // Find nearest driver to delivery location
        if ($order->delivery_lat && $order->delivery_lng) {
            $nearest = $drivers->sortBy(function ($driver) use ($order) {
                if (!$driver->current_lat || !$driver->current_lng) {
                    return PHP_FLOAT_MAX;
                }
                return GeoHelper::haversineDistance(
                    $driver->current_lat,
                    $driver->current_lng,
                    $order->delivery_lat,
                    $order->delivery_lng
                );
            })->first();
        } else {
            $nearest = $drivers->first();
        }

        $order->update([
            'driver_id'         => $nearest->id,
            'driver_assigned_at' => now(),
        ]);

        Log::info('Driver assigned to order', [
            'driver_id' => $nearest->id,
            'order_id'  => $order->id,
            'zone_id'   => $order->delivery_zone_id,
        ]);

        return $nearest;
    }

    /**
     * Update driver real-time location.
     */
    public function updateDriverLocation(User $driver, float $lat, float $lng, ?array $meta = null): void
    {
        $driver->update([
            'current_lat'         => $lat,
            'current_lng'         => $lng,
            'location_updated_at' => now(),
        ]);

        // Store location history
        DB::table('driver_location_history')->insert([
            'driver_id'   => $driver->id,
            'order_id'    => $meta['order_id'] ?? null,
            'latitude'    => $lat,
            'longitude'   => $lng,
            'speed'       => $meta['speed'] ?? null,
            'heading'     => $meta['heading'] ?? null,
            'accuracy'    => $meta['accuracy'] ?? null,
            'recorded_at' => now(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // Broadcast location to order watchers via Pusher
        if (!empty($meta['order_id'])) {
            try {
                broadcast(new \App\Events\DriverLocationUpdated(
                    $meta['order_id'],
                    $driver->id,
                    $lat,
                    $lng,
                    $meta['heading'] ?? null,
                ))->toOthers();
            } catch (\Exception $e) {
                // Non-critical: don't fail if broadcasting has issues
                Log::debug('Driver location broadcast failed', ['error' => $e->getMessage()]);
            }
        }
    }

    // ─── Analytics ───────────────────────────────────────────────

    /**
     * Get zone performance analytics.
     */
    public function getZoneAnalytics(DeliveryZone $zone, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $query = $zone->orders();

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo);
        }

        $orders = $query->get();

        $delivered = $orders->where('status', 'delivered');
        $cancelled = $orders->where('status', 'cancelled');

        return [
            'total_orders' => $orders->count(),
            'delivered_orders' => $delivered->count(),
            'cancelled_orders' => $cancelled->count(),
            'delivery_rate' => $orders->count() > 0
                ? round(($delivered->count() / $orders->count()) * 100, 1)
                : 0,
            'total_revenue' => round($delivered->sum('total'), 2),
            'total_delivery_fees' => round($delivered->sum('delivery_fee'), 2),
            'average_order_value' => $delivered->count() > 0
                ? round($delivered->avg('total'), 2)
                : 0,
            'active_drivers' => $zone->drivers()->where('is_available', true)->count(),
            'total_drivers' => $zone->drivers()->count(),
            'active_orders' => $zone->orders()
                ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
                ->count(),
        ];
    }

    /**
     * Get all zones overview for dashboard.
     */
    public function getDashboardOverview(): array
    {
        $zones = DeliveryZone::active()->ordered()->get();

        return [
            'total_zones' => DeliveryZone::count(),
            'active_zones' => $zones->count(),
            'inactive_zones' => DeliveryZone::where('is_active', false)->count(),
            'total_active_orders' => Order::whereNotNull('delivery_zone_id')
                ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
                ->count(),
            'zones_at_capacity' => $zones->filter(fn($z) => !$z->canAcceptOrders())->count(),
            'total_drivers' => User::where('role', 'driver')
                ->where('is_active', true)
                ->count(),
            'available_drivers' => User::where('role', 'driver')
                ->where('is_active', true)
                ->where('is_available', true)
                ->count(),
        ];
    }

    // ─── Helpers ─────────────────────────────────────────────────

    /**
     * Validate polygon coordinates array.
     *
     * @throws \InvalidArgumentException
     */
    private function validatePolygon(array $polygon): void
    {
        if (count($polygon) < 3) {
            throw new \InvalidArgumentException('Polygon must have at least 3 coordinate points.');
        }

        foreach ($polygon as $i => $point) {
            if (!isset($point['lat']) || !isset($point['lng'])) {
                throw new \InvalidArgumentException("Point at index {$i} must have 'lat' and 'lng' keys.");
            }

            $lat = (float) $point['lat'];
            $lng = (float) $point['lng'];

            if ($lat < -90 || $lat > 90) {
                throw new \InvalidArgumentException("Latitude at index {$i} must be between -90 and 90.");
            }

            if ($lng < -180 || $lng > 180) {
                throw new \InvalidArgumentException("Longitude at index {$i} must be between -180 and 180.");
            }
        }
    }

    /**
     * Sync zone schedules.
     */
    private function syncSchedules(DeliveryZone $zone, array $schedules): void
    {
        $zone->schedules()->delete();

        foreach ($schedules as $schedule) {
            $zone->schedules()->create([
                'day_of_week'      => $schedule['day_of_week'],
                'start_time'       => $schedule['start_time'],
                'end_time'         => $schedule['end_time'],
                'is_active'        => $schedule['is_active'] ?? true,
                'surge_multiplier' => $schedule['surge_multiplier'] ?? 1.00,
            ]);
        }
    }

    /**
     * Clear cached zone data.
     */
    private function clearZoneCache(): void
    {
        Cache::forget(self::ZONE_CACHE_KEY);
    }
}
