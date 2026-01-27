<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $primaryKey = 'barcode';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'barcode',
        'name_en',
        'name_ar',
        'slug',
        'image',
        'description_en',
        'description_ar',
        'price',
        'sale_price',
        'cost_price',
        'stock_quantity',
        'weight',
        'unit',
        'nutrition_facts',
        'rating',
        'review_count',
        'is_featured',
        'is_active',
        'sales_count',
    ];

    protected $casts = [
        'barcode' => 'integer',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'weight' => 'decimal:2',
        'stock_quantity' => 'integer',
        'rating' => 'decimal:2',
        'review_count' => 'integer',
        'nutrition_facts' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'sales_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The categories that belong to the product
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'product_categories', 'product_id', 'category_id', 'barcode');
    }

    /**
     * Get discount percentage if sale_price exists
     */
    public function getDiscountPercentageAttribute(): ?int
    {
        if ($this->sale_price && $this->price > $this->sale_price) {
            return round((($this->price - $this->sale_price) / $this->price) * 100);
        }
        return null;
    }

    /**
     * Get the effective price (sale price or regular price)
     */
    public function getEffectivePriceAttribute(): float
    {
        return $this->sale_price ?? $this->price;
    }
}
