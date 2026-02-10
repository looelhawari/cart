<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $orderId;
    public string $status;
    public string $statusLabel;
    public ?string $driverName;
    public ?string $driverPhone;
    public ?int $estimatedMinutes;

    public function __construct(Order $order)
    {
        $this->orderId = $order->id;
        $this->status = $order->status;
        $this->statusLabel = $order->status_label;
        $this->driverName = $order->driver
            ? trim(($order->driver->first_name ?? '') . ' ' . ($order->driver->last_name ?? ''))
            : null;
        $this->driverPhone = $order->driver?->phone;
        $this->estimatedMinutes = $order->estimated_delivery_minutes;
    }

    /**
     * Broadcast on the private order tracking channel.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("order.{$this->orderId}.tracking"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'          => $this->orderId,
            'status'            => $this->status,
            'status_label'      => $this->statusLabel,
            'driver_name'       => $this->driverName,
            'driver_phone'      => $this->driverPhone,
            'estimated_minutes' => $this->estimatedMinutes,
            'timestamp'         => now()->toIso8601String(),
        ];
    }
}
