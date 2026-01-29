<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'title_ar',
        'message',
        'message_ar',
        'data',
        'action_type',
        'action_target',
        'image_url',
        'is_broadcast',
        'is_read',
        'read_at',
        'scheduled_at',
        'sent_at',
        'push_status',
        'push_error',
    ];

    protected $casts = [
        'data' => 'array',
        'is_broadcast' => 'boolean',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the delivery records for this notification.
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(NotificationDelivery::class);
    }

    /**
     * Get the read records for broadcast notifications.
     */
    public function reads(): HasMany
    {
        return $this->hasMany(NotificationRead::class);
    }

    /**
     * Scope to get notifications for a specific user (including broadcasts).
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->orWhere('is_broadcast', true);
        });
    }

    /**
     * Scope to get unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    /**
     * Scope to filter by notification type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to get sent notifications.
     */
    public function scopeSent($query)
    {
        return $query->whereIn('push_status', ['sent', 'delivered']);
    }

    /**
     * Scope to get pending notifications.
     */
    public function scopePending($query)
    {
        return $query->where('push_status', 'pending');
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead(): void
    {
        if (!$this->is_read) {
            $this->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }
    }

    /**
     * Check if user has read this broadcast notification.
     */
    public function isReadByUser(int $userId): bool
    {
        if (!$this->is_broadcast) {
            return $this->is_read;
        }

        return $this->reads()->where('user_id', $userId)->exists();
    }

    /**
     * Mark broadcast as read for a specific user.
     */
    public function markAsReadByUser(int $userId): void
    {
        if ($this->is_broadcast) {
            NotificationRead::firstOrCreate([
                'notification_id' => $this->id,
                'user_id' => $userId,
            ], [
                'read_at' => now(),
            ]);
        } else {
            $this->markAsRead();
        }
    }

    /**
     * Get localized title based on language.
     */
    public function getLocalizedTitle(string $language = 'en'): string
    {
        if ($language === 'ar' && $this->title_ar) {
            return $this->title_ar;
        }
        return $this->title;
    }

    /**
     * Get localized message based on language.
     */
    public function getLocalizedMessage(string $language = 'en'): string
    {
        if ($language === 'ar' && $this->message_ar) {
            return $this->message_ar;
        }
        return $this->message;
    }
}
