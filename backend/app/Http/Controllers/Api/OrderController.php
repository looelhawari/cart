<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Models\Cart;
use App\Models\PromoCode;
use App\Services\CartService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    protected OrderService $orderService;
    protected CartService $cartService;

    public function __construct(OrderService $orderService, CartService $cartService)
    {
        $this->orderService = $orderService;
        $this->cartService = $cartService;
    }

    /**
     * Get user's orders
     * GET /api/v1/orders
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $status = $request->query('status');
            $perPage = $request->query('per_page', 10);

            $orders = $this->orderService->getUserOrders($user->id, $status, $perPage);

            return response()->json([
                'success' => true,
                'data' => [
                    'orders' => $orders->items(),
                    'pagination' => [
                        'current_page' => $orders->currentPage(),
                        'per_page' => $orders->perPage(),
                        'total' => $orders->total(),
                        'last_page' => $orders->lastPage(),
                    ],
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve orders',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get single order details
     * GET /api/v1/orders/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $order = $this->orderService->getOrder($id, $user->id);

            return response()->json([
                'success' => true,
                'data' => ['order' => $order],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create order from cart
     * POST /api/v1/orders
     */
    public function store(CreateOrderRequest $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required. Please login to place an order.',
                ], 401);
            }

            // Get user's cart
            $sessionId = $request->header('X-Session-ID');
            $cart = $this->cartService->getCart($user->id, $sessionId);

            if ($cart->items->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cart is empty',
                ], 422);
            }

            // Validate promo code if provided
            $promoCode = null;
            if ($request->promo_code) {
                $cartTotals = $this->cartService->calculateTotals($cart);
                $promoCode = $this->cartService->validatePromoCode(
                    $request->promo_code,
                    $cartTotals['subtotal'],
                    $user->id
                );
            }

            // Create order
            $order = $this->orderService->createOrderFromCart(
                $cart,
                $user->id,
                $request->delivery_address_id,
                $request->payment_method,
                $request->delivery_date,
                $request->delivery_time_slot,
                $request->notes,
                $promoCode
            );

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'data' => ['order' => $order],
            ], 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Cancel order
     * POST /api/v1/orders/{id}/cancel
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $order = $this->orderService->cancelOrder($id, $user->id, $request->input('reason', 'Cancelled by user'));

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully',
                'data' => ['order' => $order],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found or cannot be cancelled',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reorder from previous order
     * POST /api/v1/orders/{id}/reorder
     */
    public function reorder(Request $request, int $id): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required',
                ], 401);
            }

            $sessionId = $request->header('X-Session-ID');
            $cart = $this->orderService->reorder($id, $user->id, $sessionId);

            $cartDetails = $this->cartService->getCartDetails($cart);

            return response()->json([
                'success' => true,
                'message' => 'Items added to cart',
                'data' => $cartDetails,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reorder',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
