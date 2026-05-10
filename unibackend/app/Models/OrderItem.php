<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    /**
     * Mass-assignable attributes.
     *
     * SECURITY HARDENED: subtotal is computed from quantity × price server-side
     * (in OrderService::createOrderFromCart). Removing it from $fillable
     * prevents future controllers from forwarding client-supplied subtotals.
     * `refunded` is flipped only by RefundService.
     */
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'product_sku',
        'quantity',
        'price',
        // NOT FILLABLE (computed / state):
        //   subtotal (= quantity * price), refunded (set by RefundService)
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'refunded' => 'boolean',
    ];

    /**
     * Get the order that owns the item
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id', 'barcode');
    }
}
