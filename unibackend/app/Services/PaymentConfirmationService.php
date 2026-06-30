<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\PaymobPayment;
use App\Jobs\ProcessOrderAsync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * P1 REFACTOR: Centralised payment confirmation logic.
 *
 * The 5-step "payment confirmed" sequence was copy-pasted in:
 *  - PaymentController::processedCallback()  (webhook)
 *  - ReconcilePendingPayments::reconcilePayment() (cron job)
 *
 * This service is the SINGLE SOURCE OF TRUTH for confirming a payment.
 * Both the webhook and the reconciliation job now call this method.
 *
 * Steps performed atomically (caller must wrap in DB::transaction + lockForUpdate):
 *  1. markAsPaid() — state machine PENDING→PAID
 *  2. PaymentTransaction::updateOrCreate() — legacy audit table
 *  3. Order update — payment_status=completed, status=confirmed
 *  4. Cart clear + promo finalization
 *  5. ProcessOrderAsync dispatch — notifications, analytics
 */
class PaymentConfirmationService
{
    private CartService $cartService;
    private OrderService $orderService;

    public function __construct(CartService $cartService, OrderService $orderService)
    {
        $this->cartService = $cartService;
        $this->orderService = $orderService;
    }

    /**
     * Confirm a successful, captured payment.
     *
     * PREREQUISITES (caller must ensure):
     *  - HMAC verified (webhook) or server-to-server verified (reconciliation)
     *  - success === true && is_capture === true
     *  - Amount + currency validated against PaymobPayment record
     *  - Row locked via lockForUpdate() inside DB::transaction
     *  - Payment is still PENDING (idempotency check passed)
     *
     * @param PaymobPayment $payment   Locked payment record
     * @param string        $transactionId  Paymob transaction ID
     * @param array         $gatewayResponse  Full Paymob payload
     * @param string        $source  'webhook' | 'reconciliation' — for logging
     */
    public function confirmPayment(
        PaymobPayment $payment,
        string $transactionId,
        array $gatewayResponse,
        string $source = 'webhook'
    ): void {
        $order = $payment->order;

        // 1. State machine: PENDING → PAID
        $payment->markAsPaid($transactionId, $gatewayResponse);

        // 2. Legacy audit trail
        PaymentTransaction::updateOrCreate(
            ['order_id' => $order->id, 'transaction_id' => $transactionId],
            [
                'payment_method' => 'card',
                'amount' => $order->total,
                'status' => 'completed',
                'gateway_response' => $gatewayResponse,
                'processed_at' => now(),
            ]
        );

        // 3. Update order status.
        //
        // FUNCTIONAL FIX (audit C5):
        // The previous code moved paid card orders to status='pending'
        // (with a comment "Admin will manually confirm"). But COD and
        // card_on_delivery orders jump straight to status='confirmed'
        // (see CheckoutService::payWithCOD / payWithCardOnDelivery), and
        // DriverController::acceptOrder only accepts status='confirmed'.
        // The mismatch left paid card orders invisible to drivers until
        // an admin manually advanced them — broken handoff in practice.
        //
        // Now: paid card orders go straight to 'confirmed' for parity with
        // COD. The "admin must approve" workflow, if it ever becomes a
        // requirement, should apply uniformly across all payment methods.
        $order->update([
            'payment_status' => 'completed',
            'status'         => 'confirmed',
        ]);

        // 4. Finalize promo + clear cart
        $this->orderService->finalizePromoUsage($order);

        $cart = Cart::where('user_id', $order->user_id)->first();
        if ($cart) {
            $this->cartService->clearCart($cart);
            Log::info('🗑️ Cart cleared after payment confirmation', [
                'user_id' => $order->user_id,
                'source' => $source,
            ]);
        }

        // 5. Async processing (notifications, analytics)
        // CRITICAL FIX: ProcessOrderAsync expects int $orderId, NOT Order model
        ProcessOrderAsync::dispatch($order->id, 'pending');

        Log::info("✅ [{$source}] Payment confirmed — all tables updated", [
            'payment_id' => $payment->id,
            'order_id' => $order->id,
            'transaction_id' => $transactionId,
        ]);
    }

