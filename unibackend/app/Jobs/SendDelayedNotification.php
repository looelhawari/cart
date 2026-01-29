<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendDelayedNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private int $notificationId,
        private int $userId
    ) {
        $this->onQueue('default');
    }

    /**
     * Execute the job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        $notification = Notification::find($this->notificationId);
        $user = User::find($this->userId);

        if (!$notification || !$user) {
            Log::warning('SendDelayedNotification: Notification or user not found', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->userId,
            ]);
            return;
        }

        // Re-check quiet hours (in case settings changed)
        $prefs = NotificationPreference::getOrCreateForUser($this->userId);
        $quietCheck = $prefs->shouldSendNow();

        if (!$quietCheck['send']) {
            // Still in quiet hours, reschedule
            Log::info('SendDelayedNotification: Still in quiet hours, rescheduling', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->userId,
                'delay_until' => $quietCheck['delay_until']?->toISOString(),
            ]);

            self::dispatch($this->notificationId, $this->userId)
                ->delay($quietCheck['delay_until']);
            return;
        }

        // Check if user still wants this type of notification
        if (!$prefs->shouldReceive($notification->type)) {
            Log::info('SendDelayedNotification: User opted out', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->userId,
                'type' => $notification->type,
            ]);
            return;
        }

        // Send the notification
        $success = $pushService->dispatchPushToUser($notification, $user);

        Log::info('SendDelayedNotification: ' . ($success ? 'Sent' : 'Failed'), [
            'notification_id' => $this->notificationId,
            'user_id' => $this->userId,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendDelayedNotification: Failed', [
            'notification_id' => $this->notificationId,
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
        ]);
    }
}
