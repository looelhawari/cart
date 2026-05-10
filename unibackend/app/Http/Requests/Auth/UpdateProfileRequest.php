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
     *
     * SECURITY HARDENED (audit Chain C item 4 — account takeover):
     * `email` and `phone` are stripped here before validation. Changing these
     * requires the dedicated email-change/phone-change OTP flow. Without this,
     * a stolen access token could change the account's email to attacker-
     * controlled, then trigger password-reset and lock the legit user out.
     */
    protected function prepareForValidation(): void
    {
        // Drop attempts to change email/phone via the profile-edit endpoint.
        // The legitimate path is /auth/email-change/start + /auth/email-change/verify
        // (sends OTP to the new email; commits only after Hash::check OK).
        $this->offsetUnset('email');
        $this->offsetUnset('phone');

        $data = [];

        if ($this->has('first_name')) {
            $data['first_name'] = strip_tags(trim($this->first_name));
        }

        if ($this->has('last_name')) {
            $data['last_name'] = strip_tags(trim($this->last_name));
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
     * SECURITY: `email` and `phone` are intentionally ABSENT — they're not
     * settable from this endpoint. See prepareForValidation().
     */
    public function rules(): array
    {
        return [
            'first_name'    => 'sometimes|required|string|max:255',
            'last_name'     => 'sometimes|required|string|max:255',
            'date_of_birth' => 'sometimes|nullable|date|before:today|after:1900-01-01',
            'gender'        => 'sometimes|nullable|in:male,female,other',
            'language'      => 'sometimes|in:en,ar',
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'First name is required.',
            'last_name.required'  => 'Last name is required.',
            'date_of_birth.date'  => 'Please provide a valid date of birth.',
            'date_of_birth.before' => 'Date of birth must be in the past.',
            'date_of_birth.after' => 'Please provide a valid date of birth.',
            'gender.in'   => 'Please select a valid gender.',
            'language.in' => 'Please select a valid language.',
        ];
    }
}
