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

        // MONEY HARDENED (audit C3 — three issues fixed simultaneously):
        //   1. Paymob call was INSIDE DB::transaction. A later DB error
        //      would roll back the audit row even though Paymob had
        //      already debited our merchant account.
        //   2. Return value of refundTransaction was ignored — a Paymob
        //      `success:false` (wrong amount, already refunded, network
        //      5xx) still flipped the order to 'refunded' and sent
        //      "refund successful" notifications.
        //   3. Used a separate refund_locks table while
        //      OrderCancellationService uses idempotency_key precheck —
        //      two parallel refunds (one per service) both succeeded,
        //      charging Paymob twice.
        //
        // New flow:
        //   Phase 1 (DB::tx): lock + validate + precheck idempotency.
        //   Phase 2 (NO tx):  insert refund row + call Paymob (gateway is
        //                     non-reversible; row must outlive a crash).
        //   Phase 3 (DB::tx): post-success bookkeeping; on failure park
        //                     the refund as 'failed' with paymob_ok_db_failed:
        //                     prefix for operator reconciliation.
        //
        // The refund_locks table is kept as a belt-and-braces serializer
        // but the authoritative gate is now the OrderRefund.idempotency_key
        // unique index shared with OrderCancellationService.
        [$payment, $refundAmount, $refundAmountCents, $idempotencyKey, $existing] =
            DB::transaction(function () use ($order) {
                $lockKey = "refund_order_{$order->id}";
                try {
                    DB::table('refund_locks')->insert([
                        'order_id'   => $order->id,
                        'lock_key'   => $lockKey,
                        'created_at' => now(),
                    ]);
                } catch (Exception $e) {
                    throw new Exception('Refund already in progress for this order');
                }

                $refundAmount = (float) $order->total - (float) $order->refunded_amount;
                if ($refundAmount <= 0) {
                    throw new Exception('Order already fully refunded');
                }

                $payment = $order->paymobPayments()
                    ->where('status', 'PAID')
                    ->latest()
                    ->first();
                if (!$payment) {
                    throw new Exception('No successful payment found for this order');
                }

                $refundAmountCents = (int) round($refundAmount * 100);
                $idempotencyKey = OrderRefund::idempotencyKey($order->id, 'full', $refundAmountCents);

                $existing = OrderRefund::where('idempotency_key', $idempotencyKey)
                    ->whereIn('status', ['processing', 'completed'])
                    ->first();

                return [$payment, $refundAmount, $refundAmountCents, $idempotencyKey, $existing];
            });

        if ($existing) {
            Log::info('[REFUND] Idempotent duplicate blocked', [
                'order_id'        => $order->id,
                'idempotency_key' => $idempotencyKey,
                'existing_refund' => $existing->id,
            ]);
            return;
        }

        // Persist the refund-attempt row BEFORE calling Paymob so a crash
        // between gateway call and DB write still leaves an in-flight
        // refund row an operator can reconcile.
        $refund = OrderRefund::create([
            'order_id'              => $order->id,
            'user_id'               => $order->user_id,
            'paymob_payment_id'     => $payment->id,
            'type'                  => 'full',
            'original_amount'       => $order->total,
            'refund_amount'         => $refundAmount,
            'paymob_transaction_id' => $payment->paymob_transaction_id,
            'refund_method'         => 'gateway',
            'reason'                => $reason,
            'admin_id'              => $admin?->id,
            'initiated_by'          => 'admin',
            'idempotency_key'       => $idempotencyKey,
        ]);
        $refund->forceFill(['status' => 'processing'])->save();

        // Phase 2: call Paymob OUTSIDE the transaction.
        $result = $this->paymobService->refundTransaction(
            (string) $payment->paymob_transaction_id,
            $refundAmountCents,
        );

        if (! is_array($result) || empty($result['success'])) {
            $msg = $result['error'] ?? ($result['message'] ?? 'gateway rejected refund');
            $refund->markAsFailed(substr((string) $msg, 0, 240), is_array($result) ? $result : null);
            Log::error('[REFUND] Paymob rejected full refund', [
                'order_id'  => $order->id,
                'refund_id' => $refund->id,
                'error'     => $msg,
            ]);
            throw new Exception(__('order.refund_processing_failed'));
        }

        // Phase 3: post-refund bookkeeping inside a transaction. If any
        // write fails, park the refund as failed with the tagged reason so
        // it can be reconciled — Paymob's debit is non-reversible.
        try {
            DB::transaction(function () use ($order, $refund, $reason, $admin, $result) {
                $order->update([
                    'payment_status'  => 'refunded',
                    'refunded_amount' => $order->total,
                    'refunded_at'     => now(),
                    'refund_reason'   => $reason,
                    'refunded_by'     => $admin?->id,
                ]);

                app(OrderService::class)->rollbackPromoUsage($order);

                $refund->markAsCompleted(
                    $result['refund_id'] ?? null,
                    is_array($result['response'] ?? null) ? $result['response'] : null,
                );
            });
        } catch (\Throwable $e) {
            Log::critical('[REFUND] DB update failed AFTER Paymob success — needs reconciliation', [
                'order_id'  => $order->id,
                'refund_id' => $refund->id,
                'error'     => $e->getMessage(),
            ]);
            try {
                $refund->markAsFailed(
                    'paymob_ok_db_failed: ' . substr($e->getMessage(), 0, 200),
                );
            } catch (\Throwable $_) {
                // already logged
            }
            throw new Exception(__('order.refund_pending_reconciliation'));
        }

        try {
            $this->pushNotificationService->sendRefundNotification(
                $order->user_id,
                $order->order_number,
                $refundAmount,
                'full',
            );
        } catch (\Throwable $e) {
            Log::warning('[REFUND] notification failed (non-critical)', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }

        Log::info('Gateway full refund completed', [
            'order_id'     => $order->id,
            'order_number' => $order->order_number,
            'amount'       => $refundAmount,
            'admin_id'     => $admin?->id,
            'reason'       => $reason,
        ]);
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

        // Phase 1: validate + lock (transactional). Phase 2 (Paymob call) is
        // NOT wrapped in this transaction because Paymob's refund is a
        // non-reversible side effect — if a DB error rolls us back AFTER
        // Paymob debits, we still owe the customer money.
        [$payment, $items, $refundAmount, $sortedIds, $refundAmountCents, $idempotencyKey, $existing] =
            DB::transaction(function () use ($order, $itemIds) {
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

                $sortedIds = $items->pluck('id')->sort()->values()->all();
                $refundAmountCents = (int) round($refundAmount * 100);
                $idempotencyKey = OrderRefund::idempotencyKey($order->id, 'partial', $refundAmountCents);

                // MONEY HARDENED (audit I11):
                // Precheck for an existing refund row with the same
                // idempotency key. Without this two simultaneous partial
                // refunds with the same (order, amount) tuple both call
                // Paymob and only the second fails on the unique-index
                // INSERT after Paymob has already been charged.
                $existing = OrderRefund::where('idempotency_key', $idempotencyKey)
                    ->whereIn('status', ['processing', 'completed'])
                    ->first();
                return [$payment, $items, $refundAmount, $sortedIds, $refundAmountCents, $idempotencyKey, $existing];
            });

        if ($existing) {
            Log::info('[REFUND] Idempotent duplicate blocked', [
                'order_id'        => $order->id,
                'idempotency_key' => $idempotencyKey,
                'existing_refund' => $existing->id,
            ]);
            return; // already in-flight or done; do not call Paymob again
        }

        // Persist the refund-attempt row BEFORE the gateway call so that, if
        // Paymob debits then our process dies, an operator can still find
        // the in-flight record by idempotency_key.
        $refund = OrderRefund::create([
            'order_id'              => $order->id,
            'user_id'               => $order->user_id,
            'paymob_payment_id'     => $payment->id,
            'type'                  => 'partial',
            'original_amount'       => $order->total,
            'refund_amount'         => $refundAmount,
            'paymob_transaction_id' => $payment->paymob_transaction_id,
            'refund_method'         => 'gateway',
            'reason'                => $reason,
            'admin_id'              => $admin?->id,
            'initiated_by'          => 'admin',
            'refunded_items'        => $sortedIds,
            'idempotency_key'       => $idempotencyKey,
        ]);
        $refund->forceFill(['status' => 'processing'])->save();

        // Call the gateway OUTSIDE the original transaction.
        $result = $this->paymobService->refundTransaction(
            (string) $payment->paymob_transaction_id,
            $refundAmountCents,
        );

        // MONEY HARDENED (audit C3 + C9 + I11):
        // The previous version ignored the gateway's return value and marked
        // the order refunded regardless. If Paymob rejects (wrong amount,
        // already refunded, network 5xx) we must NOT tell the customer
        // their items are refunded.
        if (! is_array($result) || empty($result['success'])) {
            $msg = $result['error'] ?? ($result['message'] ?? 'gateway rejected refund');
            $refund->markAsFailed(substr((string) $msg, 0, 240), is_array($result) ? $result : null);
            Log::error('[REFUND] Paymob rejected partial refund', [
                'order_id'  => $order->id,
                'refund_id' => $refund->id,
                'error'     => $msg,
            ]);
            throw new Exception(__('order.refund_processing_failed'));
        }

        // Phase 3: post-refund DB updates. Wrap in transaction so a partial
        // failure flips the refund to requires_reconciliation rather than
        // leaving the system half-updated.
        try {
            DB::transaction(function () use ($order, $refund, $refundAmount, $sortedIds, $reason, $result) {
                $totalRefunded = (float) $order->refunded_amount + $refundAmount;
                $paymentStatus = $totalRefunded >= (float) $order->total ? 'refunded' : 'partially_refunded';

                $order->update([
                    'payment_status'  => $paymentStatus,
                    'refunded_amount' => $totalRefunded,
                    'refund_reason'   => $reason,
                ]);

                OrderItem::whereIn('id', $sortedIds)->update(['refunded' => true]);

                $refund->markAsCompleted(
                    $result['refund_id'] ?? null,
                    is_array($result['response'] ?? null) ? $result['response'] : null,
                );
            });
        } catch (\Throwable $e) {
            Log::critical('[REFUND] DB update failed AFTER Paymob success — needs reconciliation', [
                'order_id'  => $order->id,
                'refund_id' => $refund->id,
                'error'     => $e->getMessage(),
            ]);
            try {
                // The order_refunds.status enum is
                // ('pending','processing','completed','failed'); we can't
                // introduce 'requires_reconciliation' without a migration.
                // Park as 'failed' with a tagged failure_reason so an
                // operator (or cron) can grep for paymob_ok_db_failed: rows.
                $refund->markAsFailed(
                    'paymob_ok_db_failed: ' . substr($e->getMessage(), 0, 200),
                );
            } catch (\Throwable $_) {
                // already logged
            }
            throw new Exception(__('order.refund_pending_reconciliation'));
        }

        try {
            $this->pushNotificationService->sendRefundNotification(
                $order->user_id,
                $order->order_number,
                $refundAmount,
                'partial',
            );
        } catch (\Throwable $e) {
            Log::warning('[REFUND] notification failed (non-critical)', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }

        Log::info('Gateway partial refund completed', [
            'order_id'     => $order->id,
            'order_number' => $order->order_number,
            'amount'       => $refundAmount,
            'item_ids'     => $sortedIds,
            'admin_id'     => $admin?->id,
        ]);
    }

    /**
     * Reject pay-on-delivery orders (nothing to refund) and unpaid orders.
     *
     * Uses Order::isOnDeliveryPayment() so card_on_delivery (the card-machine
     * payment method) is rejected for the same reason as cash_on_delivery —
     * neither has any money on the gateway to refund. Without this, a
     * card_on_delivery order would slip past the literal check and crash
     * later when Paymob has no transaction to refund against.
     */
    private function assertRefundable(Order $order): void
    {
        if (Order::isOnDeliveryPayment($order->payment_method)) {
            throw new Exception('Cannot refund a pay-on-delivery order — no payment was collected at the gateway.');
        }
        if ($order->payment_status !== 'completed' && $order->payment_status !== 'partially_refunded') {
            throw new Exception('Cannot refund — order payment is not in a refundable state.');
        }
    }
}
