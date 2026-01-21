<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'order_number',
        'status',
        'subtotal',
        'delivery_fee',
        'discount',
        'tax',
        'total',
        'payment_method',
        'payment_status',
        'delivery_address_id',
        'delivery_address_snapshot',
        'promo_code_snapshot',
        'delivery_date',
        'delivery_time_slot',
        'notes',
        'cancelled_at',
        'cancellation_reason',
        'refunded_at',
        'refund_reason',
        'refunded_amount',
        'refunded_by',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'delivery_date' => 'date',
        'cancelled_at' => 'datetime',
        'refunded_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'delivery_address_snapshot' => 'array',
        'promo_code_snapshot' => 'array',
    ];

    protected $appends = ['status_label', 'payment_status_label'];

    /**
     * Get the user that owns the order
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the delivery address
     */
    public function deliveryAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'delivery_address_id');
    }

    /**
     * Get the admin who processed the refund
     */
    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }

    /**
     * Get the order items
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the order status history
     * Note: Disabled until order_status_history table is created
     */
    // public function statusHistory(): HasMany
    // {
    //     return $this->hasMany(OrderStatusHistory::class);
    // }

    /**
     * Get the Paymob payments for this order
     */
    public function paymobPayments(): HasMany
    {
        return $this->hasMany(PaymobPayment::class);
    }

    /**
     * Get the latest successful Paymob payment
     */
    public function successfulPayment()
    {
        return $this->paymobPayments()->where('status', 'PAID')->latest()->first();
    }

    /**
     * Get status label for display
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'preparing' => 'Preparing',
            'out_for_delivery' => 'Out for Delivery',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
            'failed' => 'Failed',
            default => 'Unknown',
        };
    }

    /**
     * Get payment status label for display
     */
    public function getPaymentStatusLabelAttribute(): string
    {
        return match($this->payment_status) {
            'pending' => 'Pending',
            'completed' => 'Completed',
            'failed' => 'Failed',
            'refunded' => 'Refunded',
            default => 'Unknown',
        };
    }

    /**
     * Scope for user's orders
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope for active orders (not cancelled or delivered)
     */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['delivered', 'cancelled', 'failed']);
    }

    /**
     * Generate unique order number
     */
    public static function generateOrderNumber(): string
    {
        do {
            $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }
}
