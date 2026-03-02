<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Pending registrations table — stores registration session data
     * BEFORE a user record is created. Supports the deferred insertion
     * pattern: nothing touches the `users` table until OTP is verified.
     *
     * Hybrid storage: this DB table is the source of truth, Redis is the
     * fast cache layer with TTL matching `expires_at`.
     */
    public function up(): void
    {
        Schema::create('pending_registrations', function (Blueprint $table) {
            $table->id();
            $table->uuid('registration_token')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone', 20);
            $table->string('password_hash')->nullable(); // Set at step 2
            $table->enum('language', ['en', 'ar'])->default('en');
            $table->enum('status', ['step1', 'step2', 'otp_sent'])->default('step1');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('email');
            $table->index('phone');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
