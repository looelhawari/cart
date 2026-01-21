<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'delivery_address_id' => [
                'required',
                'integer',
                Rule::exists('addresses', 'id')->where(function ($query) {
                    $query->where('user_id', $this->user()->id);
                }),
            ],
            'payment_method' => 'required|in:cash_on_delivery,card,wallet',
            'payment_method_id' => 'nullable|integer|exists:payment_methods,id',
            'delivery_date' => 'nullable|date|after_or_equal:today',
            'delivery_time_slot' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
            'promo_code' => 'nullable|string|max:50',
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'delivery_address_id.required' => 'Delivery address is required',
            'delivery_address_id.exists' => 'Selected delivery address does not exist or does not belong to you',
            'payment_method.required' => 'Payment method is required',
            'payment_method.in' => 'Invalid payment method. Must be cash_on_delivery, card, or wallet',
            'delivery_date.after_or_equal' => 'Delivery date must be today or in the future',
            'delivery_time_slot.max' => 'Delivery time slot is too long',
            'notes.max' => 'Notes cannot exceed 500 characters',
            'promo_code.max' => 'Promo code is too long',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Trim string inputs
        if ($this->has('notes')) {
            $this->merge([
                'notes' => trim($this->input('notes')),
            ]);
        }

        if ($this->has('promo_code')) {
            $this->merge([
                'promo_code' => trim(strtoupper($this->input('promo_code'))),
            ]);
        }

        if ($this->has('delivery_time_slot')) {
            $this->merge([
                'delivery_time_slot' => trim($this->input('delivery_time_slot')),
            ]);
        }
    }
}
