<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutService;
use App\Services\CartService;
use App\Models\PromoCode;
use App\Models\StoreSetting;
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
            \Log::error('Failed to retrieve delivery slots', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => __('checkout.failed_delivery_slots'),
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
                    'message' => __('checkout.auth_required'),
                ], 401);
            }

            $addresses = $this->checkoutService->getUserAddresses($user->id);

            return response()->json([
                'success' => true,
                'data' => ['addresses' => $addresses],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve addresses', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => __('checkout.failed_addresses'),
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
                    'message' => __('checkout.auth_required'),
                ], 401);
            }

            $paymentMethods = $this->checkoutService->getUserPaymentMethods($user->id);

            return response()->json([
                'success' => true,
                'data' => ['payment_methods' => $paymentMethods],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve payment methods', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => __('checkout.failed_payment_methods'),
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
            $addressId = $request->input('address_id');

            $summary = $this->checkoutService->calculateOrderSummary(
                $subtotal,
                $promoCode,
                $user?->id,
                $addressId ? (int) $addressId : null
            );

            return response()->json([
                'success' => true,
                'data' => ['summary' => $summary],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            \Log::error('Failed to calculate summary', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => __('checkout.failed_calculate_summary'),
            ], 500);
        }
    }

    /**
     * Process payment for an order.
     * POST /api/v1/checkout/process-payment
     */
    public function processPayment(Request $request): JsonResponse
    {
        $validator = \Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:card,cash_on_delivery',
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
                'message' => __('checkout.validation_failed'),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Check if store is open for orders
            $storeStatus = StoreSetting::isStoreOpen();
            if (!$storeStatus['is_open']) {
                $lang = $request->header('Accept-Language', 'en');
                $message = $lang === 'ar' ? $storeStatus['message_ar'] : $storeStatus['message_en'];

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'reason' => $storeStatus['reason'],
                    'store_status' => $storeStatus,
                ], 400);
            }

            // Get order and verify ownership
            $order = \App\Models\Order::findOrFail($request->order_id);

            if ($order->user_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => __('checkout.unauthorized_order'),
                ], 403);
            }

            // Check if already paid
            if ($order->payment_status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => __('checkout.already_paid'),
                ], 400);
            }

            // Block payment for cancelled, failed, or delivered orders
            if (in_array($order->status, ['cancelled', 'failed', 'delivered'])) {
                return response()->json([
                    'success' => false,
                    'message' => __('checkout.cannot_pay_status', ['status' => $order->status]),
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
                'message' => __('checkout.payment_failed'),
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
                    'message' => __('checkout.unauthorized'),
                ], 403);
            }

            // Wallet feature removed — only card and COD remain.
            $methods = [
                'cash_on_delivery' => [
                    'available' => true,
                    'name' => __('checkout.method_cod_name'),
                    'description' => __('checkout.method_cod_desc'),
                ],
                'card' => [
                    'available' => true,
                    'name' => __('checkout.method_card_name'),
                    'description' => __('checkout.method_card_desc'),
                ],
            ];

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
                'message' => __('checkout.failed_payment_options'),
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
                'message' => __('checkout.validation_failed'),
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => __('checkout.auth_required'),
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
                    : __('checkout.promo_applied'),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
