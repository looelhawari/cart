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
        'internal_order_id',
        'paymob_order_id',
        'paymob_transaction_id',
        'amount_cents',
        'currency',
        'payment_method',
        'integration_id',
        'status',
        'billing_data',
        'paymob_response',
        'payment_token',
        'error_message',
        'paid_at',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'billing_data' => 'array',
        'paymob_response' => 'array',
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
        $this->update([
            'status' => 'FAILED',
            'error_message' => $errorMessage,
            'paymob_response' => $response,
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
     * Get amount in EGP (from cents).
     */
    public function getAmountInEgpAttribute(): float
    {
        return $this->amount_cents / 100;
    }
}
