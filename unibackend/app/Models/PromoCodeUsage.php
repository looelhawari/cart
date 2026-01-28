<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromoCodeUsage extends Model
{
    protected $table = 'promo_code_usage';

    protected $fillable = [
        'promo_code_id',
        'user_id',
        'order_id',
        'discount_amount',
        'order_total',
        'order_number',
        'used_at',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'order_total' => 'decimal:2',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the promo code
     */
    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(PromoCode::class);
    }

    /**
     * Get the user who used the promo code
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order where promo code was used
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
