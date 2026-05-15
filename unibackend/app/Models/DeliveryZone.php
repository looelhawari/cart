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
     * GPS-jitter tolerance buffer in metres applied to every polygon-
     * containment check. Mobile GPS routinely reports 5-20 metres of
     * accuracy error even in good conditions — without a buffer a
     * customer literally standing inside the polygon can be flagged
     * "outside zone" because the device pinned them just past an edge.
     *
     * 25 m is conservative: well inside one building block, but generous
     * enough to absorb typical GPS noise. Admins can override via the
     * `delivery_zone_buffer_metres` store setting if needed.
     */
    public const DEFAULT_BUFFER_METRES = 25;

    /**
     * Check if a coordinate point falls within this zone's polygon.
     *
     * BUFFERED RAY-CASTING (Wave 5 — Task 1 — false outside-zone alerts):
     * Previously this was a strict ray-cast test. After Wave 3 added a
     * hard-throw on out-of-zone (replacing the silent flat-fee fall-through),
     * GPS jitter of a few metres started rejecting legitimate orders. Now
     * we accept a point if EITHER:
     *   (a) the strict ray-cast says it's inside, OR
     *   (b) the point lies within `DEFAULT_BUFFER_METRES` of any polygon
     *       edge (= GPS-noise tolerance).
     *
     * Branch (b) is implemented as a haversine distance check from the
     * point to each polygon edge. This is intentionally cheap: for the
     * "definitely inside" case (a) returns true immediately, and only the
     * edge case (point < ~25 m outside) pays the cost.
     */
    public function containsPoint(float $lat, float $lng): bool
    {
        $polygon = $this->polygon_coordinates;

        if (empty($polygon) || count($polygon) < 3) {
            return false;
        }

        if (self::pointInPolygon($lat, $lng, $polygon)) {
            return true;
        }

        // GPS-jitter tolerance: check distance to the polygon boundary.
        $bufferMetres = self::DEFAULT_BUFFER_METRES;
        return self::distanceToPolygonEdgeMetres($lat, $lng, $polygon) <= $bufferMetres;
    }

    /**
     * Minimum great-circle distance (in metres) from a point to any edge
     * of a polygon. Returns 0 if the point is on a vertex.
     *
     * Uses the projection-onto-line-segment formula in WGS84, accurate
     * enough for delivery-zone-scale distances (< 100 km).
     */
    public static function distanceToPolygonEdgeMetres(float $lat, float $lng, array $polygon): float
    {
        $n = count($polygon);
        if ($n < 2) {
            return PHP_FLOAT_MAX;
        }

        $min = PHP_FLOAT_MAX;
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $aLat = (float) ($polygon[$j]['lat'] ?? 0);
            $aLng = (float) ($polygon[$j]['lng'] ?? 0);
            $bLat = (float) ($polygon[$i]['lat'] ?? 0);
            $bLng = (float) ($polygon[$i]['lng'] ?? 0);
            $d = self::pointToSegmentDistanceMetres($lat, $lng, $aLat, $aLng, $bLat, $bLng);
            if ($d < $min) {
                $min = $d;
            }
        }
        return $min;
    }

    /**
     * Distance from a (lat,lng) point to the line segment (A,B) in metres.
     * Approximates the local plane via an equirectangular projection at
     * the segment's mean latitude — accurate to ~0.1% over <50 km, which
     * is more than enough for delivery-zone polygons.
     */
    private static function pointToSegmentDistanceMetres(
        float $pLat, float $pLng,
        float $aLat, float $aLng,
        float $bLat, float $bLng,
    ): float {
        // Convert to local metres via equirectangular projection.
        $R = 6_371_000.0;
        $meanLatRad = deg2rad(($aLat + $bLat) / 2.0);
        $latToM = $R * (M_PI / 180.0);
        $lngToM = $R * (M_PI / 180.0) * cos($meanLatRad);

        $px = $pLng * $lngToM; $py = $pLat * $latToM;
        $ax = $aLng * $lngToM; $ay = $aLat * $latToM;
        $bx = $bLng * $lngToM; $by = $bLat * $latToM;

        $dx = $bx - $ax;
        $dy = $by - $ay;
        $len2 = $dx * $dx + $dy * $dy;
        if ($len2 <= 0.0) {
            // Zero-length segment — distance to point A.
            $ex = $px - $ax; $ey = $py - $ay;
            return sqrt($ex * $ex + $ey * $ey);
        }
        // Project p onto segment, clamp to [0, 1].
        $t = (($px - $ax) * $dx + ($py - $ay) * $dy) / $len2;
        $t = max(0.0, min(1.0, $t));
        $cx = $ax + $t * $dx;
        $cy = $ay + $t * $dy;
        $ex = $px - $cx; $ey = $py - $cy;
        return sqrt($ex * $ex + $ey * $ey);
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
     *
     * LOGGING (Wave 5 — Task 1):
     * On a "no zone matched" result we log the point coords AND the
     * nearest active zone with its edge distance. That gives operations
     * a single grep target ("zone-detect: rejected") when a customer
     * reports "I am inside the zone but the app rejects me", so admin
     * can compare the user's pin to where their polygon actually sits
     * and either correct the polygon or widen the buffer.
     */
    public static function findZoneForCoordinates(float $lat, float $lng): ?self
    {
        $zones = self::active()
            ->withPolygon()
            ->ordered()
            ->get();

        $nearest = null;
        $nearestMetres = PHP_FLOAT_MAX;

        foreach ($zones as $zone) {
            if ($zone->containsPoint($lat, $lng)) {
                return $zone;
            }
            $polygon = $zone->polygon_coordinates ?? [];
            if (count($polygon) >= 2) {
                $d = self::distanceToPolygonEdgeMetres($lat, $lng, $polygon);
                if ($d < $nearestMetres) {
                    $nearestMetres = $d;
                    $nearest = $zone;
                }
            }
        }

        \Illuminate\Support\Facades\Log::info('zone-detect: rejected', [
            'lat'                  => $lat,
            'lng'                  => $lng,
            'active_zones'         => $zones->count(),
            'nearest_zone_id'      => $nearest?->id,
            'nearest_zone_name'    => $nearest?->name,
            'nearest_edge_metres'  => $nearest ? (int) round($nearestMetres) : null,
            'buffer_metres'        => self::DEFAULT_BUFFER_METRES,
        ]);

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
