<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
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

        if ($this->has('first_name')) {
            $data['first_name'] = strip_tags(trim($this->first_name));
        }

        if ($this->has('last_name')) {
            $data['last_name'] = strip_tags(trim($this->last_name));
        }

        if ($this->has('email')) {
            $data['email'] = strtolower(trim($this->email));
        }

        if ($this->has('phone')) {
            $data['phone'] = preg_replace('/[^0-9+]/', '', $this->phone);
        }

        if ($this->has('date_of_birth')) {
            $data['date_of_birth'] = trim($this->date_of_birth);
        }

        if ($this->has('gender')) {
            $data['gender'] = strtolower(trim($this->gender));
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
        $user = $this->user();

        return [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'phone' => [
                'sometimes',
                'required',
                'regex:/^\+?[0-9]{10,15}$/',
                Rule::unique('users')->ignore($user->id),
            ],
            'date_of_birth' => 'sometimes|nullable|date|before:today|after:1900-01-01',
            'gender' => 'sometimes|nullable|in:male,female,other',
            'language' => 'sometimes|in:en,ar',
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
            'first_name.required' => 'First name is required.',
            'last_name.required' => 'Last name is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already in use.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Please provide a valid phone number.',
            'phone.unique' => 'This phone number is already in use.',
            'date_of_birth.date' => 'Please provide a valid date of birth.',
            'date_of_birth.before' => 'Date of birth must be in the past.',
            'date_of_birth.after' => 'Please provide a valid date of birth.',
            'gender.in' => 'Please select a valid gender.',
            'language.in' => 'Please select a valid language.',
        ];
    }
}
