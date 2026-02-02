<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\OrderService;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Async Order Processing Job
 * 
 * CRITICAL for single-server performance:
 * Order creation is split into SYNC and ASYNC parts:
 * 
 * SYNC (in OrderService):
 * - Validate cart and stock
 * - Reserve stock (SELECT FOR UPDATE)
 * - Create order record
 * - Return immediately to user
 * 
 * ASYNC (this job):
 * - Send notifications
 * - Log activity
 * - AI analysis (if any)
 * - Update analytics cache
 */
class ProcessOrderAsync implements ShouldQueue
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
        protected int $orderId,
        protected string $eventType = 'created'
    ) {
        $this->onQueue('high');
    }

    /**
     * Execute the job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        try {
            $order = Order::with(['user', 'items.product'])->find($this->orderId);

            if (!$order) {
                Log::warning('ProcessOrderAsync: Order not found', ['order_id' => $this->orderId]);
                return;
            }

            switch ($this->eventType) {
                case 'created':
                    $this->handleOrderCreated($order, $pushService);
                    break;

                case 'confirmed':
                    $this->handleOrderConfirmed($order, $pushService);
                    break;

                case 'cancelled':
                    $this->handleOrderCancelled($order, $pushService);
                    break;

                case 'delivered':
                    $this->handleOrderDelivered($order, $pushService);
                    break;

                default:
                    Log::warning('ProcessOrderAsync: Unknown event type', [
                        'order_id' => $this->orderId,
                        'event_type' => $this->eventType,
                    ]);
            }

            Log::info('ProcessOrderAsync: Completed', [
                'order_id' => $this->orderId,
                'event_type' => $this->eventType,
            ]);
        } catch (\Exception $e) {
            Log::error('ProcessOrderAsync: Failed', [
                'order_id' => $this->orderId,
                'event_type' => $this->eventType,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle order created event.
     */
    protected function handleOrderCreated(Order $order, PushNotificationService $pushService): void
    {
        // Send notification to user
        $pushService->sendOrderStatusNotification(
            $order->user_id,
            (string)$order->id,
            $order->order_number,
            'pending'
        );

        // Clear analytics cache to reflect new order
        \App\Http\Controllers\Api\Admin\AnalyticsController::clearCache();

        Log::info('ProcessOrderAsync: Order created notification sent', [
            'order_id' => $order->id,
            'user_id' => $order->user_id,
        ]);
    }

    /**
     * Handle order confirmed (payment successful) event.
     */
    protected function handleOrderConfirmed(Order $order, PushNotificationService $pushService): void
    {
        $pushService->sendOrderStatusNotification(
            $order->user_id,
            (string)$order->id,
            $order->order_number,
            'confirmed'
        );

        // Finalize promo usage
        app(OrderService::class)->finalizePromoUsage($order);

        Log::info('ProcessOrderAsync: Order confirmed notification sent', [
            'order_id' => $order->id,
        ]);
    }

    /**
     * Handle order cancelled event.
     */
    protected function handleOrderCancelled(Order $order, PushNotificationService $pushService): void
    {
        $pushService->sendOrderStatusNotification(
            $order->user_id,
            (string)$order->id,
            $order->order_number,
            'cancelled',
            $order->cancellation_reason
        );

        // Rollback promo usage
        app(OrderService::class)->rollbackPromoUsage($order);

        // Clear analytics cache
        \App\Http\Controllers\Api\Admin\AnalyticsController::clearCache();

        Log::info('ProcessOrderAsync: Order cancelled notification sent', [
            'order_id' => $order->id,
        ]);
    }

    /**
     * Handle order delivered event.
     */
    protected function handleOrderDelivered(Order $order, PushNotificationService $pushService): void
    {
        $pushService->sendOrderStatusNotification(
            $order->user_id,
            (string)$order->id,
            $order->order_number,
            'delivered'
        );

        // Clear analytics cache
        \App\Http\Controllers\Api\Admin\AnalyticsController::clearCache();

        Log::info('ProcessOrderAsync: Order delivered notification sent', [
            'order_id' => $order->id,
        ]);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessOrderAsync: Job failed permanently', [
            'order_id' => $this->orderId,
            'event_type' => $this->eventType,
            'error' => $exception->getMessage(),
        ]);
    }
}
