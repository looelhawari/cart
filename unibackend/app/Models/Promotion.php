<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Promotion extends Model
{
    protected $fillable = [
        'title',
        'title_ar',
        'description',
        'description_ar',
        'image_url',
        'banner_image_url',
        'discount_type',
        'discount_value',
        'start_date',
        'end_date',
        'is_active',
        'is_featured',
        'applies_to',
        'min_purchase',
        'max_discount',
        'terms_conditions',
        'terms_conditions_ar',
        'created_by',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_purchase' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['is_currently_active', 'time_remaining'];

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
        return $now->between($this->start_date, $this->end_date);
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
        $diff = $now->diff($this->end_date);

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
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now);
    }

    /**
     * Scope: Get featured promotion
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true)->active();
    }

    /**
     * Scope: Get promotions for a specific category
     */
    public function scopeForCategory($query, int $categoryId)
    {
        return $query->active()
            ->where(function ($q) use ($categoryId) {
                $q->where('applies_to', 'all')
                    ->orWhere(function ($q2) use ($categoryId) {
                        $q2->where('applies_to', 'category')
                            ->whereHas('categories', function ($q3) use ($categoryId) {
                                $q3->where('categories.id', $categoryId);
                            });
                    });
            });
    }

    /**
     * Scope: Get promotions for a specific product
     */
    public function scopeForProduct($query, string $barcode)
    {
        return $query->active()
            ->where(function ($q) use ($barcode) {
                $q->where('applies_to', 'all')
                    ->orWhere(function ($q2) use ($barcode) {
                        $q2->where('applies_to', 'products')
                            ->whereHas('products', function ($q3) use ($barcode) {
                                $q3->where('products.barcode', $barcode);
                            });
                    });
            });
    }
}
