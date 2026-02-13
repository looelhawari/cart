<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\PaymobPayment;
use Illuminate\Support\Facades\Log;

class PaymentDecisionService
{
    /**
     * Decide which payment flow to use based on business rules.
     *
     * Decision Tree:
     * 1. No saved card? → Unified Checkout 3DS
     * 2. Has saved card + meets MOTO criteria? → Try MOTO first
     * 3. MOTO fails? → Fallback to Unified Checkout 3DS
     * 4. High value order? → Force Unified Checkout 3DS
     *
     * @param Order $order
     * @param PaymentMethod|null $savedCard
     * @param bool $saveCard Whether user wants to save card
     * @return array ['flow' => 'unified_3ds|moto', 'reason' => '...', other params]
     */
    public function decidePaymentFlow(Order $order, ?PaymentMethod $savedCard, bool $saveCard = false): array
    {
        // Check if features are enabled
        $motoEnabled = config('payments.enable_moto', true);
        $savedCardsEnabled = config('payments.enable_saved_cards', true);
        $unifiedEnabled = config('payments.enable_unified_checkout', true);

        // RULE 1: No saved card → Always Unified Checkout
        if (!$savedCard) {
            Log::info('💳 Decision: Unified 3DS (no saved card)', [
                'order_id' => $order->id,
                'save_card' => $saveCard,
            ]);

            return [
                'flow' => 'unified_3ds',
                'reason' => 'No saved card - first time payment',
                'should_save_card' => $saveCard && $savedCardsEnabled,
                'use_saved_card_token' => null,
            ];
        }

        // RULE 2: Saved card exists but invalid/expired
        if (!$savedCard->isActive()) {
            Log::info('💳 Decision: Unified 3DS (saved card inactive)', [
                'order_id' => $order->id,
                'payment_method_id' => $savedCard->id,
                'status' => $savedCard->status,
                'expired' => $savedCard->isExpired(),
            ]);

            return [
                'flow' => 'unified_3ds',
                'reason' => 'Saved card invalid or expired - updating card',
                'should_save_card' => $savedCardsEnabled,
                'use_saved_card_token' => null, // Don't pre-fill invalid card
            ];
        }

        // RULE 3: Unified Checkout disabled → Use classic iframe
        if (!$unifiedEnabled) {
            return [
                'flow' => 'classic_iframe',
                'reason' => 'Unified Checkout feature disabled',
                'should_save_card' => false,
            ];
        }

        // RULE 4: High value order → Force 3DS for security
        $highValueThreshold = config('payments.high_value_threshold', 200000); // 2000 EGP in cents
        $amountCents = (int) ($order->total * 100);
        if ($amountCents > $highValueThreshold) {
            Log::info('💳 Decision: Unified 3DS (high value order)', [
                'order_id' => $order->id,
                'amount_cents' => $amountCents,
                'threshold' => $highValueThreshold,
            ]);

            return [
                'flow' => 'unified_3ds',
                'reason' => 'High value order requires 3DS authentication',
                'should_save_card' => false,
                'use_saved_card_token' => $savedCard->paymob_card_token, // Pre-fill in Unified Checkout
                'saved_card' => $savedCard,
            ];
        }

        // RULE 5: Check user payment history (fraud prevention)
        $recentFailures = $this->countRecentPaymentFailures($order->user_id);
        $failureThreshold = config('payments.recent_failure_threshold', 2);

        if ($recentFailures >= $failureThreshold) {
            Log::info('💳 Decision: Unified 3DS (recent payment failures)', [
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'recent_failures' => $recentFailures,
                'threshold' => $failureThreshold,
            ]);

            return [
                'flow' => 'unified_3ds',
                'reason' => 'Recent payment failures detected - requiring 3DS',
                'should_save_card' => false,
                'use_saved_card_token' => $savedCard->paymob_card_token,
                'saved_card' => $savedCard,
            ];
        }

        // RULE 6: MOTO disabled → Use Unified 3DS
        if (!$motoEnabled) {
            Log::info('💳 Decision: Unified 3DS (MOTO disabled)', [
                'order_id' => $order->id,
            ]);

            return [
                'flow' => 'unified_3ds',
                'reason' => 'MOTO feature disabled',
                'should_save_card' => false,
                'use_saved_card_token' => $savedCard->paymob_card_token,
                'saved_card' => $savedCard,
            ];
        }

        // RULE 7: Force 3DS for new users (optional policy)
        if (config('payments.force_3ds_for_new_users', false)) {
            $userOrderCount = Order::where('user_id', $order->user_id)
                ->where('payment_status', 'completed')
                ->count();

            if ($userOrderCount < 2) {
                Log::info('💳 Decision: Unified 3DS (new user policy)', [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'completed_orders' => $userOrderCount,
                ]);

                return [
                    'flow' => 'unified_3ds',
                    'reason' => 'New user - requires 3DS for first orders',
                    'should_save_card' => false,
                    'use_saved_card_token' => $savedCard->paymob_card_token,
                    'saved_card' => $savedCard,
                ];
            }
        }

        // RULE 8: Default to MOTO for best UX (one-click)
        Log::info('💳 Decision: MOTO (one-click payment)', [
            'order_id' => $order->id,
            'payment_method_id' => $savedCard->id,
            'amount_cents' => (int) ($order->total * 100),
        ]);

        return [
            'flow' => 'moto',
            'reason' => 'Saved card + low risk order - attempting one-click MOTO',
            'fallback_to_3ds' => true, // Auto-fallback if MOTO fails
            'saved_card' => $savedCard,
        ];
    }

    /**
     * Count payment failures in recent period.
     * Used for fraud detection and risk assessment.
     *
     * @param int $userId
     * @return int Number of failed payments
     */
    private function countRecentPaymentFailures(int $userId): int
    {
        $lookbackDays = config('payments.recent_failure_lookback_days', 30);

        return PaymobPayment::whereHas('order', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where('status', 'FAILED')
            ->where('created_at', '>=', now()->subDays($lookbackDays))
            ->count();
    }

    /**
     * Determine if MOTO should be retried after failure.
     *
     * @param PaymobPayment $payment
     * @return bool
     */
    public function shouldRetryMoto(PaymobPayment $payment): bool
    {
        $maxAttempts = config('payments.moto_max_attempts', 1);

        return $payment->moto_attempts < $maxAttempts;
    }

    /**
     * Check if payment should fallback to 3DS after MOTO failure.
     *
     * @param array $motoResponse Response from payWithSavedCardMoto()
     * @return bool
     */
    public function shouldFallbackTo3DS(array $motoResponse): bool
    {
        // If MOTO explicitly requires 3DS
        if ($motoResponse['requires_3ds'] ?? false) {
            return true;
        }

        // If MOTO has redirect URL (indicates 3DS needed)
        if (!empty($motoResponse['redirect_url'])) {
            return true;
        }

        // If MOTO failed but didn't specify 3DS requirement
        // Still fallback to give user another chance
        if (!($motoResponse['success'] ?? false)) {
            return true;
        }

        return false;
    }
}
