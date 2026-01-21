<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\UserWallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class RefundService
{
    /**
     * Refund full order amount to wallet
     *
     * @param Order $order
     * @param string $reason
     * @param User|null $admin
     * @return void
     * @throws Exception
     */
    public function refundOrder(Order $order, string $reason, ?User $admin = null): void
    {
        DB::transaction(function() use ($order, $reason, $admin) {
            // Idempotency lock
            $lockKey = "refund_order_{$order->id}_" . time();

            try {
                DB::table('refund_locks')->insert([
                    'order_id' => $order->id,
                    'lock_key' => $lockKey,
                    'created_at' => now(),
                ]);
            } catch (Exception $e) {
                throw new Exception('Refund already in progress for this order');
            }

            // Get or create wallet
            $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

            // Calculate refundable amount (total - already refunded)
            $refundAmount = $order->total - $order->refunded_amount;

            if ($refundAmount <= 0) {
                throw new Exception('Order already fully refunded');
            }

            // Credit wallet
            $wallet->credit(
                $refundAmount,
                "Refund for order #{$order->order_number}",
                'Order',
                $order->id,
                "order_refund_{$order->id}"
            );

            // Update order
            $order->update([
                'payment_status' => 'refunded',
                'refunded_amount' => $order->total,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refunded_by' => $admin?->id,
            ]);

            // Log
            Log::info('Order refunded to wallet', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $refundAmount,
                'user_id' => $order->user_id,
                'admin_id' => $admin?->id,
                'reason' => $reason,
            ]);
        });
    }

    /**
     * Refund specific order items (partial refund)
     *
     * @param Order $order
     * @param array $itemIds
     * @param string $reason
     * @return void
     * @throws Exception
     */
    public function partialRefund(Order $order, array $itemIds, string $reason): void
    {
        DB::transaction(function() use ($order, $itemIds, $reason) {
            // Calculate refund amount for selected items
            $items = OrderItem::whereIn('id', $itemIds)
                ->where('order_id', $order->id)
                ->where('refunded', false)
                ->get();

            if ($items->isEmpty()) {
                throw new Exception('No valid items to refund');
            }

            $refundAmount = $items->sum('subtotal');

            // Get or create wallet
            $wallet = UserWallet::firstOrCreate(['user_id' => $order->user_id]);

            // Credit wallet
            $wallet->credit(
                $refundAmount,
                "Partial refund for order #{$order->order_number}",
                'Order',
                $order->id,
                "partial_refund_{$order->id}_" . implode('_', $itemIds)
            );

            // Update order
            $totalRefunded = $order->refunded_amount + $refundAmount;
            $paymentStatus = $totalRefunded >= $order->total ? 'refunded' : 'partially_refunded';

            $order->update([
                'payment_status' => $paymentStatus,
                'refunded_amount' => $totalRefunded,
                'refund_reason' => $reason,
            ]);

            // Mark items as refunded
            OrderItem::whereIn('id', $itemIds)->update(['refunded' => true]);

            // Log
            Log::info('Partial refund processed', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $refundAmount,
                'item_ids' => $itemIds,
                'user_id' => $order->user_id,
            ]);
        });
    }
}
