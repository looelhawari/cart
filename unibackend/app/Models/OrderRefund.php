<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderRefund extends Model
{
    use HasFactory;

    protected $table = 'order_refunds';

    /**
     * Mass-assignable attributes.
     *
     * SECURITY HARDENED: status, paymob_refund_id, paymob_response, completed_at,
     * failure_reason are gateway/state fields — must only be flipped via the
     * dedicated mark*() methods that go through Paymob's webhook. Previously
     * a controller forwarding $request->validated() could fabricate a
     * status='completed' refund record without touching Paymob, then
     * RefundService::partialRefund's totalRefundedForOrder would credit the
     * wallet trusting the lie.
     */
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
        'refund_method',
        'reason',
        'initiated_by',
        'admin_id',
        'refunded_items',
        'idempotency_key',
        // NOT FILLABLE (gateway/state):
        //   status, paymob_refund_id, paymob_response, completed_at, failure_reason
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

    /**
     * Hidden from JSON serialization.
     *
     * SECURITY: gateway IDs and the full Paymob response can include card BINs,
     * masked PANs, internal merchant IDs and idempotency fingerprints. The
     * admin refund dashboard returns OrderRefund rows directly, so these must
     * never reach the client without an explicit makeVisible() at the call
     * site that needs them. The internal idempotency_key is also hidden so
     * its shape can't be probed and replayed.
     */
    protected $hidden = [
        'paymob_response',
        'paymob_refund_id',
        'paymob_transaction_id',
        'idempotency_key',
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

    /**
     * Canonical idempotency key for refund deduplication.
     *
     * SECURITY: previously RefundService and OrderCancellationService used
     * different key shapes (plain string vs sha256). The same partial refund
     * routed through the two paths produced two different keys, so the
     * idempotency unique-index never fired and Paymob could be charged twice.
     *
     * Both services now route through this single method so the key is
     * shape-stable across all entry points.
     *
     * Format: sha256("refund:{orderId}:{type}:{amountCents}")
     */
    public static function idempotencyKey(int $orderId, string $type, int $amountCents): string
    {
        return hash('sha256', "refund:{$orderId}:{$type}:{$amountCents}");
    }
}
