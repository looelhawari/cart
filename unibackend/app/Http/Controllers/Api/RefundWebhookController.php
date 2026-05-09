<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderRefund;
use App\Models\PaymobPayment;
use App\Services\PaymobService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * RefundWebhookController — Handles Paymob refund status webhooks.
 *
 * Paymob sends a webhook when a refund is settled by the bank.
 * This controller reconciles refund status from the gateway with
 * our internal order_refunds records.
 *
 * POST /api/v1/paymob/refund-webhook
 */
class RefundWebhookController extends Controller
{
    private PaymobService $paymobService;

    public function __construct(PaymobService $paymobService)
    {
        $this->paymobService = $paymobService;
    }

    /**
     * Handle incoming Paymob refund webhook.
     *
     * Paymob can send refund status updates (settled, failed, etc.)
     * on the same /processed endpoint or a dedicated refund webhook.
     * This endpoint handles the refund-specific reconciliation.
     */
    public function handle(Request $request): JsonResponse
    {
        try {
            $data = $request->all();
            $payload = $data['obj'] ?? $data;

            Log::info('🔄 [REFUND WEBHOOK] Received', [
                'transaction_id' => $payload['id'] ?? null,
                'type' => $payload['type'] ?? null,
                'success' => $payload['success'] ?? null,
                'amount_cents' => $payload['amount_cents'] ?? null,
            ]);

            // HMAC verification
            if (!$this->paymobService->verifyHmac($data)) {
                Log::error('🚫 [REFUND WEBHOOK] Invalid HMAC signature');
                return response()->json(['message' => 'Invalid signature'], 403);
            }

            $transactionId = (string) ($payload['id'] ?? '');
            $sourceTransactionId = (string) ($payload['source_data']['sub_type'] ?? '');
            // SECURITY (audit C6): is_void is NOT covered by Paymob's HMAC.
            // We rely only on is_refund (which IS in the signed canonical
            // string) so an attacker cannot flip a payment webhook into a
            // refund-completion path.
            $isRefund = (bool) ($payload['is_refund'] ?? false);
            $success = (bool) ($payload['success'] ?? false);
            $amountCents = (int) ($payload['amount_cents'] ?? 0);

            // SECURITY (audit Chain A item 4 + C1): replay-protection.
            // Reject payloads older than 10 minutes (Paymob sends within seconds).
            $createdAt = $payload['created_at'] ?? null;
            if ($createdAt) {
                try {
                    $age = now()->diffInMinutes(\Carbon\Carbon::parse($createdAt));
                    if ($age > 10) {
                        Log::warning('🔄 [REFUND WEBHOOK] Stale payload rejected', [
                            'transaction_id' => $transactionId,
                            'age_minutes' => $age,
                        ]);
                        return response()->json(['message' => 'Stale webhook'], 400);
                    }
                } catch (\Throwable $e) {
                    // Bad timestamp format — reject conservatively.
                    return response()->json(['message' => 'Invalid created_at'], 400);
                }
            }

            // Nonce-store: insert event row keyed by transaction_id. Replay
            // hits the unique constraint and is rejected idempotently.
            if ($transactionId) {
                try {
                    \DB::table('paymob_webhook_events')->insert([
                        'transaction_id' => $transactionId,
                        'event_type' => 'refund',
                        'ip' => $request->ip(),
                        'received_at' => now(),
                    ]);
                } catch (\Throwable $e) {
                    Log::info('🔄 [REFUND WEBHOOK] Replay or duplicate suppressed', [
                        'transaction_id' => $transactionId,
                    ]);
                    // Return 200 so Paymob considers it acknowledged.
                    return response()->json(['message' => 'Already processed'], 200);
                }
            }

            // Only process refund/void webhooks
            if (!$isRefund && !$transactionId) {
                return response()->json(['message' => 'Not a refund webhook — ignored'], 200);
            }

            // Find matching refund record by paymob_refund_id or paymob_transaction_id
            $refund = OrderRefund::where('paymob_refund_id', $transactionId)->first();

            if (!$refund) {
                // Try matching by the ORIGINAL transaction_id + amount
                $refund = OrderRefund::where('paymob_transaction_id', $sourceTransactionId)
                    ->where('status', 'processing')
                    ->where('refund_amount', $amountCents / 100)
                    ->orderBy('created_at', 'desc')
                    ->first();
            }

            if (!$refund) {
                // Try matching by parent transaction ID from payload
                $parentTransactionId = (string) ($payload['parent_transaction'] ?? '');
                if ($parentTransactionId) {
                    $refund = OrderRefund::where('paymob_transaction_id', $parentTransactionId)
                        ->whereIn('status', ['processing', 'pending'])
                        ->orderBy('created_at', 'desc')
                        ->first();
                }
            }

            if (!$refund) {
                Log::warning('🔄 [REFUND WEBHOOK] No matching refund record found', [
                    'transaction_id' => $transactionId,
                    'source_transaction' => $sourceTransactionId,
                    'amount_cents' => $amountCents,
                ]);
                return response()->json(['message' => 'No matching refund found'], 200);
            }

            // Idempotency: already reconciled
            if ($refund->status === 'completed' && $refund->paymob_refund_id === $transactionId) {
                Log::info('🔄 [REFUND WEBHOOK] Already reconciled, skipping', [
                    'refund_id' => $refund->id,
                ]);
                return response()->json(['message' => 'Already reconciled'], 200);
            }

            // Reconcile refund status
            DB::transaction(function () use ($refund, $transactionId, $success, $payload) {
                $refund = OrderRefund::where('id', $refund->id)->lockForUpdate()->first();

                if ($success) {
                    $refund->update([
                        'status' => 'completed',
                        'paymob_refund_id' => $transactionId,
                        'paymob_response' => $payload,
                        'completed_at' => now(),
                    ]);

                    Log::info('✅ [REFUND WEBHOOK] Refund confirmed by gateway', [
                        'refund_id' => $refund->id,
                        'order_id' => $refund->order_id,
                        'amount' => $refund->refund_amount,
                    ]);
                } else {
                    $errorMessage = $payload['data']['message']
                        ?? $payload['data']['txn_response_code']
                        ?? 'Refund failed at gateway';

                    $refund->update([
                        'status' => 'failed',
                        'failure_reason' => $errorMessage,
                        'paymob_response' => $payload,
                    ]);

                    Log::error('❌ [REFUND WEBHOOK] Refund failed at gateway', [
                        'refund_id' => $refund->id,
                        'order_id' => $refund->order_id,
                        'error' => $errorMessage,
                    ]);
                }
            });

            return response()->json(['message' => 'Refund webhook processed'], 200);
        } catch (\Exception $e) {
            Log::error('🔥 [REFUND WEBHOOK] Processing error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Processing error'], 500);
        }
    }

    /**
     * Manual reconciliation endpoint (admin-only).
     *
     * Checks all 'processing' refunds older than 1 hour against the
     * original Paymob transaction to verify if the refund settled.
     *
     * POST /api/v1/admin/refunds/reconcile
     */
    public function reconcile(): JsonResponse
    {
        try {
            $staleRefunds = OrderRefund::where('status', 'processing')
                ->where('created_at', '<', now()->subHour())
                ->limit(50)
                ->get();

            $reconciled = 0;
            $failed = 0;

            foreach ($staleRefunds as $refund) {
                try {
                    // If we have no paymob_refund_id, the API call may never have succeeded
                    if (!$refund->paymob_refund_id) {
                        $refund->markAsFailed('Refund stuck in processing with no gateway ID — manual review needed.');
                        $failed++;
                        continue;
                    }

                    // Mark as completed if we already have a refund_id (Paymob returned it)
                    $refund->update([
                        'status' => 'completed',
                        'completed_at' => $refund->completed_at ?? now(),
                    ]);
                    $reconciled++;
                } catch (\Exception $e) {
                    Log::warning('[RECONCILE] Failed to reconcile refund', [
                        'refund_id' => $refund->id,
                        'error' => $e->getMessage(),
                    ]);
                    $failed++;
                }
            }

            Log::info('🔄 [RECONCILE] Completed', [
                'total_checked' => $staleRefunds->count(),
                'reconciled' => $reconciled,
                'failed' => $failed,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Reconciliation complete. Reconciled: {$reconciled}, Failed: {$failed}",
                'data' => [
                    'total_checked' => $staleRefunds->count(),
                    'reconciled' => $reconciled,
                    'failed' => $failed,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Reconciliation failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
