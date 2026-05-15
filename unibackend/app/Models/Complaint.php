<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Complaint extends Model
{
    protected $fillable = [
        'user_id',
        'order_id',
        'ticket_number',
        'subject',
        'category',
        'priority',
        'status',
        'description',
        'resolved_at',
        'resolved_by',
        'assigned_to',
        'bot_handled',
        'escalated_to_agent',
        'escalated_at',
        'escalation_reason',
        'bot_satisfaction_rating',
        'bot_feedback',
        // Identity snapshot — populated by booted() so the audit trail
        // survives user deletion (FK is nullOnDelete).
        'user_email_snapshot',
        'user_name_snapshot',
    ];

    /**
     * Auto-populate the identity snapshot at create-time so deleting the
     * user (or anonymising them for GDPR) doesn't erase the audit trail.
     */
    protected static function booted(): void
    {
        static::creating(function (self $c) {
            if (! $c->user_email_snapshot && $c->user_id) {
                $u = User::find($c->user_id);
                if ($u) {
                    $c->user_email_snapshot = $u->email;
                    $c->user_name_snapshot  = trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''));
                }
            }
        });
    }

    protected $casts = [
        'resolved_at' => 'datetime',
        'escalated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'bot_handled' => 'boolean',
        'escalated_to_agent' => 'boolean',
    ];

    /**
     * The user who created the complaint.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The order related to this complaint.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * The admin assigned to the complaint.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * The admin who resolved the complaint.
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Messages in this complaint thread.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ComplaintMessage::class);
    }

    /**
     * Attachments for this complaint.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ComplaintAttachment::class);
    }

    /**
     * Bot conversation context
     */
    public function botContext(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(BotConversationContext::class);
    }

    /**
     * Check if this complaint needs agent attention
     */
    public function needsAgentAttention(): bool
    {
        return $this->escalated_to_agent && !in_array($this->status, ['resolved', 'closed']);
    }

    /**
     * Generate a unique ticket number.
     */
    public static function generateTicketNumber(): string
    {
        do {
            $ticketNumber = 'TKT-' . date('Ymd') . '-' . str_pad((string) rand(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('ticket_number', $ticketNumber)->exists());

        return $ticketNumber;
    }
}
