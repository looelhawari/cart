<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\EgyptianMobilePhone;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $fullName = $this->cleanName(
            $this->input('full_name')
                ?? trim((string) $this->input('first_name', '') . ' ' . (string) $this->input('last_name', ''))
        );

        [$firstName, $lastName] = $this->splitFullName($fullName);

        $phone = EgyptianMobilePhone::normalize($this->input('phone'));
        $address = $this->cleanAddress($this->input('address'));

        $data = [
            'full_name' => $fullName,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'phone' => $phone ?? trim((string) $this->input('phone', '')),
            'date_of_birth' => trim((string) $this->input('date_of_birth', '')),
            'gender' => strtolower(trim((string) $this->input('gender', ''))),
            'language' => $this->input('language', 'en'),
        ];

        if ($address !== null) {
            $data['address'] = $address;
        }

        $this->merge($data);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:2', 'max:120'],
            'first_name' => ['required', 'string', 'min:2', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'email' => [
                'required',
                'string',
                'email:rfc',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'phone' => [
                'required',
                'string',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (EgyptianMobilePhone::normalize((string) $value) === null) {
                        $fail(__('auth.invalid_egyptian_mobile'));
                    }
                },
            ],
            'date_of_birth' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'gender' => ['required', 'in:male,female,other'],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
            'language' => ['required', 'in:en,ar'],
            'address' => ['sometimes', 'nullable', 'array'],
            'address.label' => ['required_with:address', 'string', 'max:100', 'in:Home,Work,Other'],
            'address.recipient_name' => ['nullable', 'string', 'max:255'],
            'address.phone' => ['nullable', 'string', 'max:20'],
            'address.street' => ['required_with:address', 'string', 'max:1000'],
            'address.building' => ['nullable', 'string', 'max:255'],
            'address.floor' => ['nullable', 'string', 'max:255'],
            'address.apartment' => ['nullable', 'string', 'max:255'],
            'address.city' => ['required_with:address', 'string', 'max:100'],
            'address.area' => ['nullable', 'string', 'max:255'],
            'address.postal_code' => ['nullable', 'string', 'max:20'],
            'address.landmark' => ['nullable', 'string', 'max:255'],
            'address.notes' => ['nullable', 'string', 'max:500'],
            'address.is_default' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($validator->errors()->has('phone')) {
                return;
            }

            $normalized = EgyptianMobilePhone::normalize($this->input('phone'));

            if ($normalized === null) {
                return;
            }

            $existingUser = User::whereIn('phone', EgyptianMobilePhone::variants($normalized))->first();

            if (! $existingUser) {
                return;
            }

            if (! $existingUser->is_active) {
                $validator->errors()->add('phone', __('auth.account_cannot_be_used_contact_support'));
                return;
            }

            $validator->errors()->add('phone', __('auth.phone_already_registered_login'));
        });
    }

    public function messages(): array
    {
        return [
            'full_name.required' => __('auth.full_name_required'),
            'full_name.min' => __('auth.full_name_too_short'),
            'full_name.max' => __('auth.full_name_too_long'),
            'first_name.required' => __('auth.full_name_required'),
            'email.unique' => __('auth.email_already_exists'),
            'phone.required' => __('auth.phone_required'),
            'date_of_birth.required' => __('auth.date_of_birth_required'),
            'date_of_birth.date' => __('auth.date_of_birth_invalid'),
            'date_of_birth.before' => __('auth.date_of_birth_must_be_past'),
            'date_of_birth.after' => __('auth.date_of_birth_invalid'),
            'gender.required' => __('auth.gender_required'),
            'gender.in' => __('auth.gender_invalid'),
            'password.confirmed' => __('auth.password_confirmation_mismatch'),
            'address.label.required_with' => __('auth.address_label_required'),
            'address.label.in' => __('auth.address_label_invalid'),
            'address.street.required_with' => __('auth.address_street_required'),
            'address.city.required_with' => __('auth.address_city_required'),
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => __('auth.validation_failed'),
            'errors' => $validator->errors(),
        ], 422));
    }

    private function cleanName(?string $name): string
    {
        $cleaned = strip_tags(trim((string) $name));

        return preg_replace('/\s+/u', ' ', $cleaned) ?? '';
    }

    private function cleanAddress(mixed $address): ?array
    {
        if ($address === null || $address === '') {
            return null;
        }

        if (! is_array($address)) {
            return null;
        }

        $allowed = [
            'label',
            'recipient_name',
            'phone',
            'street',
            'building',
            'floor',
            'apartment',
            'city',
            'area',
            'postal_code',
            'landmark',
            'notes',
            'is_default',
        ];

        $cleaned = [];

        foreach ($allowed as $key) {
            if (! array_key_exists($key, $address)) {
                continue;
            }

            if ($key === 'is_default') {
                $cleaned[$key] = filter_var($address[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
                continue;
            }

            $value = strip_tags(trim((string) $address[$key]));
            $cleaned[$key] = preg_replace('/\s+/u', ' ', $value) ?? '';
        }

        if (isset($cleaned['label'])) {
            $labels = [
                'home' => 'Home',
                'work' => 'Work',
                'other' => 'Other',
            ];
            $cleaned['label'] = $labels[strtolower($cleaned['label'])] ?? $cleaned['label'];
        }

        return $cleaned === [] ? null : $cleaned;
    }

    /**
     * Preserve the existing users.first_name/users.last_name schema while the
     * mobile signup UI collects a single full name.
     */
    private function splitFullName(string $fullName): array
    {
        if ($fullName === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/u', $fullName, 2);

        return [
            $parts[0] ?? '',
            $parts[1] ?? '',
        ];
    }
}
