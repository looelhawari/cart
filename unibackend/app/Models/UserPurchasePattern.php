<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPurchasePattern extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'purchase_count',
        'avg_days_between_purchases',
        'last_purchased_at',
        'next_predicted_purchase',
        'reorder_reminder_sent',
        'last_reminder_sent_at',
    ];

    protected $casts = [
        'last_purchased_at' => 'datetime',
        'next_predicted_purchase' => 'datetime',
        'reorder_reminder_sent' => 'boolean',
        'last_reminder_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Record a purchase and update pattern.
     */
    public static function recordPurchase(int $userId, int $productId): self
    {
        $pattern = self::firstOrNew([
            'user_id' => $userId,
            'product_id' => $productId,
        ]);

        $now = now();
        $previousPurchase = $pattern->last_purchased_at;

        // Update purchase count
        $pattern->purchase_count = ($pattern->purchase_count ?? 0) + 1;

        // Calculate average days between purchases
        if ($previousPurchase && $pattern->purchase_count > 1) {
            $daysSinceLast = $previousPurchase->diffInDays($now);
            $currentAvg = $pattern->avg_days_between_purchases ?? $daysSinceLast;

            // Weighted average (more recent = more weight)
            $pattern->avg_days_between_purchases = round(
                ($currentAvg * 0.3) + ($daysSinceLast * 0.7)
            );

            // Predict next purchase
            $pattern->next_predicted_purchase = $now->copy()->addDays(
                $pattern->avg_days_between_purchases
            );
        } elseif ($pattern->purchase_count == 1) {
            // First purchase, set default prediction (14 days for consumables)
            $pattern->avg_days_between_purchases = 14;
            $pattern->next_predicted_purchase = $now->copy()->addDays(14);
        }

        $pattern->last_purchased_at = $now;
        $pattern->reorder_reminder_sent = false;
        $pattern->save();

        return $pattern;
    }

    /**
     * Get products due for reorder for a user.
     */
    public static function getReorderSuggestionsForUser(int $userId, int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return self::with('product')
            ->where('user_id', $userId)
            ->where('purchase_count', '>=', 2)
            ->where('next_predicted_purchase', '<=', now())
            ->whereHas('product', function ($query) {
                $query->where('is_active', true)->where('stock', '>', 0);
            })
            ->orderBy('purchase_count', 'desc')
            ->limit($limit)
            ->get();
    }
}
