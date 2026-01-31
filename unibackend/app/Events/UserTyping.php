<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $complaintId,
        public int $userId,
        public string $userName,
        public bool $isTyping,
        public bool $isAdmin = false
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('complaints.' . $this->complaintId),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'user_id' => $this->userId,
            'user_name' => $this->userName,
            'is_typing' => $this->isTyping,
            'is_admin' => $this->isAdmin,
        ];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }
}
