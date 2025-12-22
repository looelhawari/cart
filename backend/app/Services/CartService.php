<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\PromoCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartService
{
    /**
     * Get or create cart for guest or authenticated user
     */
    public function getCart(?int $userId = null, ?string $sessionId = null): Cart
    {
        if ($userId) {
            $cart = Cart::where('user_id', $userId)->first();

            if (!$cart) {
                $cart = Cart::create(['user_id' => $userId]);
            }
        } else {
            // Guest cart
            if (!$sessionId) {
                $sessionId = Str::uuid()->toString();
            }

            $cart = Cart::where('session_id', $sessionId)->first();

            if (!$cart) {
                $cart = Cart::create(['session_id' => $sessionId]);
            }
        }

        return $cart;
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
        foreach ($cart->items as $item) {
            $subtotal += $item->price * $item->quantity;
        }

        // Get tax rate from settings (14% for Egypt)
        $taxRate = 0.14;

        // Get delivery fee from settings
        $deliveryFee = 20.00;

        // Apply promo code discount
        $discount = 0;
        if ($promoCode) {
            $discount = $this->calculateDiscount($promoCode, $subtotal);
        }

        // Calculate tax on subtotal after discount
        $tax = ($subtotal - $discount) * $taxRate;

        // Calculate total
        $total = $subtotal - $discount + $tax + $deliveryFee;

        return [
            'subtotal' => round($subtotal, 2),
            'delivery_fee' => round($deliveryFee, 2),
            'discount' => round($discount, 2),
            'tax' => round($tax, 2),
            'total' => round($total, 2),
            'items_count' => $cart->items->sum('quantity'),
        ];
    }

    /**
     * Calculate promo code discount
     */
    private function calculateDiscount(PromoCode $promoCode, float $subtotal): float
    {
        if ($promoCode->type === 'percentage') {
            $discount = ($subtotal * $promoCode->value) / 100;

            // Apply maximum discount if set
            if ($promoCode->maximum_discount && $discount > $promoCode->maximum_discount) {
                $discount = $promoCode->maximum_discount;
            }

            return $discount;
        } elseif ($promoCode->type === 'fixed_amount') {
            return min($promoCode->value, $subtotal);
        } elseif ($promoCode->type === 'free_delivery') {
            return 0; // Handled separately in delivery fee
        }

        return 0;
    }

    /**
     * Validate promo code
     */
    public function validatePromoCode(string $code, float $cartSubtotal, ?int $userId = null): PromoCode
    {
        $promoCode = PromoCode::where('code', $code)->first();

        if (!$promoCode) {
            throw new \Exception('Invalid promo code');
        }

        if (!$promoCode->is_active) {
            throw new \Exception('Promo code is inactive');
        }

        // Check if code has expired
        $now = now();
        if ($promoCode->valid_from && $promoCode->valid_from > $now) {
            throw new \Exception('Promo code is not yet valid');
        }

        if ($promoCode->valid_until && $promoCode->valid_until < $now) {
            throw new \Exception('Promo code has expired');
        }

        // Check minimum order requirement
        if ($cartSubtotal < $promoCode->minimum_order) {
            throw new \Exception('Minimum order amount of ' . $promoCode->minimum_order . ' required');
        }

        // Check total usage limit
        if ($promoCode->usage_limit && $promoCode->used_count >= $promoCode->usage_limit) {
            throw new \Exception('Promo code usage limit reached');
        }

        // Check per-user usage limit
        if ($userId && $promoCode->usage_per_user) {
            $userUsageCount = DB::table('promo_code_usage')
                ->where('promo_code_id', $promoCode->id)
                ->where('user_id', $userId)
                ->count();

            if ($userUsageCount >= $promoCode->usage_per_user) {
                throw new \Exception('You have already used this promo code the maximum number of times');
            }
        }

        return $promoCode;
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
