<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryZoneSchedule extends Model
{
    protected $table = 'delivery_zone_schedules';

    protected $fillable = [
        'delivery_zone_id',
        'day_of_week',
        'start_time',
        'end_time',
        'is_active',
        'surge_multiplier',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_active' => 'boolean',
        'surge_multiplier' => 'decimal:2',
    ];

    /**
     * Get the zone this schedule belongs to.
     */
    public function zone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    /**
     * Day name accessor.
     */
    public function getDayNameAttribute(): string
    {
        return match($this->day_of_week) {
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            default => 'Unknown',
        };
    }

    /**
     * Check if this schedule is active right now.
     */
    public function isActiveNow(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        return $now->dayOfWeek === $this->day_of_week
            && $now->format('H:i:s') >= $this->start_time
            && $now->format('H:i:s') <= $this->end_time;
    }
}
