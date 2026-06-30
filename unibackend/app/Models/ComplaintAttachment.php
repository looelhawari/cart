<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplaintAttachment extends Model
{
    protected $fillable = [
        'complaint_id',
        'message_id',
        'user_id',
        'file_name',
        'file_path',
        'file_type',
        'mime_type',
        'size_bytes',
        'storage_provider',
        'public_id',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The complaint this attachment belongs to.
     */
    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    /**
     * The chat message this attachment was sent with, when applicable.
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(ComplaintMessage::class, 'message_id');
    }

    /**
     * The user who uploaded the attachment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
