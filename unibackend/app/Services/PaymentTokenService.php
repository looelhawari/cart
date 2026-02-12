<?php

namespace App\Services;

use App\Models\PaymentMethod;
use App\Models\PaymobPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * P1: Extracted from PaymentController (God Controller breakup).
 *
 * Handles card token lifecycle:
 * - Deciding whether to save a card token from webhook
 * - Extracting token data from Paymob response
 * - Persisting encrypted tokens to payment_methods table
 * - Duplicate detection via SHA-256 fingerprint
 * - Soft-delete restore strategy
 *
 * CRITICAL: Token save failures MUST NOT break payment completion.
 * All public methods catch exceptions and return gracefully.
 */
class PaymentTokenService
{
    private PaymobService $paymobService;

    public function __construct(PaymobService $paymobService)
    {
        $this->paymobService = $paymobService;
    }

    /**
     * Check if we should save card token from webhook.
     *
     * Conditions:
     * 1. Payment method is CARD (not wallet)
     * 2. User opted in during payment initiation
     * 3. Token exists in Paymob response
     */
    public function shouldSaveCardToken(PaymobPayment $payment, array $payload): bool
    {
        if ($payment->payment_method !== 'CARD') {
            return false;
        }

        if (!$payment->save_card_requested) {
            return false;
        }

        // Check BOTH structures for token presence
        $hasClassicToken = isset($payload['source_data']['token']) && !empty($payload['source_data']['token']);
        $hasIntentionToken = isset($payload['token']['token']) && !empty($payload['token']['token']);
        $hasDirectToken = isset($payload['token']) && is_string($payload['token']) && !empty($payload['token']);

        if (!$hasClassicToken && !$hasIntentionToken && !$hasDirectToken) {
            Log::warning('💳 Card save requested but no token in callback', [
                'payment_id' => $payment->id,
            ]);
            return false;
        }

        return true;
    }

    /**
     * Extract card token from callback and save to payment_methods table.
     *
     * CRITICAL: This method does NOT throw exceptions on failure.
     * Card save failure MUST NOT break payment completion.
     */
    public function saveCardToken(int $userId, array $payload): void
    {
        try {
            $cardData = $this->paymobService->extractCardTokenFromIntention($payload);

            if (!$cardData) {
                Log::warning('💳 Failed to extract card data from callback', [
                    'user_id' => $userId,
                ]);
                return;
            }

            $tokenFingerprint = hash('sha256', $cardData['token']);

            // Check if previously deleted (restore strategy)
            $restored = PaymentMethod::findOrRestoreDeleted($userId, $tokenFingerprint);
            if ($restored) {
                Log::info('💳 Restored previously deleted payment method', [
                    'payment_method_id' => $restored->id,
                    'user_id' => $userId,
                ]);
                return;
            }

            // Duplicate detection
            $exists = PaymentMethod::where('user_id', $userId)
                ->where('token_fingerprint', $tokenFingerprint)
                ->whereNull('deleted_at')
                ->exists();

            if ($exists) {
                Log::info('💳 Card already saved (duplicate)', [
                    'user_id' => $userId,
                    'last4' => $cardData['last4'],
                ]);
                return;
            }

            $isFirstCard = PaymentMethod::where('user_id', $userId)
                ->whereNull('deleted_at')
                ->count() === 0;

            $expiresAt = null;
            if (isset($cardData['expiry_month']) && isset($cardData['expiry_year'])) {
                $expiresAt = Carbon::createFromFormat(
                    'Y-m',
                    $cardData['expiry_year'] . '-' . str_pad($cardData['expiry_month'], 2, '0', STR_PAD_LEFT)
                )->endOfMonth();
            }

            $cardHolderName = null;
            if (isset($payload['billing_data'])) {
                $billing = $payload['billing_data'];
                $cardHolderName = trim(($billing['first_name'] ?? '') . ' ' . ($billing['last_name'] ?? ''));
            }

            $paymentMethod = PaymentMethod::create([
                'user_id' => $userId,
                'type' => 'card',
                'card_last_four' => $cardData['last4'],
                'card_brand' => $cardData['brand'],
                'card_holder_name' => $cardHolderName,
                'paymob_card_token' => $cardData['token'],
                'token_type' => 'paymob_saved_card',
                'status' => 'active',
                'is_default' => $isFirstCard,
                'is_verified' => true,
                'expires_at' => $expiresAt,
            ]);

            Log::info('✅ Card saved successfully', [
                'payment_method_id' => $paymentMethod->id,
                'user_id' => $userId,
                'card_last_four' => $paymentMethod->card_last_four,
                'card_brand' => $paymentMethod->card_brand,
            ]);

        } catch (\Exception $e) {
            Log::error('💳 Failed to save card token - payment still succeeded', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
