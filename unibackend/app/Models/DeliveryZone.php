<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DeliveryZone extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'name_ar',
        'description',
        'city',
        'area',
        'polygon_coordinates',
        'center_lat',
        'center_lng',
        'color',
        'opacity',
        'delivery_fee',
        'minimum_order',
        'estimated_delivery_time',
        'max_delivery_time_minutes',
        'surge_multiplier',
        'max_concurrent_orders',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'polygon_coordinates' => 'array',
        'center_lat' => 'decimal:8',
        'center_lng' => 'decimal:8',
        'delivery_fee' => 'decimal:2',
        'minimum_order' => 'decimal:2',
        'opacity' => 'decimal:2',
        'surge_multiplier' => 'decimal:2',
        'max_delivery_time_minutes' => 'integer',
        'max_concurrent_orders' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['active_orders_count'];

    // ─── Relationships ───────────────────────────────────────────

    /**
     * Orders delivered to this zone.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'delivery_zone_id');
    }

    /**
     * Addresses in this zone.
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class, 'delivery_zone_id');
    }

    /**
     * Drivers assigned to this zone.
     */
    public function drivers(): HasMany
    {
        return $this->hasMany(User::class, 'assigned_zone_id')
                    ->where('role', 'driver');
    }

    /**
     * Zone schedules (time-based availability).
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(DeliveryZoneSchedule::class);
    }

    // ─── Scopes ──────────────────────────────────────────────────

    /**
     * Only active zones.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Order by sort_order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Zones that have polygon coordinates defined.
     */
    public function scopeWithPolygon($query)
    {
        return $query->whereNotNull('polygon_coordinates')
                     ->where('polygon_coordinates', '!=', '[]');
    }

    // ─── Spatial Methods ─────────────────────────────────────────

    /**
     * Check if a coordinate point falls within this zone's polygon.
     * Uses ray casting algorithm (works without MySQL spatial extensions).
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        $polygon = $this->polygon_coordinates;

        if (empty($polygon) || count($polygon) < 3) {
            return false;
        }

        return self::pointInPolygon($lat, $lng, $polygon);
    }

    /**
     * Ray Casting algorithm for point-in-polygon test.
     * Production-grade implementation with edge case handling.
     *
     * @param float $lat  Point latitude
     * @param float $lng  Point longitude
     * @param array $polygon Array of ['lat' => float, 'lng' => float]
     * @return bool
     */
    public static function pointInPolygon(float $lat, float $lng, array $polygon): bool
    {
        $n = count($polygon);
        if ($n < 3) {
            return false;
        }

        $inside = false;

        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $iLat = (float) ($polygon[$i]['lat'] ?? 0);
            $iLng = (float) ($polygon[$i]['lng'] ?? 0);
            $jLat = (float) ($polygon[$j]['lat'] ?? 0);
            $jLng = (float) ($polygon[$j]['lng'] ?? 0);

            // Check if point is on polygon edge (within tolerance)
            if (abs($iLat - $lat) < 1e-10 && abs($iLng - $lng) < 1e-10) {
                return true; // Point is a vertex
            }

            if (($iLng > $lng) !== ($jLng > $lng)) {
                $intersectLat = $jLat + ($lng - $jLng) / ($iLng - $jLng) * ($iLat - $jLat);

                if ($lat < $intersectLat) {
                    $inside = !$inside;
                }
            }
        }

        return $inside;
    }

    /**
     * Find the delivery zone that contains the given coordinates.
     * Returns null if no active zone covers the point.
     */
    public static function findZoneForCoordinates(float $lat, float $lng): ?self
    {
        $zones = self::active()
            ->withPolygon()
            ->ordered()
            ->get();

        foreach ($zones as $zone) {
            if ($zone->containsPoint($lat, $lng)) {
                return $zone;
            }
        }

        return null;
    }

    /**
     * Find all zones that contain the given coordinates (overlapping zones).
     */
    public static function findAllZonesForCoordinates(float $lat, float $lng): \Illuminate\Support\Collection
    {
        $zones = self::active()
            ->withPolygon()
            ->ordered()
            ->get();

        return $zones->filter(fn($zone) => $zone->containsPoint($lat, $lng));
    }

    /**
     * Calculate the centroid of the polygon.
     */
    public function calculateCentroid(): array
    {
        $polygon = $this->polygon_coordinates ?? [];

        if (empty($polygon)) {
            return ['lat' => 0, 'lng' => 0];
        }

        $latSum = 0;
        $lngSum = 0;
        $count = count($polygon);

        foreach ($polygon as $point) {
            $latSum += (float) ($point['lat'] ?? 0);
            $lngSum += (float) ($point['lng'] ?? 0);
        }

        return [
            'lat' => round($latSum / $count, 8),
            'lng' => round($lngSum / $count, 8),
        ];
    }

    /**
     * Auto-set center coordinates from polygon centroid.
     */
    public function updateCenterFromPolygon(): void
    {
        $centroid = $this->calculateCentroid();
        $this->update([
            'center_lat' => $centroid['lat'],
            'center_lng' => $centroid['lng'],
        ]);
    }

    // ─── Accessors ───────────────────────────────────────────────

    /**
     * Get current active (non-delivered, non-cancelled) orders count.
     */
    public function getActiveOrdersCountAttribute(): int
    {
        return $this->orders()
            ->whereNotIn('status', ['delivered', 'cancelled', 'failed'])
            ->count();
    }

    /**
     * Get effective delivery fee (with surge multiplier).
     */
    public function getEffectiveDeliveryFee(): float
    {
        $baseFee = (float) $this->delivery_fee;
        $multiplier = (float) ($this->surge_multiplier ?? 1.00);

        // Check schedule-based surge
        $scheduleSurge = $this->getCurrentScheduleSurge();
        if ($scheduleSurge > 1.00) {
            $multiplier = max($multiplier, $scheduleSurge);
        }

        return round($baseFee * $multiplier, 2);
    }

    /**
     * Get surge multiplier from current time schedule.
     */
    private function getCurrentScheduleSurge(): float
    {
        $now = now();
        $schedule = $this->schedules()
            ->where('day_of_week', $now->dayOfWeek)
            ->where('start_time', '<=', $now->format('H:i:s'))
            ->where('end_time', '>=', $now->format('H:i:s'))
            ->where('is_active', true)
            ->first();

        return $schedule ? (float) $schedule->surge_multiplier : 1.00;
    }

    /**
     * Check if zone can accept more orders.
     */
    public function canAcceptOrders(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->max_concurrent_orders === null) {
            return true;
        }

        return $this->active_orders_count < $this->max_concurrent_orders;
    }

    /**
     * Calculate distance from zone center to a point (Haversine formula).
     * Returns distance in kilometers.
     */
    public function distanceFromCenter(float $lat, float $lng): float
    {
        if (!$this->center_lat || !$this->center_lng) {
            return PHP_FLOAT_MAX;
        }

        $earthRadius = 6371; // km
        $dLat = deg2rad($lat - $this->center_lat);
        $dLng = deg2rad($lng - $this->center_lng);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($this->center_lat)) * cos(deg2rad($lat)) *
             sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }
}
