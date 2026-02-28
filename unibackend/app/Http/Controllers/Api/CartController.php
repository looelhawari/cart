<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CartReminder;
use App\Models\PromoCode;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    protected CartService $cartService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }

    /**
     * Update cart reminder tracking for abandonment notifications
     */
    private function updateCartReminder(?int $userId, Cart $cart): void
    {
        if (!$userId || $cart->items->count() === 0) {
            // Remove reminder if cart is empty or user is guest
            if ($userId) {
                CartReminder::where('user_id', $userId)->delete();
            }
            return;
        }

        try {
            // Calculate cart total
            $cartTotal = $cart->items->sum(fn($item) => $item->price * $item->quantity);

            CartReminder::updateOrCreate(
                ['user_id' => $userId],
                [
                    'cart_item_count' => $cart->items->count(),
                    'cart_total' => $cartTotal,
                    'last_cart_activity' => now(),
                    'converted' => false,
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to update cart reminder', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get cart for guest or authenticated user
     * GET /api/v1/cart
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID');

            $cart = $this->cartService->getCart($userId, $sessionId);

            // Load promo code if one is applied to the cart
            $promoCode = null;
            if ($cart->promo_code) {
                $promoCode = PromoCode::where('code', $cart->promo_code)->first();
            }

            $cartDetails = $this->cartService->getCartDetails($cart, $promoCode);

            return response()->json([
                'success' => true,
                'data' => $cartDetails,
                'session_id' => $cart->session_id, // Return session ID for guest users
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            Log::error('Cart GET error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => __('cart.failed_retrieve'),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add item to cart
     * POST /api/v1/cart/items
     */
    public function addItem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|integer|exists:products,barcode',
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => __('cart.validation_failed'),
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);

            $cartItem = $this->cartService->addItem(
                $cart,
                $request->product_id,
                $request->quantity
            );

            // Single refresh with eager loading — prevents 2x fresh() N+1
            $cart = $cart->fresh(['items.product']);

            $cartDetails = $this->cartService->getCartDetails($cart, null);

            // Update cart reminder for abandonment tracking
            $this->updateCartReminder($userId, $cart);

            return response()->json([
                'success' => true,
                'message' => __('cart.product_added'),
                'data' => [
                    'cart_item' => [
                        'id' => $cartItem->id,
                        'product_id' => $cartItem->product_id,
                        'quantity' => $cartItem->quantity,
                        'price' => $cartItem->price,
                        'subtotal' => $cartItem->subtotal,
                    ],
                    ...$cartDetails,
                ],
            ], 201, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() === 422 ? 422 : 500);
        }
    }

    /**
     * Update cart item quantity
     * PUT /api/v1/cart/items/{id}
     */
    public function updateItem(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => __('cart.validation_failed'),
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);

            // Find cart item and verify it belongs to this cart
            $cartItem = CartItem::where('id', $id)
                ->where('cart_id', $cart->id)
                ->firstOrFail();

            $this->cartService->updateItem($cartItem, $request->quantity);

            $cartDetails = $this->cartService->getCartDetails($cart->fresh(['items.product']), null);

            return response()->json([
                'success' => true,
                'message' => __('cart.updated'),
                'data' => $cartDetails,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('cart.item_not_found'),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() === 422 ? 422 : 500);
        }
    }

    /**
     * Remove item from cart
     * DELETE /api/v1/cart/items/{id}
     */
    public function removeItem(Request $request, int $id): JsonResponse
    {
        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);

            // Find cart item and verify it belongs to this cart
            $cartItem = CartItem::where('id', $id)
                ->where('cart_id', $cart->id)
                ->firstOrFail();

            $this->cartService->removeItem($cartItem);

            // Return updated cart details
            $cartDetails = $this->cartService->getCartDetails($cart->fresh(['items.product']), null);

            return response()->json([
                'success' => true,
                'message' => __('cart.item_removed'),
                'data' => $cartDetails,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => __('cart.item_not_found'),
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('cart.failed_remove_item'),
            ], 500);
        }
    }

    /**
     * Clear all items from cart
     * DELETE /api/v1/cart/clear
     */
    public function clear(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);

            $this->cartService->clearCart($cart);

            return response()->json([
                'success' => true,
                'message' => __('cart.cleared'),
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('cart.failed_clear'),
            ], 500);
        }
    }

    /**
     * Apply promo code to cart
     * POST /api/v1/cart/apply-promo
     */
    public function applyPromo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => __('cart.validation_failed'),
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);
            $promoCode = PromoCode::where('code', $request->code)->first();

            if (!$promoCode) {
                return response()->json([
                    'success' => false,
                    'message' => $this->cartService->promoReasonMessage('INVALID_CODE'),
                    'data' => [
                        'promo' => [
                            'applied_code' => $request->code,
                            'promo_id' => null,
                            'promo_code' => $request->code,
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

            $cartTotals = $this->cartService->calculateTotals($cart);
            $promoEvaluation = $this->cartService->evaluatePromoForCart(
                $promoCode,
                $cart,
                $userId,
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

            // Store the promo code on the cart so it persists
            $cart->promo_code = $promoCode->code;
            $cart->save();

            $cartDetails = $this->cartService->getCartDetails($cart, $promoCode);

            return response()->json([
                'success' => true,
                'message' => $promoEvaluation['validation_state'] === 'pending'
                    ? $this->cartService->promoReasonMessage($promoEvaluation['invalid_reason'])
                    : __('cart.promo_applied'),
                'data' => [
                    'promo' => $promoEvaluation,
                    ...$cartDetails,
                ],
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Remove promo code from cart
     * DELETE /api/v1/cart/remove-promo
     */
    public function removePromo(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()?->id;
            $sessionId = $request->header('X-Session-ID') ?? $request->cookie('session_id');

            $cart = $this->cartService->getCart($userId, $sessionId);

            // Clear the promo code from the cart
            $cart->promo_code = null;
            $cart->save();

            $cartDetails = $this->cartService->getCartDetails($cart);

            return response()->json([
                'success' => true,
                'message' => __('cart.promo_removed'),
                'data' => $cartDetails,
            ], 200, [], JSON_UNESCAPED_UNICODE);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => __('cart.failed_remove_promo'),
            ], 500);
        }
    }
}
