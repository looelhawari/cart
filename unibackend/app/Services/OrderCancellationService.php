<?php

namespace App\Services;

use App\Mail\RefundReceiptMail;
use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\PaymobPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Exception;

/**
 * OrderCancellationService — Enterprise-grade order cancellation with Paymob refund.
 *
 * ARCHITECTURE:
 *   Phase 1 (inside DB::transaction + lockForUpdate):
 *     - Validate order, check race condition, set status = 'cancelling'
 *   Phase 2 (outside transaction):
 *     - Create refund record + call Paymob API (non-reversible)
 *   Phase 3 (try/catch best-effort):
 *     - Finalize DB updates, restore stock, rollback promo, notify + email
 *
 * FEATURES:
 *   - Race condition guard via 'cancelling' transient status
 *   - Idempotency key per refund attempt
 *   - Rate limiting (1 cancel per order per 30 seconds)
 *   - Sales_count negative protection
 *   - Predefined cancellation reasons
 *   - Email refund receipt
 *   - Customer partial item cancel
 *   - Refund webhook reconciliation support
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

    /**
     * Predefined cancellation reasons for the frontend dropdown.
     * Each reason has an id, label (English), and label_ar (Arabic).
     */
    public const CANCELLATION_REASONS = [
        ['id' => 'ordered_by_mistake', 'label' => 'Ordered by mistake', 'label_ar' => 'طلبت بالخطأ'],
        ['id' => 'duplicate_order', 'label' => 'Duplicate order', 'label_ar' => 'طلب مكرر'],
        ['id' => 'delivery_too_long', 'label' => 'Delivery time is too long', 'label_ar' => 'وقت التوصيل طويل'],
        ['id' => 'wrong_items', 'label' => 'Ordered wrong items', 'label_ar' => 'طلبت منتجات خاطئة'],
        ['id' => 'wrong_address', 'label' => 'Wrong delivery address', 'label_ar' => 'عنوان التوصيل خاطئ'],
        ['id' => 'payment_issue', 'label' => 'Payment issue', 'label_ar' => 'مشكلة في الدفع'],
        ['id' => 'other', 'label' => 'Other reason', 'label_ar' => 'سبب آخر'],
    ];

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
     * Get predefined cancellation reasons for the frontend dropdown.
     */
    public function getCancellationReasons(): array
    {
        return self::CANCELLATION_REASONS;
    }

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
        // ── Rate limiting: 1 cancel per order per 30 seconds ──
        $rateLimitKey = "cancel_order:{$orderId}:{$userId}";
        if (RateLimiter::tooManyAttempts($rateLimitKey, 1)) {
            $retryAfter = RateLimiter::availableIn($rateLimitKey);
            throw new Exception(__('order.wait_before_cancel', ['seconds' => $retryAfter]));
        }
        RateLimiter::hit($rateLimitKey, 30);

        // Phase 1: Validate + lock + set 'cancelling' (inside transaction)
        [$order, $previousStatus] = DB::transaction(function () use ($orderId, $userId) {
            $order = Order::where('id', $orderId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'cancelling') {
                throw new Exception(__('order.already_cancelling'));
            }

            if (in_array($order->status, ['cancelled', 'failed'])) {
                throw new Exception(__('order.already_cancelled_or_failed'));
            }

            // Capture the real status BEFORE setting cancelling
            $previousStatus = $order->status;

            // ── Race condition guard: set transient 'cancelling' status ──
            $order->update(['status' => 'cancelling']);

            return [$order, $previousStatus];
        });

        try {
            // Phase 2: Execute (outside transaction so Paymob call can't cause rollback)
            $isCod = Order::isOnDeliveryPayment($order->payment_method);

            if ($isCod) {
                return DB::transaction(fn() => $this->handleCodCancellation($order->fresh(), $reason, 'customer', null, $previousStatus));
            } else {
                return $this->handleCardCancellation($order->fresh(), $reason, 'customer', null, null, $previousStatus);
            }
        } catch (\Exception $e) {
            // If Phase 2 fails, revert the 'cancelling' status back
            $this->revertCancellingStatus($order, $previousStatus);
            throw $e;
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
        // Phase 1: Validate + lock + set 'cancelling'
        [$order, $previousStatus] = DB::transaction(function () use ($orderId) {
            $order = Order::where('id', $orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'delivered') {
                throw new Exception(__('order.cannot_cancel_delivered'));
            }

            if ($order->status === 'cancelling') {
                throw new Exception(__('order.already_cancelling'));
            }

            if (in_array($order->status, ['cancelled', 'failed'])) {
                throw new Exception(__('order.already_cancelled_or_failed'));
            }

            $previousStatus = $order->status;
            $order->update(['status' => 'cancelling']);

            return [$order, $previousStatus];
        });

        try {
            // Phase 2: Execute (outside transaction for card payments)
            $isCod = Order::isOnDeliveryPayment($order->payment_method);

            if ($isCod) {
                return DB::transaction(fn() => $this->handleCodCancellation($order->fresh(), $reason, 'admin', $adminId, $previousStatus));
            } else {
                return $this->handleCardCancellation($order->fresh(), $reason, 'admin', $adminId, $overridePenaltyPercent, $previousStatus);
            }
        } catch (\Exception $e) {
            $this->revertCancellingStatus($order, $previousStatus);
            throw $e;
        }
    }

    /**
     * Partial item refund for a card-paid order.
     *
     * Supports both admin and customer-initiated partial refunds.
     * Refunds the exact amount for specific items.
     * Prevents over-refund by checking already-refunded total.
     */
    public function partialItemRefund(
        int $orderId,
        array $itemIds,
        string $reason,
        ?int $adminId = null,
        string $initiatedBy = 'admin'
    ): array {
        // Phase 1: Validate inside transaction
        [$order, $payment, $items, $itemRefundAmount, $amountCents, $alreadyRefunded, $refundedItemsLog] =
            DB::transaction(function () use ($orderId, $itemIds, $initiatedBy) {
                $order = Order::where('id', $orderId)
                    ->lockForUpdate()
                    ->with('items')
                    ->firstOrFail();

                // Customer can only partial-refund confirmed/preparing/delivered orders
                if ($initiatedBy === 'customer') {
                    if (!in_array($order->status, ['confirmed', 'preparing', 'delivered'])) {
                        throw new Exception(__('order.partial_refund_status_error'));
                    }
                }

                if (Order::isOnDeliveryPayment($order->payment_method)) {
                    throw new Exception(__('order.partial_refund_card_only'));
                }

                $payment = $order->successfulPayment();
                if (!$payment || !$payment->isPaid()) {
                    throw new Exception(__('order.no_payment_found'));
                }

                $items = $order->items()->whereIn('id', $itemIds)->where('refunded', false)->get();
                if ($items->isEmpty()) {
                    throw new Exception(__('order.no_valid_items'));
                }

                $itemRefundAmount = $items->sum('subtotal');
                $amountCents = (int) round($itemRefundAmount * 100);

                $alreadyRefunded = OrderRefund::totalRefundedForOrder($orderId);

                $paymobMaxCents = $payment->amount_cents ?? (int) round((float) $order->total * 100);
                $paymobMaxEgp = $paymobMaxCents / 100;
                $maxRefundable = min((float) $order->total, $paymobMaxEgp) - $alreadyRefunded;

                if ($itemRefundAmount > $maxRefundable) {
                    throw new Exception(
                        __('order.refund_exceeds_max', [
                            'amount' => $itemRefundAmount,
                            'max' => $maxRefundable,
                        ])
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

        // ── Idempotency check ──
        $idempotencyKey = $this->generateIdempotencyKey($order->id, 'partial', $amountCents);
        $existingRefund = OrderRefund::where('idempotency_key', $idempotencyKey)
            ->whereIn('status', ['processing', 'completed'])
            ->first();

        if ($existingRefund) {
            Log::warning('[PARTIAL REFUND] Idempotent duplicate blocked', [
                'order_id' => $order->id,
                'idempotency_key' => $idempotencyKey,
                'existing_refund_id' => $existingRefund->id,
            ]);
            return [
                'success' => true,
                'message' => __('order.refund_already_processed'),
                'refund' => [
                    'id' => $existingRefund->id,
                    'type' => $existingRefund->type,
                    'amount' => $existingRefund->refund_amount,
                    'items' => $existingRefund->refunded_items,
                    'status' => $existingRefund->status,
                ],
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

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
            'initiated_by' => $initiatedBy,
            'admin_id' => $adminId,
            'refunded_items' => $refundedItemsLog,
            'idempotency_key' => $idempotencyKey,
        ]);

        $paymobResult = $this->executePaymobRefund($payment, $amountCents, $refund);

        if (!$paymobResult['success']) {
            throw new Exception(
                __('order.refund_processing_failed')
            );
        }

        // Phase 3: Finalize DB updates.
        //
        // SECURITY/MONEY HARDENED (audit C9 — swallow-and-return-success):
        // The previous version caught DB exceptions here, logged critical, and
        // STILL returned `success: true`. That meant Paymob had refunded but
        // the DB showed items not marked refunded, stock not restored, and the
        // OrderRefund row would never be reconciled. The caller would tell the
        // customer "refund completed" while leaving the system inconsistent.
        //
        // Now: any Phase-3 failure flips the OrderRefund row to
        // `requires_reconciliation` and re-throws so the caller surfaces a
        // 202-style "partial success — reconciliation pending" path instead of
        // a misleading "completed". The Paymob refund itself is irreversible
        // and the audit row remains in the DB; an operator (or a cron job
        // querying OrderRefund::where('status','requires_reconciliation')) can
        // finish the post-refund bookkeeping.
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

            // Restore stock for refunded items
            $this->restoreStockForItems($items);

            $this->notifyCustomer($order, $itemRefundAmount, 'partial');
            $this->sendRefundEmail($order, $refund, 'partial', $itemRefundAmount);
        } catch (\Throwable $e) {
            Log::critical('[PARTIAL REFUND] DB update failed AFTER Paymob success — needs reconciliation', [
                'order_id'  => $order->id,
                'refund_id' => $refund->id,
                'error'     => $e->getMessage(),
            ]);
            try {
                // The order_refunds.status enum doesn't include
                // 'requires_reconciliation'. Park as 'failed' with a
                // tagged failure_reason so an operator/cron can grep
                // failure_reason starting with paymob_ok_db_failed:
                // to find rows that need manual money-side reconciliation.
                $refund->markAsFailed(
                    'paymob_ok_db_failed: ' . substr($e->getMessage(), 0, 200),
                );
            } catch (\Throwable $inner) {
                Log::critical('[PARTIAL REFUND] Could not even flag refund for reconciliation', [
                    'refund_id' => $refund->id,
                    'error'     => $inner->getMessage(),
                ]);
            }
            // Re-throw so the caller returns 5xx / 422 instead of "success".
            throw new Exception(__('order.refund_pending_reconciliation'));
        }

        Log::info('✅ [PARTIAL REFUND] Completed', [
            'order_id' => $order->id,
            'items_refunded' => $itemIds,
            'amount' => $itemRefundAmount,
            'initiated_by' => $initiatedBy,
        ]);

        return [
            'success' => true,
            'message' => __('order.partial_refund_success', ['amount' => $itemRefundAmount, 'currency' => $order->currency ?? 'EGP']),
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
     * Customer-initiated partial item cancel/refund.
     *
     * Allows customers to cancel specific items from confirmed/preparing orders
     * without cancelling the entire order.
     */
    public function customerPartialItemCancel(
        int $orderId,
        int $userId,
        array $itemIds,
        string $reason
    ): array {
        // Verify ownership
        $order = Order::where('id', $orderId)
            ->where('user_id', $userId)
            ->firstOrFail();

        // Rate limiting
        $rateLimitKey = "partial_cancel:{$orderId}:{$userId}";
        if (RateLimiter::tooManyAttempts($rateLimitKey, 2)) {
            $retryAfter = RateLimiter::availableIn($rateLimitKey);
            throw new Exception(__('order.wait_before_cancel', ['seconds' => $retryAfter]));
        }
        RateLimiter::hit($rateLimitKey, 30);

        // Route to COD-specific handler for any pay-on-delivery method (cash or card machine)
        if (Order::isOnDeliveryPayment($order->payment_method)) {
            return $this->codPartialItemCancel($orderId, $itemIds, $reason, null, 'customer');
        }

        return $this->partialItemRefund($orderId, $itemIds, $reason, null, 'customer');
    }

    /**
     * COD partial item cancel — no payment refund needed.
     *
     * Marks selected items as cancelled/refunded, restocks them,
     * updates order totals, and creates an audit refund record.
     * No Paymob API calls are needed since no payment was made.
     */
    public function codPartialItemCancel(
        int $orderId,
        array $itemIds,
        string $reason,
        ?int $adminId = null,
        string $initiatedBy = 'admin'
    ): array {
        [$order, $items, $itemCancelAmount, $refundedItemsLog] =
            DB::transaction(function () use ($orderId, $itemIds, $reason, $initiatedBy) {
                $order = Order::where('id', $orderId)
                    ->lockForUpdate()
                    ->with('items')
                    ->firstOrFail();

                if (!Order::isOnDeliveryPayment($order->payment_method)) {
                    throw new Exception(__('order.cod_only_method'));
                }

                if ($initiatedBy === 'customer') {
                    if (!in_array($order->status, ['pending', 'confirmed', 'preparing'])) {
                        throw new Exception(__('order.cod_cancel_status_error'));
                    }
                }

                $items = $order->items()->whereIn('id', $itemIds)->where('refunded', false)->get();
                if ($items->isEmpty()) {
                    throw new Exception(__('order.no_valid_items_cancel'));
                }

                // Ensure at least one item remains active
                $activeItems = $order->items()->where('refunded', false)->count();
                if ($items->count() >= $activeItems) {
                    throw new Exception(__('order.cannot_cancel_all_items'));
                }

                $itemCancelAmount = $items->sum('subtotal');

                $refundedItemsLog = $items->map(fn($item) => [
                    'item_id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'amount' => $item->subtotal,
                ])->toArray();

                // Mark items as refunded
                $order->items()->whereIn('id', $itemIds)->update(['refunded' => true]);

                // Update order totals
                $alreadyCancelled = OrderRefund::where('order_id', $orderId)
                    ->whereIn('status', ['completed'])
                    ->sum('refund_amount');
                $totalCancelled = $alreadyCancelled + $itemCancelAmount;

                // MONEY HARDENED (audit C10):
                // Previously this only updated `refunded_amount`. For a COD
                // partial cancel the driver still saw the ORIGINAL `total`
                // and would ask the customer to pay cash for the cancelled
                // items too. Recompute subtotal/total from the remaining
                // (still-active) items so the driver and customer see the
                // correct amount owed.
                $remainingSubtotal = (float) $order->items()
                    ->where('refunded', false)
                    ->sum('subtotal');
                $newTotal = max(
                    0.0,
                    $remainingSubtotal
                        + (float) $order->delivery_fee
                        - (float) $order->discount
                        + (float) $order->tax,
                );

                $order->update([
                    'subtotal'        => $remainingSubtotal,
                    'total'           => $newTotal,
                    'refunded_amount' => $totalCancelled,
                    'refund_reason'   => $reason,
                ]);

                return [$order, $items, $itemCancelAmount, $refundedItemsLog];
            });

        // Create audit refund record (no actual payment refund)
        $refund = OrderRefund::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'type' => 'partial',
            'original_amount' => $itemCancelAmount,
            'penalty_percent' => 0,
            'penalty_amount' => 0,
            'refund_amount' => $itemCancelAmount,
            'refund_method' => 'none',
            'status' => 'completed',
            'reason' => $reason,
            'initiated_by' => $initiatedBy,
            'admin_id' => $adminId,
            'refunded_items' => $refundedItemsLog,
            'completed_at' => now(),
        ]);

        // Restore stock
        $this->restoreStockForItems($items);

        // Notify customer
        $this->notifyCustomer($order, $itemCancelAmount, 'partial');

        Log::info('✅ [COD PARTIAL CANCEL] Completed', [
            'order_id' => $order->id,
            'items_cancelled' => $itemIds,
            'amount_removed' => $itemCancelAmount,
            'initiated_by' => $initiatedBy,
        ]);

        return [
            'success' => true,
            'message' => __('order.items_cancelled_success', ['amount' => $itemCancelAmount, 'currency' => $order->currency ?? 'EGP']),
            'refund' => [
                'id' => $refund->id,
                'type' => 'partial',
                'amount' => $itemCancelAmount,
                'refund_amount' => $itemCancelAmount,
                'items' => $refundedItemsLog,
                'status' => 'completed',
                'refund_method' => 'none',
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
        $isCod = Order::isOnDeliveryPayment($order->payment_method);
        $config = config('payments.cancellation');

        if (in_array($order->status, ['cancelled', 'failed'])) {
            return [
                'can_cancel' => false,
                'reason' => __('order.eligibility_already_cancelled'),
                'refund_type' => null,
                'refund_percent' => 0,
                'penalty_percent' => 0,
                'can_partial_cancel' => false,
            ];
        }

        if ($order->status === 'cancelling') {
            return [
                'can_cancel' => false,
                'reason' => __('order.eligibility_currently_cancelling'),
                'refund_type' => null,
                'refund_percent' => 0,
                'penalty_percent' => 0,
                'can_partial_cancel' => false,
            ];
        }

        // Check partial item cancel eligibility for all payment methods
        $canPartialCancel = $isCod
            ? in_array($order->status, ['pending', 'confirmed', 'preparing'])
                && $order->items()->where('refunded', false)->count() > 1
            : in_array($order->status, ['confirmed', 'preparing', 'delivered'])
                && $order->successfulPayment();

        if ($isCod) {
            $canCancel = in_array($order->status, $config['cod_cancel_statuses']);
            return [
                'can_cancel' => $canCancel,
                'reason' => $canCancel
                    ? __('order.eligibility_cod_can_cancel')
                    : $this->getBlockedMessage($order->status, true),
                'refund_type' => 'none',
                'refund_percent' => 0,
                'penalty_percent' => 0,
                'can_partial_cancel' => $canPartialCancel,
            ];
        }

        // Card payment
        // Calculate how much has already been refunded (partial item cancels)
        $alreadyRefunded = OrderRefund::totalRefundedForOrder($order->id);

        if (in_array($order->status, $config['full_refund_statuses'])) {
            $payment = $order->successfulPayment();
            $maxPayable = $payment
                ? min((float) $order->total, ($payment->amount_cents / 100))
                : (float) $order->total;
            $estimatedRefund = max(0, $maxPayable - $alreadyRefunded);

            $estimatedDays = __('order.estimated_days');
            $reason = $alreadyRefunded > 0
                ? __('order.eligibility_full_refund_with_previous', ['estimated' => $estimatedRefund, 'already' => $alreadyRefunded, 'days' => $estimatedDays])
                : __('order.eligibility_full_refund', ['days' => $estimatedDays]);

            return [
                'can_cancel' => true,
                'reason' => $reason,
                'refund_type' => 'full',
                'refund_percent' => 100,
                'penalty_percent' => 0,
                'estimated_refund' => round($estimatedRefund, 2),
                'can_partial_cancel' => $canPartialCancel,
            ];
        }

        if (in_array($order->status, $config['penalty_refund_statuses'])) {
            $penalty = $config['penalty_percent'];
            $refundPercent = 100 - $penalty;

            $payment = $order->successfulPayment();
            $maxPayable = $payment
                ? min((float) $order->total, ($payment->amount_cents / 100))
                : (float) $order->total;
            $remainingAmount = max(0, $maxPayable - $alreadyRefunded);
            $penaltyAmount = round($remainingAmount * ($penalty / 100), 2);
            $refundAmount = round($remainingAmount - $penaltyAmount, 2);

            $estimatedDays = __('order.estimated_days');
            $reason = $alreadyRefunded > 0
                ? __('order.eligibility_penalty_refund_with_previous', ['penalty' => $penalty, 'refund' => $refundAmount, 'percent' => $refundPercent, 'remaining' => $remainingAmount, 'days' => $estimatedDays])
                : __('order.eligibility_penalty_refund', ['penalty' => $penalty, 'refund' => $refundAmount, 'percent' => $refundPercent, 'days' => $estimatedDays]);

            return [
                'can_cancel' => true,
                'reason' => $reason,
                'refund_type' => 'penalty',
                'refund_percent' => $refundPercent,
                'penalty_percent' => $penalty,
                'estimated_refund' => $refundAmount,
                'can_partial_cancel' => $canPartialCancel,
            ];
        }

        // Blocked statuses
        return [
            'can_cancel' => false,
            'reason' => $this->getBlockedMessage($order->status, false),
            'refund_type' => null,
            'refund_percent' => 0,
            'penalty_percent' => 0,
            'can_partial_cancel' => $canPartialCancel,
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
     * Routes to full refund, penalty refund, or blocks based on the PREVIOUS status
     * (captured before setting 'cancelling' in Phase 1).
     */
    private function handleCardCancellation(
        Order $order,
        string $reason,
        string $initiatedBy = 'customer',
        ?int $adminId = null,
        ?float $overridePenaltyPercent = null,
        ?string $previousStatus = null
    ): array {
        $config = config('payments.cancellation');
        $status = $previousStatus ?? $order->status;

        // If no payment completed, just cancel without refund
        $payment = $order->successfulPayment();
        if (!$payment || !$payment->isPaid()) {
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);
            return [
                'success' => true,
                'message' => __('order.no_payment_no_refund'),
                'refund' => null,
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

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

        // Admin can force-cancel any non-blocked status with full refund
        if ($initiatedBy === 'admin') {
            return $this->processCardCancellationWithRefund(
                $order,
                $reason,
                $overridePenaltyPercent ?? 0,
                $overridePenaltyPercent ? 'penalty' : 'full',
                $initiatedBy,
                $adminId
            );
        }

        throw new Exception(__('order.unexpected_status_cancel'));
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
                'message' => __('order.no_payment_no_refund'),
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
                'message' => __('order.refund_already_done'),
                'refund' => null,
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

        // Calculate penalty on the REMAINING amount (after any previous partial refunds)
        $remainingAmount = max(0, min($originalAmount, $paymobMaxEgp) - $alreadyRefunded);
        $penaltyAmount = round($remainingAmount * ($penaltyPercent / 100), 2);
        $refundAmount = round($remainingAmount - $penaltyAmount, 2);

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

        // ── Idempotency check ──
        $idempotencyKey = $this->generateIdempotencyKey($order->id, $refundType, $refundAmountCents);
        $existingRefund = OrderRefund::where('idempotency_key', $idempotencyKey)
            ->whereIn('status', ['processing', 'completed'])
            ->first();

        if ($existingRefund) {
            Log::warning('[REFUND] Idempotent duplicate blocked', [
                'order_id' => $order->id,
                'idempotency_key' => $idempotencyKey,
                'existing_refund_id' => $existingRefund->id,
            ]);
            // Still cancel the order since the refund already went through
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);

            return [
                'success' => true,
                'message' => __('order.refund_already_processed_cancel'),
                'refund' => [
                    'id' => $existingRefund->id,
                    'type' => $existingRefund->type,
                    'original_amount' => $existingRefund->original_amount,
                    'penalty_percent' => $existingRefund->penalty_percent,
                    'penalty_amount' => $existingRefund->penalty_amount,
                    'refund_amount' => $existingRefund->refund_amount,
                    'status' => $existingRefund->status,
                    'estimated_days' => __('order.estimated_days'),
                ],
                'order' => $order->fresh(['items.product', 'refunds']),
            ];
        }

        // ── Step 1: Create refund audit record ──
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
            'idempotency_key' => $idempotencyKey,
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
                __('order.refund_processing_failed')
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
        $this->sendRefundEmail($order, $refund, $refundType, $refundAmount, $penaltyAmount, $penaltyPercent);

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
            ? __('order.full_refund_success', ['amount' => $refundAmount, 'currency' => $order->currency ?? 'EGP'])
            : __('order.penalty_refund_success', ['amount' => $refundAmount, 'currency' => $order->currency ?? 'EGP', 'penalty' => $penaltyPercent]);

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
                'estimated_days' => __('order.estimated_days'),
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
     *
     * @param string $previousStatus The status before 'cancelling' was set (race condition guard)
     */
    private function handleCodCancellation(
        Order $order,
        string $reason,
        string $initiatedBy = 'customer',
        ?int $adminId = null,
        string $previousStatus = ''
    ): array {
        $config = config('payments.cancellation');
        $status = $previousStatus ?: $order->status;

        // ── CASE A+B: Cancellable ──
        if (in_array($status, $config['cod_cancel_statuses'])) {
            $this->cancelOrderRecord($order, $reason);
            $this->restoreStock($order);
            $this->rollbackPromo($order);

            // Notify customer + send email receipt
            $this->notifyCustomer($order, 0, 'cod_cancel');
            $this->sendRefundEmail($order, null, 'cod_cancel', 0, 0, 0);

            Log::info('✅ [CANCELLATION] COD order cancelled', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'previous_status' => $status,
                'initiated_by' => $initiatedBy,
            ]);

            return [
                'success' => true,
                'message' => __('order.cod_cancelled_no_refund'),
                'refund' => null,
                'order' => $order->fresh(['items.product']),
            ];
        }

        // ── CASE C: Blocked ──
        if (in_array($status, $config['cod_blocked_statuses'])) {
            throw new Exception($this->getBlockedMessage($status, true));
        }

        throw new Exception(__('order.unexpected_status_cancel'));
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
     * Restore stock for all order items with sales_count negative protection.
     */
    private function restoreStock(Order $order): void
    {
        foreach ($order->items as $item) {
            if ($item->product) {
                $item->product->increment('stock_quantity', $item->quantity);

                // Negative protection: never decrement sales_count below 0
                $currentSalesCount = (int) ($item->product->sales_count ?? 0);
                $decrementBy = min($item->quantity, $currentSalesCount);
                if ($decrementBy > 0) {
                    $item->product->decrement('sales_count', $decrementBy);
                }
            }
        }

        Log::info('📦 [STOCK] Restored stock for cancelled order', [
            'order_id' => $order->id,
            'items_count' => $order->items->count(),
        ]);
    }

    /**
     * Restore stock for specific items (used by partial item refund).
     */
    private function restoreStockForItems(iterable $items): void
    {
        foreach ($items as $item) {
            if ($item->product) {
                $item->product->increment('stock_quantity', $item->quantity);

                $currentSalesCount = (int) ($item->product->sales_count ?? 0);
                $decrementBy = min($item->quantity, $currentSalesCount);
                if ($decrementBy > 0) {
                    $item->product->decrement('sales_count', $decrementBy);
                }
            }
        }
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
            'out_for_delivery' => __('order.blocked_out_for_delivery'),
            'delivered' => __('order.blocked_delivered'),
            'cancelled' => __('order.blocked_already_cancelled'),
            'failed' => __('order.blocked_already_failed'),
            default => __('order.blocked_default'),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE — Enterprise Helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Revert order from 'cancelling' back to its previous status.
     * Called when Phase 2 (Paymob API / COD logic) fails.
     */
    private function revertCancellingStatus(Order $order, string $previousStatus): void
    {
        try {
            if ($order->status === 'cancelling') {
                $order->update(['status' => $previousStatus]);
                Log::info('[REVERT] Reverted cancelling status', [
                    'order_id' => $order->id,
                    'reverted_to' => $previousStatus,
                ]);
            }
        } catch (\Exception $e) {
            Log::critical('[REVERT] Failed to revert cancelling status', [
                'order_id' => $order->id,
                'previous_status' => $previousStatus,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send refund receipt email to customer (queued).
     */
    private function sendRefundEmail(
        Order $order,
        ?OrderRefund $refund,
        string $refundType,
        float $refundAmount,
        float $penaltyAmount = 0,
        float $penaltyPercent = 0
    ): void {
        try {
            $user = $order->user;
            if (!$user || !$user->email) {
                Log::info('[EMAIL] Skipped refund email — no user email', ['order_id' => $order->id]);
                return;
            }

            Mail::to($user->email)->queue(
                new RefundReceiptMail(
                    order: $order,
                    refund: $refund,
                    refundType: $refundType,
                    refundAmount: $refundAmount,
                    penaltyAmount: $penaltyAmount,
                    penaltyPercent: $penaltyPercent
                )
            );

            Log::info('[EMAIL] Refund receipt queued', [
                'order_id' => $order->id,
                'email' => $user->email,
                'type' => $refundType,
            ]);
        } catch (\Exception $e) {
            // Email failure should never block the refund flow
            Log::warning('[EMAIL] Failed to queue refund receipt', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Generate a deterministic idempotency key for refund deduplication.
     *
     * Delegates to OrderRefund::idempotencyKey so RefundService and this
     * service share one canonical shape — refunds routed through either
     * service will hit the same uniquely-indexed row and cannot
     * double-charge Paymob.
     */
    private function generateIdempotencyKey(int $orderId, string $type, int $amountCents): string
    {
        return \App\Models\OrderRefund::idempotencyKey($orderId, $type, $amountCents);
    }
}
