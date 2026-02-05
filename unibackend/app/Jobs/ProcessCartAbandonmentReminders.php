<?php

namespace App\Jobs;

use App\Models\CartReminder;
use App\Models\Cart;
use App\Models\User;
use App\Services\EnterpriseNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Process cart abandonment reminders.
 * Schedule: Run every 15 minutes
 */
class ProcessCartAbandonmentReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(EnterpriseNotificationService $notificationService): void
    {
        // Get all non-converted cart reminders
        $reminders = CartReminder::where('converted', false)
            ->where('cart_item_count', '>', 0)
            ->get();

        foreach ($reminders as $reminder) {
            $this->processReminder($reminder, $notificationService);
        }
    }

    protected function processReminder(CartReminder $reminder, EnterpriseNotificationService $notificationService): void
    {
        $lastActivity = $reminder->last_cart_activity;
        if (!$lastActivity) return;

        $now = now();
        $hoursSinceActivity = $lastActivity->diffInHours($now);

        $cartTotal = (float) $reminder->cart_total;

        // 1-hour reminder
        if ($hoursSinceActivity >= 1 && $hoursSinceActivity < 24 && !$reminder->reminder_1_sent_at) {
            $notificationService->notifyCartAbandoned1h(
                $reminder->user_id,
                $reminder->cart_item_count,
                $cartTotal
            );
            $reminder->update(['reminder_1_sent_at' => $now]);
            Log::info('CartAbandonment: 1h reminder sent', ['user_id' => $reminder->user_id]);
        }

        // 24-hour reminder
        if ($hoursSinceActivity >= 24 && $hoursSinceActivity < 72 && !$reminder->reminder_2_sent_at) {
            $notificationService->notifyCartAbandoned24h(
                $reminder->user_id,
                $reminder->cart_item_count,
                $cartTotal
            );
            $reminder->update(['reminder_2_sent_at' => $now]);
            Log::info('CartAbandonment: 24h reminder sent', ['user_id' => $reminder->user_id]);
        }

        // 72-hour reminder (final)
        if ($hoursSinceActivity >= 72 && !$reminder->reminder_3_sent_at) {
            $notificationService->notifyCartAbandoned24h(
                $reminder->user_id,
                $reminder->cart_item_count,
                $cartTotal
            );
            $reminder->update(['reminder_3_sent_at' => $now]);
            Log::info('CartAbandonment: 72h final reminder sent', ['user_id' => $reminder->user_id]);
        }
    }
}
