<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Promotion extends Model
{
    // Database schema uses: name, description, type, discount_type, discount_value,
    // min_purchase, max_discount, starts_at, ends_at, is_active, priority, banner_image
    protected $fillable = [
        'name',
        'description',
        'type',           // flash_sale, deal, seasonal, clearance
        'discount_type',  // percentage, fixed
        'discount_value',
        'min_purchase',
        'max_discount',
        'starts_at',
        'ends_at',
        'is_active',
        'priority',
        'banner_image',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_purchase' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_active' => 'boolean',
        'priority' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['is_currently_active', 'time_remaining'];

    // Accessors to map database columns to expected API fields
    public function getTitleAttribute()
    {
        return $this->name;
    }

    public function getStartDateAttribute()
    {
        return $this->starts_at;
    }

    public function getEndDateAttribute()
    {
        return $this->ends_at;
    }

    public function getBannerImageUrlAttribute()
    {
        return $this->banner_image;
    }

    /**
     * Get the admin who created this promotion
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Categories this promotion applies to
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'promotion_categories');
    }

    /**
     * Products this promotion applies to
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'promotion_products', 'promotion_id', 'product_barcode', 'id', 'barcode');
    }

    /**
     * Check if promotion is currently active (based on dates and is_active flag)
     */
    public function getIsCurrentlyActiveAttribute(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = Carbon::now();
        return $now->between($this->starts_at, $this->ends_at);
    }

    /**
     * Get time remaining until promotion ends
     */
    public function getTimeRemainingAttribute(): ?array
    {
        if (!$this->is_currently_active) {
            return null;
        }

        $now = Carbon::now();
        $diff = $now->diff($this->ends_at);

        return [
            'days' => $diff->days,
            'hours' => $diff->h,
            'minutes' => $diff->i,
            'seconds' => $diff->s,
        ];
    }

    /**
     * Calculate discount for a given price
     */
    public function calculateDiscount(float $price): float
    {
        if ($this->discount_type === 'percentage') {
            $discount = $price * ($this->discount_value / 100);

            // Apply maximum discount cap if set
            if ($this->max_discount && $discount > $this->max_discount) {
                $discount = (float) $this->max_discount;
            }

            return round($discount, 2);
        }

        if ($this->discount_type === 'fixed') {
            return min((float) $this->discount_value, $price);
        }

        return 0.00;
    }

    /**
     * Scope: Get only active promotions
     */
    public function scopeActive($query)
    {
        $now = Carbon::now();
        return $query->where('is_active', true)
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>=', $now);
    }

    /**
     * Scope: Get featured promotion (highest priority)
     */
    public function scopeFeatured($query)
    {
        return $query->active()->orderBy('priority', 'desc');
    }

    /**
     * Scope: Get promotions for a specific category
     */
    public function scopeForCategory($query, int $categoryId)
    {
        return $query->active()
            ->whereHas('categories', function ($q) use ($categoryId) {
                $q->where('categories.id', $categoryId);
            });
    }

    /**
     * Scope: Get promotions for a specific product
     */
    public function scopeForProduct($query, string $barcode)
    {
        return $query->active()
            ->whereHas('products', function ($q) use ($barcode) {
                $q->where('products.barcode', $barcode);
            });
    }
}
