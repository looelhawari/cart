<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\PromoCode;
use Illuminate\Support\Str;

class CartService
{
    /**
     * Get cart for user or guest
     */
    public function getCart(?int $userId = null, ?string $sessionId = null): Cart
    {
        \Log::info('🛒 CART SERVICE - getCart() called', [
            'user_id' => $userId,
            'session_id' => $sessionId,
        ]);

        if ($userId) {
            // Try to get user's cart
            $cart = Cart::where('user_id', $userId)->first();

            if ($cart) {
                \Log::info('📦 Found existing USER cart', [
                    'cart_id' => $cart->id,
                    'items_count' => $cart->items->count(),
                    'updated_at' => $cart->updated_at->toDateTimeString(),
                ]);
            }

            // If user has a session ID, check for guest cart and merge
            if ($sessionId) {
                $guestCart = Cart::where('session_id', $sessionId)
                    ->whereNull('user_id')
                    ->first();

                if ($guestCart) {
                    \Log::warning('⚠️ FOUND BOTH USER AND GUEST CARTS - WILL MERGE', [
                        'user_cart_id' => $cart?->id,
                        'user_cart_items' => $cart?->items->count() ?? 0,
                        'user_cart_updated' => $cart?->updated_at->toDateTimeString(),
                        'guest_cart_id' => $guestCart->id,
                        'guest_cart_items' => $guestCart->items->count(),
                        'guest_cart_updated' => $guestCart->updated_at->toDateTimeString(),
                    ]);

                    if ($cart) {
                        // Merge guest cart into user cart
                        \Log::info('🔀 MERGING guest cart INTO user cart');
                        $this->mergeCarts($guestCart, $cart);
                        $guestCart->delete();
                        \Log::info('✅ Merge complete, guest cart deleted');
                    } else {
                        // Convert guest cart to user cart
                        \Log::info('🔄 Converting guest cart to user cart');
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
                \Log::info('🆕 Creating new user cart');
                $cart = Cart::create(['user_id' => $userId]);
            }
        } else {
            // Guest cart
            if (!$sessionId) {
                $sessionId = Str::uuid()->toString();
                \Log::info('🎲 Generated new session ID', ['session_id' => $sessionId]);
            }

            $cart = Cart::where('session_id', $sessionId)->first();

            if (!$cart) {
                \Log::info('🆕 Creating new guest cart', ['session_id' => $sessionId]);
                $cart = Cart::create(['session_id' => $sessionId]);
            } else {
                \Log::info('📦 Found existing GUEST cart', [
                    'cart_id' => $cart->id,
                    'items_count' => $cart->items->count(),
                ]);
            }
        }

        // Load cart items with product relationship
        $cart->load('items.product');

        \Log::info('📊 Returning cart', [
            'cart_id' => $cart->id,
            'final_items_count' => $cart->items->count(),
            'is_user_cart' => (bool) $cart->user_id,
        ]);

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

    // ... rest of the file remains unchanged ...
