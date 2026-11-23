<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
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

        Schema::create('activity_logs', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    #[Test]
    public function profile_update_saves_normalized_phone_to_the_user_row(): void
    {
        $user = User::factory()->create([
            'phone' => null,
            'date_of_birth' => null,
            'gender' => null,
            'is_social_only' => true,
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson('/api/v1/profile', [
            'first_name' => $user->first_name,
            'phone' => '01012345678',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.user.phone', '+201012345678')
            ->assertJsonPath('data.user.date_of_birth', '1995-05-15')
            ->assertJsonPath('data.user.gender', 'male');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'phone' => '+201012345678',
            'date_of_birth' => '1995-05-15',
            'gender' => 'male',
        ]);
    }
}
