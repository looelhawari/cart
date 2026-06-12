<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlashSaleProduct extends Model
{
    protected $fillable = [
        'flash_sale_id',
        'product_id',
        'original_price',
        'sale_price',
        'quantity_limit',
        'quantity_sold',
    ];

    protected $casts = [
        'original_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
    ];

    public function flashSale(): BelongsTo
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product(): BelongsTo
    {
        // Product PK is `barcode`; product_id holds a barcode value.
        return $this->belongsTo(Product::class, 'product_id', 'barcode');
    }

    /**
     * Get discount percentage.
     */
    public function getDiscountPercentAttribute(): int
    {
        if ($this->original_price <= 0) return 0;
        return (int) round((($this->original_price - $this->sale_price) / $this->original_price) * 100);
    }

    /**
     * Check if product is still available.
     */
    public function isAvailable(): bool
    {
        if (!$this->flashSale->isActive()) return false;
        if ($this->quantity_limit && $this->quantity_sold >= $this->quantity_limit) return false;
        return true;
    }

    /**
     * Get remaining quantity.
     */
    public function getRemainingQuantityAttribute(): ?int
    {
        if (!$this->quantity_limit) return null;
        return max(0, $this->quantity_limit - $this->quantity_sold);
    }

    /**
     * Record a sale.
     */
    public function recordSale(int $quantity = 1): bool
    {
        if (!$this->isAvailable()) return false;

        $this->increment('quantity_sold', $quantity);
        return true;
    }
}
