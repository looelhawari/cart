<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->whenLoaded('product');

        return [
            'id' => $this->id,
            'product' => $product ? [
                'barcode' => $product->barcode,
                'name_en' => $product->name_en,
                'name_ar' => $product->name_ar,
                'image' => $product->image,
                'price' => $product->price,
                'sale_price' => $product->sale_price,
                'stock_quantity' => $product->stock_quantity,
                'unit' => $product->unit,
                'rating' => $product->rating,
                'review_count' => $product->review_count,
            ] : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