    /**
     * Inspect a Paymob intention payload and, if it represents a TERMINAL
     * state (success-and-captured or genuine failure), atomically transition
     * the local PaymobPayment row to PAID/FAILED.
     *
     * Designed to be called from BOTH:
     *   - the scheduled ReconcilePendingPayments job (every 5 min)
     *   - the user-driven /payments/status/{id} polling endpoint
     *
     * Behaviour:
     *   - If $transactionData says "not processed yet" → returns 'pending' without
     *     touching the row.
     *   - If success && captured && amount/currency match → confirmPayment().
     *   - If success && !captured (auth-only) → leaves row PENDING; caller will
     *     keep polling until capture lands.
     *   - If !success → failPayment().
     *
     * Returns: 'confirmed' | 'failed' | 'pending' | 'mismatch' | 'noop'
     *
     * IDEMPOTENCY: takes lockForUpdate inside DB::transaction and re-checks
     * status === 'PENDING' before transitioning, so a concurrent webhook or
     * a second polling caller can't double-confirm.
     *
     * @param PaymobPayment $payment           Fresh model (will be reloaded with lock).
     * @param array         $transactionData   Output of PaymobService::getTransactionByIntention.
     * @param string        $source            Caller tag for logs: 'polling' | 'reconciliation' | 'webhook'.
     */
    public function reconcileFromPaymob(
        PaymobPayment $payment,
        array $transactionData,
        string $source = 'polling',
    ): string {
        $paymobStatus = $transactionData['status'] ?? null;
        $latestTxn    = $transactionData['latest_transaction'] ?? null;

        // Paymob hasn't reached a terminal state yet — caller should keep polling.
        if ($paymobStatus !== 'PROCESSED' || !$latestTxn) {
            return 'pending';
        }

        $txnSuccess = (bool) ($latestTxn['success'] ?? false);
        $txnId      = (string) ($latestTxn['id'] ?? '');
        $isCapture  = (bool) ($latestTxn['is_capture'] ?? false);
        $isAuth     = (bool) ($latestTxn['is_auth'] ?? false);

        // Paymob Unified Checkout quirk: is_capture sometimes false even when
        // funds have actually been captured. Cross-check the secondary signals.
        if ($txnSuccess && !$isCapture) {
            $migsStatus  = strtoupper(trim($latestTxn['data']['migs_order']['status'] ?? ''));
            $capturedAmt = (float) ($latestTxn['data']['captured_amount'] ?? $latestTxn['captured_amount'] ?? 0);
            $orderPaySt  = strtoupper(trim($latestTxn['order']['payment_status'] ?? ''));

            if ($migsStatus === 'CAPTURED' || $capturedAmt > 0 || $orderPaySt === 'PAID') {
                $isCapture = true;
            }
        }

        // Amount safety: never auto-confirm when gateway amount disagrees with
        // our stored amount — that's a tampering signal, surface for manual review.
        $txnAmount = (int) ($latestTxn['amount_cents'] ?? 0);
        if ($txnAmount !== (int) $payment->amount_cents) {
            Log::error("🚨 [{$source}] Reconcile: amount mismatch", [
                'payment_id'    => $payment->id,
                'expected'      => $payment->amount_cents,
                'paymob_amount' => $txnAmount,
            ]);
            return 'mismatch';
        }

        $txnCurrency = strtoupper(trim((string) ($latestTxn['currency'] ?? '')));
        $expected    = strtoupper(trim((string) $payment->currency));
        if ($txnCurrency !== '' && $txnCurrency !== $expected) {
            Log::error("🚨 [{$source}] Reconcile: currency mismatch", [
                'payment_id'  => $payment->id,
                'expected'    => $expected,
                'paymob_ccy'  => $txnCurrency,
            ]);
            return 'mismatch';
        }

        return DB::transaction(function () use ($payment, $txnSuccess, $txnId, $isCapture, $isAuth, $latestTxn, $source) {
            // Re-read with lock; webhook may have just finished while we were
            // talking to Paymob. If state already moved off PENDING, nothing to do.
            $locked = PaymobPayment::where('id', $payment->id)
                ->lockForUpdate()
                ->first();

            if (!$locked || $locked->status !== 'PENDING') {
                return 'noop';
            }

            if (!$txnSuccess) {
                $this->failPayment(
                    $locked,
                    $txnId,
                    "Reconcile ({$source}): Paymob reports failure",
                    $latestTxn,
                    $source,
                );
                return 'failed';
            }

            // Auth-only (3DS authorised but not yet captured) — wait for capture.
            if ($isAuth && !$isCapture) {
                $locked->markAsPending("Reconcile ({$source}): authorised, awaiting capture", $latestTxn);
                return 'pending';
            }

            if (!$isCapture) {
                $this->failPayment(
                    $locked,
                    $txnId,
                    "Reconcile ({$source}): success but not captured",
                    $latestTxn,
                    $source,
                );
                return 'failed';
            }

            $this->confirmPayment($locked, $txnId, $latestTxn, $source);
            return 'confirmed';
        });
    }

    /**
     * Handle a failed payment.
     *
     * @param PaymobPayment $payment    Locked payment record
     * @param string        $transactionId  Paymob transaction ID
     * @param string        $errorMessage   Reason for failure
     * @param array         $gatewayResponse Full Paymob payload
     * @param string        $source  'webhook' | 'reconciliation'
     */
    public function failPayment(
        PaymobPayment $payment,
        string $transactionId,
        string $errorMessage,
        array $gatewayResponse,
        string $source = 'webhook'
    ): void {
        $order = $payment->order;

        $payment->markAsFailed($errorMessage, $gatewayResponse);

        PaymentTransaction::updateOrCreate(
            ['order_id' => $order->id, 'transaction_id' => $transactionId],
            [
                'payment_method' => 'card',
                'amount' => $order->total,
                'status' => 'failed',
                'gateway_response' => $gatewayResponse,
                'processed_at' => now(),
            ]
        );

        $order->update(['payment_status' => 'failed', 'status' => 'failed']);

        // Restore stock
        foreach ($order->items as $orderItem) {
            $product = $orderItem->product;
            if ($product) {
                $product->increment('stock_quantity', $orderItem->quantity);
                Log::info('📦 Stock restored', [
                    'product_id' => $product->id,
                    'quantity' => $orderItem->quantity,
                    'source' => $source,
                ]);
            }
        }

        Log::info("❌ [{$source}] Payment FAILED", [
            'payment_id' => $payment->id,
            'order_id' => $order->id,
            'error' => $errorMessage,
        ]);
    }
}
