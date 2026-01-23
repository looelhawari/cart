<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class PaymentMethod extends Model
{
    use SoftDeletes; // ✅ Audit trail for deleted cards

    protected $fillable = [
        'user_id',
        'type',
        'card_last_four',
        'card_brand',
        'card_holder_name',
        'token', // Auto-encrypted via accessor
        'token_fingerprint', // SHA-256 hash for duplicate detection
        'is_default',
        'is_verified',
        'expires_at',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_verified' => 'boolean',
        'expires_at' => 'date',
    ];

    protected $hidden = [
        'token', // NEVER expose in JSON - PCI-DSS compliance
    ];

    // ═══════════════════════════════════════════════════════
    // ENCRYPTION (PCI-DSS Compliance - Phase 1)
    // ═══════════════════════════════════════════════════════

    /**
     * Encrypt token before saving to database.
     * Uses Laravel's encryption (AES-256-CBC with APP_KEY).
     * Also auto-generates token_fingerprint for duplicate detection.
     *
     * CRITICAL: Does NOT throw on encryption failure (payment flows must not break).
     * If encryption fails, sets both token and fingerprint to null and logs error.
     *
     * @param string|null $value
     */
    public function setTokenAttribute($value): void
    {
        if (!$value) {
            $this->attributes['token'] = null;
            $this->attributes['token_fingerprint'] = null;
            return;
        }

        try {
            // Encrypt token for storage
            $this->attributes['token'] = Crypt::encryptString($value);

            // Generate SHA-256 fingerprint for duplicate detection
            $this->attributes['token_fingerprint'] = hash('sha256', $value);
        } catch (\Exception $e) {
            // CRITICAL: Log but DON'T throw - payment completion must not break
            Log::error('Failed to encrypt payment token - card save skipped', [
                'user_id' => $this->user_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Set to null - card won't be saved, but payment completes
            $this->attributes['token'] = null;
            $this->attributes['token_fingerprint'] = null;
        }
    }

    /**
     * Decrypt token when reading from database.
     * Returns null on decryption failure (e.g., APP_KEY changed).
     *
     * @param string|null $value
     * @return string|null
     */
    public function getTokenAttribute($value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Exception $e) {
            Log::error('Failed to decrypt payment token', [
                'payment_method_id' => $this->id,
                'user_id' => $this->user_id,
                'error' => $e->getMessage(),
            ]);
            // Return null instead of throwing - allows graceful degradation
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════
    // RELATIONSHIPS
    // ═══════════════════════════════════════════════════════

    /**
     * Get the user that owns the payment method
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ═══════════════════════════════════════════════════════
    // VALIDATION & BUSINESS LOGIC
    // ═══════════════════════════════════════════════════════

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
     * Get masked card number for display (e.g., "**** **** **** 4242")
     */
    public function getMaskedCardAttribute(): string
    {
        return '**** **** **** ' . $this->card_last_four;
    }

    /**
     * Get formatted expiry date for display (e.g., "12/25")
     */
    public function getFormattedExpiryAttribute(): ?string
    {
        if (!$this->expires_at) {
            return null;
        }

        return $this->expires_at->format('m/y');
    }

    /**
     * Get card icon/emoji based on brand
     */
    public function getCardIconAttribute(): string
    {
        return match($this->card_brand) {
            'visa' => '💳 Visa',
            'mastercard' => '💳 Mastercard',
            'amex' => '💳 Amex',
            'discover' => '💳 Discover',
            default => '💳 Card',
        };
    }

    // ═══════════════════════════════════════════════════════
    // SCOPES (Query Builders)
    // ═══════════════════════════════════════════════════════

    /**
     * Scope: Get default payment method for user
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope: Get only active cards (non-expired + verified)
     */
    public function scopeActive($query)
    {
        return $query
            ->where('is_verified', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Scope: Get only verified cards (used for payment at least once)
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    // ═══════════════════════════════════════════════════════
    // BUSINESS METHODS
    // ═══════════════════════════════════════════════════════

    /**
     * Mark this card as verified after first successful payment.
     * Called from PaymentController webhook after success.
     */
    public function markAsVerified(): void
    {
        $this->update(['is_verified' => true]);

        Log::info('Payment method verified', [
            'payment_method_id' => $this->id,
            'user_id' => $this->user_id,
            'card_last_four' => $this->card_last_four,
        ]);
    }

    /**
     * Set this card as default (unset all others for user).
     * Uses transaction to ensure atomicity.
     */
    public function setAsDefault(): void
    {
        \DB::transaction(function () {
            // Unset all other defaults for this user
            self::where('user_id', $this->user_id)
                ->where('id', '!=', $this->id)
                ->update(['is_default' => false]);

            // Set this as default
            $this->update(['is_default' => true]);
        });

        Log::info('Default payment method updated', [
            'payment_method_id' => $this->id,
            'user_id' => $this->user_id,
        ]);
    }

    /**
     * Validate token can be decrypted before use.
     * Returns true if token is valid and decryptable.
     */
    public function hasValidToken(): bool
    {
        return !is_null($this->token);
    }

    /**
     * Find or restore a previously deleted card by token fingerprint.
     *
     * Strategy: If user re-adds a card they previously deleted, we restore
     * the soft-deleted record instead of creating a duplicate.
     *
     * This prevents unique constraint violations and maintains audit trail.
     *
     * @param int $userId
     * @param string $tokenFingerprint SHA-256 hash of token
     * @return PaymentMethod|null The restored card or null if not found
     */
    public static function findOrRestoreDeleted(int $userId, string $tokenFingerprint): ?PaymentMethod
    {
        // Check if this exact card was soft-deleted before
        $deletedCard = self::onlyTrashed()
            ->where('user_id', $userId)
            ->where('token_fingerprint', $tokenFingerprint)
            ->first();

        if ($deletedCard) {
            // Restore the soft-deleted record
            $deletedCard->restore();

            Log::info('Restored previously deleted payment method', [
                'payment_method_id' => $deletedCard->id,
                'user_id' => $userId,
                'card_last_four' => $deletedCard->card_last_four,
            ]);

            return $deletedCard;
        }

        return null;
    }
}
