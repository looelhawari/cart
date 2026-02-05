<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartReminder extends Model
{
    protected $fillable = [
        'user_id',
        'cart_item_count',
        'cart_total',
        'last_cart_activity',
        'reminder_1_sent_at',
        'reminder_2_sent_at',
        'reminder_3_sent_at',
        'converted',
        'converted_at',
    ];

    protected $casts = [
        'cart_total' => 'decimal:2',
        'last_cart_activity' => 'datetime',
        'reminder_1_sent_at' => 'datetime',
        'reminder_2_sent_at' => 'datetime',
        'reminder_3_sent_at' => 'datetime',
        'converted' => 'boolean',
        'converted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Update cart reminder when cart is modified.
     */
    public static function updateForUser(int $userId, int $itemCount, float $total): self
    {
        return self::updateOrCreate(
            ['user_id' => $userId],
            [
                'cart_item_count' => $itemCount,
                'cart_total' => $total,
                'last_cart_activity' => now(),
                'converted' => false,
                'converted_at' => null,
            ]
        );
    }

    /**
     * Mark cart as converted (order placed).
     */
    public function markAsConverted(): void
    {
        $this->update([
            'converted' => true,
            'converted_at' => now(),
            'cart_item_count' => 0,
            'cart_total' => 0,
        ]);
    }

    /**
     * Reset reminders for a new cart session.
     */
    public function resetReminders(): void
    {
        $this->update([
            'reminder_1_sent_at' => null,
            'reminder_2_sent_at' => null,
            'reminder_3_sent_at' => null,
            'converted' => false,
            'converted_at' => null,
        ]);
    }

    /**
     * Clear cart reminder when cart is emptied.
     */
    public static function clearForUser(int $userId): void
    {
        self::where('user_id', $userId)->update([
            'cart_item_count' => 0,
            'cart_total' => 0,
            'last_cart_activity' => now(),
        ]);
    }
}
