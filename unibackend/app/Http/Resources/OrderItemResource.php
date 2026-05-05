<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->relationLoaded('product') ? $this->product : null;

        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'product_id' => $this->product_id,
            'product_barcode' => $this->product_sku ?? ($product?->barcode),
            'product_name' => $this->product_name,
            'product_image' => $product?->image,
            'product_price' => (float) $this->price,
            'quantity' => $this->quantity,
            'subtotal' => (float) $this->subtotal,
        ];
    }
}
