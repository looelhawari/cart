<?php

namespace App\Jobs;

use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendOrderNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying.
     */
    public int $backoff = 10;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private int $userId,
        private string $orderId,
        private string $orderNumber,
        private string $status,
        private ?string $reason = null
    ) {
        $this->onQueue('high'); // High priority for order notifications
    }

    /**
     * Execute the job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        try {
            $notification = $pushService->sendOrderStatusNotification(
                $this->userId,
                $this->orderId,
                $this->orderNumber,
                $this->status,
                $this->reason
            );

            Log::info('SendOrderNotification: Sent', [
                'notification_id' => $notification?->id,
                'user_id' => $this->userId,
                'order_number' => $this->orderNumber,
                'status' => $this->status,
            ]);
        } catch (\Exception $e) {
            Log::error('SendOrderNotification: Failed', [
                'user_id' => $this->userId,
                'order_number' => $this->orderNumber,
                'status' => $this->status,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendOrderNotification: Job failed', [
            'user_id' => $this->userId,
            'order_number' => $this->orderNumber,
            'status' => $this->status,
            'error' => $exception->getMessage(),
        ]);
    }
}
