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

            // Convert amount to cents
            $amountCents = (int) ($order->total * 100);

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
     * Processed callback from Paymob (SOURCE OF TRUTH).
     *
     * POST /api/v1/paymob/processed
     */
    public function processedCallback(Request $request): JsonResponse
    {
        try {
            $data = $request->all();

            Log::info('Paymob processed callback received', ['data' => $data]);

            // Step 1: Verify HMAC
            if (!$this->paymobService->verifyHmac($data)) {
                Log::error('Invalid HMAC signature in callback');
                return response()->json(['message' => 'Invalid signature'], 403);
            }

            // Step 2: Find payment by Paymob order ID
            $paymobOrderId = $data['order']['id'] ?? null;

            if (!$paymobOrderId) {
                Log::error('No order ID in callback');
                return response()->json(['message' => 'Invalid data'], 400);
            }

            $payment = PaymobPayment::where('paymob_order_id', $paymobOrderId)->first();

            if (!$payment) {
                Log::error('Payment not found', ['paymob_order_id' => $paymobOrderId]);
                return response()->json(['message' => 'Payment not found'], 404);
            }

            // Prevent duplicate processing (idempotency)
            if ($payment->status !== 'PENDING') {
                Log::info('Payment already processed', [
                    'payment_id' => $payment->id,
                    'status' => $payment->status,
                ]);
                return response()->json(['message' => 'Already processed'], 200);
            }

            // Step 3: Validate transaction data
            $success = $data['success'] ?? false;
            $transactionId = $data['id'] ?? null;
            $amountCents = $data['amount_cents'] ?? 0;

            // Verify amount matches
            if ($amountCents != $payment->amount_cents) {
                Log::error('Amount mismatch', [
                    'expected' => $payment->amount_cents,
                    'received' => $amountCents,
                ]);
                $payment->markAsFailed('Amount mismatch', $data);
                return response()->json(['message' => 'Amount mismatch'], 400);
            }

            DB::beginTransaction();

            // Step 4: Update payment status
            if ($success && $transactionId) {
                $payment->markAsPaid($transactionId, $data);

                // Update order
                $order = $payment->order;
                $order->update([
                    'payment_status' => 'completed',
                    'status' => 'confirmed',
                ]);

                Log::info('Payment marked as paid', [
                    'payment_id' => $payment->id,
                    'order_id' => $order->id,
                    'transaction_id' => $transactionId,
                ]);
            } else {
                $errorMessage = $data['data']['message'] ?? 'Payment failed';
                $payment->markAsFailed($errorMessage, $data);

                // Update order
                $order = $payment->order;
                $order->update([
                    'payment_status' => 'failed',
                ]);

                Log::warning('Payment marked as failed', [
                    'payment_id' => $payment->id,
                    'error' => $errorMessage,
                ]);
            }

            DB::commit();

            return response()->json(['message' => 'Callback processed'], 200);

        } catch (Exception $e) {
            DB::rollBack();

            Log::error('Processed callback error', [
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

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => $payment->status,
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
