<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\PaymobPayment;
use App\Jobs\ProcessOrderAsync;
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
