<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
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
            // Calculate cart totals
            $cartTotals = $this->cartService->calculateTotals($cart);

            if ($cartTotals['item_count'] === 0) {
                throw new \Exception('Cannot create order from empty cart');
            }

            // Calculate delivery fee (you can customize this logic)
            $deliveryFee = $this->calculateDeliveryFee($cartTotals['subtotal']);

            // Calculate discount
            $discount = 0;
            if ($promoCode) {
                $discount = $this->calculateDiscount($promoCode, $cartTotals['subtotal']);
            }

            // Calculate tax (14% for Egypt)
            $taxRate = (float) (config('app.tax_rate') ?? 14);
            $tax = ($cartTotals['subtotal'] + $deliveryFee - $discount) * ($taxRate / 100);

            // Calculate total
            $total = $cartTotals['subtotal'] + $deliveryFee + $tax - $discount;

            // Create order
            $order = Order::create([
                'user_id' => $userId,
                'order_number' => Order::generateOrderNumber(),
                'status' => 'pending',
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

            // Create order items from cart items
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
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'pending',
                'notes' => 'Order created',
                'created_by' => $userId,
            ]);

            // Clear cart after successful order
            $this->cartService->clearCart($cart);

            return $order->load(['items.product', 'deliveryAddress', 'user']);
        });
    }

    /**
     * Calculate delivery fee based on subtotal
     */
    protected function calculateDeliveryFee(float $subtotal): float
    {
        $freeDeliveryThreshold = (float) (config('app.free_delivery_threshold') ?? 200);
        $defaultDeliveryFee = (float) (config('app.delivery_fee') ?? 20);

        if ($subtotal >= $freeDeliveryThreshold) {
            return 0.00;
        }

        return $defaultDeliveryFee;
    }

    /**
     * Calculate discount from promo code
     */
    protected function calculateDiscount(PromoCode $promoCode, float $subtotal): float
    {
        if ($promoCode->type === 'percentage') {
            $discount = $subtotal * ($promoCode->value / 100);

            // Apply maximum discount if set
            if ($promoCode->maximum_discount && $discount > $promoCode->maximum_discount) {
                $discount = $promoCode->maximum_discount;
            }

            return round($discount, 2);
        }

        if ($promoCode->type === 'fixed_amount') {
            return min($promoCode->value, $subtotal);
        }

        return 0.00;
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
            ->with(['items.product', 'deliveryAddress', 'statusHistory'])
            ->firstOrFail();
    }

    /**
     * Cancel order
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

            // Update order
            $order->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ]);

            // Record status change
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'cancelled',
                'notes' => 'Order cancelled by customer: ' . $reason,
                'created_by' => $userId,
            ]);

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
