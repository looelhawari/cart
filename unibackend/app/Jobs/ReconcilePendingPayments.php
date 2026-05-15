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

        // DRY: identical reconcile flow runs in three places (webhook miss,
        // cron, user polling). Centralised in PaymentConfirmationService so
        // amount/currency checks, lockForUpdate, and the auth-vs-capture
        // quirks can't drift apart between callers.
        $outcome = $confirmationService->reconcileFromPaymob(
            $payment,
            $transactionData,
            'reconciliation',
        );

        return match ($outcome) {
            'confirmed' => 'reconciled',
            'failed'    => 'failed',
            default     => 'skipped',
        };
    }
}
