<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DriverLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $orderId;
    public int $driverId;
    public float $latitude;
    public float $longitude;
    public ?float $heading;

    public function __construct(
        int $orderId,
        int $driverId,
        float $latitude,
        float $longitude,
        ?float $heading = null
    ) {
        $this->orderId = $orderId;
        $this->driverId = $driverId;
        $this->latitude = $latitude;
        $this->longitude = $longitude;
        $this->heading = $heading;
    }

    /**
     * Broadcast on private channel so only order owner can listen.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("order.{$this->orderId}.tracking"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'driver.location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'driver_id' => $this->driverId,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'heading' => $this->heading,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
