<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Rule;
use App\Models\User;

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

        // Delete any previous unverified records with the same email or phone.
        // This handles the case where a user started signup, went back from OTP,
        // changed email/phone, and is re-registering. Must run BEFORE validation
        // so the unique checks don't collide with our own stale record.
        $email = strtolower(trim($this->email ?? ''));
        $phone = $this->sanitizePhone($this->phone ?? '');

        User::where('is_verified', false)
            ->where(function ($query) use ($email, $phone) {
                $query->where('email', $email)
                      ->orWhere('phone', $phone);
            })
            ->delete();
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
            'email' => [
                'required', 'string', 'email:rfc,dns', 'max:255',
                Rule::unique('users', 'email')->where(function ($query) {
                    $query->where('is_verified', true);
                }),
            ],
            'phone' => [
                'required', 'string', 'regex:/^\+?[0-9]{10,15}$/',
                Rule::unique('users', 'phone')->where(function ($query) {
                    $query->where('is_verified', true);
                }),
            ],
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
