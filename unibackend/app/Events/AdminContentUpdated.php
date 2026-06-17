<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast whenever admin-controlled content changes, so every connected
 * mobile app invalidates its caches and refetches — no manual refresh.
 *
 * Public channel ('app-content') so it reaches ALL users including guests
 * with no channel-auth round-trip.
 */
class AdminContentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $type,        // product|category|settings|map|banner|promotion|global
        public string $action,      // created|updated|deleted
        public int|string|null $entityId,
        public int $version         // new global content version
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel('app-content')];
    }

    public function broadcastAs(): string
    {
        return 'admin.content.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'type'      => $this->type,
            'action'    => $this->action,
            'entity_id' => $this->entityId,
            'version'   => $this->version,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
