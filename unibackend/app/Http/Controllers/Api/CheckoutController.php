<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutService;
use App\Services\CartService;
use App\Models\PromoCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    protected CheckoutService $checkoutService;
    protected CartService $cartService;

    public function __construct(CheckoutService $checkoutService, CartService $cartService)
    {
        $this->checkoutService = $checkoutService;
        $this->cartService = $cartService;
    }

    /**
     * Get available delivery slots
     * GET /api/v1/checkout/delivery-slots
     */
    public function getDeliverySlots(Request $request): JsonResponse
    {
        try {
            $slots = $this->checkoutService->getDeliverySlots();

            return response()->json([
                'success' => true,
                'data' => ['delivery_slots' => array_values($slots)],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve delivery slots',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user's saved addresses
     * GET /api/v1/checkout/addresses
     */
    public function getAddresses(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $addresses = $this->checkoutService->getUserAddresses($user->id);

            return response()->json([
                'success' => true,
                'data' => ['addresses' => $addresses],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve addresses',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get user's saved payment methods
     * GET /api/v1/checkout/payment-methods
     */
    public function getPaymentMethods(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $paymentMethods = $this->checkoutService->getUserPaymentMethods($user->id);

            return response()->json([
                'success' => true,
                'data' => ['payment_methods' => $paymentMethods],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payment methods',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate order summary
     * POST /api/v1/checkout/calculate
     */
    public function calculateSummary(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $subtotal = (float) $request->input('subtotal', 0);
            $promoCode = $request->input('promo_code');

            $summary = $this->checkoutService->calculateOrderSummary(
                $subtotal,
                $promoCode,
                $user?->id
            );

            return response()->json([
                'success' => true,
                'data' => ['summary' => $summary],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate summary',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process payment for an order with wallet-first strategy
     * POST /api/v1/checkout/process-payment
     */
    public function processPayment(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:wallet,card,cash_on_delivery',
            // Billing data only required for card payments
            'billing_data' => 'required_if:payment_method,card|array',
            'billing_data.first_name' => 'required_if:payment_method,card|string|max:255',
            'billing_data.last_name' => 'required_if:payment_method,card|string|max:255',
            'billing_data.email' => 'required_if:payment_method,card|email',
            'billing_data.phone_number' => 'required_if:payment_method,card|string',
            'billing_data.city' => 'required_if:payment_method,card|string',
            'billing_data.street' => 'required_if:payment_method,card|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Get order and verify ownership
            $order = \App\Models\Order::findOrFail($request->order_id);

            if ($order->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to order',
                ], 403);
            }

            // Check if already paid
            if ($order->payment_status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order already paid',
                ], 400);
            }

            // Prepare billing data for card payments
            $billingData = [];
            if ($request->payment_method === 'card') {
                $billingData = array_merge($request->billing_data, [
                    'apartment' => 'NA',
                    'floor' => 'NA',
                    'building' => 'NA',
                    'shipping_method' => 'NA',
                    'postal_code' => 'NA',
                    'country' => 'Egypt',
                    'state' => $request->billing_data['city'] ?? 'Cairo',
                ]);
            }

            // Process payment with wallet-first strategy
            $result = $this->checkoutService->processPayment(
                $order,
                $request->payment_method,
                $billingData
            );

            return response()->json($result);

        } catch (\Exception $e) {
            \Log::error('Payment processing failed', [
                'error' => $e->getMessage(),
                'order_id' => $request->order_id ?? null,
                'user_id' => $request->user()->id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get available payment options for an order
     * GET /api/v1/checkout/payment-options/{orderId}
     */
    public function getPaymentOptions(Request $request, int $orderId): JsonResponse
    {
        try {
            $order = \App\Models\Order::findOrFail($orderId);

            if ($order->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            $wallet = \App\Models\UserWallet::firstOrCreate(['user_id' => $order->user_id]);

            $methods = [
                'cash_on_delivery' => [
                    'available' => true,
                    'name' => 'Cash on Delivery',
                    'description' => 'Pay when you receive your order',
                ],
                'card' => [
                    'available' => true,
                    'name' => 'Credit/Debit Card',
                    'description' => 'Pay securely with your card',
                ],
                'wallet' => [
                    'available' => $wallet->hasSufficientBalance($order->total),
                    'name' => 'Wallet',
                    'description' => 'Pay with your wallet balance',
                    'balance' => $wallet->balance,
                    'required' => $order->total,
                    'sufficient' => $wallet->hasSufficientBalance($order->total),
                ],
            ];

            // Check if partial wallet payment is possible
            if ($wallet->balance > 0 && $wallet->balance < $order->total) {
                $methods['wallet_partial'] = [
                    'available' => true,
                    'name' => 'Wallet + Card',
                    'description' => "Pay {$wallet->balance} EGP with wallet, remainder with card",
                    'wallet_amount' => $wallet->balance,
                    'card_amount' => $order->total - $wallet->balance,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'order_total' => $order->total,
                    'payment_options' => $methods,
                ],
            ]);

        } catch (\Exception $e) {
            \Log::error('Failed to get payment options', [
                'error' => $e->getMessage(),
                'order_id' => $orderId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payment options',
            ], 500);
        }
    }

    /**
     * Validate promo code
     * POST /api/v1/checkout/validate-promo
     */
    public function validatePromoCode(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'promo_code' => 'required|string',
            'order_total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');
            $cart = $this->cartService->getCart($user->id, $sessionId);
            $cartTotals = $this->cartService->calculateTotals($cart);

            $promo = PromoCode::where('code', $request->promo_code)->first();
            if (!$promo) {
                return response()->json([
                    'success' => false,
                    'message' => $this->cartService->promoReasonMessage('INVALID_CODE'),
                    'data' => [
                        'promo' => [
                            'applied_code' => $request->promo_code,
                            'promo_id' => null,
                            'promo_code' => $request->promo_code,
                            'type' => null,
                            'applies_to' => null,
                            'discount_amount' => 0.00,
                            'discount_type' => null,
                            'breakdown' => [],
                            'validation_state' => 'invalid',
                            'invalid_reason' => 'INVALID_CODE',
                        ],
                    ],
                ], 422);
            }

            $promoEvaluation = $this->cartService->evaluatePromoForCart(
                $promo,
                $cart,
                $user->id,
                $cartTotals['subtotal'],
                $cartTotals['delivery_fee']
            );

            if ($promoEvaluation['validation_state'] === 'invalid') {
                return response()->json([
                    'success' => false,
                    'message' => $this->cartService->promoReasonMessage($promoEvaluation['invalid_reason']),
                    'data' => [
                        'promo' => $promoEvaluation,
                    ],
                ], 422);
            }

            $totals = $this->cartService->calculateTotals($cart, $promo);
            $discount = $totals['discount'];

            return response()->json([
                'success' => true,
                'data' => [
                    'promo' => $promoEvaluation,
                    'cart_totals' => $totals,
                ],
                'message' => $promoEvaluation['validation_state'] === 'pending'
                    ? $this->cartService->promoReasonMessage($promoEvaluation['invalid_reason'])
                    : 'Promo code applied successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
