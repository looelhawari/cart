<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\PromoCode;
use App\Models\UserWallet;
use App\Models\PaymobPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class CheckoutService
{
    private PaymobService $paymobService;

    public function __construct(PaymobService $paymobService)
    {
        $this->paymobService = $paymobService;
    }

    /**
     * Process payment with wallet-first strategy
     *
     * @param Order $order
     * @param string $paymentMethod 'wallet' | 'card' | 'cash_on_delivery'
     * @param array $billingData Required for card payments
     * @return array Payment result with status and next steps
     * @throws Exception
     */
    public function processPayment(Order $order, string $paymentMethod, array $billingData = []): array
    {
        // Get or create user wallet
        $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

        // Strategy selection based on payment method and wallet balance
        if ($paymentMethod === 'wallet' && $wallet->hasSufficientBalance($order->total)) {
            // Strategy 1: Full payment with wallet
            return $this->payWithWalletOnly($order, $wallet);
        }

        if ($paymentMethod === 'card') {
            if ($wallet->balance > 0 && $wallet->balance < $order->total) {
                // Strategy 2: Partial wallet + card
                return $this->payWithWalletAndCard($order, $wallet, $billingData);
            } else {
                // Strategy 3: Card only
                return $this->payWithCardOnly($order, $billingData);
            }
        }

        if ($paymentMethod === 'cash_on_delivery') {
            // Strategy 4: COD
            return $this->payWithCOD($order);
        }

        if ($paymentMethod === 'wallet' && !$wallet->hasSufficientBalance($order->total)) {
            throw new Exception('Insufficient wallet balance. Please use card payment.');
        }

        throw new Exception('Invalid payment method');
    }

    /**
     * Strategy 1: Pay entirely with wallet balance
     */
    private function payWithWalletOnly(Order $order, UserWallet $wallet): array
    {
        DB::transaction(function () use ($order, $wallet) {
            // Debit wallet
            $wallet->debit(
                $order->total,
                "Payment for order #{$order->order_number}",
                'Order',
                $order->id,
                "order_payment_{$order->id}"
            );

            // Update order
            $order->update([
                'payment_method' => 'wallet',
                'payment_status' => 'completed',
                'status' => 'confirmed',
            ]);

            Log::info('Order paid with wallet', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $order->total,
                'user_id' => $order->user_id,
            ]);
        });

        return [
            'success' => true,
            'payment_method' => 'wallet',
            'status' => 'completed',
            'message' => 'Payment completed successfully with wallet',
            'order_id' => $order->id,
        ];
    }

    /**
     * Strategy 2: Pay partially with wallet, remainder with card
     */
    private function payWithWalletAndCard(Order $order, UserWallet $wallet, array $billingData): array
    {
        $walletAmount = $wallet->balance;
        $cardAmount = $order->total - $walletAmount;

        // Debit wallet first
        DB::transaction(function () use ($order, $wallet, $walletAmount) {
            $wallet->debit(
                $walletAmount,
                "Partial payment for order #{$order->order_number} (wallet portion)",
                'Order',
                $order->id,
                "order_partial_wallet_{$order->id}"
            );

            // Mark order with partial payment
            $order->update([
                'payment_method' => 'wallet+card',
                'payment_status' => 'pending',
            ]);

            Log::info('Partial wallet payment processed', [
                'order_id' => $order->id,
                'wallet_amount' => $walletAmount,
                'remaining_amount' => $cardAmount,
            ]);
        });

        // Initiate Paymob for remaining amount
        $amountCents = (int)($cardAmount * 100);
        $internalOrderId = 'ORD-' . $order->id . '-' . time();

        // Step 1: Authenticate
        $authToken = $this->paymobService->authenticate();

        // Step 2: Register order
        $paymobOrderId = $this->paymobService->registerOrder(
            $authToken,
            $amountCents,
            $internalOrderId
        );

        // Step 3: Generate payment key
        $paymentToken = $this->paymobService->generatePaymentKey(
            $authToken,
            $amountCents,
            $paymobOrderId,
            $billingData,
            'CARD'
        );

        // Store payment record
        $integrationId = $this->paymobService->getIntegrationId('CARD');

        PaymobPayment::create([
            'order_id' => $order->id,
            'internal_order_id' => $internalOrderId,
            'paymob_order_id' => $paymobOrderId,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'payment_method' => 'CARD',
            'integration_id' => $integrationId,
            'status' => 'PENDING',
            'billing_data' => $billingData,
            'payment_token' => $paymentToken,
        ]);

        // Get iframe URL
        $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

        return [
            'success' => true,
            'payment_method' => 'wallet+card',
            'status' => 'pending',
            'wallet_amount' => $walletAmount,
            'card_amount' => $cardAmount,
            'iframe_url' => $iframeUrl,
            'payment_token' => $paymentToken,
            'message' => "Paid {$walletAmount} EGP with wallet, {$cardAmount} EGP pending card payment",
        ];
    }

    /**
     * Strategy 3: Pay entirely with card
     */
    private function payWithCardOnly(Order $order, array $billingData): array
    {
        $amountCents = (int)($order->total * 100);
        $internalOrderId = 'ORD-' . $order->id . '-' . time();

        // Step 1: Authenticate
        $authToken = $this->paymobService->authenticate();

        // Step 2: Register order
        $paymobOrderId = $this->paymobService->registerOrder(
            $authToken,
            $amountCents,
            $internalOrderId
        );

        // Step 3: Generate payment key
        $paymentToken = $this->paymobService->generatePaymentKey(
            $authToken,
            $amountCents,
            $paymobOrderId,
            $billingData,
            'CARD'
        );

        // Get integration ID
        $integrationId = $this->paymobService->getIntegrationId('CARD');

        // Store payment record
        PaymobPayment::create([
            'order_id' => $order->id,
            'internal_order_id' => $internalOrderId,
            'paymob_order_id' => $paymobOrderId,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'payment_method' => 'CARD',
            'integration_id' => $integrationId,
            'status' => 'PENDING',
            'billing_data' => $billingData,
            'payment_token' => $paymentToken,
        ]);

        // Update order
        $order->update([
            'payment_method' => 'card',
            'payment_status' => 'pending',
        ]);

        // Get iframe URL
        $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

        return [
            'success' => true,
            'payment_method' => 'card',
            'status' => 'pending',
            'iframe_url' => $iframeUrl,
            'payment_token' => $paymentToken,
            'amount' => $order->total,
            'currency' => 'EGP',
        ];
    }

    /**
     * Strategy 4: Cash on Delivery
     */
    private function payWithCOD(Order $order): array
    {
        $order->update([
            'payment_method' => 'cash_on_delivery',
            'payment_status' => 'pending',
            'status' => 'confirmed',
        ]);

        Log::info('Order placed with COD', [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'amount' => $order->total,
        ]);

        return [
            'success' => true,
            'payment_method' => 'cash_on_delivery',
            'status' => 'pending',
            'message' => 'Order confirmed. Pay on delivery.',
            'order_id' => $order->id,
        ];
    }

    /**
     * Validate promo code with server-side rules
     *
     * @param string $code
     * @param float $orderTotal
     * @param int $userId
     * @return PromoCode
     * @throws Exception
     */
    public function validatePromoCode(string $code, float $orderTotal, int $userId): PromoCode
    {
        $promo = PromoCode::where('code', $code)->first();

        if (!$promo) {
            throw new Exception('Invalid promo code');
        }

        if (!$promo->is_active) {
            throw new Exception('Promo code is no longer active');
        }

        // Check date validity
        $now = now();
        if ($promo->valid_from && $now->lt($promo->valid_from)) {
            throw new Exception('Promo code is not yet valid');
        }

        if ($promo->valid_until && $now->gt($promo->valid_until)) {
            throw new Exception('Promo code has expired');
        }

        // Check minimum purchase
        if ($promo->minimum_purchase && $orderTotal < $promo->minimum_purchase) {
            throw new Exception("Minimum purchase of {$promo->minimum_purchase} EGP required for this promo code");
        }

        // Check usage limits
        if ($promo->usage_limit && $promo->used_count >= $promo->usage_limit) {
            throw new Exception('Promo code usage limit reached');
        }

        // Check per-user usage limit
        if ($promo->usage_limit_per_user) {
            $userUsageCount = DB::table('orders')
                ->where('user_id', $userId)
                ->where('promo_code_id', $promo->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($userUsageCount >= $promo->usage_limit_per_user) {
                throw new Exception('You have already used this promo code the maximum number of times');
            }
        }

        return $promo;
    }
    /**
     * Get available delivery slots
     */
    public function getDeliverySlots(): array
    {
        $settingsValue = DB::table('settings')
            ->where('key', 'delivery_slots')
            ->value('value');

        if (!$settingsValue) {
            // Return default slots if not configured
            return [
                ['slot' => '9:00 AM - 12:00 PM', 'capacity' => 50, 'is_active' => true],
                ['slot' => '12:00 PM - 3:00 PM', 'capacity' => 50, 'is_active' => true],
                ['slot' => '3:00 PM - 6:00 PM', 'capacity' => 50, 'is_active' => true],
                ['slot' => '6:00 PM - 9:00 PM', 'capacity' => 50, 'is_active' => true],
            ];
        }

        $slots = json_decode($settingsValue, true);

        // Filter only active slots
        return array_filter($slots, fn($slot) => $slot['is_active'] ?? true);
    }

    /**
     * Get user's saved addresses
     */
    public function getUserAddresses(int $userId): array
    {
        return Address::where('user_id', $userId)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Get user's saved payment methods
     */
    public function getUserPaymentMethods(int $userId): array
    {
        return PaymentMethod::where('user_id', $userId)
            ->active()
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'type' => $method->type,
                    'card_brand' => $method->card_brand,
                    'card_last_four' => $method->card_last_four,
                    'masked_card' => $method->masked_card,
                    'is_default' => $method->is_default,
                    'expires_at' => $method->expires_at?->format('m/y'),
                ];
            })
            ->toArray();
    }

    /**
     * Validate checkout data before order creation
     */
    public function validateCheckout(
        int $userId,
        int $deliveryAddressId,
        string $paymentMethod,
        ?int $paymentMethodId = null
    ): array {
        $errors = [];

        // Validate delivery address
        $address = Address::where('id', $deliveryAddressId)
            ->where('user_id', $userId)
            ->first();

        if (!$address) {
            $errors[] = 'Invalid delivery address selected';
        }

        // Validate payment method
        if ($paymentMethod === 'card' && $paymentMethodId) {
            $savedCard = PaymentMethod::where('id', $paymentMethodId)
                ->where('user_id', $userId)
                ->active()
                ->first();

            if (!$savedCard) {
                $errors[] = 'Invalid payment method selected';
            } elseif ($savedCard->isExpired()) {
                $errors[] = 'Selected card has expired';
            }
        }

        return $errors;
    }

    /**
     * Calculate order summary before placement
     */
    public function calculateOrderSummary(
        float $subtotal,
        ?string $promoCode = null,
        ?int $userId = null
    ): array {
        // Calculate delivery fee
        $freeDeliveryThreshold = (float) (config('app.free_delivery_threshold') ?? 200);
        $defaultDeliveryFee = (float) (config('app.delivery_fee') ?? 20);
        $deliveryFee = $subtotal >= $freeDeliveryThreshold ? 0 : $defaultDeliveryFee;

        // Calculate discount
        $discount = 0;
        $promoCodeData = null;

        if ($promoCode && $userId) {
            try {
                $cartService = app(CartService::class);
                $validatedPromo = $cartService->validatePromoCode($promoCode, $subtotal, $userId);

                if ($validatedPromo->type === 'percentage') {
                    $discount = $subtotal * ($validatedPromo->value / 100);
                    if ($validatedPromo->maximum_discount && $discount > $validatedPromo->maximum_discount) {
                        $discount = $validatedPromo->maximum_discount;
                    }
                } elseif ($validatedPromo->type === 'fixed_amount') {
                    $discount = min($validatedPromo->value, $subtotal);
                } elseif ($validatedPromo->type === 'free_delivery') {
                    $deliveryFee = 0;
                }

                $promoCodeData = [
                    'code' => $validatedPromo->code,
                    'type' => $validatedPromo->type,
                    'value' => $validatedPromo->value,
                    'discount_amount' => round($discount, 2),
                ];
            } catch (\Exception $e) {
                // Promo code validation failed, continue without it
            }
        }

        // Calculate tax (14% for Egypt)
        $taxRate = (float) (config('app.tax_rate') ?? 14);
        $tax = ($subtotal + $deliveryFee - $discount) * ($taxRate / 100);

        // Calculate total
        $total = $subtotal + $deliveryFee + $tax - $discount;

        return [
            'subtotal' => round($subtotal, 2),
            'delivery_fee' => round($deliveryFee, 2),
            'tax' => round($tax, 2),
            'discount' => round($discount, 2),
            'total' => round($total, 2),
            'promo_code' => $promoCodeData,
        ];
    }
}
