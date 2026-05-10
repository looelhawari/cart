<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderRefund;
use App\Models\PaymobPayment;
use App\Models\User;
use App\Services\OrderService;
use App\Services\PaymobService;
use App\Services\PushNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Admin-initiated refunds, gateway-only.
 *
 * SECURITY HARDENED (Chain A): Wallet credit path removed. Wallet feature
 * is no longer part of this product. Refunds are issued via Paymob's refund
 * API for card-paid orders. COD orders are rejected (no money to return —
 * the cash never reached us).
 *
 * Idempotency: replaced the time()-based lock with a deterministic key.
 * Item-level keys now use sort($itemIds) so [1,2] and [2,1] produce the
 * same fingerprint, preventing the "permutation double-refund" hole.
 */
class RefundService
{
    protected PushNotificationService $pushNotificationService;
    protected PaymobService $paymobService;

    public function __construct(
        PushNotificationService $pushNotificationService,
        PaymobService $paymobService,
    ) {
        $this->pushNotificationService = $pushNotificationService;
        $this->paymobService = $paymobService;
    }

    /**
     * Full refund — issues Paymob gateway refund for the unrefunded balance.
     *
     * @throws Exception when order is COD, already fully refunded, or has
     *                  no successful Paymob payment to refund against.
     */
    public function refundOrder(Order $order, string $reason, ?User $admin = null): void
    {
        $this->assertRefundable($order);

        DB::transaction(function () use ($order, $reason, $admin) {
            // Acquire deterministic lock — same key every time, FK uniqueness
            // on order_id makes the second concurrent refund fail-fast.
            $lockKey = "refund_order_{$order->id}";
            try {
                DB::table('refund_locks')->insert([
                    'order_id' => $order->id,
                    'lock_key' => $lockKey,
                    'created_at' => now(),
                ]);
            } catch (Exception $e) {
                throw new Exception('Refund already in progress for this order');
            }

            $refundAmount = (float) $order->total - (float) $order->refunded_amount;
            if ($refundAmount <= 0) {
                throw new Exception('Order already fully refunded');
            }

            // Find the successful Paymob transaction to refund against
            $payment = $order->paymobPayments()
                ->where('status', 'PAID')
                ->latest()
                ->first();
            if (!$payment) {
                throw new Exception('No successful payment found for this order');
            }

            // Persist the refund-attempt row first (idempotency_key column on
            // OrderRefund is now deterministic and uniquely indexed).
            // OrderRefund.status is non-fillable (state machine) — use forceFill
            // for the initial 'processing' status. The webhook will flip it to
            // completed/failed via OrderRefund::markAsCompleted/Failed.
            $refund = OrderRefund::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'paymob_payment_id' => $payment->id,
                'type' => 'full',
                'original_amount' => $order->total,
                'refund_amount' => $refundAmount,
                'paymob_transaction_id' => $payment->paymob_transaction_id,
                'refund_method' => 'gateway',
                'reason' => $reason,
                'admin_id' => $admin?->id,
                'initiated_by' => 'admin',
                'idempotency_key' => "refund_order_{$order->id}",
            ]);
            $refund->forceFill(['status' => 'processing'])->save();

            // Call Paymob gateway. Real settlement happens via webhook
            // callback to RefundWebhookController which will mark the
            // OrderRefund as completed/failed.
            $this->paymobService->refundTransaction(
                (string) $payment->paymob_transaction_id,
                (int) round($refundAmount * 100), // amount in cents
            );

            $order->update([
                'payment_status' => 'refunded',
                'refunded_amount' => $order->total,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refunded_by' => $admin?->id,
            ]);

            app(OrderService::class)->rollbackPromoUsage($order);

            $this->pushNotificationService->sendRefundNotification(
                $order->user_id,
                $order->order_number,
                $refundAmount,
                'full',
            );

            Log::info('Gateway refund initiated', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $refundAmount,
                'admin_id' => $admin?->id,
                'reason' => $reason,
            ]);
        });
    }

    /**
     * Partial item refund — gateway-only.
     *
     * SECURITY: idempotency key is built from sort($itemIds) so [1,2] and
     * [2,1] cannot produce different keys and double-refund.
     *
     * @throws Exception
     */
    public function partialRefund(Order $order, array $itemIds, string $reason, ?User $admin = null): void
    {
        $this->assertRefundable($order);

        DB::transaction(function () use ($order, $itemIds, $reason, $admin) {
            $items = OrderItem::whereIn('id', $itemIds)
                ->where('order_id', $order->id)
                ->where('refunded', false)
                ->lockForUpdate()
                ->get();

            if ($items->isEmpty()) {
                throw new Exception('No valid items to refund');
            }

            $refundAmount = (float) $items->sum('subtotal');

            $payment = $order->paymobPayments()
                ->where('status', 'PAID')
                ->latest()
                ->first();
            if (!$payment) {
                throw new Exception('No successful payment found for this order');
            }

            // Sort itemIds before building the key — order-independent.
            $sortedIds = $items->pluck('id')->sort()->values()->all();
            $idempotencyKey = "partial_refund_{$order->id}_" . implode('_', $sortedIds);

            $refund = OrderRefund::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'paymob_payment_id' => $payment->id,
                'type' => 'partial',
                'original_amount' => $order->total,
                'refund_amount' => $refundAmount,
                'paymob_transaction_id' => $payment->paymob_transaction_id,
                'refund_method' => 'gateway',
                'reason' => $reason,
                'admin_id' => $admin?->id,
                'initiated_by' => 'admin',
                'refunded_items' => $sortedIds,
                'idempotency_key' => $idempotencyKey,
            ]);
            $refund->forceFill(['status' => 'processing'])->save();

            $this->paymobService->refundTransaction(
                (string) $payment->paymob_transaction_id,
                (int) round($refundAmount * 100),
            );

            $totalRefunded = (float) $order->refunded_amount + $refundAmount;
            $paymentStatus = $totalRefunded >= (float) $order->total ? 'refunded' : 'partially_refunded';

            $order->update([
                'payment_status' => $paymentStatus,
                'refunded_amount' => $totalRefunded,
                'refund_reason' => $reason,
            ]);

            OrderItem::whereIn('id', $sortedIds)->update(['refunded' => true]);

            $this->pushNotificationService->sendRefundNotification(
                $order->user_id,
                $order->order_number,
                $refundAmount,
                'partial',
            );

            Log::info('Gateway partial refund initiated', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => $refundAmount,
                'item_ids' => $sortedIds,
                'admin_id' => $admin?->id,
            ]);
        });
    }

    /**
     * Reject COD orders (nothing to refund) and unpaid orders.
     */
    private function assertRefundable(Order $order): void
    {
        if ($order->payment_method === 'cash_on_delivery') {
            throw new Exception('Cannot refund a cash-on-delivery order — no payment was collected.');
        }
        if ($order->payment_status !== 'completed' && $order->payment_status !== 'partially_refunded') {
            throw new Exception('Cannot refund — order payment is not in a refundable state.');
        }
    }
}
