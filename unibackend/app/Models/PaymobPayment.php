<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymobPayment extends Model
{
    use HasFactory;

    protected $table = 'paymob_payments';

    protected $fillable = [
        'order_id',
        'user_id',
        'internal_order_id',
        'paymob_order_id',
        'paymob_intention_id',   // NEW: For Unified Checkout
        'transaction_id',
        'amount_cents',
        'currency',
        'payment_method',
        'flow',                  // NEW: classic_iframe, unified_3ds, moto
        'save_card_requested',
        'moto_attempts',         // NEW: Track MOTO retry attempts
        'moto_attempted_at',     // NEW: When MOTO was last attempted
        'is_fallback_from_moto', // NEW: Track if fell back from MOTO to 3DS
        'integration_id',
        'status',
        'billing_data',
        'paymob_response',
        'failure_reason',
        'paid_at',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'billing_data' => 'array',
        'paymob_response' => 'array',
        'save_card_requested' => 'boolean',
        'is_fallback_from_moto' => 'boolean',
        'moto_attempts' => 'integer',
        'moto_attempted_at' => 'datetime',
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the order that owns the payment.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Mark payment as paid.
     */
    public function markAsPaid(string $transactionId, array $response): void
    {
        $this->update([
            'status' => 'PAID',
            'transaction_id' => $transactionId,  // FIXED: Match actual database column name
            'paymob_response' => $response,
            'paid_at' => now(),
        ]);
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(string $errorMessage, array $response = null): void
    {
        $this->update([
            'status' => 'FAILED',
            'paymob_response' => array_merge($response ?? [], ['error' => $errorMessage]),
        ]);
    }

    /**
     * Check if payment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'PENDING';
    }

    /**
     * Check if payment is paid.
     */
    public function isPaid(): bool
    {
        return $this->status === 'PAID';
    }

    /**
     * Check if payment is failed.
     */
    public function isFailed(): bool
    {
        return $this->status === 'FAILED';
    }

    /**
     * NEW: Mark payment as MOTO attempted.
     */
    public function markMotoAttempted(): void
    {
        $this->increment('moto_attempts');
        $this->moto_attempted_at = now();
        $this->save();
    }

    /**
     * NEW: Mark as fallback to 3DS after MOTO failure.
     */
    public function markAsFallbackTo3DS(string $reason): void
    {
        $this->update([
            'is_fallback_from_moto' => true,
            'flow' => 'unified_3ds',
            'failure_reason' => $reason,
        ]);
    }

    /**
     * Scope: Get recent failed payments for a user.
     */
    public function scopeRecentFailures($query, int $userId, int $days = 30)
    {
        return $query->where('user_id', $userId)
                     ->where('status', 'FAILED')
                     ->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Get amount in EGP (from cents).
     */
    public function getAmountInEgpAttribute(): float
    {
        return $this->amount_cents / 100;
    }
}
