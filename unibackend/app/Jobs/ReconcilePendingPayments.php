<?php

namespace App\Jobs;

use App\Models\PaymobPayment;
use App\Services\PaymobService;
use App\Services\PaymentConfirmationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * P1: Reconciliation Scheduled Job — "Webhook Missed" Safety Net
 *
 * Runs every 5 minutes via Laravel scheduler.
 * Finds PENDING payments older than 10 minutes (webhook should have arrived by now)
 * and queries Paymob server-to-server to reconcile.
 *
 * This replaces the old polling→DB mutation that was removed from checkStatus().
 * Only processes Unified Checkout (intention-based) payments that have a
 * paymob_intention_id — classic iframe payments without an intention_id
 * must rely on the webhook (no server-to-server inquiry available).
 *
 * Key Differences from old polling auto-update:
 * - Runs in background job (not user-triggered)
 * - Uses lockForUpdate to prevent race with webhook
 * - Verifies is_capture before confirming
 * - Logs discrepancies for manual review
 * - Rate-limited by scheduler (every 5 min, not every 2 sec per user)
 */
class ReconcilePendingPayments implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Payments older than this (minutes) are eligible for reconciliation.
     * Gives webhook enough time to arrive first.
     */
    private const STALE_AFTER_MINUTES = 10;

    /**
     * Maximum age of payments to reconcile (hours).
     * Payments older than this are left for manual review.
     */
    private const MAX_AGE_HOURS = 24;

    /**
     * Maximum payments to process per run to avoid long-running jobs.
     */
    private const BATCH_SIZE = 50;

    public function handle(PaymobService $paymobService, PaymentConfirmationService $confirmationService): void
    {
        $stalePayments = PaymobPayment::where('status', 'PENDING')
            ->whereNotNull('paymob_intention_id')
            ->where('created_at', '<=', now()->subMinutes(self::STALE_AFTER_MINUTES))
            ->where('created_at', '>=', now()->subHours(self::MAX_AGE_HOURS))
            ->orderBy('created_at', 'asc')
            ->limit(self::BATCH_SIZE)
            ->get();

        if ($stalePayments->isEmpty()) {
            return;
        }

        Log::info('🔄 Reconciliation: Processing stale PENDING payments', [
            'count' => $stalePayments->count(),
        ]);

        $reconciled = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($stalePayments as $payment) {
            try {
                $result = $this->reconcilePayment($payment, $paymobService, $confirmationService);
                if ($result === 'reconciled') {
                    $reconciled++;
                } elseif ($result === 'failed') {
                    $failed++;
                } else {
                    $skipped++;
                }
            } catch (\Exception $e) {
                Log::error('❌ Reconciliation: Error processing payment', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
                $skipped++;
            }
        }

        Log::info('✅ Reconciliation complete', [
            'reconciled' => $reconciled,
            'failed' => $failed,
            'skipped' => $skipped,
        ]);
    }

    private function reconcilePayment(PaymobPayment $payment, PaymobService $paymobService, PaymentConfirmationService $confirmationService): string
    {
        $transactionData = $paymobService->getTransactionByIntention(
            $payment->paymob_intention_id
        );

        if (!$transactionData || !isset($transactionData['status'])) {
            Log::warning('⚠️ Reconciliation: Could not fetch Paymob status', [
                'payment_id' => $payment->id,
                'intention_id' => $payment->paymob_intention_id,
            ]);
            return 'skipped';
        }

        $paymobStatus = $transactionData['status'];
        $latestTxn = $transactionData['latest_transaction'] ?? null;

        // Not yet processed at Paymob — skip for now
        if ($paymobStatus !== 'PROCESSED' || !$latestTxn) {
            return 'skipped';
        }

        $txnSuccess = (bool) ($latestTxn['success'] ?? false);
        $txnId = (string) ($latestTxn['id'] ?? '');
        $isCapture = (bool) ($latestTxn['is_capture'] ?? false);
        $isAuth = (bool) ($latestTxn['is_auth'] ?? false);

        // Paymob Unified Checkout quirk: is_capture can be false even when captured
        if ($txnSuccess && !$isCapture) {
            $migsStatus  = strtoupper(trim($latestTxn['data']['migs_order']['status'] ?? ''));
            $capturedAmt = (float) ($latestTxn['data']['captured_amount'] ?? $latestTxn['captured_amount'] ?? 0);
            $orderPaySt  = strtoupper(trim($latestTxn['order']['payment_status'] ?? ''));

            if ($migsStatus === 'CAPTURED' || $capturedAmt > 0 || $orderPaySt === 'PAID') {
                Log::info('🔧 Reconciliation: Paymob quirk — overriding is_capture to true', [
                    'payment_id'  => $payment->id,
                    'migs_status' => $migsStatus,
                    'captured_amt' => $capturedAmt,
                ]);
                $isCapture = true;
            }
        }

        // Verify amount
        $txnAmount = (int) ($latestTxn['amount_cents'] ?? 0);
        if ($txnAmount !== (int) $payment->amount_cents) {
            Log::error('🚨 Reconciliation: Amount mismatch!', [
                'payment_id' => $payment->id,
                'expected' => $payment->amount_cents,
                'paymob_amount' => $txnAmount,
            ]);
            return 'skipped'; // Don't auto-fix amount mismatches — manual review required
        }

        // Verify currency
        $txnCurrency = strtoupper(trim((string) ($latestTxn['currency'] ?? '')));
        $expectedCurrency = strtoupper(trim((string) $payment->currency));
        if ($txnCurrency !== '' && $txnCurrency !== $expectedCurrency) {
            Log::error('🚨 Reconciliation: Currency mismatch!', [
                'payment_id' => $payment->id,
                'expected' => $expectedCurrency,
                'paymob_currency' => $txnCurrency,
            ]);
            return 'skipped';
        }

        return DB::transaction(function () use ($payment, $txnSuccess, $txnId, $isCapture, $isAuth, $latestTxn, $confirmationService) {
            // Lock the row to prevent race with webhook
            $payment = PaymobPayment::where('id', $payment->id)
                ->lockForUpdate()
                ->first();

            // Webhook may have processed it while we were querying Paymob
            if (!$payment || $payment->status !== 'PENDING') {
                return 'skipped';
            }

            if (!$txnSuccess) {
                // Paymob says failed — use centralised failure handler
                $confirmationService->failPayment(
                    $payment,
                    $txnId,
                    'Reconciliation: Paymob reports failure',
                    $latestTxn,
                    'reconciliation'
                );
                return 'failed';
            }

            // Authorized but not captured — don't confirm
            if ($isAuth && !$isCapture) {
                $payment->markAsPending('Reconciliation: Authorized but not captured', $latestTxn);
                Log::warning('⚠️ Reconciliation: Auth-only payment, awaiting capture', [
                    'payment_id' => $payment->id,
                ]);
                return 'skipped';
            }

            if (!$isCapture) {
                $confirmationService->failPayment(
                    $payment,
                    $txnId,
                    'Reconciliation: Success but not captured',
                    $latestTxn,
                    'reconciliation'
                );
                return 'failed';
            }

            // ✅ Success + captured — use centralised confirmation handler
            $confirmationService->confirmPayment(
                $payment,
                $txnId,
                $latestTxn,
                'reconciliation'
            );

            Log::info('✅ Reconciliation: Payment confirmed', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'transaction_id' => $txnId,
                'was_stale_minutes' => now()->diffInMinutes($payment->created_at),
            ]);

            return 'reconciled';
        });
    }
}
