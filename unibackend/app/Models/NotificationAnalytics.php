<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationAnalytics extends Model
{
    protected $table = 'notification_analytics';

    protected $fillable = [
        'notification_id',
        'user_id',
        'event_type',
        'platform',
        'app_state',
        'metadata',
        'event_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'event_at' => 'datetime',
    ];

    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get delivery rate for a notification.
     */
    public static function getDeliveryRate(int $notificationId): float
    {
        $sent = self::where('notification_id', $notificationId)
            ->where('event_type', 'sent')
            ->count();

        $delivered = self::where('notification_id', $notificationId)
            ->where('event_type', 'delivered')
            ->count();

        return $sent > 0 ? ($delivered / $sent) * 100 : 0;
    }

    /**
     * Get open rate for a notification.
     */
    public static function getOpenRate(int $notificationId): float
    {
        $delivered = self::where('notification_id', $notificationId)
            ->where('event_type', 'delivered')
            ->count();

        $opened = self::where('notification_id', $notificationId)
            ->where('event_type', 'opened')
            ->count();

        return $delivered > 0 ? ($opened / $delivered) * 100 : 0;
    }

    /**
     * Get click-through rate for a notification.
     */
    public static function getClickRate(int $notificationId): float
    {
        $opened = self::where('notification_id', $notificationId)
            ->where('event_type', 'opened')
            ->count();

        $clicked = self::where('notification_id', $notificationId)
            ->where('event_type', 'clicked')
            ->count();

        return $opened > 0 ? ($clicked / $opened) * 100 : 0;
    }

    /**
     * Get analytics summary for a time period.
     */
    public static function getSummary(string $startDate, string $endDate): array
    {
        $stats = self::whereBetween('event_at', [$startDate, $endDate])
            ->selectRaw('event_type, COUNT(*) as count')
            ->groupBy('event_type')
            ->pluck('count', 'event_type')
            ->toArray();

        $sent = $stats['sent'] ?? 0;
        $delivered = $stats['delivered'] ?? 0;
        $opened = $stats['opened'] ?? 0;
        $clicked = $stats['clicked'] ?? 0;
        $dismissed = $stats['dismissed'] ?? 0;

        return [
            'total_sent' => $sent,
            'total_delivered' => $delivered,
            'total_opened' => $opened,
            'total_clicked' => $clicked,
            'total_dismissed' => $dismissed,
            'delivery_rate' => $sent > 0 ? round(($delivered / $sent) * 100, 2) : 0,
            'open_rate' => $delivered > 0 ? round(($opened / $delivered) * 100, 2) : 0,
            'click_rate' => $opened > 0 ? round(($clicked / $opened) * 100, 2) : 0,
        ];
    }
}
