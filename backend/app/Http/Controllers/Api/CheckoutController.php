<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    protected CheckoutService $checkoutService;

    public function __construct(CheckoutService $checkoutService)
    {
        $this->checkoutService = $checkoutService;
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
                'data' => ['slots' => array_values($slots)],
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
}
