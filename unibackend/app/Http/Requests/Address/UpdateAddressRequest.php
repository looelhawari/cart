<?php

namespace App\Http\Requests\Address;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAddressRequest extends FormRequest
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
        if ($this->has('street')) {
            $data['street'] = strip_tags(trim($this->street));
        }
        if ($this->has('building')) {
            $data['building'] = strip_tags(trim($this->building));
        }
        if ($this->has('floor')) {
            $data['floor'] = strip_tags(trim($this->floor));
        }
        if ($this->has('appartment')) {
            $data['appartment'] = strip_tags(trim($this->appartment));
        }
        if ($this->has('city')) {
            $data['city'] = strip_tags(trim($this->city));
        }
        if ($this->has('area')) {
            $data['area'] = strip_tags(trim($this->area));
        }
        if ($this->has('landmark')) {
            $data['landmark'] = strip_tags(trim($this->landmark));
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
            'label' => 'sometimes|required|string|max:100|in:Home,Work,Other',
            'street' => 'sometimes|required|string',
            'building' => 'nullable|string|max:255',
            'floor' => 'nullable|string|max:255',
            'appartment' => 'nullable|string|max:255',
            'city' => 'sometimes|required|string|max:100',
            'area' => 'nullable|string|max:255',
            'landmark' => 'nullable|string|max:255',
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
            'street.required' => 'Street address is required.',
            'city.required' => 'City is required.',
        ];
    }
}
