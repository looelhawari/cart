<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderRefund extends Model
{
    use HasFactory;

    protected $table = 'order_refunds';

    protected $fillable = [
        'order_id',
        'user_id',
        'paymob_payment_id',
        'type',
        'original_amount',
        'penalty_percent',
        'penalty_amount',
        'refund_amount',
        'paymob_transaction_id',
        'paymob_refund_id',
        'refund_method',
        'status',
        'reason',
        'failure_reason',
        'initiated_by',
        'admin_id',
        'paymob_response',
        'refunded_items',
        'completed_at',
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'penalty_percent' => 'decimal:2',
        'penalty_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'paymob_response' => 'array',
        'refunded_items' => 'array',
        'completed_at' => 'datetime',
    ];

    // ═══════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function paymobPayment(): BelongsTo
    {
        return $this->belongsTo(PaymobPayment::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    // ═══════════════════════════════════════════
    // STATUS HELPERS
    // ═══════════════════════════════════════════

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function markAsProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    public function markAsCompleted(string $paymobRefundId = null, array $paymobResponse = null): void
    {
        $this->update([
            'status' => 'completed',
            'paymob_refund_id' => $paymobRefundId,
            'paymob_response' => $paymobResponse,
            'completed_at' => now(),
        ]);
    }

    public function markAsFailed(string $failureReason, array $paymobResponse = null): void
    {
        $this->update([
            'status' => 'failed',
            'failure_reason' => $failureReason,
            'paymob_response' => $paymobResponse,
        ]);
    }

    // ═══════════════════════════════════════════
    // SCOPES
    // ═══════════════════════════════════════════

    public function scopeForOrder($query, int $orderId)
    {
        return $query->where('order_id', $orderId);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Get the total already refunded for an order.
     */
    public static function totalRefundedForOrder(int $orderId): float
    {
        return (float) self::where('order_id', $orderId)
            ->where('status', 'completed')
            ->sum('refund_amount');
    }
}
