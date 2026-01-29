<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessBroadcastNotification implements ShouldQueue
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
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private int $notificationId
    ) {
        $this->onQueue('low'); // Broadcasts are lower priority
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $notification = Notification::find($this->notificationId);
        if (!$notification || !$notification->is_broadcast) {
            Log::warning('ProcessBroadcastNotification: Notification not found or not a broadcast', [
                'notification_id' => $this->notificationId,
            ]);
            return;
        }

        $notification->update(['push_status' => 'processing']);

        $type = $notification->type;
        $chunkSize = 500;
        $totalDispatched = 0;

        // Use chunkById for memory efficiency with 50k+ users
        User::whereNotNull('push_tokens')
            ->whereRaw("JSON_LENGTH(push_tokens) > 0")
            ->select(['id'])
            ->chunkById($chunkSize, function ($users) use ($notification, $type, &$totalDispatched) {
                $userIds = $users->pluck('id')->toArray();

                // Dispatch a separate job for each chunk
                SendBroadcastChunk::dispatch(
                    $notification->id,
                    $userIds,
                    $type
                );

                $totalDispatched += count($userIds);
            });

        // Update notification with metadata
        $notification->update([
            'data' => array_merge($notification->data ?? [], [
                'total_recipients' => $totalDispatched,
                'chunks' => ceil($totalDispatched / $chunkSize),
                'started_at' => now()->toISOString(),
            ]),
        ]);

        Log::info('ProcessBroadcastNotification: Queued', [
            'notification_id' => $notification->id,
            'total_chunks' => ceil($totalDispatched / $chunkSize),
            'total_users' => $totalDispatched,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessBroadcastNotification: Failed', [
            'notification_id' => $this->notificationId,
            'error' => $exception->getMessage(),
        ]);

        $notification = Notification::find($this->notificationId);
        if ($notification) {
            $notification->update([
                'push_status' => 'failed',
                'push_error' => $exception->getMessage(),
            ]);
        }
    }
}
