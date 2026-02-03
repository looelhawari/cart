<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'user_id' => $this->user_id,
            'user_name' => $this->user ? ($this->user->first_name . ' ' . $this->user->last_name) : 'Anonymous',
            'user_avatar' => $this->user->avatar ?? null,
            'order_id' => $this->order_id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'images' => $this->images ? json_decode($this->images, true) : [],
            'status' => $this->status,
            'helpful' => 0, // This would come from a separate helpful_votes table in production
            'verified' => $this->status === 'approved',
            'date' => $this->created_at->format('Y-m-d'),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
