<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $messages = $this->whenLoaded('messages');
        $attachments = $this->whenLoaded('attachments');

        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'subject' => $this->subject,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'description' => $this->description,
            'order_id' => $this->order_id,
            'messages_count' => $this->when(isset($this->messages_count), $this->messages_count),
            'messages' => $messages ? ComplaintMessageResource::collection($messages) : null,
            'attachments' => $attachments ? ComplaintAttachmentResource::collection($attachments) : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),
        ];
    }
}
