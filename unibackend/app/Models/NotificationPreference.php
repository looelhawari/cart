<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'push_enabled',
        'email_enabled',
        'order_updates',
        'promotions',
        'wallet_updates',
        'complaint_updates',
        'price_alerts',
        'back_in_stock',
        'marketing',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'timezone',
    ];

    protected $casts = [
        'push_enabled' => 'boolean',
        'email_enabled' => 'boolean',
        'order_updates' => 'boolean',
        'promotions' => 'boolean',
        'wallet_updates' => 'boolean',
        'complaint_updates' => 'boolean',
        'price_alerts' => 'boolean',
        'back_in_stock' => 'boolean',
        'marketing' => 'boolean',
        'quiet_hours_enabled' => 'boolean',
    ];

    /**
     * Get the user that owns these preferences.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if user should receive notification of given type.
     */
    public function shouldReceive(string $type): bool
    {
        if (!$this->push_enabled) {
            return false;
        }

        return match ($type) {
            'order', 'order_confirmed', 'order_processing', 'order_out_for_delivery',
            'order_delivered', 'order_cancelled', 'order_rescheduled',
            'order_payment_failed', 'order_return_approved' => $this->order_updates,
            'promo', 'promotion', 'flash_sale' => $this->promotions,
            'wallet', 'wallet_credited', 'wallet_debited', 'refund_processed' => $this->wallet_updates,
            'complaint', 'complaint_received', 'complaint_in_progress',
            'complaint_resolved', 'complaint_feedback_requested', 'complaint_escalated' => $this->complaint_updates,
            'price_drop', 'price_alert' => $this->price_alerts,
            'back_in_stock' => $this->back_in_stock,
            'marketing' => $this->marketing,
            'account', 'welcome' => true, // Always send account notifications
            default => true,
        };
    }

    /**
     * Check if notification should be sent now or delayed (for quiet hours).
     * Returns: ['send' => bool, 'delay_until' => ?Carbon]
     */
    public function shouldSendNow(): array
    {
        if (!$this->quiet_hours_enabled || !$this->quiet_hours_start || !$this->quiet_hours_end) {
            return ['send' => true, 'delay_until' => null];
        }

        $userTimezone = $this->timezone ?? $this->user?->timezone ?? config('app.timezone', 'UTC');

        try {
            $now = Carbon::now($userTimezone);
            $start = Carbon::createFromTimeString($this->quiet_hours_start, $userTimezone);
            $end = Carbon::createFromTimeString($this->quiet_hours_end, $userTimezone);

            // Handle overnight quiet hours (e.g., 22:00 to 08:00)
            if ($start->gt($end)) {
                // Quiet hours span midnight
                if ($now->gte($start) || $now->lt($end)) {
                    // Currently in quiet hours
                    $delayUntil = $now->gte($start)
                        ? $end->copy()->addDay()
                        : $end->copy();
                    return ['send' => false, 'delay_until' => $delayUntil->setTimezone('UTC')];
                }
            } else {
                // Normal quiet hours (e.g., 14:00 to 16:00)
                if ($now->between($start, $end)) {
                    return ['send' => false, 'delay_until' => $end->copy()->setTimezone('UTC')];
                }
            }
        } catch (\Exception $e) {
            // If there's any error parsing times, just send the notification
            return ['send' => true, 'delay_until' => null];
        }

        return ['send' => true, 'delay_until' => null];
    }

    /**
     * Check if currently in quiet hours.
     */
    public function isInQuietHours(): bool
    {
        return !$this->shouldSendNow()['send'];
    }

    /**
     * Get default preferences for a user.
     */
    public static function getOrCreateForUser(int $userId): self
    {
        return self::firstOrCreate(
            ['user_id' => $userId],
            [
                'push_enabled' => true,
                'email_enabled' => true,
                'order_updates' => true,
                'promotions' => true,
                'wallet_updates' => true,
                'complaint_updates' => true,
                'price_alerts' => true,
                'back_in_stock' => true,
                'marketing' => true,
                'quiet_hours_enabled' => false,
                'quiet_hours_start' => '22:00',
                'quiet_hours_end' => '08:00',
            ]
        );
    }
}
