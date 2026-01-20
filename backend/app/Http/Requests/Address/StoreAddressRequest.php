<?php

namespace App\Http\Requests\Address;

use Illuminate\Foundation\Http\FormRequest;

class StoreAddressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $data = [];
        
        if ($this->has('label')) {
            $data['label'] = strip_tags(trim($this->label));
        }
        if ($this->has('recipient_name')) {
            $data['recipient_name'] = strip_tags(trim($this->recipient_name));
        }
        if ($this->has('phone')) {
            $data['phone'] = preg_replace('/[^0-9+]/', '', $this->phone);
        }
        if ($this->has('street')) {
            $data['street'] = strip_tags(trim($this->street));
        }
        if ($this->has('building')) {
            $data['building'] = strip_tags(trim($this->building));
        }
        if ($this->has('floor')) {
            $data['floor'] = strip_tags(trim($this->floor));
        }
        if ($this->has('apartment')) {
            $data['apartment'] = strip_tags(trim($this->apartment));
        }
        if ($this->has('city')) {
            $data['city'] = strip_tags(trim($this->city));
        }
        if ($this->has('area')) {
            $data['area'] = strip_tags(trim($this->area));
        }
        if ($this->has('postal_code')) {
            $data['postal_code'] = trim($this->postal_code);
        }
        if ($this->has('landmark')) {
            $data['landmark'] = strip_tags(trim($this->landmark));
        }
        if ($this->has('notes')) {
            $data['notes'] = strip_tags(trim($this->notes));
        }
        
        $this->merge($data);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => 'required|string|max:100|in:Home,Work,Other',
            'recipient_name' => 'required|string|max:255',
            'phone' => 'required|regex:/^\+?[0-9]{10,15}$/',
            'street' => 'required|string',
            'building' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:255',
            'apartment' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'area' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:255',
            'landmark' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_default' => 'sometimes|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'label.required' => 'Please select an address type.',
            'label.in' => 'Address type must be Home, Work, or Other.',
            'recipient_name.required' => 'Recipient name is required.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Please provide a valid phone number.',
            'street.required' => 'Street address is required.',
            'city.required' => 'City is required.',
        ];
    }
}
