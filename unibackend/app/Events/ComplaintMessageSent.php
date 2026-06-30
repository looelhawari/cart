<?php

namespace App\Events;

use App\Http\Resources\ComplaintMessageResource;
use App\Models\ComplaintMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ComplaintMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public ComplaintMessage $message)
    {
        //
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('complaints.' . $this->message->complaint_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'message' => (new ComplaintMessageResource($this->message->load(['user', 'attachments'])))->resolve(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
