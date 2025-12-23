<?php

namespace App\Services;

use App\Models\Address;
use App\Models\PaymentMethod;
use App\Models\PromoCode;
use Illuminate\Support\Facades\DB;

class CheckoutService
{
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
