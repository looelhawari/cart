<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Get delivery address from snapshot or relationship
        $deliveryAddress = '';
        if ($this->delivery_address_snapshot) {
            $snapshot = is_array($this->delivery_address_snapshot)
                ? $this->delivery_address_snapshot
                : json_decode($this->delivery_address_snapshot, true);

            if ($snapshot) {
                $deliveryAddress = implode(', ', array_filter([
                    $snapshot['street_address'] ?? '',
                    $snapshot['building'] ?? '',
                    $snapshot['floor'] ?? '',
                    $snapshot['apartment'] ?? '',
                    $snapshot['area'] ?? '',
                    $snapshot['city'] ?? '',
                ]));
            }
        } elseif ($this->deliveryAddress) {
            $deliveryAddress = implode(', ', array_filter([
                $this->deliveryAddress->street ?? '',
                $this->deliveryAddress->building ?? '',
                $this->deliveryAddress->floor ?? '',
                $this->deliveryAddress->apartment ?? '',
                $this->deliveryAddress->area ?? '',
                $this->deliveryAddress->city ?? '',
            ]));
        }

        // Scheduled-order fields (Wave 5 — Task 4):
        // The dashboard needs to differentiate scheduled vs instant orders.
        // Previously this Resource collapsed delivery_date + delivery_time_slot
        // into a single `estimated_delivery_time` string and didn't expose
        // a boolean — so the dashboard couldn't render a badge or filter.
        // Now we expose all three separately so the UI can render the
        // formatted slot AND branch on `is_scheduled`.
        $deliveryDateStr = $this->delivery_date instanceof \Carbon\Carbon
            ? $this->delivery_date->toDateString()
            : ($this->delivery_date ? (string) $this->delivery_date : null);
        $isScheduled = ! empty($deliveryDateStr);

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'user_id' => $this->user_id,
            'user' => $this->when($this->relationLoaded('user'), [
                'id' => $this->user?->id,
                'first_name' => $this->user?->first_name,
                'last_name' => $this->user?->last_name,
                'email' => $this->user?->email,
                'phone' => $this->user?->phone,
            ]),
            'total_amount' => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount,
            'delivery_fee' => (float) $this->delivery_fee,
            'final_amount' => (float) $this->total,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,
            'delivery_address' => $deliveryAddress,
            'delivery_latitude' => null,
            'delivery_longitude' => null,
            'delivery_notes' => $this->notes,
            // Scheduled-order fields exposed as separate keys + a boolean.
            'delivery_date' => $deliveryDateStr,
            'delivery_time_slot' => $this->delivery_time_slot,
            'is_scheduled' => $isScheduled,
            // Legacy combined string — kept for backward compat with any
            // existing mobile consumers that read this key.
            'estimated_delivery_time' => $isScheduled
                ? trim($deliveryDateStr . ' ' . (string) $this->delivery_time_slot)
                : null,
            'actual_delivery_time' => null,
            'promo_code_id' => null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
