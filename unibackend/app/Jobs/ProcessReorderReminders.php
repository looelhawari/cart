<?php

namespace App\Jobs;

use App\Models\UserPurchasePattern;
use App\Services\EnterpriseNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Process reorder reminders based on user purchase patterns.
 * Schedule: Run daily at 10 AM
 */
class ProcessReorderReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(EnterpriseNotificationService $notificationService): void
    {
        $today = now()->startOfDay();

        // Get patterns where predicted purchase date is today or in the past
        // and reminder hasn't been sent recently
        $patterns = UserPurchasePattern::with(['user', 'product'])
            ->where('reorder_reminder_sent', false)
            ->where('next_predicted_purchase', '<=', $today)
            ->where('purchase_count', '>=', 2) // Only for repeat buyers
            ->whereNull('last_reminder_sent_at')
            ->orWhere('last_reminder_sent_at', '<', now()->subDays(7)) // Not sent in last 7 days
            ->limit(1000) // Process in batches
            ->get();

        foreach ($patterns as $pattern) {
            if (!$pattern->user || !$pattern->product) continue;

            // Check if product is still active
            if (!$pattern->product->is_active || $pattern->product->stock <= 0) {
                continue;
            }

            // Calculate days since last purchase
            $daysSincePurchase = $pattern->last_purchased_at
                ? $pattern->last_purchased_at->diffInDays(now())
                : null;

            $lastOrdered = $daysSincePurchase
                ? ($daysSincePurchase == 1 ? 'yesterday' : "{$daysSincePurchase} days ago")
                : 'a while ago';

            $notificationService->notifyReorderReminder(
                $pattern->user_id,
                $pattern->product->name,
                $pattern->product_id,
                $lastOrdered
            );

            $pattern->reorder_reminder_sent = true;
            $pattern->last_reminder_sent_at = now();
            $pattern->save();

            Log::info('ReorderReminder: Sent', [
                'user_id' => $pattern->user_id,
                'product_id' => $pattern->product_id,
            ]);
        }
    }
}
