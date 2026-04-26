<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
// use App\Models\OrderStatusHistory; // Table not created yet
use App\Models\Address;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\User;
use App\Models\UserPurchasePattern;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    protected CartService $cartService;
    protected ?EnterpriseNotificationService $notificationService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
        try {
            $this->notificationService = app(EnterpriseNotificationService::class);
        } catch (\Exception $e) {
            $this->notificationService = null;
        }
    }

    /**
     * Create order from cart
     * Uses pessimistic locking to prevent cart race conditions
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
            // CRITICAL FIX: Lock the cart row and reload items inside the transaction
            // This prevents concurrent requests from clearing/modifying the cart
            // between the controller fetching it and this method processing it
            $cart = Cart::where('id', $cart->id)->lockForUpdate()->firstOrFail();
            $cart->load('items.product');

            // STEP 2: SNAPSHOT RULE - Calculate cart totals ONCE
            $cartTotals = $this->cartService->calculateTotals($cart, $promoCode);

            Log::debug('Order snapshot', [
                'cart_id' => $cart->id,
                'subtotal' => $cartTotals['subtotal'],
                'items_count' => $cartTotals['items_count'],
                'total' => $cartTotals['total'],
            ]);

            if ($cartTotals['items_count'] === 0) {
                throw new \Exception('Cannot create order from empty cart');
            }

            $deliveryFee = $cartTotals['delivery_fee'];
            $discount = $cartTotals['discount'];
            $tax = $cartTotals['tax'];
            $total = $cartTotals['total'];
            $promoSnapshot = $cartTotals['promo_summary'] ?? null;

            // ZONE FEE OVERRIDE: Use zone-specific delivery fee when available
            try {
                $address = Address::find($deliveryAddressId);
                if ($address && $address->latitude && $address->longitude) {
                    $zoneService = app(DeliveryZoneService::class);
                    $zoneFeeResult = $zoneService->calculateDeliveryFee(
                        $address->latitude,
                        $address->longitude,
                        $cartTotals['subtotal']
                    );
                    if ($zoneFeeResult['is_deliverable'] && isset($zoneFeeResult['delivery_fee'])) {
                        $oldFee = $deliveryFee;
                        $deliveryFee = $zoneFeeResult['delivery_fee'];
                        $total = $cartTotals['subtotal'] + $deliveryFee - $discount + $tax;
                        Log::info('🗺️ Zone delivery fee applied', [
                            'zone_id' => $zoneFeeResult['zone_id'],
                            'zone_name' => $zoneFeeResult['zone_name'],
                            'flat_fee' => $oldFee,
                            'zone_fee' => $deliveryFee,
                            'new_total' => $total,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Zone fee lookup failed, using flat fee', ['error' => $e->getMessage()]);
            }

            Log::info('🔒 [STEP 2] SNAPSHOT LOCKED - Order totals finalized', [
                'subtotal' => $cartTotals['subtotal'],
                'delivery_fee' => $deliveryFee,
                'TOTAL' => $total,
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

            Log::info('Order created', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'total' => $order->total,
            ]);

            // STEP 2.5: ZONE SNAPSHOT - Freeze delivery zone info
            try {
                $address = Address::find($deliveryAddressId);
                if ($address && $address->latitude && $address->longitude) {
                    $zoneService = app(DeliveryZoneService::class);
                    $zoneService->snapshotZoneToOrder($order, $address);
                }
            } catch (\Exception $e) {
                Log::warning('Zone snapshot failed (non-critical)', ['error' => $e->getMessage()]);
            }

            // Create order items from cart items — items already loaded above

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
                    throw new \Exception('Out of stock [ERR1]: ' . $productId, 422);
                }

                if ($product->stock_quantity < $qty) {
                    throw new \Exception('Insufficient stock. Available: ' . $product->stock_quantity, 422);
                }
            }

            foreach ($cart->items as $cartItem) {
                $product = $products->get((int) $cartItem->product_id);

                if (!$product || !$product->is_in_stock) {
                    throw new \Exception('Out of stock [ERR2]: ' . $cartItem->product_id, 422);
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

                // Update product stock — atomic guard against negative stock
                $affected = \App\Models\Product::where('barcode', $product->barcode)
                    ->where('stock_quantity', '>=', $cartItem->quantity)
                    ->update([
                        'stock_quantity' => DB::raw("stock_quantity - {$cartItem->quantity}"),
                        'sales_count' => DB::raw("sales_count + {$cartItem->quantity}"),
                    ]);

                if ($affected === 0) {
                    throw new \Exception("Insufficient stock for product: {$product->name_en}", 422);
                }
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

            // Load order with relationships
            $order->load(['items.product', 'deliveryAddress', 'user']);

            // Send enterprise notification for order placement
            if ($this->notificationService) {
                try {
                    $this->notificationService->notifyOrderPlacedFromOrder($order);

                    // Record purchase patterns for smart reorder suggestions
                    foreach ($order->items as $item) {
                        UserPurchasePattern::recordPurchase($userId, $item->product_id);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to send order notification', ['error' => $e->getMessage()]);
                }
            }

            return $order;
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
            ->with(['items.product', 'deliveryAddress', 'driver:id,first_name,last_name,phone,average_rating', 'driverRating', 'refunds'])
            ->firstOrFail();
    }

    /**
     * Cancel order — delegates to OrderCancellationService.
     *
     * @deprecated Use OrderCancellationService::cancelOrder() directly.
     *             This method is kept for backward compatibility only.
     */
    public function cancelOrder(int $orderId, int $userId, string $reason): Order
    {
        $cancellationService = app(OrderCancellationService::class);
        $result = $cancellationService->cancelOrder($orderId, $userId, $reason);
        return $result['order'];
    }

    /**
     * Reorder - create new cart from previous order
     */
    public function reorder(int $orderId, int $userId, ?string $sessionId = null): array
    {
        Log::debug('Reorder started', ['order_id' => $orderId, 'user_id' => $userId]);

        $order = Order::where('id', $orderId)
            ->where('user_id', $userId)
            ->with('items.product')
            ->firstOrFail();

        $cart = $this->cartService->getCart($userId, $sessionId);

        Log::debug('Reorder cart retrieved', ['cart_id' => $cart->id]);

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

        Log::debug('Reorder completed', ['items_added' => count($addedItems), 'items_unavailable' => count($unavailableItems)]);

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
