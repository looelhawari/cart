<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\EgyptianMobilePhone;
use Illuminate\Foundation\Http\FormRequest;

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
     * `email` is stripped here before validation. Changing email requires the
     * dedicated email-change OTP flow. Phone is still editable from the mobile
     * profile screen, but it is normalized and duplicate-checked below.
     */
    protected function prepareForValidation(): void
    {
        // Drop attempts to change email via the profile-edit endpoint.
        $this->offsetUnset('email');

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

        if ($this->has('phone')) {
            $normalized = EgyptianMobilePhone::normalize($this->input('phone'));
            $data['phone'] = $normalized ?? trim((string) $this->input('phone', ''));
        }

        $this->merge($data);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * SECURITY: `email` is intentionally ABSENT — it is not settable from
     * this endpoint. See prepareForValidation().
     */
    public function rules(): array
    {
        return [
            'first_name'    => 'sometimes|required|string|max:255',
            'last_name'     => 'sometimes|nullable|string|max:255',
            'phone'         => [
                'sometimes',
                'required',
                'string',
                'max:20',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $normalized = EgyptianMobilePhone::normalize((string) $value);

                    if ($normalized === null) {
                        $fail(__('auth.invalid_egyptian_mobile'));
                        return;
                    }

                    $userId = $this->user()?->id;
                    $phoneExists = User::whereIn('phone', EgyptianMobilePhone::variants($normalized))
                        ->when($userId !== null, fn ($query) => $query->where('id', '!=', $userId))
                        ->exists();

                    if ($phoneExists) {
                        $fail(__('auth.phone_already_registered_login'));
                    }
                },
            ],
            'date_of_birth' => 'sometimes|nullable|date|before:today|after:1900-01-01',
            'gender'        => 'sometimes|nullable|in:male,female,other',
            'language'      => 'sometimes|in:en,ar',
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required' => 'First name is required.',
            'phone.required' => __('auth.phone_required'),
            'date_of_birth.date'  => 'Please provide a valid date of birth.',
            'date_of_birth.before' => 'Date of birth must be in the past.',
            'date_of_birth.after' => 'Please provide a valid date of birth.',
            'gender.in'   => 'Please select a valid gender.',
            'language.in' => 'Please select a valid language.',
        ];
    }
}
