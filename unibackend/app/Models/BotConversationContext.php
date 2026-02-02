<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BotConversationContext extends Model
{
    use HasFactory;

    protected $fillable = [
        'complaint_id',
        'current_intent',
        'context_data',
        'message_count',
        'awaiting_input',
        'awaiting_input_type',
    ];

    protected $casts = [
        'context_data' => 'array',
        'awaiting_input' => 'boolean',
    ];

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }

    /**
     * Get or create context for a complaint
     */
    public static function getOrCreate(int $complaintId): self
    {
        return self::firstOrCreate(
            ['complaint_id' => $complaintId],
            [
                'current_intent' => null,
                'context_data' => [],
                'message_count' => 0,
                'awaiting_input' => false,
                'awaiting_input_type' => null,
            ]
        );
    }

    /**
     * Update context with new intent
     */
    public function updateContext(string $intent, array $data = []): self
    {
        $contextData = $this->context_data ?? [];
        $contextData = array_merge($contextData, $data);

        $this->update([
            'current_intent' => $intent,
            'context_data' => $contextData,
            'message_count' => $this->message_count + 1,
        ]);

        return $this->fresh();
    }

    /**
     * Set awaiting input state
     */
    public function awaitInput(string $inputType): self
    {
        $this->update([
            'awaiting_input' => true,
            'awaiting_input_type' => $inputType,
        ]);

        return $this;
    }

    /**
     * Clear awaiting input state
     */
    public function clearAwaitInput(): self
    {
        $this->update([
            'awaiting_input' => false,
            'awaiting_input_type' => null,
        ]);

        return $this;
    }
}
