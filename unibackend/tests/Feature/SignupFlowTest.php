<?php

namespace Tests\Feature;

use Tests\TestCase;

class SignupFlowTest extends TestCase
{
    public function test_register_request_normalizes_egyptian_phone_and_has_no_otp_cleanup(): void
    {
        $src = file_get_contents(base_path('app/Http/Requests/Auth/RegisterRequest.php'));

        $this->assertStringContainsString('EgyptianMobilePhone::normalize', $src);
        $this->assertStringContainsString("User::whereIn('phone'", $src);
        $this->assertStringContainsString("'date_of_birth' => ['required'", $src);
        $this->assertStringContainsString("'gender' => ['required', 'in:male,female,other']", $src);
        $this->assertStringContainsString("'address.street' => ['required_with:address'", $src);
        $this->assertStringNotContainsString("where('is_verified', false)", $src);
        $this->assertStringNotContainsString('createEmailVerificationOtp', $src);
    }

    public function test_register_controller_issues_tokens_and_handles_duplicate_races(): void
    {
        $src = file_get_contents(base_path('app/Http/Controllers/Api/Auth/AuthController.php'));
        $body = $this->methodBody($src, 'register');

        $this->assertStringContainsString("createToken(\n            'access_token'", $body);
        $this->assertStringContainsString("'is_verified'       => true", $body);
        $this->assertStringContainsString("'status'        => 'active'", $body);
        $this->assertStringContainsString("'date_of_birth' => \$user->date_of_birth?->format('Y-m-d')", $body);
        $this->assertStringContainsString('$this->addressService->createForUser', $body);
        $this->assertStringContainsString("ActivityLog::log('address_created'", $body);
        $this->assertStringContainsString('catch (QueryException $e)', $body);
        $this->assertStringNotContainsString('createEmailVerificationOtp', $body);
        $this->assertStringNotContainsString('requires_verification', $body);
    }

    public function test_address_controller_uses_shared_address_service(): void
    {
        $src = file_get_contents(base_path('app/Http/Controllers/Api/AddressController.php'));

        $this->assertStringContainsString('AddressService $addressService', $src);
        $this->assertStringContainsString('$this->addressService->createForUser', $src);
        $this->assertStringContainsString('$this->addressService->updateAddress', $src);
    }

    public function test_signup_screen_has_no_otp_surface(): void
    {
        $src = file_get_contents(base_path('../frontend/app/(auth)/signup.tsx'));

        $this->assertStringContainsString('type Step = 1 | 2 | 3 | 4', $src);
        $this->assertStringContainsString('normalizeEgyptianMobile', $src);
        $this->assertStringContainsString('sanitizeEgyptianMobileInput', $src);
        $this->assertStringContainsString('setPhone((current) =>', $src);
        $this->assertStringContainsString('date_of_birth: formatDateForApi(dateOfBirth)', $src);
        $this->assertStringContainsString('gender,', $src);
        $this->assertStringContainsString('address: buildAddressPayload()', $src);
        $this->assertStringContainsString('skipAddressButton', $src);
        $this->assertStringContainsString('<Text style={styles.countryCodeText}>+20</Text>', $src);
        $this->assertStringNotContainsString('resend-otp', $src);
        $this->assertStringNotContainsString('otpDigits', $src);
        $this->assertStringNotContainsString('verifyAccount', $src);
    }

    public function test_auth_language_buttons_use_i18n_setter(): void
    {
        $signup = file_get_contents(base_path('../frontend/app/(auth)/signup.tsx'));
        $login = file_get_contents(base_path('../frontend/app/(auth)/login.tsx'));
        $welcome = file_get_contents(base_path('../frontend/app/welcome.tsx'));

        $this->assertStringContainsString('setLanguage: setAppLanguage', $signup);
        $this->assertStringContainsString('void setAppLanguage("en")', $signup);
        $this->assertStringContainsString('void setAppLanguage("ar")', $signup);
        $this->assertStringContainsString('void setLanguage("en")', $login);
        $this->assertStringContainsString('void setLanguage("ar")', $login);
        $this->assertStringContainsString('void setLanguage("en")', $welcome);
        $this->assertStringContainsString('void setLanguage("ar")', $welcome);
    }

    public function test_users_table_enforces_unique_phone_column(): void
    {
        $src = file_get_contents(base_path('database/migrations/0001_01_01_000000_create_users_table.php'));

        $this->assertStringContainsString("\$table->string('phone', 20)->unique()", $src);
        $this->assertStringContainsString("\$table->index('phone')", $src);
    }

    private function methodBody(string $src, string $method): string
    {
        $start = strpos($src, "public function {$method}(");
        $this->assertNotFalse($start, "{$method}() method not found.");

        $afterStart = substr($src, $start);
        $end = strpos($afterStart, "\n    public function ", 10);

        return $end !== false ? substr($afterStart, 0, $end) : $afterStart;
    }
}
