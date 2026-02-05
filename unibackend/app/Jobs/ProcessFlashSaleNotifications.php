<?php

namespace App\Jobs;

use App\Models\FlashSale;
use App\Services\EnterpriseNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Process flash sale notifications.
 * Schedule: Run every 5 minutes
 */
class ProcessFlashSaleNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(EnterpriseNotificationService $notificationService): void
    {
        $now = now();

        // Check for flash sales that just started
        $newSales = FlashSale::where('is_active', true)
            ->where('start_notification_sent', false)
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>', $now)
            ->get();

        foreach ($newSales as $sale) {
            $hoursRemaining = $now->diffInHours($sale->ends_at);
            
            // Get products safely using the relationship
            $products = $sale->products;
            $discountPercent = 30; // Default discount
            
            if ($products && $products->count() > 0) {
                $firstProduct = $products->first();
                if ($firstProduct && $firstProduct->original_price > 0) {
                    $discountPercent = round(
                        ($firstProduct->original_price - $firstProduct->sale_price) / $firstProduct->original_price * 100
                    );
                }
            }

            $notificationService->notifyFlashSaleStarted(
                $sale->title,
                $sale->id,
                (int) $discountPercent,
                (int) $hoursRemaining
            );

            $sale->start_notification_sent = true;
            $sale->save();
            Log::info('FlashSale: Start notification sent', ['sale_id' => $sale->id]);
        }

        // Check for flash sales ending within 1 hour
        $endingSales = FlashSale::where('is_active', true)
            ->where('ending_notification_sent', false)
            ->where('ends_at', '>', $now)
            ->where('ends_at', '<=', $now->copy()->addHour())
            ->get();

        foreach ($endingSales as $sale) {
            $minutesRemaining = $now->diffInMinutes($sale->ends_at);

            $notificationService->notifyFlashSaleEnding(
                $sale->title,
                $sale->id,
                (int) $minutesRemaining
            );

            $sale->ending_notification_sent = true;
            $sale->save();
            Log::info('FlashSale: Ending notification sent', ['sale_id' => $sale->id]);
        }
    }
}
