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
        'invoice_number',
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
        // Zone & delivery tracking fields
        'delivery_zone_id',
        'delivery_lat',
        'delivery_lng',
        'zone_name',
        'driver_id',
        'driver_assigned_at',
        'driver_picked_up_at',
        'actual_delivered_at',
        'estimated_delivery_minutes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'delivery_lat' => 'decimal:8',
        'delivery_lng' => 'decimal:8',
        'delivery_date' => 'date',
        'cancelled_at' => 'datetime',
        'refunded_at' => 'datetime',
        'driver_assigned_at' => 'datetime',
        'driver_picked_up_at' => 'datetime',
        'actual_delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'delivery_address_snapshot' => 'array',
        'promo_code_snapshot' => 'array',
        'estimated_delivery_minutes' => 'integer',
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
     * Get the delivery zone
     */
    public function deliveryZone(): BelongsTo
    {
        return $this->belongsTo(DeliveryZone::class, 'delivery_zone_id');
    }

    /**
     * Get the assigned driver
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
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
     * Get refund records for this order
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(OrderRefund::class);
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
            'pending_payment' => 'Pending Payment',
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
            'partially_refunded' => 'Partially Refunded',
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
     * Get the reviews for this order
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the order rating (overall order experience rating)
     */
    public function orderRating()
    {
        return $this->hasOne(Review::class)->where('rating_type', 'order');
    }

    /**
     * Get the driver rating (customer rated the driver for this order)
     */
    public function driverRating()
    {
        return $this->hasOne(Review::class)->where('rating_type', 'driver');
    }

    /**
     * Get the customer rating (driver rated the customer for this order)
     */
    public function customerRating()
    {
        return $this->hasOne(Review::class)->where('rating_type', 'customer');
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

    /**
     * Generate unique sequential invoice number (INV-YYYYMMDD-XXXXXX)
     */
    public static function generateInvoiceNumber(): string
    {
        do {
            $invoiceNumber = 'INV-' . date('Ymd') . '-' . str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('invoice_number', $invoiceNumber)->exists());

        return $invoiceNumber;
    }

    /**
     * Get or create an invoice number for this order (lazy generation).
     */
    public function getOrCreateInvoiceNumber(): string
    {
        if (!$this->invoice_number) {
            $this->invoice_number = self::generateInvoiceNumber();
            $this->save();
        }

        return $this->invoice_number;
    }
}
