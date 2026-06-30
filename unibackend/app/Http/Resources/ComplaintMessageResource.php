<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ComplaintMessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->whenLoaded('user');
        $attachments = $this->whenLoaded('attachments');

        return [
            'id' => $this->id,
            'message' => $this->message,
            'is_admin_reply' => (bool) $this->is_admin_reply,
            'is_bot_reply' => (bool) $this->is_bot_reply,
            'bot_intent' => $this->bot_intent,
            'user' => $user ? [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
            ] : null,
            'attachments' => $attachments ? ComplaintAttachmentResource::collection($attachments) : null,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
