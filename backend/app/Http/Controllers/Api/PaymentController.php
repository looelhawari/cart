<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymobPayment;
use App\Services\PaymobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class PaymentController extends Controller
{
    private PaymobService $paymobService;

    public function __construct(PaymobService $paymobService)
    {
        $this->paymobService = $paymobService;
    }

    /**
     * Pre-check payment capability BEFORE order creation (NEW - Industry Standard Flow).
     * This endpoint validates Paymob WITHOUT creating an internal order.
     * Prevents users from reaching "Place Order" if payment cannot be initiated.
     *
     * POST /api/v1/payments/paymob/pre-check
     */
    public function preCheckPayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'payment_method' => 'required|in:CARD,WALLET',
            'amount' => 'required|numeric|min:0.01',
            'billing_data' => 'required|array',
            'billing_data.first_name' => 'required|string|max:255',
            'billing_data.last_name' => 'required|string|max:255',
            'billing_data.email' => 'required|email',
            'billing_data.phone_number' => 'required|string',
            'billing_data.city' => 'required|string',
            'billing_data.street' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            // Convert amount to cents
            $amountCents = (int) ($request->amount * 100);

            // Generate temporary unique ID (not tied to any order yet)
            $tempOrderId = 'PRECHECK-' . auth()->id() . '-' . time();

            // Step 1: Authenticate with Paymob
            $authToken = $this->paymobService->authenticate();

            // Step 2: Register order with Paymob (validates integration)
            $paymobOrderId = $this->paymobService->registerOrder(
                $authToken,
                $amountCents,
                $tempOrderId
            );

            // Prepare billing data for Paymob
            $billingData = array_merge($request->billing_data, [
                'apartment' => 'NA',
                'floor' => 'NA',
                'building' => 'NA',
                'shipping_method' => 'NA',
                'postal_code' => 'NA',
                'country' => 'Egypt',
                'state' => $request->billing_data['city'] ?? 'Cairo',
            ]);

            // Step 3: Generate payment key (validates credentials)
            $paymentToken = $this->paymobService->generatePaymentKey(
                $authToken,
                $amountCents,
                $paymobOrderId,
                $billingData,
                $request->payment_method
            );

            // Get integration ID
            $integrationId = $this->paymobService->getIntegrationId($request->payment_method);

            // Get iframe URL
            $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

            // Cache payment data for order creation (expires in 30 minutes)
            $cacheKey = 'payment_precheck_' . auth()->id();
            cache()->put($cacheKey, [
                'paymob_order_id' => $paymobOrderId,
                'payment_token' => $paymentToken,
                'amount_cents' => $amountCents,
                'billing_data' => $billingData,
                'payment_method' => $request->payment_method,
                'integration_id' => $integrationId,
                'temp_order_id' => $tempOrderId,
            ], now()->addMinutes(30));

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_token' => $paymentToken,
                    'iframe_url' => $iframeUrl,
                    'amount' => $request->amount,
                    'currency' => 'EGP',
                    'expires_at' => now()->addMinutes(30)->toIso8601String(),
                ],
                'message' => 'Payment pre-check successful. Proceed to order summary.',
            ]);

        } catch (Exception $e) {
            Log::error('Payment pre-check failed', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Payment service temporarily unavailable. Please try again or choose Cash on Delivery.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 503);
        }
    }

    /**
     * Initiate payment with Paymob.
     *
     * POST /api/v1/payments/paymob/initiate
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:CARD,WALLET',
            'billing_data' => 'required|array',
            'billing_data.first_name' => 'required|string|max:255',
            'billing_data.last_name' => 'required|string|max:255',
            'billing_data.email' => 'required|email',
            'billing_data.phone_number' => 'required|string',
            'billing_data.city' => 'required|string',
            'billing_data.street' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Get order
            $order = Order::findOrFail($request->order_id);

            // Check if order already has a successful payment
            $existingPayment = PaymobPayment::where('order_id', $order->id)
                ->where('status', 'PAID')
                ->first();

            if ($existingPayment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order already paid',
                ], 400);
            }

            // STEP 2: Use order snapshot total - NEVER recalculate from cart
            $amountCents = (int) ($order->total * 100);

            \Log::info('💳 [STEP 2] PAYMENT FROM ORDER SNAPSHOT', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'source' => 'orders.total column (NOT recalculated from cart)',
                'order_total_EGP' => $order->total,
                'amount_cents' => $amountCents,
                'PAYMOB_WILL_CHARGE' => $amountCents / 100 . ' EGP',
                'order_snapshot' => [
                    'subtotal' => $order->subtotal,
                    'delivery' => $order->delivery_fee,
                    'tax' => $order->tax,
                    'discount' => $order->discount,
                    'total' => $order->total,
                ],
                'created_at' => $order->created_at->toDateTimeString(),
                'rule' => 'Using frozen order totals - cart changes ignored',
            ]);

            // Generate unique internal order ID
            $internalOrderId = 'ORD-' . $order->id . '-' . time();

            // Step 1: Authenticate with Paymob
            $authToken = $this->paymobService->authenticate();

            // Step 2: Register order with Paymob
            $paymobOrderId = $this->paymobService->registerOrder(
                $authToken,
                $amountCents,
                $internalOrderId
            );

            // Prepare billing data for Paymob
            $billingData = array_merge($request->billing_data, [
                'apartment' => 'NA',
                'floor' => 'NA',
                'building' => 'NA',
                'shipping_method' => 'NA',
                'postal_code' => 'NA',
                'country' => 'Egypt',
                'state' => $request->billing_data['city'] ?? 'Cairo',
            ]);

            // Step 3: Generate payment key
            $paymentToken = $this->paymobService->generatePaymentKey(
                $authToken,
                $amountCents,
                $paymobOrderId,
                $billingData,
                $request->payment_method
            );

            // Get integration ID
            $integrationId = $this->paymobService->getIntegrationId($request->payment_method);

            // Store payment record
            $payment = PaymobPayment::create([
                'order_id' => $order->id,
                'internal_order_id' => $internalOrderId,
                'paymob_order_id' => $paymobOrderId,
                'amount_cents' => $amountCents,
                'currency' => 'EGP',
                'payment_method' => $request->payment_method,
                'integration_id' => $integrationId,
                'status' => 'PENDING',
                'billing_data' => $billingData,
                'payment_token' => $paymentToken,
            ]);

            // Update order payment status
            $order->update([
                'payment_status' => 'pending',
            ]);

            DB::commit();

            // Get iframe URL
            $iframeUrl = $this->paymobService->getIframeUrl($paymentToken);

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'payment_token' => $paymentToken,
                    'iframe_url' => $iframeUrl,
                    'amount' => $order->total,
                    'currency' => 'EGP',
                ],
            ]);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Payment initiation failed', [
                'error' => $e->getMessage(),
                'order_id' => $request->order_id ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate payment. Please try again.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle Paymob's server-to-server processed callback (webhook).
     *
     * 🔒 STEP 5: WEBHOOK HARDENING - ENTERPRISE GRADE
     *
     * This is the ONLY payment authority - frontend/WebView redirects are NOT trusted.
     * Only this server-to-server webhook can finalize payment status.
     *
     * Requirements:
     * 1. HMAC verification FIRST (reject invalid signatures)
     * 2. Idempotency (safe for duplicate calls from Paymob)
     * 3. Atomic DB transaction (all-or-nothing updates)
     * 4. Cart clearing ONLY on success (preserve cart on failure for retry)
     * 5. Consistent failure mapping across all tables
     * 6. NEVER recalculate totals (use order snapshot)
     *
     * POST /api/v1/paymob/processed
     */
    public function processedCallback(Request $request): JsonResponse
    {
        try {
            $data = $request->all();

            // Paymob can send data wrapped in 'obj' key or directly
            $payload = $data['obj'] ?? $data;

            Log::info('🔔 Paymob webhook received', [
                'order_id' => $payload['order']['id'] ?? null,
                'success' => $payload['success'] ?? false,
                'transaction_id' => $payload['id'] ?? null,
                'has_obj_wrapper' => isset($data['obj']),
            ]);

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 1: HMAC VERIFICATION FIRST (Security Gate)
            // ═══════════════════════════════════════════════════════════════
            if (!$this->paymobService->verifyHmac($data)) {
                Log::error('🚫 SECURITY: Invalid HMAC signature', [
                    'order_id' => $payload['order']['id'] ?? null,
                    'ip' => $request->ip(),
                    // NO sensitive data logged
                ]);
                return response()->json(['message' => 'Invalid signature'], 403);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 2: FIND PAYMENT & IDEMPOTENCY CHECK
            // ═══════════════════════════════════════════════════════════════
            $paymobOrderId = $payload['order']['id'] ?? null;
            $transactionId = $payload['id'] ?? null;

            if (!$paymobOrderId || !$transactionId) {
                Log::error('❌ Missing required webhook data', [
                    'paymob_order_id' => $paymobOrderId,
                    'transaction_id' => $transactionId,
                    'payload_keys' => array_keys($payload),
                ]);
                return response()->json(['message' => 'Invalid data'], 400);
            }

            $payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)->first();

            if (!$payment) {
                Log::error('❌ Payment not found', ['paymob_order_id' => $paymobOrderId]);
                return response()->json(['message' => 'Payment not found'], 404);
            }

            // IDEMPOTENCY: Check if already processed (by status OR transaction_id)
            if ($payment->status !== 'PENDING' || $payment->transaction_id === $transactionId) {
                Log::info('✅ IDEMPOTENCY: Webhook already processed (no-op)', [
                    'payment_id' => $payment->id,
                    'current_status' => $payment->status,
                    'transaction_id' => $payment->transaction_id,
                    'duplicate_transaction_id' => $transactionId,
                ]);
                // Return 200 OK but do NOTHING (safe idempotent behavior)
                return response()->json(['message' => 'Already processed'], 200);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 3: VALIDATE WEBHOOK DATA (Amount Match)
            // ═══════════════════════════════════════════════════════════════
            $success = $payload['success'] ?? false;
            $amountCents = $payload['amount_cents'] ?? 0;

            // Verify amount matches (prevent payment manipulation)
            if ($amountCents != $payment->amount_cents) {
                Log::error('❌ SECURITY: Amount mismatch detected', [
                    'expected' => $payment->amount_cents,
                    'received' => $amountCents,
                    'order_id' => $payment->order_id,
                ]);

                // Mark as failed in atomic transaction
                DB::transaction(function () use ($payment, $payload) {
                    $payment->markAsFailed('Amount mismatch - security violation', $payload);
                    $payment->order->update([
                        'status' => 'failed',
                        'payment_status' => 'failed',
                    ]);
                });

                return response()->json(['message' => 'Amount mismatch'], 400);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 4: ATOMIC TRANSACTION (All-or-Nothing)
            // ═══════════════════════════════════════════════════════════════
            DB::beginTransaction();

            try {
                $order = $payment->order;

                if ($success) {
                    // ═══════════════════════════════════════════════════════
                    // SUCCESS PATH: Payment Confirmed
                    // ═══════════════════════════════════════════════════════

                    // 1. Update paymob_payments table
                    $payment->markAsPaid($transactionId, $payload);

                    // 2. Update/Create payment_transactions table
                    \App\Models\PaymentTransaction::updateOrCreate(
                        [
                            'order_id' => $order->id,
                            'transaction_id' => $transactionId,
                        ],
                        [
                            'payment_method' => 'card',
                            'amount' => $order->total,  // Use order snapshot, NOT cart
                            'status' => 'completed',
                            'gateway_response' => $payload,
                            'processed_at' => now(),
                        ]
                    );

                    // 3. Update orders table (STEP 4: Use 'completed' as single source of truth)
                    $order->update([
                        'payment_status' => 'completed',
                        'status' => 'confirmed',
                        // REQUIREMENT 6: NEVER touch orders.total or recalculate anything
                    ]);

                    // 4. REQUIREMENT 5: Clear cart ONLY when success confirmed (inside transaction)
                    $cart = \App\Models\Cart::where('user_id', $order->user_id)->first();
                    if ($cart) {
                        Log::info('🗑️ ATOMIC: Clearing cart after payment confirmation', [
                            'cart_id' => $cart->id,
                            'user_id' => $order->user_id,
                            'items_count_before' => $cart->items->count(),
                        ]);

                        app(\App\Services\CartService::class)->clearCart($cart);

                        // Verify cart is cleared
                        $cart->refresh();
                        Log::info('✅ Cart cleared successfully', [
                            'cart_id' => $cart->id,
                            'items_count_after' => $cart->items->count(),
                        ]);
                    } else {
                        Log::warning('⚠️ No cart found to clear', [
                            'user_id' => $order->user_id,
                        ]);
                    }

                    Log::info('✅ Payment SUCCESS - All tables updated atomically', [
                        'payment_id' => $payment->id,
                        'order_id' => $order->id,
                        'transaction_id' => $transactionId,
                        'paymob_payments.status' => 'PAID',
                        'payment_transactions.status' => 'completed',
                        'orders.payment_status' => 'completed',
                        'orders.status' => 'confirmed',
                        'cart_cleared' => true,
                    ]);
                } else {
                    // ═══════════════════════════════════════════════════════
                    // FAILURE PATH: Payment Failed/Cancelled
                    // ═══════════════════════════════════════════════════════

                    $errorMessage = $payload['data']['message'] ?? 'Payment failed';
                    $isCancelled = isset($payload['is_cancelled']) && $payload['is_cancelled'];

                    // 1. Update paymob_payments table
                    // NOTE: Database only has PENDING/PAID/FAILED, so treat CANCELLED as FAILED
                    $payment->markAsFailed(
                        $isCancelled ? 'Payment cancelled by user' : $errorMessage,
                        $payload
                    );

                    // 2. Update/Create payment_transactions table
                    \App\Models\PaymentTransaction::updateOrCreate(
                        [
                            'order_id' => $order->id,
                            'transaction_id' => $transactionId,
                        ],
                        [
                            'payment_method' => 'card',
                            'amount' => $order->total,  // Use order snapshot
                            'status' => 'failed',  // REQUIREMENT 6: Consistent failure mapping
                            'gateway_response' => $payload,
                            'processed_at' => now(),
                        ]
                    );

                    // 3. Update orders table (REQUIREMENT 6: Consistent failure mapping)
                    $order->update([
                        'payment_status' => 'failed',
                        'status' => 'failed',
                    ]);

                    // 4. REQUIREMENT 5: DO NOT clear cart on failure (preserve for retry)
                    Log::info('❌ Payment FAILED - Cart preserved for retry', [
                        'payment_id' => $payment->id,
                        'order_id' => $order->id,
                        'error' => $errorMessage,
                        'paymob_payments.status' => $payment->status,
                        'payment_transactions.status' => 'failed',
                        'orders.payment_status' => 'failed',
                        'orders.status' => 'failed',
                        'cart_cleared' => false,
                    ]);
                }

                DB::commit();

                return response()->json(['message' => 'Callback processed'], 200);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;  // Re-throw to outer catch block
            }

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('🔥 Webhook processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Processing failed'], 500);
        }
    }

    /**
     * Response callback from Paymob (UX ONLY - for redirect).
     *
     * GET /api/v1/payment/response
     */
    public function responseCallback(Request $request): JsonResponse
    {
        // This is only for UX/redirect purposes
        // DO NOT update database here

        $success = $request->query('success') === 'true';
        $orderId = $request->query('merchant_order_id');

        Log::info('Paymob response callback', [
            'success' => $success,
            'order_id' => $orderId,
        ]);

        // Just return status for frontend to display
        return response()->json([
            'success' => $success,
            'message' => $success ? 'Payment successful' : 'Payment failed',
            'order_id' => $orderId,
        ]);
    }

    /**
     * Get payment status for an order.
     *
     * GET /api/v1/payments/order/{orderId}/status
     */
    public function getPaymentStatus($orderId): JsonResponse
    {
        try {
            $payment = PaymobPayment::where('order_id', $orderId)
                ->latest()
                ->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'No payment found for this order',
                ], 404);
            }

            // Also get order payment status for frontend terminal state detection
            $order = \App\Models\Order::find($orderId);

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => $payment->status, // PENDING, PAID, FAILED
                    'payment_status' => $order ? $order->payment_status : null, // pending, completed, failed
                    'order_status' => $order ? $order->status : null, // confirmed, failed, etc
                    'amount' => $payment->amount_in_egp,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'paid_at' => $payment->paid_at,
                    'transaction_id' => $payment->paymob_transaction_id,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Get payment status error', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get payment status',
            ], 500);
        }
    }
}
