<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
// use App\Models\OrderStatusHistory; // Table not created yet
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderService
{
    protected CartService $cartService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }

    /**
     * Create order from cart
     */
    public function createOrderFromCart(
        Cart $cart,
        int $userId,
        int $deliveryAddressId,
        string $paymentMethod,
        ?string $deliveryDate = null,
        ?string $deliveryTimeSlot = null,
        ?string $notes = null,
        ?PromoCode $promoCode = null
    ): Order {
        return DB::transaction(function () use (
            $cart,
            $userId,
            $deliveryAddressId,
            $paymentMethod,
            $deliveryDate,
            $deliveryTimeSlot,
            $notes,
            $promoCode
        ) {
            // STEP 2: SNAPSHOT RULE - Calculate cart totals ONCE
            // These values will be frozen in the order table
            // CRITICAL: Order totals NEVER recalculate after this point
            $cartTotals = $this->cartService->calculateTotals($cart, $promoCode);

            \Log::info('📸 [STEP 2] ORDER SNAPSHOT - Freezing cart totals', [
                'cart_id' => $cart->id,
                'cart_totals' => $cartTotals,
                'items_count' => $cart->items->count(),
                'snapshot_timestamp' => now()->toDateTimeString(),
                'items_breakdown' => $cart->items->map(fn($item) => [
                    'product_id' => $item->product_id,
                    'name' => $item->product->name_en ?? 'Unknown',
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                    'subtotal' => $item->price * $item->quantity,
                ])->toArray(),
            ]);

            if ($cartTotals['items_count'] === 0) {
                throw new \Exception('Cannot create order from empty cart');
            }

            $deliveryFee = $cartTotals['delivery_fee'];
            $discount = $cartTotals['discount'];
            $tax = $cartTotals['tax'];
            $total = $cartTotals['total'];
            $promoSnapshot = $cartTotals['promo_summary'] ?? null;

            \Log::info('� [STEP 2] SNAPSHOT LOCKED - Order totals finalized', [
                'subtotal' => $cartTotals['subtotal'],
                'delivery_fee' => $deliveryFee,
                'tax' => $tax,
                'discount' => $discount,
                'TOTAL' => $total,
                'payment_method' => $paymentMethod,
                'rule' => 'These values are now IMMUTABLE - will never recalculate from cart',
            ]);

            // Create order
            $order = Order::create([
                'user_id' => $userId,
                'order_number' => Order::generateOrderNumber(),
                'status' => $paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending_payment',
                'subtotal' => $cartTotals['subtotal'],
                'delivery_fee' => $deliveryFee,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentMethod === 'cash_on_delivery' ? 'pending' : 'pending',
                'delivery_address_id' => $deliveryAddressId,
                'promo_code_snapshot' => $promoSnapshot,
                'delivery_date' => $deliveryDate,
                'delivery_time_slot' => $deliveryTimeSlot,
                'notes' => $notes,
            ]);

            \Log::info('✅ [STEP 2] ORDER CREATED - Snapshot saved to database', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'snapshot_values' => [
                    'subtotal' => $order->subtotal,
                    'delivery_fee' => $order->delivery_fee,
                    'tax' => $order->tax,
                    'discount' => $order->discount,
                    'total' => $order->total,
                ],
                'verification' => 'Order totals match cart snapshot',
            ]);

            // Create order items from cart items
            $cart->load('items.product');

            $productQuantities = [];
            foreach ($cart->items as $cartItem) {
                $productId = (int) $cartItem->product_id;
                $productQuantities[$productId] = ($productQuantities[$productId] ?? 0) + (int) $cartItem->quantity;
            }

            $products = Product::whereIn('barcode', array_keys($productQuantities))
                ->lockForUpdate()
                ->get()
                ->keyBy(fn($product) => (int) $product->barcode);

            foreach ($productQuantities as $productId => $qty) {
                /** @var Product|null $product */
                $product = $products->get((int) $productId);

                if (!$product || !$product->is_active || !$product->is_in_stock) {
                    throw new \Exception('One or more products in your cart are out of stock', 422);
                }

                if ($product->stock_quantity < $qty) {
                    throw new \Exception('Insufficient stock. Available: ' . $product->stock_quantity, 422);
                }
            }

            foreach ($cart->items as $cartItem) {
                $product = $products->get((int) $cartItem->product_id);

                if (!$product || !$product->is_in_stock) {
                    throw new \Exception('One or more products in your cart are out of stock', 422);
                }

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->barcode,
                    'product_name' => $product->name_en,
                    'product_sku' => (string) $product->barcode,
                    'quantity' => $cartItem->quantity,
                    'price' => $cartItem->price,
                    'subtotal' => $cartItem->quantity * $cartItem->price,
                ]);

                // Update product stock
                $product->decrement('stock_quantity', $cartItem->quantity);
                $product->increment('sales_count', $cartItem->quantity);
            }

            // Create initial status history
            // OrderStatusHistory::create([
            //     'order_id' => $order->id,
            //     'status' => 'pending',
            //     'notes' => 'Order created',
            //     'created_by' => $userId,
            // ]);

            // CRITICAL: DO NOT clear cart here for card payments
            // Cart should only be cleared AFTER successful payment confirmation
            // For COD, we can clear immediately
            if ($paymentMethod === 'cash_on_delivery') {
                $this->cartService->clearCart($cart);
            }

            return $order->load(['items.product', 'deliveryAddress', 'user']);
        });
    }

    /**
     * Get orders for user
     */
    public function getUserOrders(int $userId, ?string $status = null, int $perPage = 20)
    {
        $query = Order::where('user_id', $userId)
            ->with(['items.product', 'deliveryAddress'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get single order
     */
    public function getOrder(int $orderId, int $userId): Order
    {
        return Order::where('id', $orderId)
            ->where('user_id', $userId)
            ->with(['items.product', 'deliveryAddress'])
            ->firstOrFail();
    }

    /**
     * Cancel order with automatic refund
     */
    public function cancelOrder(int $orderId, int $userId, string $reason): Order
    {
        return DB::transaction(function () use ($orderId, $userId, $reason) {
            $order = Order::where('id', $orderId)
                ->where('user_id', $userId)
                ->whereNotIn('status', ['delivered', 'cancelled'])
                ->firstOrFail();

            // Restore product stock
            foreach ($order->items as $item) {
                $item->product->increment('stock_quantity', $item->quantity);
                $item->product->decrement('sales_count', $item->quantity);
            }

            // Process refund if payment was completed
            if ($order->payment_status === 'completed') {
                $refundService = app(RefundService::class);
                $refundService->refundOrder($order, $reason);
            }

            // Update order
            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ]);

            // Record status change
            // OrderStatusHistory::create([
            //     'order_id' => $order->id,
            //     'status' => 'cancelled',
            //     'notes' => 'Order cancelled by customer: ' . $reason,
            //     'created_by' => $userId,
            // ]);

            return $order->fresh(['items.product', 'deliveryAddress']);
        });
    }

    /**
     * Reorder - create new cart from previous order
     */
    public function reorder(int $orderId, int $userId, ?string $sessionId = null): array
    {
        \Log::info('🛒 [REORDER] Starting reorder process', [
            'order_id' => $orderId,
            'user_id' => $userId,
            'session_id' => $sessionId,
        ]);

        $order = Order::where('id', $orderId)
            ->where('user_id', $userId)
            ->with('items.product')
            ->firstOrFail();

        $cart = $this->cartService->getCart($userId, $sessionId);

        \Log::info('🛒 [REORDER] Cart retrieved', [
            'cart_id' => $cart->id,
            'existing_items' => $cart->items->count(),
            'session_id' => $cart->session_id,
        ]);

        // Clear existing cart
        $this->cartService->clearCart($cart);

        $addedItems = [];
        $unavailableItems = [];

        // Add items from order to cart
        foreach ($order->items as $item) {
            // Check if product still exists and is active
            if ($item->product && $item->product->is_active && $item->product->is_in_stock && $item->product->stock_quantity > 0) {
                $this->cartService->addItem($cart, $item->product_id, $item->quantity);
                $addedItems[] = [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                ];
            } else {
                $unavailableItems[] = [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'reason' => !$item->product ? 'discontinued' : ((!$item->product->is_active || !$item->product->is_in_stock) ? 'inactive' : 'out_of_stock'),
                ];
            }
        }

        $cart->fresh('items.product');

        \Log::info('✅ [REORDER] Reorder completed', [
            'cart_id' => $cart->id,
            'items_added' => count($addedItems),
            'items_unavailable' => count($unavailableItems),
            'final_items_count' => $cart->items->count(),
            'session_id' => $cart->session_id,
        ]);

        return [
            'cart' => $cart->fresh('items.product'),
            'added_items' => $addedItems,
            'unavailable_items' => $unavailableItems,
            'summary' => [
                'total_items_requested' => count($order->items),
                'items_added' => count($addedItems),
                'items_unavailable' => count($unavailableItems),
            ],
        ];
    }

    /**
     * Record promo usage after successful payment finalization.
     */
    public function finalizePromoUsage(Order $order): void
    {
        $promoSnapshot = $order->promo_code_snapshot;

        if (!$promoSnapshot || empty($promoSnapshot['promo_id'])) {
            return;
        }

        $discountAmount = (float) ($promoSnapshot['discount_amount'] ?? 0);
        if ($discountAmount <= 0) {
            return;
        }

        DB::transaction(function () use ($order, $promoSnapshot, $discountAmount) {
            $exists = DB::table('promo_code_usage')
                ->where('order_id', $order->id)
                ->where('promo_code_id', $promoSnapshot['promo_id'])
                ->exists();

            if ($exists) {
                return;
            }

            DB::table('promo_code_usage')->insert([
                'promo_code_id' => $promoSnapshot['promo_id'],
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'discount_amount' => $discountAmount,
                'order_total' => $order->total,
                'order_number' => $order->order_number,
                'used_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            PromoCode::where('id', $promoSnapshot['promo_id'])->lockForUpdate()->increment('used_count');
        });
    }

    /**
     * Roll back promo usage for refunded orders.
     */
    public function rollbackPromoUsage(Order $order): void
    {
        $promoSnapshot = $order->promo_code_snapshot;
        if (!$promoSnapshot || empty($promoSnapshot['promo_id'])) {
            return;
        }

        DB::transaction(function () use ($order, $promoSnapshot) {
            $deleted = DB::table('promo_code_usage')
                ->where('order_id', $order->id)
                ->where('promo_code_id', $promoSnapshot['promo_id'])
                ->delete();

            if ($deleted > 0) {
                PromoCode::where('id', $promoSnapshot['promo_id'])
                    ->lockForUpdate()
                    ->decrement('used_count', $deleted);
            }
        });
    }

    /**
     * Mark COD order as delivered and finalize promo usage.
     */
    public function markCodOrderDelivered(Order $order): Order
    {
        return DB::transaction(function () use ($order) {
            $order->update([
                'status' => 'delivered',
                'payment_status' => 'completed',
            ]);

            $this->finalizePromoUsage($order);

            return $order->fresh(['items.product', 'deliveryAddress']);
        });
    }
}
