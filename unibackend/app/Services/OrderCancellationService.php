<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\PaymobPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * OrderCancellationService — Enterprise-grade order cancellation with Paymob refund.
 *
 * SCENARIO 1 — CARD PAYMENT (Prepaid):
 *   A. Before preparation → Full refund (100%) via Paymob Refund API
 *   B. After preparation, before delivery → Penalty refund (86%) via Paymob Partial Refund
 *   C. Out for delivery / Delivered → BLOCKED — cannot cancel
 *   D. Partial item refund → Exact item amount via Paymob Partial Refund
 *
 * SCENARIO 2 — COD (Cash On Delivery):
 *   A. Before shipment → Cancel + restock immediately (no refund needed)
 *   B. After preparation, before delivery → Cancel + restock (no refund needed)
 *   C. Out for delivery / Delivered → BLOCKED — cannot cancel
 */
class OrderCancellationService
{
    private PaymobService $paymobService;
    private OrderService $orderService;
    private PushNotificationService $pushNotificationService;

    public function __construct(
        PaymobService $paymobService,
        OrderService $orderService,
        PushNotificationService $pushNotificationService
    ) {
        $this->paymobService = $paymobService;
        $this->orderService = $orderService;
        $this->pushNotificationService = $pushNotificationService;
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API — Entry Points
    // ═══════════════════════════════════════════════════════════════

    /**
     * Cancel an order (customer-initiated).
     *
     * This is the single entry point for all customer cancellations.
     * It routes to the correct handler based on payment method + order status.
     *
     * @return array{
     *   success: bool,
     *   message: string,
     *   refund: array|null,
     *   order: Order
     * }
     * @throws Exception
     */
    public function cancelOrder(int $orderId, int $userId, string $reason): array
    {
        // Phase 1: Validate + lock (inside transaction)
        $order = DB::transaction(function () use ($orderId, $userId) {
            $order = Order::where('id', $orderId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($order->status, ['cancelled', 'failed'])) {
                throw new Exception('This order has already been cancelled or failed.');
            }

            return $order;
        });

        // Phase 2: Execute (outside transaction so Paymob call can't cause rollback)
        $isCod = $order->payment_method === 'cash_on_delivery';

        if ($isCod) {
            return DB::transaction(fn() => $this->handleCodCancellation($order->fresh(), $reason));
        } else {
            return $this->handleCardCancellation($order->fresh(), $reason);
        }
    }

    /**
     * Cancel order by admin (with optional refund override).
     *
     * Admin can force-cancel orders in any status (except delivered).
     * Admin can override penalty percentage.
     */
    public function adminCancelOrder(
        int $orderId,
        int $adminId,
        string $reason,
        ?float $overridePenaltyPercent = null
    ): array {
        // Phase 1: Validate + lock
        $order = DB::transaction(function () use ($orderId) {
            $order = Order::where('id', $orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'delivered') {
                throw new Exception('Cannot cancel a delivered order. Use the return/refund process instead.');
            }

            if (in_array($order->status, ['cancelled', 'failed'])) {
                throw new Exception('This order has already been cancelled or failed.');
            }

            return $order;
        });

        // Phase 2: Execute (outside transaction for card payments)
        $isCod = $order->payment_method === 'cash_on_delivery';

        if ($isCod) {
            return DB::transaction(fn() => $this->handleCodCancellation($order->fresh(), $reason, 'admin', $adminId));
        } else {
            return $this->handleCardCancellation($order->fresh(), $reason, 'admin', $adminId, $overridePenaltyPercent);
        }
    }

    /**
     * Partial item refund for a card-paid order (admin-only).
     *
     * Refunds the exact amount for specific items.
     * Prevents over-refund by checking already-refunded total.
     */
    public function partialItemRefund(
        int $orderId,
        array $itemIds,
        string $reason,
        int $adminId
    ): array {
        // Phase 1: Validate inside transaction
        [$order, $payment, $items, $itemRefundAmount, $amountCents, $alreadyRefunded, $refundedItemsLog] =
            DB::transaction(function () use ($orderId, $itemIds) {
                $order = Order::where('id', $orderId)
                    ->lockForUpdate()
                    ->with('items')
                    ->firstOrFail();

                if ($order->payment_method === 'cash_on_delivery') {
                    throw new Exception('Partial refunds are only available for card-paid orders.');
                }

                $payment = $order->successfulPayment();
                if (!$payment || !$payment->isPaid()) {
                    throw new Exception('No successful payment found for this order.');
                }

                $items = $order->items()->whereIn('id', $itemIds)->where('refunded', false)->get();
                if ($items->isEmpty()) {
                    throw new Exception('No valid items found to refund. Items may already be refunded.');
                }

                $itemRefundAmount = $items->sum('subtotal');
                $amountCents = (int) round($itemRefundAmount * 100);

                $alreadyRefunded = OrderRefund::totalRefundedForOrder($orderId);

                // Also cap against Paymob transaction amount
                $paymobMaxCents = $payment->amount_cents ?? (int) round((float) $order->total * 100);
                $paymobMaxEgp = $paymobMaxCents / 100;
                $maxRefundable = min((float) $order->total, $paymobMaxEgp) - $alreadyRefunded;

                if ($itemRefundAmount > $maxRefundable) {
                    throw new Exception(
                        "Refund amount ({$itemRefundAmount} EGP) exceeds maximum refundable ({$maxRefundable} EGP)."
                    );
                }

                $refundedItemsLog = $items->map(fn($item) => [
                    'item_id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'amount' => $item->subtotal,
                ])->toArray();

                return [$order, $payment, $items, $itemRefundAmount, $amountCents, $alreadyRefunded, $refundedItemsLog];
            });

        // Phase 2: Create refund record + call Paymob (outside transaction)
        $refund = OrderRefund::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'paymob_payment_id' => $payment->id,
            'type' => 'partial',
            'original_amount' => $itemRefundAmount,
            'penalty_percent' => 0,
            'penalty_amount' => 0,
            'refund_amount' => $itemRefundAmount,
            'paymob_transaction_id' => $payment->paymob_transaction_id,
            'refund_method' => 'paymob',
            'status' => 'processing',
            'reason' => $reason,
            'initiated_by' => 'admin',
            'admin_id' => $adminId,
            'refunded_items' => $refundedItemsLog,
        ]);

