<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
     * Sanitize inputs before validation per project-instructions.md
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim($this->email ?? '')),
            'phone' => $this->sanitizePhone($this->phone ?? ''),
            'first_name' => strip_tags(trim($this->first_name ?? '')),
            'last_name' => strip_tags(trim($this->last_name ?? '')),
        ]);
    }

    /**
     * Remove non-numeric characters from phone except +
     */
    private function sanitizePhone(string $phone): string
    {
        return preg_replace('/[^0-9+]/', '', $phone);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^\+?[0-9]{10,15}$/', 'unique:users,phone'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()      // At least one uppercase and one lowercase letter
                    ->numbers()        // At least one number
                    ->symbols()        // At least one symbol
                    ->uncompromised(), // Check haveibeenpwned.com
            ],
            'language' => ['required', 'in:en,ar'],
        ];
    }
}
