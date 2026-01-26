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
            foreach ($cart->items as $cartItem) {
                $product = $cartItem->product;

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

            // Record promo code usage if applied
            if ($promoCode) {
                DB::table('promo_code_usage')->insert([
                    'promo_code_id' => $promoCode->id,
                    'user_id' => $userId,
                    'order_id' => $order->id,
                    'discount_amount' => $discount,
                    'created_at' => now(),
                ]);

                $promoCode->increment('used_count');
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
    public function reorder(int $orderId, int $userId, ?string $sessionId = null): Cart
    {
        $order = Order::where('id', $orderId)
            ->where('user_id', $userId)
            ->with('items.product')
            ->firstOrFail();

        $cart = $this->cartService->getCart($userId, $sessionId);

        // Clear existing cart
        $this->cartService->clearCart($cart);

        // Add items from order to cart
        foreach ($order->items as $item) {
            // Check if product still exists and is active
            if ($item->product && $item->product->is_active && $item->product->stock_quantity > 0) {
                $this->cartService->addItem($cart, $item->product_id, $item->quantity);
            }
        }

        return $cart->fresh('items.product');
    }
}
