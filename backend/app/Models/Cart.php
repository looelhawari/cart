<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the cart
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the cart items
     */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Get the total number of items in cart
     */
    public function getItemsCountAttribute(): int
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Calculate subtotal (sum of all items)
     */
    public function getSubtotalAttribute(): float
    {
        return round($this->items()->get()->sum(function ($item) {
            return $item->price * $item->quantity;
        }), 2);
    }
}
