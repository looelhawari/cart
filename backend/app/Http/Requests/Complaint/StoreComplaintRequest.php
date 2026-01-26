<?php

namespace App\Http\Requests\Complaint;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreComplaintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'subject' => 'required|string|max:255',
            'category' => [
                'required',
                Rule::in([
                    'order_issue',
                    'product_quality',
                    'delivery_problem',
                    'payment_issue',
                    'technical_issue',
                    'general_inquiry',
                    'suggestion',
                    'other',
                ]),
            ],
            'priority' => [
                'nullable',
                Rule::in(['low', 'medium', 'high', 'urgent']),
            ],
            'description' => 'required|string',
            'order_id' => [
                'nullable',
                'integer',
                Rule::exists('orders', 'id')->where('user_id', $this->user()?->id),
            ],
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'subject' => $this->sanitizeText($this->subject),
            'description' => $this->sanitizeText($this->description),
        ]);
    }

    private function sanitizeText(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return trim(strip_tags($value));
    }
}
