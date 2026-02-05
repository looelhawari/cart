<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FlashSale extends Model
{
    protected $fillable = [
        'title',
        'title_ar',
        'description',
        'description_ar',
        'image_url',
        'starts_at',
        'ends_at',
        'start_notification_sent',
        'ending_notification_sent',
        'is_active',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'start_notification_sent' => 'boolean',
        'ending_notification_sent' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(FlashSaleProduct::class);
    }

    /**
     * Check if flash sale is currently active.
     */
    public function isActive(): bool
    {
        $now = now();
        return $this->is_active && $this->starts_at <= $now && $this->ends_at > $now;
    }

    /**
     * Get time remaining in seconds.
     */
    public function getTimeRemainingAttribute(): int
    {
        if (!$this->isActive()) return 0;
        return max(0, now()->diffInSeconds($this->ends_at, false));
    }

    /**
     * Get all active flash sales.
     */
    public static function getActive(): \Illuminate\Database\Eloquent\Collection
    {
        $now = now();
        return self::where('is_active', true)
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>', $now)
            ->with('products.product')
            ->get();
    }

    /**
     * Get upcoming flash sales.
     */
    public static function getUpcoming(int $limit = 5): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('is_active', true)
            ->where('starts_at', '>', now())
            ->orderBy('starts_at')
            ->limit($limit)
            ->get();
    }
}
