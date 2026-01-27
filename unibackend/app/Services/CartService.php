<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\PromoCodeBogoRule;
use App\Models\PromoCodeCategory;
use App\Models\PromoCodeProduct;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartService
{
    /**
     * Get or create cart for guest or authenticated user
     * STEP 1: Newest Cart Wins - NO MERGING
     */
    public function getCart(?int $userId = null, ?string $sessionId = null): Cart
    {
        \Log::info('🛒 [STEP 1] CartService::getCart()', [
            'user_id' => $userId,
            'session_id' => $sessionId,
        ]);

        if ($userId) {
            // Try to get user's cart
            $cart = Cart::where('user_id', $userId)->first();

            if ($cart) {
                \Log::info('📦 [STEP 1] Found USER cart', [
                    'cart_id' => $cart->id,
                    'items' => $cart->items->count(),
                    'updated' => $cart->updated_at->toDateTimeString(),
                ]);
            }

            // If user has a session ID, check for guest cart
            if ($sessionId) {
                $guestCart = Cart::where('session_id', $sessionId)
                    ->whereNull('user_id')
                    ->first();

                if ($guestCart) {
                    \Log::info('🔍 [STEP 1] Found GUEST cart', [
                        'cart_id' => $guestCart->id,
                        'items' => $guestCart->items->count(),
                        'updated' => $guestCart->updated_at->toDateTimeString(),
                    ]);

                    if ($cart) {
                        // BOTH CARTS EXIST - NEWEST WINS!
                        \Log::warning('🏆 [STEP 1] BOTH CARTS - APPLYING NEWEST WINS STRATEGY', [
                            'user_cart' => [
                                'id' => $cart->id,
                                'items' => $cart->items->count(),
                                'updated' => $cart->updated_at->toDateTimeString(),
                            ],
                            'guest_cart' => [
                                'id' => $guestCart->id,
                                'items' => $guestCart->items->count(),
                                'updated' => $guestCart->updated_at->toDateTimeString(),
                            ],
                        ]);

                        // Compare timestamps - keep the newest cart
                        if ($guestCart->updated_at->gt($cart->updated_at)) {
                            // Guest cart is newer - delete old user cart and convert guest to user cart
                            \Log::info('✅ [STEP 1] GUEST CART WINS (newer)', [
                                'deleting_cart_id' => $cart->id,
                                'keeping_cart_id' => $guestCart->id,
                                'guest_is_newer_by' => $guestCart->updated_at->diffForHumans($cart->updated_at),
                            ]);

                            $cart->items()->delete();
                            $cart->delete();

                            $guestCart->update([
                                'user_id' => $userId,
                                'session_id' => null,
                            ]);
                            $cart = $guestCart;
                        } else {
                            // User cart is newer or same age - delete guest cart
                            \Log::info('✅ [STEP 1] USER CART WINS (newer or same age)', [
                                'keeping_cart_id' => $cart->id,
                                'deleting_cart_id' => $guestCart->id,
                                'user_is_newer_by' => $cart->updated_at->diffForHumans($guestCart->updated_at),
                            ]);

                            $guestCart->items()->delete();
                            $guestCart->delete();
                        }
                    } else {
                        // No user cart - convert guest cart to user cart
                        \Log::info('🔄 [STEP 1] Converting GUEST cart to USER cart', [
                            'cart_id' => $guestCart->id,
                        ]);

                        $guestCart->update([
                            'user_id' => $userId,
                            'session_id' => null,
                        ]);
                        $cart = $guestCart;
                    }
                }
            }

            // Create new user cart if none exists
            if (!$cart) {
                \Log::info('🆕 [STEP 1] Creating NEW user cart', [
                    'user_id' => $userId,
                ]);
                $cart = Cart::create(['user_id' => $userId]);
            }
        } else {
            // Guest cart
            if (!$sessionId) {
                $sessionId = Str::uuid()->toString();
            }

            $cart = Cart::where('session_id', $sessionId)->first();

            if (!$cart) {
                \Log::info('🆕 [STEP 1] Creating NEW guest cart', [
                    'session_id' => $sessionId,
                ]);
                $cart = Cart::create(['session_id' => $sessionId]);
            }
        }

        // Load cart items with product relationship
        $cart->load('items.product');

        return $cart;
    }

    /**
     * Merge items from source cart into destination cart
     */
    private function mergeCarts(Cart $sourceCart, Cart $destinationCart): void
    {
        foreach ($sourceCart->items as $sourceItem) {
            $existingItem = $destinationCart->items()
                ->where('product_id', $sourceItem->product_id)
                ->first();

            if ($existingItem) {
                // Update quantity and use latest price
                $existingItem->update([
                    'quantity' => $existingItem->quantity + $sourceItem->quantity,
                    'price' => $sourceItem->price,
                ]);
            } else {
                // Move item to destination cart
                $sourceItem->update(['cart_id' => $destinationCart->id]);
            }
        }
    }

    /**
     * Add item to cart
     */
    public function addItem(Cart $cart, int $productId, int $quantity = 1): CartItem
    {
        // Get product and lock price
        $product = Product::where('barcode', $productId)->firstOrFail();

        // Check stock availability
        if ($product->stock_quantity < $quantity) {
            throw new \Exception('Insufficient stock. Available: ' . $product->stock_quantity);
        }

        if (!$product->is_active) {
            throw new \Exception('Product is not available');
        }

        // Check if item already exists in cart
        $cartItem = CartItem::where('cart_id', $cart->id)
            ->where('product_id', $productId)
            ->first();

        $effectivePrice = $product->sale_price ?? $product->price;

        if ($cartItem) {
            // Update quantity
            $newQuantity = $cartItem->quantity + $quantity;

            // Check stock for new quantity
            if ($product->stock_quantity < $newQuantity) {
                throw new \Exception('Insufficient stock. Available: ' . $product->stock_quantity);
            }

            $cartItem->update([
                'quantity' => $newQuantity,
                'price' => $effectivePrice, // Update price to current price
            ]);
        } else {
            // Create new cart item
            $cartItem = CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $productId,
                'quantity' => $quantity,
                'price' => $effectivePrice,
            ]);
        }

        return $cartItem;
    }

    /**
     * Update cart item quantity
     */
    public function updateItem(CartItem $cartItem, int $quantity): CartItem
    {
        // Check stock availability
        $product = $cartItem->product;

        if ($product->stock_quantity < $quantity) {
            throw new \Exception('Insufficient stock. Available: ' . $product->stock_quantity);
        }

        $cartItem->update(['quantity' => $quantity]);

        return $cartItem;
    }

    /**
     * Remove item from cart
     */
    public function removeItem(CartItem $cartItem): void
    {
        $cartItem->delete();
    }

    /**
     * Clear all items from cart
     */
    public function clearCart(Cart $cart): void
    {
        $cart->items()->delete();
    }

    /**
     * Calculate cart totals
     */
    public function calculateTotals(Cart $cart, ?PromoCode $promoCode = null): array
    {
        $cart->load('items.product');

        $subtotal = 0;
        $itemDetails = [];

        foreach ($cart->items as $item) {
            $itemSubtotal = $item->price * $item->quantity;
            $subtotal += $itemSubtotal;

            $itemDetails[] = [
                'product_id' => $item->product_id,
                'product_name' => $item->product->name_en,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'subtotal' => $itemSubtotal,
            ];
        }

        // 🔍 DEBUG: Log cart calculation
        \Log::info('🛒 CART TOTALS CALCULATION', [
            'cart_id' => $cart->id,
            'items' => $itemDetails,
            'calculated_subtotal' => $subtotal,
        ]);

        // Get tax rate from settings (14% for Egypt)
        $taxRate = (float) (config('app.tax_rate') ?? 14);

        // Get delivery fee from settings
        $freeDeliveryThreshold = (float) (config('app.free_delivery_threshold') ?? 200);
        $defaultDeliveryFee = (float) (config('app.delivery_fee') ?? 20);
        $deliveryFee = $subtotal >= $freeDeliveryThreshold ? 0.00 : $defaultDeliveryFee;

        // Apply promo code discount
        $discount = 0;
        $promoSummary = null;
        if ($promoCode) {
            $promoSummary = $this->evaluatePromoForCart(
                $promoCode,
                $cart,
                $cart->user_id,
                $subtotal,
                $deliveryFee
            );

            if (in_array($promoSummary['validation_state'], ['valid', 'pending'], true)) {
                $discount = (float) ($promoSummary['discount_amount'] ?? 0);
                if ($promoCode->type === 'free_delivery') {
                    $deliveryFee = 0.00;
                }
            }
        }

        // Calculate tax on subtotal after discount
        $taxableAmount = $subtotal + $deliveryFee - $discount;
        $tax = $taxableAmount * ($taxRate / 100);

        // Calculate total
        $total = $subtotal - $discount + $tax + $deliveryFee;

        return [
            'subtotal' => round($subtotal, 2),
            'delivery_fee' => round($deliveryFee, 2),
            'discount' => round($discount, 2),
            'tax' => round($tax, 2),
            'total' => round($total, 2),
            'items_count' => $cart->items->sum('quantity'),
            'promo_summary' => $promoSummary,
        ];
    }

    public function evaluatePromoForCart(
        PromoCode $promoCode,
        Cart $cart,
        ?int $userId,
        float $subtotal,
        float $deliveryFee
    ): array {
        $payload = [
            'applied_code' => $promoCode->code,
            'promo_id' => $promoCode->id,
            'promo_code' => $promoCode->code,
            'type' => $promoCode->type,
            'applies_to' => $promoCode->applies_to,
            'discount_amount' => 0.00,
            'discount_type' => $promoCode->type === 'bogo' ? 'bogo' : $promoCode->applies_to,
            'breakdown' => [],
            'validation_state' => 'valid',
            'invalid_reason' => null,
        ];

        if (!$promoCode->is_active) {
            return $this->invalidatePromo($payload, 'PROMO_INACTIVE');
        }

        $now = now();
        if ($promoCode->valid_from && $promoCode->valid_from > $now) {
            return $this->invalidatePromo($payload, 'NOT_STARTED');
        }

        if ($promoCode->valid_until && $promoCode->valid_until < $now) {
            return $this->invalidatePromo($payload, 'EXPIRED');
        }

        if ($promoCode->usage_limit && $promoCode->used_count >= $promoCode->usage_limit) {
            return $this->invalidatePromo($payload, 'USAGE_LIMIT_REACHED');
        }

        if ($userId && $promoCode->usage_per_user) {
            $userUsageCount = DB::table('promo_code_usage')
                ->where('promo_code_id', $promoCode->id)
                ->where('user_id', $userId)
                ->count();

            if ($userUsageCount >= $promoCode->usage_per_user) {
                return $this->invalidatePromo($payload, 'USER_LIMIT_REACHED');
            }
        }

        if ($promoCode->first_order_only) {
            if (!$userId) {
                return $this->invalidatePromo($payload, 'FIRST_ORDER_ONLY');
            }

            $paidOrders = DB::table('orders')
                ->where('user_id', $userId)
                ->where('payment_status', 'completed')
                ->count();

            if ($paidOrders > 0) {
                return $this->invalidatePromo($payload, 'FIRST_ORDER_ONLY');
            }
        }

        if ($promoCode->type === 'percentage' && ($promoCode->value <= 0 || $promoCode->value > 100)) {
            return $this->invalidatePromo($payload, 'PROMO_MISCONFIGURED');
        }

        if ($promoCode->type === 'fixed_amount' && $promoCode->value <= 0) {
            return $this->invalidatePromo($payload, 'PROMO_MISCONFIGURED');
        }

        if ($promoCode->type === 'bogo') {
            $bogoResult = $this->evaluateBogoRules($promoCode, $cart);
            if ($bogoResult['validation_state'] === 'invalid') {
                return $this->invalidatePromo($payload, $bogoResult['invalid_reason'] ?? 'PROMO_MISCONFIGURED');
            }

            $payload['discount_amount'] = round(min($bogoResult['discount_amount'], $subtotal), 2);
            $payload['breakdown'] = $bogoResult['breakdown'] ?? [];
            $payload['validation_state'] = $bogoResult['validation_state'];
            $payload['invalid_reason'] = $bogoResult['invalid_reason'];

            return $payload;
        }

        if ($promoCode->type === 'free_delivery' && $promoCode->applies_to !== 'order') {
            return $this->invalidatePromo($payload, 'PROMO_MISCONFIGURED');
        }

        $eligibleSubtotal = $subtotal;

        if ($promoCode->applies_to === 'product') {
            $eligibleProductIds = $this->getPromoProductIds($promoCode);
            if (empty($eligibleProductIds)) {
                return $this->invalidatePromo($payload, 'PROMO_MISCONFIGURED');
            }
            $eligibleSubtotal = $this->calculateEligibleSubtotalByProducts($cart, $eligibleProductIds);
        } elseif ($promoCode->applies_to === 'category') {
            $eligibleProductIds = $this->getPromoCategoryProductIds($promoCode);
            if (empty($eligibleProductIds)) {
                return $this->invalidatePromo($payload, 'PROMO_MISCONFIGURED');
            }
            $eligibleSubtotal = $this->calculateEligibleSubtotalByProducts($cart, $eligibleProductIds);
        }

        if ($eligibleSubtotal <= 0) {
            return $this->invalidatePromo($payload, 'NOT_APPLICABLE_TO_CART');
        }

        if ($promoCode->minimum_order && $eligibleSubtotal < $promoCode->minimum_order) {
            return $this->invalidatePromo($payload, 'MINIMUM_NOT_MET');
        }

        if ($promoCode->type === 'percentage') {
            $discount = ($eligibleSubtotal * $promoCode->value) / 100;
            if ($promoCode->maximum_discount && $discount > $promoCode->maximum_discount) {
                $discount = $promoCode->maximum_discount;
            }
            $payload['discount_amount'] = round(min($discount, $eligibleSubtotal), 2);
            return $payload;
        }

        if ($promoCode->type === 'fixed_amount') {
            $discount = min($promoCode->value, $eligibleSubtotal);
            if ($promoCode->maximum_discount && $discount > $promoCode->maximum_discount) {
                $discount = $promoCode->maximum_discount;
            }
            $payload['discount_amount'] = round(min($discount, $eligibleSubtotal), 2);
            return $payload;
        }

        if ($promoCode->type === 'free_delivery') {
            $payload['discount_amount'] = round($deliveryFee, 2);
        }

        return $payload;
    }

    private function invalidatePromo(array $payload, string $reason): array
    {
        $payload['validation_state'] = 'invalid';
        $payload['invalid_reason'] = $reason;
        $payload['discount_amount'] = 0.00;
        $payload['breakdown'] = [];

        return $payload;
    }

    private function calculateEligibleSubtotalByProducts(Cart $cart, array $productIds): float
    {
        if (empty($productIds)) {
            return 0.00;
        }

        return (float) $cart->items
            ->whereIn('product_id', $productIds)
            ->sum(fn($item) => $item->price * $item->quantity);
    }

    private function getPromoProductIds(PromoCode $promoCode): array
    {
        return PromoCodeProduct::where('promo_code_id', $promoCode->id)
            ->pluck('product_id')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function getPromoCategoryProductIds(PromoCode $promoCode): array
    {
        $targets = PromoCodeCategory::where('promo_code_id', $promoCode->id)->get();

        if ($targets->isEmpty()) {
            return [];
        }

        $categoryIds = [];
        foreach ($targets as $target) {
            $categoryIds[] = (int) $target->category_id;
            if ($target->include_subcategories) {
                $categoryIds = array_merge(
                    $categoryIds,
                    $this->getCategoryDescendantIds((int) $target->category_id)
                );
            }
        }

        $categoryIds = array_values(array_unique($categoryIds));

        if (empty($categoryIds)) {
            return [];
        }

        return DB::table('product_categories')
            ->whereIn('category_id', $categoryIds)
            ->pluck('product_id')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function getCategoryDescendantIds(int $categoryId): array
    {
        $rows = DB::select(
            'WITH RECURSIVE category_tree AS (
                SELECT id FROM categories WHERE id = ?
                UNION ALL
                SELECT c.id FROM categories c INNER JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT id FROM category_tree',
            [$categoryId]
        );

        return array_values(array_unique(array_map(fn($row) => (int) $row->id, $rows)));
    }

    private function evaluateBogoRules(PromoCode $promoCode, Cart $cart): array
    {
        $rules = PromoCodeBogoRule::where('promo_code_id', $promoCode->id)
            ->where('is_active', true)
            ->get();

        if ($rules->isEmpty()) {
            return [
                'validation_state' => 'invalid',
                'invalid_reason' => 'PROMO_MISCONFIGURED',
                'discount_amount' => 0.00,
                'breakdown' => [],
            ];
        }

        $discount = 0.00;
        $breakdown = [];
        $hasApplicable = false;
        $pendingReason = null;

        foreach ($rules as $rule) {
            $ruleValidation = $this->validateBogoRuleIntegrity($rule);
            if ($ruleValidation !== null) {
                return [
                    'validation_state' => 'invalid',
                    'invalid_reason' => 'PROMO_MISCONFIGURED',
                    'discount_amount' => 0.00,
                    'breakdown' => [],
                ];
            }

            $ruleResult = $this->evaluateBogoRule($rule, $cart);
            if ($ruleResult['applicable']) {
                $hasApplicable = true;
            }

            $discount += $ruleResult['discount'];
            if (!empty($ruleResult['breakdown'])) {
                $breakdown = array_merge($breakdown, $ruleResult['breakdown']);
            }

            if ($ruleResult['pending'] && !$pendingReason) {
                $pendingReason = $ruleResult['pending_reason'];
            }
        }

        if (!$hasApplicable) {
            return [
                'validation_state' => 'invalid',
                'invalid_reason' => 'NOT_APPLICABLE_TO_CART',
                'discount_amount' => 0.00,
                'breakdown' => [],
            ];
        }

        if ($pendingReason) {
            return [
                'validation_state' => 'pending',
                'invalid_reason' => $pendingReason,
                'discount_amount' => round($discount, 2),
                'breakdown' => $breakdown,
            ];
        }

        return [
            'validation_state' => 'valid',
            'invalid_reason' => null,
            'discount_amount' => round($discount, 2),
            'breakdown' => $breakdown,
        ];
    }

    private function validateBogoRuleIntegrity(PromoCodeBogoRule $rule): ?string
    {
        if ($rule->buy_qty <= 0 || $rule->get_qty <= 0) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->buy_scope === 'product' && !$rule->buy_product_id) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->buy_scope === 'category' && !$rule->buy_category_id) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->get_scope === 'product' && !$rule->get_product_id) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->get_scope === 'category' && !$rule->get_category_id) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->get_discount_type === 'percentage' && ($rule->get_discount_value <= 0 || $rule->get_discount_value > 100)) {
            return 'PROMO_MISCONFIGURED';
        }

        if ($rule->get_discount_type === 'fixed_amount' && $rule->get_discount_value <= 0) {
            return 'PROMO_MISCONFIGURED';
        }

        return null;
    }

    private function evaluateBogoRule(PromoCodeBogoRule $rule, Cart $cart): array
    {
        $buyQty = $this->getScopeQuantity(
            $cart,
            $rule->buy_scope,
            $rule->buy_product_id,
            $rule->buy_category_id,
            $rule->buy_include_subcategories
        );

        if ($buyQty < $rule->buy_qty) {
            return [
                'applicable' => false,
                'discount' => 0.00,
                'breakdown' => [],
                'pending' => false,
                'pending_reason' => null,
            ];
        }

        $applications = intdiv($buyQty, (int) $rule->buy_qty);
        if ($rule->max_applications_per_order) {
            $applications = min($applications, (int) $rule->max_applications_per_order);
        }

        if ($applications <= 0) {
            return [
                'applicable' => false,
                'discount' => 0.00,
                'breakdown' => [],
                'pending' => false,
                'pending_reason' => null,
            ];
        }

        $getQty = $applications * (int) $rule->get_qty;

        $eligibleItems = $this->getScopeItems(
            $cart,
            $rule->get_scope,
            $rule->get_product_id,
            $rule->get_category_id,
            $rule->get_include_subcategories
        );

        if (empty($eligibleItems)) {
            return [
                'applicable' => true,
                'discount' => 0.00,
                'breakdown' => [],
                'pending' => true,
                'pending_reason' => 'BOGO_ADD_ELIGIBLE_ITEM',
            ];
        }

        $totalGetUnits = array_sum(array_map(fn($item) => (int) $item['quantity'], $eligibleItems));
        $discountableUnits = min($totalGetUnits, $getQty);
        $pendingReason = null;
        if ($totalGetUnits < $getQty) {
            $pendingReason = 'BOGO_ADD_MORE_GET_ITEMS';
        }

        $discountResult = $this->calculateBogoLineDiscount(
            $eligibleItems,
            $discountableUnits,
            $rule->get_discount_type,
            (float) $rule->get_discount_value
        );

        return [
            'applicable' => true,
            'discount' => $discountResult['discount'],
            'breakdown' => $discountResult['breakdown'],
            'pending' => $pendingReason !== null,
            'pending_reason' => $pendingReason,
        ];
    }

    private function getScopeQuantity(
        Cart $cart,
        string $scope,
        ?int $productId,
        ?int $categoryId,
        bool $includeSubcategories
    ): int {
        $items = $this->getScopeItems($cart, $scope, $productId, $categoryId, $includeSubcategories);

        return (int) array_sum(array_map(fn($item) => (int) $item['quantity'], $items));
    }

    private function getScopeItems(
        Cart $cart,
        string $scope,
        ?int $productId,
        ?int $categoryId,
        bool $includeSubcategories
    ): array {
        if ($scope === 'product') {
            if (!$productId) {
                return [];
            }

            $item = $cart->items->firstWhere('product_id', (int) $productId);

            if (!$item) {
                return [];
            }

            return [[
                'product_id' => (int) $item->product_id,
                'unit_price' => (float) $item->price,
                'quantity' => (int) $item->quantity,
            ]];
        }

        if ($scope === 'category') {
            if (!$categoryId) {
                return [];
            }

            $productIds = $this->getProductIdsForCategory((int) $categoryId, $includeSubcategories);

            if (empty($productIds)) {
                return [];
            }

            return $cart->items
                ->whereIn('product_id', $productIds)
                ->map(fn($item) => [
                    'product_id' => (int) $item->product_id,
                    'unit_price' => (float) $item->price,
                    'quantity' => (int) $item->quantity,
                ])
                ->values()
                ->all();
        }

        return [];
    }

    private function getProductIdsForCategory(int $categoryId, bool $includeSubcategories): array
    {
        $categoryIds = [$categoryId];
        if ($includeSubcategories) {
            $categoryIds = array_merge($categoryIds, $this->getCategoryDescendantIds($categoryId));
        }

        $categoryIds = array_values(array_unique($categoryIds));

        return DB::table('product_categories')
            ->whereIn('category_id', $categoryIds)
            ->pluck('product_id')
            ->map(fn($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function calculateBogoLineDiscount(
        array $eligibleItems,
        int $getQty,
        string $discountType,
        float $discountValue
    ): array {
        if ($getQty <= 0) {
            return ['discount' => 0.00, 'breakdown' => []];
        }

        usort($eligibleItems, fn($a, $b) => $a['unit_price'] <=> $b['unit_price']);

        $remaining = $getQty;
        $discount = 0.00;
        $breakdown = [];

        foreach ($eligibleItems as $item) {
            if ($remaining <= 0) {
                break;
            }

            $unitsToApply = min($remaining, (int) $item['quantity']);
            $unitPrice = (float) $item['unit_price'];

            if ($discountType === 'free') {
                $discountPerUnit = $unitPrice;
            } elseif ($discountType === 'percentage') {
                $discountPerUnit = $unitPrice * ($discountValue / 100);
            } else {
                $discountPerUnit = min($discountValue, $unitPrice);
            }

            $lineDiscount = $unitsToApply * $discountPerUnit;
            $discount += $lineDiscount;
            $remaining -= $unitsToApply;

            $breakdown[] = [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) $unitsToApply,
                'unit_price' => round($unitPrice, 2),
                'discount_per_unit' => round($discountPerUnit, 2),
                'discount_total' => round($lineDiscount, 2),
            ];
        }

        return [
            'discount' => round($discount, 2),
            'breakdown' => $breakdown,
        ];
    }

    /**
     * Validate promo code
     */
    public function validatePromoCode(string $code, Cart $cart, ?int $userId = null): PromoCode
    {
        $promoCode = PromoCode::where('code', $code)->first();

        if (!$promoCode) {
            throw new \Exception('Invalid promo code');
        }

        $cartTotals = $this->calculateTotals($cart);
        $evaluation = $this->evaluatePromoForCart(
            $promoCode,
            $cart,
            $userId,
            $cartTotals['subtotal'],
            $cartTotals['delivery_fee']
        );

        if ($evaluation['validation_state'] === 'invalid') {
            throw new \Exception($this->promoReasonMessage($evaluation['invalid_reason']));
        }

        return $promoCode;
    }

    public function evaluatePromoCodeForCart(string $code, Cart $cart, ?int $userId = null): array
    {
        $promoCode = PromoCode::where('code', $code)->first();

        if (!$promoCode) {
            return [
                'applied_code' => $code,
                'promo_id' => null,
                'promo_code' => $code,
                'type' => null,
                'applies_to' => null,
                'discount_amount' => 0.00,
                'discount_type' => null,
                'breakdown' => [],
                'validation_state' => 'invalid',
                'invalid_reason' => 'INVALID_CODE',
            ];
        }

        $cartTotals = $this->calculateTotals($cart);

        return $this->evaluatePromoForCart(
            $promoCode,
            $cart,
            $userId,
            $cartTotals['subtotal'],
            $cartTotals['delivery_fee']
        );
    }

    public function promoReasonMessage(?string $reason): string
    {
        return match ($reason) {
            'INVALID_CODE' => 'Invalid promo code',
            'PROMO_INACTIVE' => 'Promo code is inactive',
            'NOT_STARTED' => 'Promo code is not yet valid',
            'EXPIRED' => 'Promo code has expired',
            'USAGE_LIMIT_REACHED' => 'Promo code usage limit reached',
            'USER_LIMIT_REACHED' => 'You have already used this promo code the maximum number of times',
            'FIRST_ORDER_ONLY' => 'Promo code is only valid for your first paid order',
            'MINIMUM_NOT_MET' => 'Minimum order amount not met',
            'NOT_APPLICABLE_TO_CART' => 'Promo code does not apply to items in your cart',
            'PROMO_MISCONFIGURED' => 'Promo code is not configured correctly',
            'BOGO_ADD_ELIGIBLE_ITEM' => 'Promo eligible — add your free item to cart to claim',
            'BOGO_ADD_MORE_GET_ITEMS' => 'Promo eligible — add more eligible items to claim full discount',
            default => 'Promo code is not valid',
        };
    }

    /**
     * Merge guest cart into user cart on login
     */
    public function mergeGuestCart(string $sessionId, int $userId): Cart
    {
        return DB::transaction(function () use ($sessionId, $userId) {
            // Find guest cart
            $guestCart = Cart::where('session_id', $sessionId)->first();

            if (!$guestCart || $guestCart->items->isEmpty()) {
                // No guest cart or empty, just return user cart
                return $this->getCart($userId);
            }

            // Get or create user cart
            $userCart = $this->getCart($userId);

            // Merge items
            foreach ($guestCart->items as $guestItem) {
                try {
                    $this->addItem($userCart, $guestItem->product_id, $guestItem->quantity);
                } catch (\Exception $e) {
                    // Skip items that can't be added (out of stock, etc.)
                    continue;
                }
            }

            // Delete guest cart
            $guestCart->items()->delete();
            $guestCart->delete();

            return $userCart->fresh('items.product');
        });
    }

    /**
     * Get cart with full details
     */
    public function getCartDetails(Cart $cart, ?PromoCode $promoCode = null): array
    {
        $cart->load('items.product');

        $items = $cart->items->map(function ($item) {
            return [
                'id' => $item->id,
                'product' => [
                    'id' => $item->product->barcode,
                    'name_en' => $item->product->name_en,
                    'name_ar' => $item->product->name_ar,
                    'image' => $item->product->image,
                    'price' => $item->product->price,
                    'sale_price' => $item->product->sale_price,
                    'stock_quantity' => $item->product->stock_quantity,
                ],
                'quantity' => $item->quantity,
                'price' => $item->price,
                'subtotal' => $item->subtotal,
            ];
        });

        $totals = $this->calculateTotals($cart, $promoCode);

        return [
            'cart' => [
                'id' => $cart->id,
                'items' => $items,
                ...$totals,
            ],
        ];
    }
}
