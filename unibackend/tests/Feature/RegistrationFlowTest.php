<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RegistrationFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);

        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->string('phone', 20)->unique()->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender')->nullable();
            $table->string('password');
            $table->string('avatar')->nullable();
            $table->string('language')->default('en');
            $table->string('role')->default('customer');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_social_only')->default(false);
            $table->string('google_id')->nullable();
            $table->string('apple_id')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('registration_source')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table): void {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    #[Test]
    public function registration_returns_tokens_even_when_activity_log_table_is_unavailable(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'Manual Signup',
            'first_name' => 'Manual',
            'last_name' => 'Signup',
            'email' => 'manual.signup@example.com',
            'phone' => '01012345678',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
            'password' => 'Aa123456!',
            'password_confirmation' => 'Aa123456!',
            'language' => 'en',
            'address' => null,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'manual.signup@example.com')
            ->assertJsonPath('data.user.phone', '+201012345678')
            ->assertJsonPath('data.access_token', fn ($token) => is_string($token) && $token !== '')
            ->assertJsonPath('data.refresh_token', fn ($token) => is_string($token) && $token !== '');

        $this->assertFalse(Schema::hasTable('activity_logs'));
        $this->assertDatabaseHas('users', [
            'email' => 'manual.signup@example.com',
            'phone' => '+201012345678',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
        ]);
    }
}
