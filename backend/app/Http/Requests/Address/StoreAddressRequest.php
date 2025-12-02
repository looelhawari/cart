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
        $this->merge([
            'label' => strip_tags(trim($this->label ?? '')),
            'street' => strip_tags(trim($this->street ?? '')),
            'city' => strip_tags(trim($this->city ?? '')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'label' => 'required|string|max:100',
            'street' => 'required|string',
            'city' => 'required|string|max:100',
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
            'label.required' => 'Address label is required.',
            'label.max' => 'Address label must not exceed 100 characters.',
            'street.required' => 'Street address is required.',
            'city.required' => 'City is required.',
            'city.max' => 'City must not exceed 100 characters.',
            'is_default.boolean' => 'Default address field must be true or false.',
        ];
    }
}