        $paymobResult = $this->executePaymobRefund($payment, $amountCents, $refund);

        if (!$paymobResult['success']) {
            throw new Exception(
                'Refund could not be processed. Please try again later or contact support.'
            );
        }

        // Phase 3: Finalize DB updates
        try {
            $order->items()->whereIn('id', $itemIds)->update(['refunded' => true]);

            $totalRefunded = $alreadyRefunded + $itemRefundAmount;
            $paymentStatus = $totalRefunded >= (float) $order->total ? 'refunded' : 'partially_refunded';
            $order->update([
                'payment_status' => $paymentStatus,
                'refunded_amount' => $totalRefunded,
                'refund_reason' => $reason,
                'refunded_by' => $adminId,
            ]);

            $this->notifyCustomer($order, $itemRefundAmount, 'partial');
        } catch (\Exception $e) {
            Log::critical('[PARTIAL REFUND] DB update failed after Paymob success', [
                'order_id' => $order->id,
                'refund_id' => $refund->id,
                'error' => $e->getMessage(),
            ]);
        }

        Log::info('✅ [PARTIAL REFUND] Completed', [
            'order_id' => $order->id,
            'items_refunded' => $itemIds,
            'amount' => $itemRefundAmount,
        ]);

        return [
            'success' => true,
            'message' => "Partial refund of {$itemRefundAmount} EGP processed successfully.",
            'refund' => [
                'id' => $refund->id,
                'type' => 'partial',
                'amount' => $itemRefundAmount,
                'items' => $refundedItemsLog,
                'status' => 'completed',
            ],
            'order' => $order->fresh(['items.product', 'refunds']),
        ];
    }

    /**
     * Check if an order can be cancelled and return details.
     *
     * Used by the frontend to show appropriate UI (button state + message).
     */
    public function getCancellationEligibility(Order $order): array
    {
        $isCod = $order->payment_method === 'cash_on_delivery';
        $config = config('payments.cancellation');

        if (in_array($order->status, ['cancelled', 'failed'])) {
            return [
                'can_cancel' => false,
                'reason' => 'This order has already been cancelled.',
                'refund_type' => null,
                'refund_percent' => 0,
                'penalty_percent' => 0,
            ];
        }

        if ($isCod) {
            $canCancel = in_array($order->status, $config['cod_cancel_statuses']);
            return [
                'can_cancel' => $canCancel,
                'reason' => $canCancel
                    ? 'Order will be cancelled and items restocked.'
                    : $this->getBlockedMessage($order->status, true),
                'refund_type' => 'none',
                'refund_percent' => 0,
                'penalty_percent' => 0,
            ];
        }

        // Card payment
        if (in_array($order->status, $config['full_refund_statuses'])) {
            return [
                'can_cancel' => true,
                'reason' => 'Full refund will be processed to your card. Refunds typically take 5-14 business days.',
                'refund_type' => 'full',
                'refund_percent' => 100,
                'penalty_percent' => 0,
            ];
        }

        if (in_array($order->status, $config['penalty_refund_statuses'])) {
            $penalty = $config['penalty_percent'];
            $refundPercent = 100 - $penalty;
            $refundAmount = round((float) $order->total * ($refundPercent / 100), 2);
            return [
                'can_cancel' => true,
                'reason' => "A {$penalty}% preparation fee will be deducted. You will receive {$refundAmount} EGP ({$refundPercent}% of the order total) back to your card within 5-14 business days.",
                'refund_type' => 'penalty',
                'refund_percent' => $refundPercent,
                'penalty_percent' => $penalty,
                'estimated_refund' => $refundAmount,
            ];
        }

        // Blocked statuses
        return [
            'can_cancel' => false,
            'reason' => $this->getBlockedMessage($order->status, false),
            'refund_type' => null,
            'refund_percent' => 0,
            'penalty_percent' => 0,
        ];
    }

    /**
     * Get refund history for an order.
     */
    public function getRefundHistory(int $orderId): array
    {
        $refunds = OrderRefund::where('order_id', $orderId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $refunds->toArray();
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — Card Payment Cancellation Handlers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle cancellation for card-paid orders.
     *
     * Routes to full refund, penalty refund, or blocks based on status.
     */
    private function handleCardCancellation(
        Order $order,
        string $reason,
        string $initiatedBy = 'customer',
        ?int $adminId = null,
        ?float $overridePenaltyPercent = null
    ): array {
        $config = config('payments.cancellation');
        $status = $order->status;

        // ── CASE A: Full refund (before preparation) ──
        if (in_array($status, $config['full_refund_statuses'])) {
            return $this->processCardCancellationWithRefund(
                $order,
                $reason,
                0, // 0% penalty = 100% refund
                'full',
                $initiatedBy,
                $adminId
            );
        }

        // ── CASE B: Penalty refund (preparing — 14% deduction) ──
        if (in_array($status, $config['penalty_refund_statuses'])) {
            $penaltyPercent = $overridePenaltyPercent ?? $config['penalty_percent'];
            return $this->processCardCancellationWithRefund(
                $order,
                $reason,
                $penaltyPercent,
                'penalty',
                $initiatedBy,
                $adminId
            );
        }

        // ── CASE C: Blocked ──
        if (in_array($status, $config['blocked_statuses'])) {
            throw new Exception($this->getBlockedMessage($status, false));
        }

        // Should never reach here, but safety net
        throw new Exception('Order is in an unexpected status and cannot be cancelled.');
    }

    /**
     * Process card cancellation with Paymob refund (full or penalty).
     *
     * IMPORTANT: This method runs OUTSIDE a DB::transaction() for card payments.
     * Paymob API calls are non-reversible, so we must not wrap them in a
     * transaction that could roll back our refund audit records if a later
     * DB update fails.
     */
    private function processCardCancellationWithRefund(
        Order $order,
        string $reason,
        float $penaltyPercent,
        string $refundType,
        string $initiatedBy,
        ?int $adminId
    ): array {
        // Get successful payment
        $payment = $order->successfulPayment();

        if (!$payment || !$payment->isPaid()) {
            // Payment not completed yet — just cancel without refund
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);

            return [
                'success' => true,
                'message' => 'Order cancelled. No payment was completed, so no refund is needed.',
                'refund' => null,
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

        // Calculate amounts
        // Use the ACTUAL Paymob transaction amount as the ceiling,
        // because Paymob rejects refunds exceeding the charged amount.
        $originalAmount = (float) $order->total;
        $paymobMaxCents = $payment->amount_cents ?? (int) round($originalAmount * 100);
        $paymobMaxEgp = $paymobMaxCents / 100;

        $alreadyRefunded = OrderRefund::totalRefundedForOrder($order->id);
        $maxRefundable = min($originalAmount, $paymobMaxEgp) - $alreadyRefunded;

        if ($maxRefundable <= 0) {
            // Already fully refunded — just cancel the order without another refund
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);
            $order->update([
                'payment_status' => 'refunded',
                'refunded_at' => now(),
                'refund_reason' => $reason,
            ]);
            return [
                'success' => true,
                'message' => 'Order cancelled. A refund was already processed for this order.',
                'refund' => null,
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

        $penaltyAmount = round($originalAmount * ($penaltyPercent / 100), 2);
        $refundAmount = round($originalAmount - $penaltyAmount, 2);

        // Safety: don't refund more than what Paymob allows
        if ($refundAmount > $maxRefundable) {
            Log::warning('[REFUND] Capping refund amount to Paymob max', [
                'order_id' => $order->id,
                'calculated_refund' => $refundAmount,
                'paymob_max' => $paymobMaxEgp,
                'already_refunded' => $alreadyRefunded,
                'capped_to' => $maxRefundable,
            ]);
            $refundAmount = $maxRefundable;
        }

        $refundAmountCents = (int) round($refundAmount * 100);

        // ── Step 1: Create refund audit record (committed immediately, not in a
        //    transaction, so it survives even if later steps fail) ──
        $refund = OrderRefund::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'paymob_payment_id' => $payment->id,
            'type' => $refundType,
            'original_amount' => $originalAmount,
            'penalty_percent' => $penaltyPercent,
            'penalty_amount' => $penaltyAmount,
            'refund_amount' => $refundAmount,
            'paymob_transaction_id' => $payment->paymob_transaction_id,
            'refund_method' => 'paymob',
            'status' => 'processing',
            'reason' => $reason,
            'initiated_by' => $initiatedBy,
            'admin_id' => $adminId,
        ]);

        // ── Step 2: Call Paymob refund API ──
        $paymobResult = $this->executePaymobRefund($payment, $refundAmountCents, $refund);

        if (!$paymobResult['success']) {
            Log::error('[REFUND] Paymob refund failed — order NOT cancelled', [
                'order_id' => $order->id,
                'refund_id' => $refund->id,
                'refund_amount' => $refundAmount,
                'refund_amount_cents' => $refundAmountCents,
                'paymob_max_cents' => $paymobMaxCents,
                'raw_error' => $paymobResult['error'] ?? 'unknown',
            ]);

            throw new Exception(
                'Refund could not be processed. Please try again later or contact support.'
            );
        }

        // ── Step 3: Paymob succeeded — finalize DB updates (each individually
        //    so a failure in one doesn't prevent the others) ──
        try {
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);

            $totalRefunded = $alreadyRefunded + $refundAmount;
            $paymentStatus = $totalRefunded >= $originalAmount ? 'refunded' : 'partially_refunded';
            $order->update([
                'payment_status' => $paymentStatus,
                'refunded_amount' => $totalRefunded,
                'refunded_at' => now(),
                'refund_reason' => $reason,
                'refunded_by' => $adminId,
            ]);

            if ($paymentStatus === 'refunded') {
                $payment->markAsRefunded($paymobResult['refund_id']);
            }
        } catch (\Exception $e) {
            // DB update failed AFTER Paymob refund succeeded.
            // The refund record is already committed and marked completed.
            // Log the failure but don't throw — the money is already refunded.
            Log::critical('[REFUND] DB update failed AFTER successful Paymob refund!', [
                'order_id' => $order->id,
                'refund_id' => $refund->id,
                'refund_amount' => $refundAmount,
                'db_error' => $e->getMessage(),
            ]);

            // Best-effort: try to at least cancel the order
            try {
                $order->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'cancellation_reason' => $reason,
                    'payment_status' => 'refunded',
                ]);
            } catch (\Exception $innerE) {
                Log::critical('[REFUND] Even order cancel update failed', [
                    'order_id' => $order->id,
                    'error' => $innerE->getMessage(),
                ]);
            }
        }

        // Notify customer
        $this->notifyCustomer($order, $refundAmount, $refundType, $penaltyPercent);

        Log::info('✅ [CANCELLATION] Card order cancelled with refund', [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'refund_type' => $refundType,
            'original_amount' => $originalAmount,
            'penalty_percent' => $penaltyPercent,
            'penalty_amount' => $penaltyAmount,
            'refund_amount' => $refundAmount,
            'initiated_by' => $initiatedBy,
        ]);

        $message = $refundType === 'full'
            ? "Order cancelled. Full refund of {$refundAmount} EGP will appear on your card within 5-14 business days."
            : "Order cancelled. A {$penaltyPercent}% preparation fee was deducted. {$refundAmount} EGP will appear on your card within 5-14 business days.";

        return [
            'success' => true,
            'message' => $message,
            'refund' => [
                'id' => $refund->id,
                'type' => $refundType,
                'original_amount' => $originalAmount,
                'penalty_percent' => $penaltyPercent,
                'penalty_amount' => $penaltyAmount,
                'refund_amount' => $refundAmount,
                'status' => 'completed',
                'estimated_days' => '5-14 business days',
            ],
            'order' => $order->fresh(['items.product', 'refunds']),
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — COD Cancellation Handler
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle cancellation for COD orders.
     *
     * CASE A+B: Cancel before delivery → restock, no refund
     * CASE C: Out for delivery / Delivered → BLOCKED
     */
    private function handleCodCancellation(
        Order $order,
        string $reason,
        string $initiatedBy = 'customer',
        ?int $adminId = null
    ): array {
        $config = config('payments.cancellation');
        $status = $order->status;

        // ── CASE A+B: Cancellable ──
        if (in_array($status, $config['cod_cancel_statuses'])) {
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);

            // Notify customer
            $this->notifyCustomer($order, 0, 'cod_cancel');

            Log::info('✅ [CANCELLATION] COD order cancelled', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'previous_status' => $status,
                'initiated_by' => $initiatedBy,
            ]);

            return [
                'success' => true,
                'message' => 'Order cancelled successfully. No refund is needed for cash on delivery orders.',
                'refund' => null,
                'order' => $order->fresh(['items.product']),
            ];
        }

        // ── CASE C: Blocked ──
        if (in_array($status, $config['cod_blocked_statuses'])) {
            throw new Exception($this->getBlockedMessage($status, true));
        }

        throw new Exception('Order is in an unexpected status and cannot be cancelled.');
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — Paymob Refund Execution
    // ═══════════════════════════════════════════════════════════════

    /**
     * Execute Paymob refund and update the refund record.
     *
     * @return array{success: bool, refund_id: string|null, error: string|null}
     */
    private function executePaymobRefund(
        PaymobPayment $payment,
        int $amountCents,
        OrderRefund $refund
    ): array {
        try {
            $transactionId = $payment->paymob_transaction_id;

            if (!$transactionId) {
                $refund->markAsFailed('No Paymob transaction ID found on the payment record.');
                return ['success' => false, 'refund_id' => null, 'error' => 'Missing transaction ID'];
            }

            $result = $this->paymobService->refundTransaction($transactionId, $amountCents);

            if ($result['success']) {
                $refund->markAsCompleted($result['refund_id'], $result['response']);
                return [
                    'success' => true,
                    'refund_id' => $result['refund_id'],
                    'error' => null,
                ];
            } else {
                // Store the full error for DB audit trail
                $rawErrorMsg = $result['response']['message']
                    ?? $result['response']['detail']
                    ?? 'Paymob refund rejected';
                $refund->markAsFailed($rawErrorMsg, $result['response']);

                // Log full raw error for debugging
                Log::error('[REFUND] Paymob returned failure', [
                    'transaction_id' => $transactionId,
                    'amount_cents' => $amountCents,
                    'raw_error' => $rawErrorMsg,
                    'full_response' => $result['response'],
                ]);

                // Return a sanitized error — never expose raw Paymob JSON
                return [
                    'success' => false,
                    'refund_id' => null,
                    'error' => 'Payment gateway rejected the refund request.',
                ];
            }
        } catch (Exception $e) {
            Log::error('[REFUND] Exception during executePaymobRefund', [
                'transaction_id' => $transactionId,
                'amount_cents' => $amountCents,
                'exception' => $e->getMessage(),
            ]);
            $refund->markAsFailed($e->getMessage());
            return [
                'success' => false,
                'refund_id' => null,
                'error' => 'Payment gateway error. Please try again.',
            ];
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — Shared Helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update order record to cancelled status.
     */
    private function cancelOrderRecord(Order $order, string $reason): void
    {
        $order->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    /**
     * Restore stock for all order items.
     */
    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product) {
                $item->product->increment('stock_quantity', $item->quantity);
                $item->product->decrement('sales_count', $item->quantity);
            }
        }

        Log::info('📦 [STOCK] Restored stock for cancelled order', [
            'order_id' => $order->id,
            'items_count' => $order->items->count(),
        ]);
    }

    /**
     * Rollback promo usage if applicable.
     */
    private function rollbackPromo(Order $order): void
    {
        try {
            $this->orderService->rollbackPromoUsage($order);
        } catch (Exception $e) {
            Log::warning('Failed to rollback promo usage', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send push notification to customer about cancellation/refund.
     */
    private function notifyCustomer(
        Order $order,
        float $refundAmount,
        string $type,
        float $penaltyPercent = 0
    ): void {
        try {
            $message = match ($type) {
                'full' => "Your order #{$order->order_number} has been cancelled. A full refund of {$refundAmount} EGP will be processed to your card within 5-14 business days.",
                'penalty' => "Your order #{$order->order_number} has been cancelled. After a {$penaltyPercent}% preparation fee, {$refundAmount} EGP will be refunded to your card within 5-14 business days.",
                'partial' => "A partial refund of {$refundAmount} EGP for order #{$order->order_number} has been processed to your card.",
                'cod_cancel' => "Your order #{$order->order_number} has been cancelled successfully.",
                default => "Your order #{$order->order_number} has been cancelled.",
            };

            $this->pushNotificationService->sendRefundNotification(
                $order->user_id,
                $order->order_number,
                $refundAmount,
                $type
            );
        } catch (Exception $e) {
            Log::warning('Failed to send cancellation notification', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get user-friendly blocked message for a given status.
     */
    private function getBlockedMessage(string $status, bool $isCod): string
    {
        return match ($status) {
            'out_for_delivery' => 'Your order is already out for delivery and cannot be cancelled. Please refuse the delivery or contact our support team.',
            'delivered' => 'This order has been delivered and cannot be cancelled. Please contact support for returns.',
            'cancelled' => 'This order has already been cancelled.',
            'failed' => 'This order has already failed.',
            default => 'This order cannot be cancelled in its current status.',
        };
    }
}
