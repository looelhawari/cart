<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintMessage extends Model
{
    protected $fillable = [
        'complaint_id',
        'user_id',
        'message',
        'is_admin_reply',
        'is_bot_reply',
        'bot_intent',
        // Identity snapshot — populated by booted() so the audit trail
        // survives user deletion (FK is nullOnDelete).
        'author_email_snapshot',
        'author_name_snapshot',
        'author_role_snapshot',
    ];

    protected $casts = [
        'is_admin_reply' => 'boolean',
        'is_bot_reply' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Auto-populate identity snapshot on create so the audit trail
     * survives user deletion. Bot messages still attribute to
     * complaint owner; admin replies attribute to the admin.
     */
    protected static function booted(): void
    {
        static::creating(function (self $m) {
            if (! $m->author_email_snapshot && $m->user_id) {
                $u = User::find($m->user_id);
                if ($u) {
                    $m->author_email_snapshot = $u->email;
                    $m->author_name_snapshot  = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));
                    $m->author_role_snapshot  = $u->role;
                }
            }
        });
    }

    /**
     * The complaint this message belongs to.
     */
    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    /**
     * The user who sent the message.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
