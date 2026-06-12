<?php

namespace App\Jobs;

use App\Models\ProductWatchlist;
use App\Models\Product;
use App\Services\EnterpriseNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Check for product back in stock and price drops.
 * Schedule: Run every 30 minutes
 */
class ProcessProductWatchlistNotifications implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(EnterpriseNotificationService $notificationService): void
    {
        $this->processBackInStock($notificationService);
        $this->processPriceDrops($notificationService);
    }

    protected function processBackInStock(EnterpriseNotificationService $notificationService): void
    {
        // Get watchlist items waiting for back-in-stock
        $watchlistItems = ProductWatchlist::with(['product', 'user'])
            ->where('notify_back_in_stock', true)
            ->where('notified_back_in_stock', false)
            ->whereHas('product', function ($query) {
                // products has `stock_quantity`, not `stock`
                $query->where('stock_quantity', '>', 0)->where('is_active', true);
            })
            ->limit(500)
            ->get();

        foreach ($watchlistItems as $item) {
            if (!$item->user || !$item->product) continue;

            $notificationService->notifyProductBackInStock(
                $item->user_id,
                $item->product->name_en,
                $item->product_id,
                $item->product->image
            );

            $item->notified_back_in_stock = true;
            $item->last_notified_at = now();
            $item->save();

            Log::info('ProductWatchlist: Back in stock notification sent', [
                'user_id' => $item->user_id,
                'product_id' => $item->product_id,
            ]);
        }
    }

    protected function processPriceDrops(EnterpriseNotificationService $notificationService): void
    {
        // Get watchlist items with price threshold set
        $watchlistItems = ProductWatchlist::with(['product', 'user'])
            ->where('notify_price_drop', true)
            ->whereNotNull('price_threshold')
            ->where('notified_price_drop', false)
            ->whereHas('product', function ($query) {
                $query->where('is_active', true);
            })
            ->limit(500)
            ->get();

        foreach ($watchlistItems as $item) {
            if (!$item->user || !$item->product) continue;

            // Check if current price is below threshold
            $currentPrice = $item->product->sale_price ?? $item->product->price;
            if ($currentPrice <= $item->price_threshold) {
                $notificationService->notifyPriceDropOnWatched(
                    $item->user_id,
                    $item->product->name_en,
                    $item->product_id,
                    (float) ($item->last_known_price ?? $item->product->price),
                    (float) $currentPrice
                );

                $item->notified_price_drop = true;
                $item->last_notified_at = now();
                $item->save();

                Log::info('ProductWatchlist: Price drop notification sent', [
                    'user_id' => $item->user_id,
                    'product_id' => $item->product_id,
                    'old_price' => $item->last_known_price,
                    'new_price' => $currentPrice,
                ]);
            }
        }
    }
}
