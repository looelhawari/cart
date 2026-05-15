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

        // product_name is the snapshot saved into the order at checkout time
        // (in OrderService::createOrderFromCart). It's whatever locale the
        // customer was using — usually name_en. For the Arabic admin receipt
        // we surface the live product's name_ar when the relation is loaded,
        // falling back to the snapshot when it isn't (the order can outlive
        // a product deletion; an English-only snapshot is better than blank).
        $nameAr = $product?->name_ar ?: ($this->product_name ?? '');
        $nameEn = $product?->name_en ?: ($this->product_name ?? '');

        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'product_id' => $this->product_id,
            'product_barcode' => $this->product_sku ?? ($product?->barcode),
            'product_name' => $this->product_name,
            'product_name_ar' => $nameAr,
            'product_name_en' => $nameEn,
            'product_image' => $product?->image,
            'product_price' => (float) $this->price,
            'quantity' => $this->quantity,
            'subtotal' => (float) $this->subtotal,
        ];
    }
}
