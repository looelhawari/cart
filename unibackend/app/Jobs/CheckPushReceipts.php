<?php

namespace App\Jobs;

use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckPushReceipts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 2;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private array $ticketIds,
        private int $notificationId
    ) {
        $this->onQueue('low');
    }

    /**
     * Execute the job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        if (empty($this->ticketIds)) {
            return;
        }

        $receipts = $pushService->checkReceipts($this->ticketIds);

        $invalidTokens = [];
        $successCount = 0;
        $failedCount = 0;

        foreach ($receipts as $ticketId => $receipt) {
            $status = $receipt['status'] ?? 'unknown';

            // Find and update the delivery record
            $delivery = NotificationDelivery::where('ticket_id', $ticketId)->first();

            if ($delivery) {
                if ($status === 'ok') {
                    $delivery->markAsDelivered();
                    $successCount++;
                } elseif ($status === 'error') {
                    $errorMessage = $receipt['message'] ?? 'Unknown error';
                    $errorDetails = $receipt['details'] ?? [];

                    $delivery->markAsFailed($errorMessage);
                    $failedCount++;

                    // Check for invalid token errors
                    if (isset($errorDetails['error']) && $errorDetails['error'] === 'DeviceNotRegistered') {
                        $invalidTokens[] = [
                            'user_id' => $delivery->user_id,
                            'token' => $delivery->device_token,
                        ];
                    }

                    Log::warning('CheckPushReceipts: Delivery failed', [
                        'ticket_id' => $ticketId,
                        'error' => $errorMessage,
                        'details' => $errorDetails,
                    ]);
                }
            }
        }

        // Remove invalid tokens
        foreach ($invalidTokens as $invalid) {
            $this->removeInvalidToken($invalid['user_id'], $invalid['token']);
        }

        Log::info('CheckPushReceipts: Completed', [
            'notification_id' => $this->notificationId,
            'tickets_checked' => count($this->ticketIds),
            'successful' => $successCount,
            'failed' => $failedCount,
            'invalid_tokens_removed' => count($invalidTokens),
        ]);
    }

    /**
     * Remove an invalid token from a user's push_tokens.
     */
    private function removeInvalidToken(int $userId, string $token): void
    {
        $user = User::find($userId);
        if (!$user) {
            return;
        }

        $tokens = $user->push_tokens ?? [];
        $tokens = array_filter($tokens, function ($t) use ($token) {
            return ($t['token'] ?? '') !== $token;
        });

        $user->push_tokens = array_values($tokens);
        $user->save();

        Log::info('CheckPushReceipts: Removed invalid token', [
            'user_id' => $userId,
            'token' => substr($token, 0, 30) . '...',
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('CheckPushReceipts: Job failed', [
            'notification_id' => $this->notificationId,
            'error' => $exception->getMessage(),
        ]);
    }
}
