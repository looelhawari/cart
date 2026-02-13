<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessOrderAsync;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\PaymobPayment;
use App\Services\PaymobService;
use App\Services\PaymentDecisionService;
use App\Services\PaymentTokenService;
use App\Services\PaymentConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Exception;

class PaymentController extends Controller
{
    private PaymobService $paymobService;
    private PaymentDecisionService $decisionService;
    private PaymentTokenService $tokenService;
    private PaymentConfirmationService $confirmationService;

    public function __construct(
        PaymobService $paymobService,
        PaymentDecisionService $decisionService,
        PaymentTokenService $tokenService,
        PaymentConfirmationService $confirmationService
    ) {
        $this->paymobService = $paymobService;
        $this->decisionService = $decisionService;
        $this->tokenService = $tokenService;
        $this->confirmationService = $confirmationService;
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
     * Initiate payment with Paymob (Dual-Flow: MOTO or Unified Checkout).
     *
     * POST /api/v1/payments/paymob/initiate
     *
     * Decision tree:
     * 1. If wallet payment → classic iframe flow
     * 2. If card payment with saved card → check business rules:
     *    - Low/medium value + good history → MOTO (one-click)
     *    - High value or risk factors → Unified Checkout (3DS)
     * 3. If card payment without saved card → Unified Checkout (with tokenization)
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method' => 'required|in:CARD,WALLET',
            'payment_method_id' => 'nullable|exists:payment_methods,id', // ✅ Saved card ID
            'save_card' => 'nullable|boolean', // ✅ Save card opt-in
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

            // SECURITY: Verify order belongs to authenticated user
            if ($order->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized: Order does not belong to you',
                ], 403);
            }

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
            $internalOrderId = 'ORD-' . $order->id . '-' . (int)(microtime(true) * 1000);

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

            // ═══════════════════════════════════════════════════════════════
            // DUAL-FLOW ROUTING: MOTO vs Unified Checkout vs Classic
            // ═══════════════════════════════════════════════════════════════

            // Wallet payments: Use classic iframe flow (no tokenization)
            if ($request->payment_method === 'WALLET') {
                $response = $this->initiateClassicFlow(
                    $order,
                    $request->payment_method,
                    $billingData,
                    $internalOrderId,
                    false // No card save for wallet
                );
                DB::commit();
                return $response;
            }

            // Check if dual-flow features enabled
            if (!config('payments.enable_moto') && !config('payments.enable_unified_checkout')) {
                // Feature flags disabled, fallback to classic flow
                $response = $this->initiateClassicFlow(
                    $order,
                    $request->payment_method,
                    $billingData,
                    $internalOrderId,
                    $request->boolean('save_card', false)
                );
                DB::commit();
                return $response;
            }

            // Get saved card if payment_method_id provided
            $savedCard = null;
            if ($request->filled('payment_method_id')) {
                $savedCard = PaymentMethod::where('id', $request->payment_method_id)
                    ->where('user_id', auth()->id())
                    ->first();

                // Validate saved card is active
                if ($savedCard && !$savedCard->isActive()) {
                    Log::warning('Inactive saved card attempted', [
                        'payment_method_id' => $request->payment_method_id,
                        'user_id' => auth()->id(),
                        'status' => $savedCard->status,
                    ]);
                    $savedCard = null; // Treat as new payment
                }
            }

            // Use decision service to determine flow
            $flowDecision = $this->decisionService->decidePaymentFlow(
                $order,
                $savedCard,
                $request->boolean('save_card', false)
            );

            Log::info('💡 Payment flow decision made', [
                'order_id' => $order->id,
                'flow' => $flowDecision['flow'],
                'reason' => $flowDecision['reason'],
                'has_saved_card' => $savedCard !== null,
                'save_card_requested' => $request->boolean('save_card', false),
            ]);

            // Route to appropriate flow handler
            if ($flowDecision['flow'] === 'moto' && $savedCard) {
                // MOTO: One-click payment with saved card
                $result = $this->initiateMotoPayment(
                    $order,
                    $savedCard,
                    $billingData,
                    $internalOrderId
                );
            } else {
                // Unified Checkout: 3DS with optional tokenization
                $result = $this->initiateUnifiedCheckout(
                    $order,
                    $savedCard?->paymob_card_token,
                    $request->boolean('save_card', false),
                    $billingData,
                    $internalOrderId
                );
            }

            // Update order payment status
            $order->update([
                'payment_status' => 'pending',
            ]);

            DB::commit();

            // Return response based on flow
            if ($result['requires_redirect']) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment_id' => $result['payment_id'],
                        'flow' => $result['flow'],
                        'redirect_url' => $result['redirect_url'],
                        'amount' => $order->total,
                        'currency' => 'EGP',
                    ],
                ]);
            } else {
                // MOTO success - no redirect needed
                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment_id' => $result['payment_id'],
                        'flow' => 'moto',
                        'status' => 'processing',
                        'message' => 'Payment processing with saved card',
                        'amount' => $order->total,
                        'currency' => 'EGP',
                    ],
                ]);
            }

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
                'payload_keys' => array_keys($payload),
                'order_keys' => isset($payload['order']) ? array_keys($payload['order']) : [],
                'has_token' => isset($payload['token']),
                'has_masked_pan' => isset($payload['masked_pan']),
            ]);

            // ═══════════════════════════════════════════════════════════════
            // Token-only webhooks (no order object):
            // Paymob sends card token data in a SEPARATE webhook BEFORE the
            // transaction webhook. The transaction webhook does NOT contain
            // the token. We cache the token data here (keyed by Paymob
            // order_id) and retrieve it when the HMAC-verified transaction
            // webhook confirms payment success.
            //
            // Security: The token is NOT saved to payment_methods here.
            // It's only used AFTER the transaction webhook passes HMAC
            // verification + success + capture checks.
            // ═══════════════════════════════════════════════════════════════
            if (isset($payload['token']) && isset($payload['masked_pan']) && !isset($payload['order'])) {
                $tokenOrderId = $payload['order_id'] ?? null;
                if ($tokenOrderId && is_string($payload['token']) && !empty($payload['token'])) {
                    // Cache token data for 30 minutes — enough for transaction webhook to arrive
                    $tokenData = [
                        'token' => $payload['token'],
                        'masked_pan' => $payload['masked_pan'] ?? null,
                        'card_subtype' => $payload['card_subtype'] ?? null,
                        'merchant_id' => $payload['merchant_id'] ?? null,
                        'order_id' => $tokenOrderId,
                    ];
                    Cache::put("paymob_token_webhook:{$tokenOrderId}", $tokenData, now()->addMinutes(30));

                    Log::info('💳 Token webhook received — cached for transaction webhook', [
                        'masked_pan' => $payload['masked_pan'] ?? null,
                        'paymob_order_id' => $tokenOrderId,
                    ]);
                } else {
                    Log::info('💳 Token webhook received — no order_id to cache', [
                        'masked_pan' => $payload['masked_pan'] ?? null,
                    ]);
                }
                return response()->json(['message' => 'Token webhook acknowledged'], 200);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 1: HMAC VERIFICATION (Security Gate for transaction webhooks)
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

            // Try finding payment by paymob_order_id first (legacy/old flow)
            $payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)->first();

            // If not found, try by special_reference (Unified Checkout Intention flow)
            if (!$payment) {
                // In Unified Checkout, the special_reference we sent is in merchant_order_id
                // Check both top level and inside order object
                $specialReference = null;

                if (isset($payload['merchant_order_id'])) {
                    $specialReference = $payload['merchant_order_id'];
                } elseif (isset($payload['order']['merchant_order_id'])) {
                    $specialReference = $payload['order']['merchant_order_id'];
                }

                if ($specialReference) {
                    Log::info('🔍 Searching payment by special_reference', [
                        'special_reference' => $specialReference,
                    ]);

                    // Extract ORD-XXX part from the special reference
                    // Format: ORD-138-1769285913241-6975291b51d97
                    if (preg_match('/^(ORD-\d+)/', $specialReference, $matches)) {
                        $orderPrefix = $matches[1];
                        Log::info('🔍 Extracted order prefix', ['prefix' => $orderPrefix]);
                        $payment = PaymobPayment::where('internal_order_id', 'LIKE', $orderPrefix . '%')->first();
                    } else {
                        // Fallback: try exact match
                        $payment = PaymobPayment::where('internal_order_id', $specialReference)->first();
                    }
                }
            }

            if (!$payment) {
                Log::error('❌ Payment not found', [
                    'paymob_order_id' => $paymobOrderId,
                    'special_reference' => $payload['merchant_order_id'] ?? null,
                    'payload_dump' => json_encode($payload, JSON_PRETTY_PRINT),
                ]);
                return response()->json(['message' => 'Payment not found'], 404);
            }

            // Update paymob_order_id if it was NULL (Unified Checkout flow)
            if (!$payment->paymob_order_id) {
                $payment->paymob_order_id = $paymobOrderId;
                $payment->save();
                Log::info('📝 Updated paymob_order_id from webhook', [
                    'payment_id' => $payment->id,
                    'paymob_order_id' => $paymobOrderId,
                ]);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 3: VALIDATE WEBHOOK DATA (Amount + Currency)
            // These checks run BEFORE the lock — they are stateless and fast.
            // ═══════════════════════════════════════════════════════════════
            $amountCents = $payload['amount_cents'] ?? 0;

            // Verify amount matches (prevent payment manipulation)
            if ((int) $amountCents !== (int) $payment->amount_cents) {
                Log::error('❌ SECURITY: Amount mismatch detected', [
                    'expected' => $payment->amount_cents,
                    'received' => $amountCents,
                    'order_id' => $payment->order_id,
                ]);

                DB::transaction(function () use ($payment, $payload) {
                    $locked = PaymobPayment::where('id', $payment->id)->lockForUpdate()->first();
                    if ($locked && $locked->isPending()) {
                        $locked->markAsFailed('Amount mismatch - security violation', $payload);
                        $locked->order->update(['status' => 'failed', 'payment_status' => 'failed']);
                    }
                });

                return response()->json(['message' => 'Amount mismatch'], 400);
            }

            // ✅ P0 FIX: Verify currency matches stored currency
            $receivedCurrency = strtoupper(trim((string) ($payload['currency'] ?? '')));
            $expectedCurrency = strtoupper(trim((string) $payment->currency));
            if ($receivedCurrency !== '' && $receivedCurrency !== $expectedCurrency) {
                Log::error('❌ SECURITY: Currency mismatch detected', [
                    'expected' => $expectedCurrency,
                    'received' => $receivedCurrency,
                    'order_id' => $payment->order_id,
                ]);

                DB::transaction(function () use ($payment, $payload, $expectedCurrency, $receivedCurrency) {
                    $locked = PaymobPayment::where('id', $payment->id)->lockForUpdate()->first();
                    if ($locked && $locked->isPending()) {
                        $locked->markAsFailed("Currency mismatch: expected {$expectedCurrency} got {$receivedCurrency}", $payload);
                        $locked->order->update(['status' => 'failed', 'payment_status' => 'failed']);
                    }
                });

                return response()->json(['message' => 'Currency mismatch'], 400);
            }

            // ═══════════════════════════════════════════════════════════════
            // REQUIREMENT 4: ATOMIC TRANSACTION with PESSIMISTIC LOCK
            // ✅ P0 FIX: lockForUpdate() prevents race conditions on
            //    concurrent webhook retries. Idempotency check is now
            //    INSIDE the lock so two simultaneous requests cannot
            //    both pass the PENDING check.
            // ═══════════════════════════════════════════════════════════════
            $result = DB::transaction(function () use ($payment, $transactionId, $payload) {
                // ✅ Re-fetch with pessimistic lock (SELECT ... FOR UPDATE)
                $payment = PaymobPayment::where('id', $payment->id)
                    ->lockForUpdate()
                    ->first();

                if (!$payment) {
                    return response()->json(['message' => 'Payment not found'], 404);
                }

                // ✅ IDEMPOTENCY inside lock — safe from race conditions
                if ($payment->status !== 'PENDING' || $payment->paymob_transaction_id === (string) $transactionId) {
                    Log::info('✅ IDEMPOTENCY: Webhook already processed (no-op)', [
                        'payment_id' => $payment->id,
                        'current_status' => $payment->status,
                        'transaction_id' => $payment->paymob_transaction_id,
                        'duplicate_transaction_id' => $transactionId,
                    ]);
                    return response()->json(['message' => 'Already processed'], 200);
                }

                $success    = (bool) ($payload['success'] ?? false);
                $isCapture  = (bool) ($payload['is_capture'] ?? false);
                $isAuth     = (bool) ($payload['is_auth'] ?? false);
                $order      = $payment->order;

                // ═══════════════════════════════════════════════════════
                // PAYMOB UNIFIED CHECKOUT QUIRK:
                // In the Intention API flow, the top-level `is_capture`
                // can be `false` even when the payment is fully captured.
                // The real capture status lives deeper in the payload:
                //   - data.migs_order.status === "CAPTURED"
                //   - data.captured_amount > 0
                //   - order.payment_status === "PAID"
                // We must check these before rejecting a successful payment.
                // ═══════════════════════════════════════════════════════
                if ($success && !$isCapture) {
                    $migsStatus     = strtoupper(trim($payload['data']['migs_order']['status'] ?? ''));
                    $capturedAmt    = (float) ($payload['data']['captured_amount'] ?? $payload['captured_amount'] ?? 0);
                    $orderPayStatus = strtoupper(trim($payload['order']['payment_status'] ?? ''));

                    if ($migsStatus === 'CAPTURED' || $capturedAmt > 0 || $orderPayStatus === 'PAID') {
                        Log::info('🔧 Paymob quirk: is_capture=false but underlying data confirms capture', [
                            'payment_id'       => $payment->id,
                            'migs_status'      => $migsStatus,
                            'captured_amount'  => $capturedAmt,
                            'order_pay_status' => $orderPayStatus,
                        ]);
                        $isCapture = true; // Override — payment IS captured
                    }
                }

                // ═══════════════════════════════════════════════════════
                // FAILURE PATH: Payment Failed/Cancelled
                // ═══════════════════════════════════════════════════════
                if (!$success) {
                    $errorMessage = $payload['data']['message'] ?? 'Payment failed';
                    $isCancelled = isset($payload['is_cancelled']) && $payload['is_cancelled'];

                    $this->confirmationService->failPayment(
                        $payment,
                        $transactionId,
                        $isCancelled ? 'Payment cancelled by user' : $errorMessage,
                        $payload,
                        'webhook'
                    );

                    Log::info('❌ Payment FAILED - Cart preserved for retry', [
                        'payment_id' => $payment->id,
                        'order_id' => $order->id,
                        'error' => $errorMessage,
                    ]);

                    return response()->json(['message' => 'Callback processed'], 200);
                }

                // ═══════════════════════════════════════════════════════
                // ✅ P0 FIX: CAPTURE/AUTH VERIFICATION
                // If authorized-but-not-captured, do NOT confirm order.
                // Money is held but NOT transferred yet.
                // ═══════════════════════════════════════════════════════
                if ($isAuth && !$isCapture) {
                    Log::warning('⚠️ Payment authorized but NOT captured — keeping PENDING', [
                        'payment_id' => $payment->id,
                        'order_id' => $order->id,
                        'transaction_id' => $transactionId,
                    ]);
                    $payment->markAsPending('Authorized but not yet captured', $payload);
                    return response()->json(['message' => 'Callback processed — awaiting capture'], 200);
                }

                if (!$isCapture) {
                    Log::error('❌ Payment success=true but is_capture=false', [
                        'payment_id' => $payment->id,
                        'is_auth' => $isAuth,
                        'is_capture' => $isCapture,
                    ]);
                    $payment->markAsFailed('Success true but not captured', $payload);
                    $order->update(['status' => 'failed', 'payment_status' => 'failed']);
                    return response()->json(['message' => 'Callback processed'], 200);
                }

                // ═══════════════════════════════════════════════════════
                // SUCCESS PATH: Payment Confirmed (success + captured)
                // ═══════════════════════════════════════════════════════

                // Centralised confirmation — single source of truth
                $this->confirmationService->confirmPayment(
                    $payment,
                    $transactionId,
                    $payload,
                    'webhook'
                );

                // ═══════════════════════════════════════════════════════
                // ✅ SAVE CARD TOKEN (only after verified success + capture)
                // Gated by: webhook HMAC ✅, success ✅, is_capture ✅,
                //           correct payment record ✅, idempotency ✅
                // ═══════════════════════════════════════════════════════
                if ($payment->save_card_requested && $payment->payment_method === 'CARD') {
                    // First try: token in the transaction webhook payload itself
                    if ($this->tokenService->shouldSaveCardToken($payment, $payload)) {
                        $this->tokenService->saveCardToken($order->user_id, $payload);
                    } else {
                        // Second try: Paymob sends the card token in a SEPARATE
                        // webhook that arrives BEFORE the transaction webhook.
                        // We cached it earlier — retrieve and use it now.
                        $paymobOrderId = $payload['order']['id'] ?? null;
                        if ($paymobOrderId) {
                            $cachedToken = Cache::pull("paymob_token_webhook:{$paymobOrderId}");
                            if ($cachedToken && !empty($cachedToken['token'])) {
                                Log::info('💳 Using cached token from token webhook', [
                                    'payment_id' => $payment->id,
                                    'masked_pan' => $cachedToken['masked_pan'] ?? null,
                                ]);
                                // Build a payload structure that extractCardTokenFromIntention understands
                                $tokenPayload = [
                                    'token' => $cachedToken['token'],
                                    'masked_pan' => $cachedToken['masked_pan'],
                                    'source_data' => [
                                        'sub_type' => $cachedToken['card_subtype'] ?? ($payload['source_data']['sub_type'] ?? 'Card'),
                                        'pan' => $payload['source_data']['pan'] ?? null,
                                    ],
                                ];
                                $this->tokenService->saveCardToken($order->user_id, $tokenPayload);
                            } else {
                                Log::warning('💳 Card save requested but no token available (not in transaction payload or cache)', [
                                    'payment_id' => $payment->id,
                                    'paymob_order_id' => $paymobOrderId,
                                ]);
                            }
                        }
                    }
                }

                Log::info('✅ Payment SUCCESS — All tables updated atomically', [
                    'payment_id' => $payment->id,
                    'order_id' => $order->id,
                    'transaction_id' => $transactionId,
                    'is_capture' => $isCapture,
                ]);

                return response()->json(['message' => 'Callback processed'], 200);
            });

            return $result;

        } catch (Exception $e) {
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

    // NOTE: getPaymentStatusById() was removed — it was dead code (no route)
    // with a dangerous polling→DB mutation pattern. Use checkStatus() instead.

    /**
     * Get payment status by order ID (legacy compatibility)
     * Route: GET /api/v1/order/{orderId}/status
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
            $order = Order::find($orderId);

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

    // ═══════════════════════════════════════════════════════════════════
    // SAVED CARD TOKEN MANAGEMENT → Delegated to PaymentTokenService
    // Methods removed: shouldSaveCardToken(), saveCardToken()
    // Now called via $this->tokenService->shouldSaveCardToken() etc.
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Initiate payment with a saved card token (Phase 3).
     *
     * IMPORTANT: Saved card payments may still require 3DS challenge.
     * Frontend must handle iframe_url to display Paymob's authentication UI.
     *
     * POST /api/v1/payments/paymob/initiate-with-saved-card
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function initiateSavedCardPayment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|exists:orders,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // MEDIUM 2 FIX: Use DB::transaction closure for atomic operations
        return DB::transaction(function () use ($request) {
            // Get order
            $order = Order::findOrFail($request->order_id);

            // Verify order belongs to authenticated user
            if ($order->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to order',
                ], 403);
            }

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

            // Get saved payment method
            $paymentMethod = PaymentMethod::findOrFail($request->payment_method_id);

            // Verify payment method belongs to authenticated user
            if ($paymentMethod->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to payment method',
                ], 403);
            }

            // Validate payment method is active and has valid token
            if ($paymentMethod->trashed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment method has been deleted',
                ], 400);
            }

            if (!$paymentMethod->hasValidToken()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment method token is invalid',
                ], 400);
            }

            if ($paymentMethod->isExpired()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Card has expired',
                ], 400);
            }

            // Use order snapshot total
            $amountCents = (int) ($order->total * 100);

            Log::info('💳 SAVED CARD PAYMENT INITIATED', [
                'order_id' => $order->id,
                'payment_method_id' => $paymentMethod->id,
                'card_last_four' => $paymentMethod->card_last_four,
                'amount_cents' => $amountCents,
            ]);

            // Generate unique internal order ID
            $internalOrderId = 'ORD-' . $order->id . '-' . time();

            // Prepare minimal billing data (required by Paymob API)
            $billingData = [
                'first_name' => $paymentMethod->card_holder_name ?? $order->user->name ?? 'Customer',
                'last_name' => ' ',
                'email' => $order->user->email,
                'phone_number' => $order->user->phone ?? '+201000000000',
                'apartment' => 'NA',
                'floor' => 'NA',
                'building' => 'NA',
                'street' => 'NA',
                'city' => 'Cairo',
                'state' => 'Cairo',
                'country' => 'EG',
            ];

            // Build items array for Paymob intention
            $items = [[
                'name' => 'Order #' . ($order->order_number ?? $order->id),
                'amount' => $amountCents,
                'description' => 'Order payment',
                'quantity' => 1,
            ]];

            // Step 1: Create MOTO Intention (uses MOTO integration ID)
            $intentionResult = $this->paymobService->createMotoIntention(
                $amountCents,
                $billingData,
                $items,
                $internalOrderId
            );

            // Step 2: Pay with saved card token via MOTO
            $motoResult = $this->paymobService->payWithSavedCardMoto(
                $paymentMethod->paymob_card_token, // Decrypted automatically by accessor
                $intentionResult['payment_token']
            );

            // Store payment record
            $payment = PaymobPayment::create([
                'order_id' => $order->id,
                'user_id' => auth()->id(),
                'internal_order_id' => $internalOrderId,
                'paymob_order_id' => $intentionResult['paymob_order_id'],
                'paymob_intention_id' => $intentionResult['intention_id'],
                'amount_cents' => $amountCents,
                'currency' => 'EGP',
                'payment_method' => 'CARD',
                'save_card_requested' => false, // Already saved
                'integration_id' => config('services.paymob.moto_integration_id'),
                'special_reference' => $internalOrderId,
                'flow' => 'moto',
                'status' => 'PENDING',
                'billing_data' => $billingData,
                'moto_attempts' => 1,
                'moto_attempted_at' => now(),
            ]);

            // Update order payment status
            $order->update([
                'payment_status' => 'pending',
            ]);

            Log::info('✅ Saved card MOTO payment initiated', [
                'payment_id' => $payment->id,
                'order_id' => $order->id,
                'payment_method_id' => $paymentMethod->id,
                'moto_success' => $motoResult['success'] ?? false,
            ]);

            // Check if MOTO succeeded directly or needs 3DS fallback
            if ($motoResult['requires_3ds'] ?? false) {
                // MOTO declined, fallback needed - return redirect info
                $payment->markAsFallbackTo3DS('MOTO declined - bank requires 3DS');

                // Fallback to Unified Checkout with saved card pre-filled
                $fallback = $this->initiateUnifiedCheckout(
                    $order,
                    $paymentMethod->paymob_card_token,
                    false,
                    $billingData,
                    $internalOrderId,
                    $payment->id
                );

                return response()->json([
                    'success' => true,
                    'data' => [
                        'payment_id' => $fallback['payment_id'],
                        'flow' => 'unified_3ds',
                        'redirect_url' => $fallback['redirect_url'],
                        'amount' => $order->total,
                        'currency' => 'EGP',
                        'card_last_four' => $paymentMethod->card_last_four,
                        'card_brand' => $paymentMethod->card_brand,
                        'fallback_from_moto' => true,
                    ],
                    'message' => 'MOTO requires 3DS - redirecting to checkout',
                ]);
            }

            if (!($motoResult['success'] ?? false)) {
                // MOTO failed entirely
                $payment->markAsFailed(
                    $motoResult['error'] ?? 'MOTO payment declined',
                    $motoResult['data'] ?? []
                );

                return response()->json([
                    'success' => false,
                    'message' => $motoResult['error'] ?? 'Payment declined. Please try again.',
                ], 400);
            }

            // MOTO SUCCESS! No redirect needed
            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'flow' => 'moto',
                    'status' => 'processing',
                    'transaction_id' => $motoResult['transaction_id'] ?? null,
                    'amount' => $order->total,
                    'currency' => 'EGP',
                    'card_last_four' => $paymentMethod->card_last_four,
                    'card_brand' => $paymentMethod->card_brand,
                ],
                'message' => 'Payment processing with saved card',
            ]);
        });
    }

    /**
     * ✅ NEW: Check payment status (for frontend polling).
     *
     * Frontend should poll this endpoint every 2 seconds after opening WebView
     * to detect when webhook has confirmed payment success.
     *
     * This replaces redirect-based success detection (more reliable).
     *
     * GET /api/v1/payments/status/{paymentId}
     */
    public function checkStatus(int $paymentId): JsonResponse
    {
        try {
            $payment = PaymobPayment::findOrFail($paymentId);

            // Security: Only return status to payment owner or admin
            $ownerId = $payment->user_id ?? $payment->order?->user_id;
            if ($ownerId && $ownerId !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to payment status',
                ], 403);
            }

            // ═══════════════════════════════════════════════════════════════
            // READ-ONLY: Fetch remote status for display only.
            // ✅ P0 FIX: Polling NEVER mutates DB. Only the webhook
            //    (processedCallback) can transition payment state.
            //    The reconciliation job handles missed webhooks.
            // ═══════════════════════════════════════════════════════════════
            $paymobStatus = null;
            $paymobSuccess = null;

            if ($payment->status === 'PENDING' && $payment->paymob_intention_id) {
                try {
                    $transactionData = $this->paymobService->getTransactionByIntention(
                        $payment->paymob_intention_id
                    );
                    if ($transactionData && isset($transactionData['status'])) {
                        $paymobStatus = $transactionData['status'];
                        $latestTxn = $transactionData['latest_transaction'] ?? null;
                        $paymobSuccess = $latestTxn['success'] ?? null;
                    }
                } catch (Exception $e) {
                    Log::warning('Could not fetch Paymob status for display', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'status' => $payment->status,
                    'order_payment_status' => $payment->order?->payment_status ?? null,
                    'order_status' => $payment->order?->status ?? null,
                    'transaction_id' => $payment->paymob_transaction_id,
                    'amount' => $payment->amount_cents / 100,
                    'currency' => $payment->currency,
                    'flow' => $payment->flow ?? 'classic_iframe',
                    'updated_at' => $payment->updated_at->toISOString(),
                    'paymob_status' => $paymobStatus,
                    'paymob_success' => $paymobSuccess,
                    'message' => 'Final confirmation is webhook-based. Polling is for display only.',
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found',
            ], 404);
        } catch (Exception $e) {
            Log::error('Payment status check failed', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve payment status',
            ], 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DUAL-FLOW PAYMENT HANDLERS (MOTO + Unified Checkout)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initiate MOTO (Mail Order / Telephone Order) payment.
     * Server-to-server one-click payment with saved card token.
     *
     * @param Order $order
     * @param PaymentMethod $savedCard
     * @param array $billingData
     * @param string $internalOrderId
     * @return array ['success' => bool, 'payment_id' => int, 'redirect_url' => ?string]
     */
    private function initiateMotoPayment(
        Order $order,
        PaymentMethod $savedCard,
        array $billingData,
        string $internalOrderId
    ): array {
        try {
            $amountCents = (int) ($order->total * 100);

            Log::info('💳 MOTO: Attempting one-click payment via Intention API', [
                'order_id' => $order->id,
                'amount_cents' => $amountCents,
                'saved_card_id' => $savedCard->id,
                'card_last4' => $savedCard->card_last_four,
                'card_brand' => $savedCard->card_brand,
            ]);

            // Build items array for Paymob intention (must sum to amountCents exactly)
            $items = $order->items->map(function ($item) {
                return [
                    'name' => $item->product->name ?? $item->product_name ?? 'Product',
                    'amount' => (int) ($item->price * 100),
                    'description' => 'Order item',
                    'quantity' => $item->quantity ?? 1,
                ];
            })->toArray();

            // Add delivery fee as a line item if present
            if ($order->delivery_fee > 0) {
                $items[] = [
                    'name' => 'Delivery Fee',
                    'amount' => (int) ($order->delivery_fee * 100),
                    'description' => 'Delivery fee',
                    'quantity' => 1,
                ];
            }

            // Add tax as a line item if present
            if ($order->tax > 0) {
                $items[] = [
                    'name' => 'Tax',
                    'amount' => (int) ($order->tax * 100),
                    'description' => 'Tax',
                    'quantity' => 1,
                ];
            }

            // Calculate and verify items total matches order total
            $itemsTotal = array_reduce($items, function ($carry, $item) {
                return $carry + ($item['amount'] * $item['quantity']);
            }, 0);

            // Fix rounding mismatches — Paymob requires items to sum exactly to amount
            if ($itemsTotal !== $amountCents) {
                $difference = $amountCents - $itemsTotal;
                Log::warning('⚠️ MOTO items total mismatch - adding adjustment', [
                    'items_total' => $itemsTotal,
                    'order_total' => $amountCents,
                    'difference' => $difference,
                ]);
                $items[] = [
                    'name' => 'Adjustment',
                    'amount' => $difference,
                    'description' => 'Rounding adjustment',
                    'quantity' => 1,
                ];
            }

            // Step 1: Create MOTO Intention (uses MOTO integration ID)
            // This returns payment_keys[0].key needed for the pay request
            $intentionResult = $this->paymobService->createMotoIntention(
                $amountCents,
                $billingData,
                $items,
                $internalOrderId // special_reference
            );

            $paymentToken = $intentionResult['payment_token'];
            $intentionId = $intentionResult['intention_id'];
            $paymobOrderId = $intentionResult['paymob_order_id'];

            // Step 2: Call Pay endpoint with saved card token + MOTO payment token
            $motoResult = $this->paymobService->payWithSavedCardMoto(
                $savedCard->paymob_card_token, // Decrypted automatically by accessor
                $paymentToken
            );

            // Create payment record
            $payment = PaymobPayment::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'internal_order_id' => $internalOrderId,
                'paymob_order_id' => $paymobOrderId,
                'paymob_intention_id' => $intentionId,
                'amount_cents' => $amountCents,
                'currency' => 'EGP',
                'payment_method' => 'CARD',
                'integration_id' => config('services.paymob.moto_integration_id'),
                'status' => 'PENDING',
                'billing_data' => $billingData,
                'flow' => 'moto',
                'special_reference' => $internalOrderId,
                'moto_attempts' => 1,
                'moto_attempted_at' => now(),
            ]);

            // Check MOTO result
            if ($motoResult['requires_3ds']) {
                // MOTO declined, bank requires 3DS authentication
                Log::warning('⚠️ MOTO: 3DS required, falling back to Unified Checkout', [
                    'payment_id' => $payment->id,
                    'order_id' => $order->id,
                ]);

                $payment->markAsFallbackTo3DS('MOTO declined - bank requires 3DS authentication');

                // Fallback to Unified Checkout with saved card pre-filled
                return $this->initiateUnifiedCheckout(
                    $order,
                    $savedCard->paymob_card_token,
                    false, // Card already saved
                    $billingData,
                    $internalOrderId,
                    $payment->id // Reuse payment record
                );
            }

            if (!$motoResult['success']) {
                // MOTO failed (declined by bank, insufficient funds, etc.)
                $payment->markAsFailed(
                    $motoResult['error'] ?? 'MOTO payment declined',
                    $motoResult['data'] ?? []
                );

                Log::error('❌ MOTO: Payment failed', [
                    'payment_id' => $payment->id,
                    'error' => $motoResult['error'] ?? 'Unknown',
                ]);

                throw new Exception($motoResult['error'] ?? 'MOTO payment declined');
            }

            // MOTO SUCCESS!
            Log::info('✅ MOTO: Payment successful', [
                'payment_id' => $payment->id,
                'transaction_id' => $motoResult['transaction_id'],
            ]);

            return [
                'success' => true,
                'payment_id' => $payment->id,
                'flow' => 'moto',
                'requires_redirect' => false,
                'transaction_id' => $motoResult['transaction_id'],
            ];

        } catch (Exception $e) {
            Log::error('MOTO payment exception', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            throw $e;
        }
    }

    /**
     * Initiate Unified Checkout payment (Intention API with 3DS + Tokenization).
     *
     * @param Order $order
     * @param string|null $savedCardToken Optional saved card token to pre-fill
     * @param bool $saveCard Whether to request card tokenization
     * @param array $billingData
     * @param string $internalOrderId
     * @param int|null $existingPaymentId Reuse existing payment record (for MOTO fallback)
     * @return array ['success' => bool, 'payment_id' => int, 'redirect_url' => string]
     */
    private function initiateUnifiedCheckout(
        Order $order,
        ?string $savedCardToken,
        bool $saveCard,
        array $billingData,
        string $internalOrderId,
        ?int $existingPaymentId = null
    ): array {
        try {
            $amountCents = (int) ($order->total * 100);

            Log::info('🔐 Unified Checkout: Creating Intention', [
                'order_id' => $order->id,
                'amount_cents' => $amountCents,
                'save_card' => $saveCard,
                'has_saved_card_token' => !empty($savedCardToken),
                'is_moto_fallback' => $existingPaymentId !== null,
            ]);

            // Build order items for fraud detection
            $items = $order->items->map(function ($item) {
                return [
                    'name' => $item->product->name ?? 'Product',
                    'amount' => (int) ($item->price * 100), // Paymob expects 'amount' not 'amount_cents'
                    'quantity' => $item->quantity,
                ];
            })->toArray();

            // Add delivery fee as a line item if present
            if ($order->delivery_fee > 0) {
                $items[] = [
                    'name' => 'Delivery Fee',
                    'amount' => (int) ($order->delivery_fee * 100),
                    'quantity' => 1,
                ];
            }

            // Add tax as a line item if present
            if ($order->tax > 0) {
                $items[] = [
                    'name' => 'Tax',
                    'amount' => (int) ($order->tax * 100),
                    'quantity' => 1,
                ];
            }

            // Calculate and verify items total
            $itemsTotal = array_reduce($items, function ($carry, $item) {
                return $carry + ($item['amount'] * $item['quantity']);
            }, 0);

            // CRITICAL FIX: If items don't match total (rounding errors), add adjustment
            if ($itemsTotal !== $amountCents) {
                $difference = $amountCents - $itemsTotal;
                Log::warning('⚠️ Items total mismatch - adding adjustment', [
                    'items_total' => $itemsTotal,
                    'order_total' => $amountCents,
                    'difference' => $difference,
                ]);

                $items[] = [
                    'name' => 'Adjustment',
                    'amount' => $difference,
                    'quantity' => 1,
                ];

                $itemsTotal = $amountCents; // Force match
            }

            Log::info('💰 Items calculation', [
                'items_count' => count($items),
                'items_total_cents' => $itemsTotal,
                'order_total_cents' => $amountCents,
                'match' => $itemsTotal === $amountCents,
                'items' => $items,
            ]);

            // Build intention data
            $intentionData = [
                'amount_cents' => $amountCents,
                'billing' => [
                    'first_name' => $billingData['first_name'] ?? 'Guest',
                    'last_name' => $billingData['last_name'] ?? 'User',
                    'email' => $billingData['email'] ?? 'guest@example.com',
                    'phone' => $billingData['phone_number'] ?? '+201000000000',
                    'country' => 'EG',
                    'city' => $billingData['city'] ?? 'Cairo',
                    'street' => $billingData['street'] ?? 'N/A',
                    'building' => $billingData['building'] ?? 'NA',
                    'floor' => $billingData['floor'] ?? 'NA',
                    'apartment' => $billingData['apartment'] ?? 'NA',
                ],
                'items' => $items,
                'internal_reference' => $internalOrderId . '-' . uniqid(), // Add unique suffix to prevent duplicates
                'redirection_url' => config('app.paymob_redirect_url', config('app.url') . '/payment-return'),
            ];

            // Pre-fill saved card if provided
            if ($savedCardToken) {
                $intentionData['saved_card_token'] = $savedCardToken;
            }

            // ✅ FIX: Pass save_card flag to Paymob via extras
            // This enables card tokenization in the Unified Checkout flow.
            // Without this, Paymob won't return a token in the webhook.
            if ($saveCard) {
                $intentionData['extras'] = ['save_card' => true];
            }

            // Create Paymob Intention
            $intention = $this->paymobService->createIntention($intentionData);

            // Create or update payment record
            if ($existingPaymentId) {
                // MOTO fallback scenario - update existing payment
                $payment = PaymobPayment::find($existingPaymentId);
                $payment->update([
                    'flow' => 'unified_3ds',
                    'paymob_intention_id' => $intention['intention_id'],
                ]);
            } else {
                // New Unified Checkout payment
                $payment = PaymobPayment::create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'internal_order_id' => $internalOrderId,
                    'paymob_order_id' => null, // Intention API doesn't return order_id upfront
                    'amount_cents' => $amountCents,
                    'currency' => 'EGP',
                    'payment_method' => 'CARD',
                    'save_card_requested' => $saveCard,
                    'integration_id' => config('services.paymob.integration_id_3ds'),
                    'status' => 'PENDING',
                    'billing_data' => $billingData,
                    'flow' => 'unified_3ds',
                    'paymob_intention_id' => $intention['intention_id'],
                    'special_reference' => $intentionData['internal_reference'],
                ]);
            }

            Log::info('✅ Unified Checkout: Intention created', [
                'payment_id' => $payment->id,
                'intention_id' => $intention['intention_id'],
                'checkout_url' => substr($intention['unified_checkout_url'], 0, 50) . '...',
            ]);

            return [
                'success' => true,
                'payment_id' => $payment->id,
                'flow' => 'unified_3ds',
                'requires_redirect' => true,
                'redirect_url' => $intention['unified_checkout_url'],
                'intention_id' => $intention['intention_id'],
            ];

        } catch (Exception $e) {
            Log::error('Unified Checkout creation failed', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            throw $e;
        }
    }

    /**
     * Initiate classic iframe flow (backward compatibility).
     * Used when dual-flow features are disabled or for wallet payments.
     *
     * @param Order $order
     * @param string $paymentMethod
     * @param array $billingData
     * @param string $internalOrderId
     * @param bool $saveCard
     * @return JsonResponse
     */
    private function initiateClassicFlow(
        Order $order,
        string $paymentMethod,
        array $billingData,
        string $internalOrderId,
        bool $saveCard
    ): JsonResponse {
        try {
            $amountCents = (int) ($order->total * 100);

            Log::info('🔄 Classic Flow: Using legacy iframe', [
                'order_id' => $order->id,
                'payment_method' => $paymentMethod,
                'save_card' => $saveCard,
            ]);

            // Step 1: Authenticate with Paymob
            $authToken = $this->paymobService->authenticate();

            // Step 2: Register order
            $paymobOrderId = $this->paymobService->registerOrder(
                $authToken,
                $amountCents,
                $internalOrderId
            );

            // Step 3: Generate payment key
            $paymentToken = $this->paymobService->generatePaymentKeyWithCardSave(
                $authToken,
                $amountCents,
                $paymobOrderId,
                $billingData,
                $paymentMethod,
                $saveCard
            );

            // Store payment record
            $payment = PaymobPayment::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'internal_order_id' => $internalOrderId,
                'paymob_order_id' => $paymobOrderId,
                'amount_cents' => $amountCents,
                'currency' => 'EGP',
                'payment_method' => $paymentMethod,
                'save_card_requested' => is_array($paymentToken) ? $paymentToken['save_card_requested'] : $saveCard,
                'integration_id' => $this->paymobService->getIntegrationId($paymentMethod),
                'status' => 'PENDING',
                'billing_data' => $billingData,
                'flow' => 'classic_iframe',
            ]);

            // Get iframe URL
            $token = is_array($paymentToken) ? $paymentToken['payment_token'] : $paymentToken;
            $iframeUrl = $this->paymobService->getIframeUrl($token);

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_id' => $payment->id,
                    'flow' => 'classic_iframe',
                    'iframe_url' => $iframeUrl,
                    'amount' => $order->total,
                    'currency' => 'EGP',
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Classic flow initiation failed', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            throw $e;
        }
    }
}
