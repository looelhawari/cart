<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use App\Models\Order;
use App\Services\PromoCodeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PromoCodeApiController extends Controller
{
    protected PromoCodeService $promoCodeService;

    public function __construct(PromoCodeService $promoCodeService)
    {
        $this->promoCodeService = $promoCodeService;
    }

    /**
     * Get available promo codes for a user
     * Shows codes that are active and can be used
     */
    public function available(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        // Get active promo codes
        $promoCodes = PromoCode::available()
            ->get()
            ->filter(function ($promoCode) use ($userId) {
                // Filter out codes user can't use
                if ($promoCode->first_order_only && $userId) {
                    $hasOrders = Order::where('user_id', $userId)
                        ->whereNotIn('status', ['cancelled', 'failed'])
                        ->exists();
                    if ($hasOrders) return false;
                }

                // Check user limit
                if ($userId && $promoCode->userHasReachedLimit($userId)) {
                    return false;
                }

                return true;
            })
            ->values();

        // Format for mobile app
        $formatted = $promoCodes->map(function ($code) use ($userId) {
            return [
                'id' => $code->id,
                'code' => $code->code,
                'type' => $code->type,
                'display' => $code->discount_display,
                'value' => $code->value,
                'minimum_order' => $code->minimum_order,
                'maximum_discount' => $code->maximum_discount,
                'first_order_only' => $code->first_order_only,
                'valid_until' => $code->valid_until?->toIso8601String(),
                'days_remaining' => $code->valid_until ? now()->diffInDays($code->valid_until, false) : null,
                'remaining_uses' => $userId ? $code->getRemainingUsesForUser($userId) : null,
                'description' => $this->getPromoDescription($code),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formatted,
        ]);
    }

    /**
     * Get smart recommendations based on cart
     */
    public function recommendations(Request $request): JsonResponse
    {
        $request->validate([
            'subtotal' => 'required|numeric|min:0',
            'delivery_fee' => 'numeric|min:0',
            'cart_items' => 'array',
            'cart_items.*.product_id' => 'required|integer',
            'cart_items.*.quantity' => 'required|integer|min:1',
            'cart_items.*.price' => 'required|numeric|min:0',
        ]);

        $userId = $request->user()?->id;

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => __('promo.auth_required'),
            ], 401);
        }

        $cartItems = $request->cart_items ?? [];
        $subtotal = $request->subtotal;
        $deliveryFee = $request->delivery_fee ?? 0;

        $recommendations = $this->promoCodeService->getBestPromoCodesForUser(
            $userId,
            $cartItems,
            $subtotal,
            $deliveryFee
        );

        return response()->json([
            'success' => true,
            'data' => $recommendations,
        ]);
    }

    /**
     * Get smart suggestions for a user (no cart needed)
     */
    public function suggestions(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        if (!$userId) {
            // Return general suggestions for guests
            $generalCodes = PromoCode::available()
                ->where('first_order_only', true)
                ->orWhere('type', 'free_delivery')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $generalCodes->map(fn($code) => [
                    'code' => $code->code,
                    'display' => $code->discount_display,
                    'reason' => $code->first_order_only
                        ? __('promo.welcome_offer')
                        : __('promo.special_offer'),
                ]),
            ]);
        }

        $suggestions = $this->promoCodeService->generateSmartSuggestions($userId);

        return response()->json([
            'success' => true,
            'data' => $suggestions,
        ]);
    }

    /**
     * Validate a promo code without applying
     */
    public function validate(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'subtotal' => 'numeric|min:0',
        ]);

        $promoCode = PromoCode::where('code', strtoupper(trim($request->code)))->first();

        if (!$promoCode) {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => __('promo.not_found'),
                'error_code' => 'NOT_FOUND',
            ], 404);
        }

        $userId = $request->user()?->id;
        $subtotal = $request->subtotal ?? 0;

        $isFirstOrder = false;
        if ($userId) {
            $isFirstOrder = Order::where('user_id', $userId)
                ->whereNotIn('status', ['cancelled', 'failed'])
                ->count() === 0;
        }

        $validation = $promoCode->validateForUser($userId ?? 0, $subtotal, $isFirstOrder);

        return response()->json([
            'success' => true,
            'valid' => $validation['valid'],
            'promo_code' => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'type' => $promoCode->type,
                'display' => $promoCode->discount_display,
                'minimum_order' => $promoCode->minimum_order,
                'maximum_discount' => $promoCode->maximum_discount,
            ],
            'errors' => $validation['errors'],
            'remaining_uses' => $validation['remaining_uses'],
        ]);
    }

    /**
     * Preview discount for a promo code
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
            'delivery_fee' => 'numeric|min:0',
            'cart_items' => 'required|array',
            'cart_items.*.product_id' => 'required|integer',
            'cart_items.*.quantity' => 'required|integer|min:1',
            'cart_items.*.price' => 'required|numeric|min:0',
        ]);

        $userId = $request->user()?->id ?? 0;
        $cartItems = $request->cart_items;
        $subtotal = $request->subtotal;
        $deliveryFee = $request->delivery_fee ?? 0;

        $result = $this->promoCodeService->applyPromoCode(
            $request->code,
            $userId,
            $cartItems,
            $subtotal,
            $deliveryFee
        );

        return response()->json($result);
    }

    /**
     * Get promo code details by code
     */
    public function details(Request $request, string $code): JsonResponse
    {
        $promoCode = PromoCode::where('code', strtoupper(trim($code)))
            ->with(['products:id,name,price', 'categories:id,name', 'activeBogoRules'])
            ->first();

        if (!$promoCode) {
            return response()->json([
                'success' => false,
                'message' => __('promo.not_found'),
            ], 404);
        }

        $userId = $request->user()?->id;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $promoCode->id,
                'code' => $promoCode->code,
                'type' => $promoCode->type,
                'applies_to' => $promoCode->applies_to,
                'display' => $promoCode->discount_display,
                'description' => $this->getPromoDescription($promoCode),
                'value' => $promoCode->value,
                'minimum_order' => $promoCode->minimum_order,
                'maximum_discount' => $promoCode->maximum_discount,
                'first_order_only' => $promoCode->first_order_only,
                'valid_from' => $promoCode->valid_from?->toIso8601String(),
                'valid_until' => $promoCode->valid_until?->toIso8601String(),
                'status' => $promoCode->status,
                'remaining_uses' => $userId ? $promoCode->getRemainingUsesForUser($userId) : null,
                'products' => $promoCode->applies_to === 'product' ? $promoCode->products : null,
                'categories' => $promoCode->applies_to === 'category' ? $promoCode->categories : null,
                'bogo_rules' => $promoCode->type === 'bogo'
                    ? $promoCode->activeBogoRules->map(fn($r) => [
                        'description' => $r->description,
                        'buy_qty' => $r->buy_qty,
                        'get_qty' => $r->get_qty,
                    ])
                    : null,
            ],
        ]);
    }

    /**
     * Get user's promo code usage history
     */
    public function myUsage(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $usages = \App\Models\PromoCodeUsage::where('user_id', $userId)
            ->with(['promoCode:id,code,type,value', 'order:id,order_number,total,created_at'])
            ->orderBy('used_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $usages->map(fn($u) => [
                'code' => $u->promoCode->code,
                'type' => $u->promoCode->type,
                'discount_amount' => $u->discount_amount,
                'order_number' => $u->order?->order_number,
                'order_total' => $u->order_total,
                'used_at' => $u->used_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Generate human-readable description for promo code
     */
    protected function getPromoDescription(PromoCode $promoCode): string
    {
        $currency = config('app.currency', 'EGP');
        $description = "";

        switch ($promoCode->type) {
            case 'percentage':
                $description = __('promo.get_percent_off', ['value' => $promoCode->value]);
                if ($promoCode->maximum_discount) {
                    $description .= ' ' . __('promo.up_to_max', ['currency' => $currency, 'max' => $promoCode->maximum_discount]);
                }
                break;

            case 'fixed_amount':
                $description = __('promo.get_fixed_off', ['currency' => $currency, 'value' => $promoCode->value]);
                break;

            case 'free_delivery':
                $description = __('promo.free_delivery');
                break;

            case 'bogo':
                $rule = $promoCode->activeBogoRules->first();
                $description = $rule ? $rule->description : __('promo.bogo_offer');
                break;
        }

        if ($promoCode->minimum_order) {
            $description .= ' ' . __('promo.on_orders_over', ['currency' => $currency, 'min' => $promoCode->minimum_order]);
        }

        if ($promoCode->first_order_only) {
            $description .= ' ' . __('promo.first_order_only');
        }

        if ($promoCode->applies_to === 'product') {
            $description .= ' ' . __('promo.on_selected_products');
        } elseif ($promoCode->applies_to === 'category') {
            $categories = $promoCode->categories->pluck('name')->join(', ');
            if ($categories) {
                $description .= " on {$categories}";
            }
        }

        return $description;
    }
}
