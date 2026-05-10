<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymobPayment extends Model
{
    use HasFactory;

    protected $table = 'paymob_payments';

    /**
     * Mass-assignable attributes.
     *
     * SECURITY HARDENED: status, paid_at, paymob_response, paymob_transaction_id,
     * is_fallback_from_moto, moto_attempts/moto_attempted_at are state-machine
     * fields — must only flip via the dedicated transitionTo()/markAsPaid()/
     * markAsFailed() methods. Direct $payment->update(['status'=>'PAID']) was
     * possible from any controller and bypassed the state machine entirely.
     */
    protected $fillable = [
        'order_id',
        'user_id',
        'internal_order_id',
        'paymob_order_id',
        'paymob_intention_id',   // For Unified Checkout
        'special_reference',     // P0 FIX: Unified Checkout merchant reference
        'amount_cents',
        'currency',
        'payment_method',
        'flow',                  // classic_iframe, unified_3ds, moto
        'save_card_requested',
        'integration_id',
        'billing_data',
        // NOT FILLABLE (state machine / gateway-only):
        //   status, paid_at, paymob_response, paymob_transaction_id,
        //   is_fallback_from_moto, moto_attempts, moto_attempted_at, error_message
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

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT STATE MACHINE — Enforced transitions
    // PENDING → PAID | FAILED
    // PAID → REFUNDED
    // FAILED → (terminal)
    // REFUNDED → (terminal)
    // ═══════════════════════════════════════════════════════════════

    private const ALLOWED_TRANSITIONS = [
        'PENDING'  => ['PAID', 'FAILED'],
        'PAID'     => ['REFUNDED'],
        'FAILED'   => [],
        'REFUNDED' => [],
    ];

    /**
     * Enforce legal state transitions.
     * @throws \LogicException if transition is illegal.
     */
    public function transitionTo(string $newStatus): void
    {
        $allowed = self::ALLOWED_TRANSITIONS[$this->status] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            throw new \LogicException(
                "Illegal payment state transition: {$this->status} → {$newStatus} (payment #{$this->id})"
            );
        }
    }

    /**
     * Mark payment as paid.
     */
    public function markAsPaid(string $transactionId, array $response): void
    {
        $this->transitionTo('PAID');
        $this->update([
            'status' => 'PAID',
            'paymob_transaction_id' => $transactionId,
            'paymob_response' => $response,
            'paid_at' => now(),
        ]);
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(string $errorMessage, array $response = null): void
    {
        $this->transitionTo('FAILED');
        $this->update([
            'status' => 'FAILED',
            'error_message' => $errorMessage,
            'paymob_response' => array_merge($response ?? [], ['error' => $errorMessage]),
        ]);
    }

    /**
     * Keep payment PENDING but store gateway response (e.g. authorized-not-captured).
     */
    public function markAsPending(string $reason, array $response = null): void
    {
        $this->update([
            'paymob_response' => $response ?? $this->paymob_response,
            'error_message' => $reason,
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
     * Mark payment as refunded.
     */
    public function markAsRefunded(string $refundId = null): void
    {
        $this->transitionTo('REFUNDED');
        $this->update([
            'status' => 'REFUNDED',
            'error_message' => 'Refunded' . ($refundId ? " (Paymob refund ID: {$refundId})" : ''),
        ]);
    }

    /**
     * Check if payment is refunded.
     */
    public function isRefunded(): bool
    {
        return $this->status === 'REFUNDED';
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
    public function markAsFallbackTo3DS(string $reason = 'MOTO failed, falling back to 3DS'): void
    {
        $this->update([
            'is_fallback_from_moto' => true,
            'flow' => 'unified_3ds',
            'error_message' => $reason,          // FIXED: Matches actual DB column
        ]);
    }

    /**
     * Scope: Get recent failed payments for a user.
     * Uses order relationship since user_id may not exist on all records.
     */
    public function scopeRecentFailures($query, int $userId, int $days = 30)
    {
        return $query->whereHas('order', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
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
