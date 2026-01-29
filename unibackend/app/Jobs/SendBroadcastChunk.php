<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\NotificationDelivery;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendBroadcastChunk implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 30;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private int $notificationId,
        private array $userIds,
        private string $notificationType
    ) {
        $this->onQueue('low');
    }

    /**
     * Execute the job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        $notification = Notification::find($this->notificationId);
        if (!$notification) {
            Log::warning('SendBroadcastChunk: Notification not found', [
                'notification_id' => $this->notificationId,
            ]);
            return;
        }

        // Load users with their preferences (eager load)
        $users = User::with('notificationPreferences')
            ->whereIn('id', $this->userIds)
            ->whereNotNull('push_tokens')
            ->get();

        $messages = [];
        $deliveryRecords = [];
        $delayedUsers = [];

        foreach ($users as $user) {
            // Check if user wants this notification type
            $prefs = $user->notificationPreferences ?? NotificationPreference::getOrCreateForUser($user->id);

            if (!$prefs->shouldReceive($this->notificationType)) {
                continue;
            }

            // Check quiet hours - if in quiet hours, schedule for later
            $quietCheck = $prefs->shouldSendNow();
            if (!$quietCheck['send']) {
                $delayedUsers[] = [
                    'user_id' => $user->id,
                    'delay_until' => $quietCheck['delay_until'],
                ];
                continue;
            }

            $tokens = $user->push_tokens ?? [];

            // Determine localized content
            $language = $user->language ?? 'en';
            $title = $notification->getLocalizedTitle($language);
            $body = $notification->getLocalizedMessage($language);

            foreach ($tokens as $tokenData) {
                $pushToken = $tokenData['token'] ?? null;

                if (!$pushToken || !str_starts_with($pushToken, 'ExponentPushToken[')) {
                    continue;
                }

                $messages[] = [
                    'to' => $pushToken,
                    'sound' => 'default',
                    'title' => $title,
                    'body' => $body,
                    'data' => array_merge($notification->data ?? [], [
                        'notificationId' => $notification->id,
                        'type' => $notification->type,
                        'actionTarget' => $notification->action_target,
                    ]),
                    'priority' => 'high',
                    'channelId' => $pushService->getChannelId($notification->type),
                ];

                $deliveryRecords[] = [
                    'notification_id' => $notification->id,
                    'user_id' => $user->id,
                    'device_token' => $pushToken,
                    'platform' => $tokenData['device_type'] ?? 'unknown',
                    'status' => 'pending',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Dispatch delayed notifications for users in quiet hours
        foreach ($delayedUsers as $delayed) {
            SendDelayedNotification::dispatch(
                $this->notificationId,
                $delayed['user_id']
            )->delay($delayed['delay_until']);
        }

        if (empty($messages)) {
            Log::info('SendBroadcastChunk: No messages to send', [
                'notification_id' => $this->notificationId,
                'users_in_chunk' => count($this->userIds),
                'delayed_users' => count($delayedUsers),
            ]);
            return;
        }

        // Bulk insert delivery records
        NotificationDelivery::insert($deliveryRecords);

        // Send messages via push service
        $result = $pushService->sendBatch($messages);

        // Schedule receipt checking if we have tickets
        if (!empty($result['tickets'])) {
            CheckPushReceipts::dispatch($result['tickets'], $this->notificationId)
                ->delay(now()->addMinutes(5));
        }

        Log::info('SendBroadcastChunk: Processed', [
            'notification_id' => $this->notificationId,
            'users_in_chunk' => count($this->userIds),
            'messages_sent' => $result['sent_count'] ?? 0,
            'delayed_users' => count($delayedUsers),
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendBroadcastChunk: Failed', [
            'notification_id' => $this->notificationId,
            'user_count' => count($this->userIds),
            'error' => $exception->getMessage(),
        ]);
    }
}
