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
            'estimated_delivery_time' => $this->delivery_date ? $this->delivery_date . ' ' . $this->delivery_time_slot : null,
            'actual_delivery_time' => null,
            'promo_code_id' => null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
