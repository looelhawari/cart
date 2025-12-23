<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentMethod extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'card_last_four',
        'card_brand',
        'token',
        'is_default',
        'expires_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'expires_at' => 'date',
    ];

    protected $hidden = [
        'token', // Never expose the actual token
    ];

    /**
     * Get the user that owns the payment method
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if card is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    /**
     * Get masked card number for display
     */
    public function getMaskedCardAttribute(): string
    {
        return '**** **** **** ' . $this->card_last_four;
    }

    /**
     * Scope for default payment method
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope for non-expired cards
     */
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }
}
