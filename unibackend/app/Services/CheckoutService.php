<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\PromoCode;
use App\Models\UserWallet;
use App\Models\PaymobPayment;
use App\Services\OrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class CheckoutService
{
    private PaymobService $paymobService;
    private CartService $cartService;

    public function __construct(PaymobService $paymobService, CartService $cartService)
    {
        $this->paymobService = $paymobService;
        $this->cartService = $cartService;
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

            app(OrderService::class)->finalizePromoUsage($order);

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
            'user_id' => $order->user_id,
            'internal_order_id' => $internalOrderId,
            'paymob_order_id' => $paymobOrderId,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'payment_method' => 'CARD',
            'flow' => 'classic_iframe',
            'save_card_requested' => false,
            'special_reference' => $internalOrderId,
            'integration_id' => $integrationId,
            'status' => 'PENDING',
            'billing_data' => $billingData,
        ]);
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
            'user_id' => $order->user_id,
            'internal_order_id' => $internalOrderId,
            'paymob_order_id' => $paymobOrderId,
            'amount_cents' => $amountCents,
            'currency' => 'EGP',
            'payment_method' => 'CARD',
            'flow' => 'classic_iframe',
            'save_card_requested' => false,
            'special_reference' => $internalOrderId,
            'integration_id' => $integrationId,
            'status' => 'PENDING',
            'billing_data' => $billingData,
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
    public function validatePromoCode(string $code, Cart $cart, int $userId): PromoCode
    {
        return $this->cartService->validatePromoCode($code, $cart, $userId);
    }
    /**
     * Get available delivery slots (dynamically generated from store hours)
     */
    public function getDeliverySlots(): array
    {
        $openTime = \App\Models\StoreSetting::getValue('store_open_time', '11:00');
        $closeTime = \App\Models\StoreSetting::getValue('store_close_time', '00:00');

        // Parse hours
        $openHour = (int) explode(':', $openTime)[0];
        $closeHour = (int) explode(':', $closeTime)[0];

        // Handle midnight (00:00) as 24
        if ($closeHour === 0) {
            $closeHour = 24;
        }

        // Generate 2-hour slots within store hours
        $slots = [];
        for ($start = $openHour; $start + 2 <= $closeHour; $start += 2) {
            $end = $start + 2;
            $startFormatted = $this->formatHour($start);
            $endFormatted = $this->formatHour($end);

            $slots[] = [
                'slot' => "{$startFormatted} - {$endFormatted}",
                'start_hour' => $start,
                'end_hour' => $end,
                'capacity' => 50,
                'is_active' => true,
            ];
        }

        // If remaining time is at least 1 hour but less than 2, add a final shorter slot
        $lastEnd = empty($slots) ? $openHour : end($slots)['end_hour'];
        if ($closeHour - $lastEnd >= 1) {
            $startFormatted = $this->formatHour($lastEnd);
            $endFormatted = $this->formatHour($closeHour);
            $slots[] = [
                'slot' => "{$startFormatted} - {$endFormatted}",
                'start_hour' => $lastEnd,
                'end_hour' => $closeHour,
                'capacity' => 50,
                'is_active' => true,
            ];
        }

        return $slots;
    }

    /**
     * Format hour integer to 12-hour AM/PM string
     */
    private function formatHour(int $hour): string
    {
        if ($hour === 0 || $hour === 24) return '12:00 AM';
        if ($hour === 12) return '12:00 PM';
        if ($hour < 12) return $hour . ':00 AM';
        return ($hour - 12) . ':00 PM';
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
        ?int $userId = null,
        ?int $addressId = null
    ): array {
        if ($userId) {
            $cart = $this->cartService->getCart($userId);
            $baseTotals = $this->cartService->calculateTotals($cart);
            $subtotal = $baseTotals['subtotal'];
        }

        // Calculate delivery fee - zone-based if address has coordinates
        $freeDeliveryThreshold = (float) (config('app.free_delivery_threshold') ?? 200);
        $defaultDeliveryFee = (float) (config('app.delivery_fee') ?? 20);
        $deliveryFee = $subtotal >= $freeDeliveryThreshold ? 0 : $defaultDeliveryFee;
        $zoneInfo = null;

        if ($addressId) {
            $address = Address::find($addressId);
            if ($address && $address->latitude && $address->longitude) {
                try {
                    $zoneService = app(DeliveryZoneService::class);
                    $zoneFee = $zoneService->calculateDeliveryFee(
                        $address->latitude,
                        $address->longitude,
                        $subtotal
                    );
                    if ($zoneFee['is_deliverable']) {
                        $deliveryFee = $subtotal >= $freeDeliveryThreshold ? 0 : $zoneFee['delivery_fee'];
                        $zoneInfo = $zoneFee;
                    }
                } catch (\Exception $e) {
                    Log::debug('Zone delivery fee calc failed, using default', ['error' => $e->getMessage()]);
                }
            }
        }

        // Calculate discount
        $discount = 0;
        $promoCodeData = null;

        if ($promoCode && $userId) {
            try {
                $cart = $this->cartService->getCart($userId);
                $validatedPromo = $this->cartService->validatePromoCode($promoCode, $cart, $userId);
                $totals = $this->cartService->calculateTotals($cart, $validatedPromo);

                $discount = $totals['discount'];
                $deliveryFee = $totals['delivery_fee'];

                $promoCodeData = $totals['promo_summary'] ?? [
                    'applied_code' => $validatedPromo->code,
                    'promo_id' => $validatedPromo->id,
                    'discount_amount' => round($discount, 2),
                    'discount_type' => $validatedPromo->type === 'bogo' ? 'bogo' : $validatedPromo->applies_to,
                    'breakdown' => [],
                    'validation_state' => 'valid',
                    'invalid_reason' => null,
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
            'zone' => $zoneInfo,
        ];
    }
}
