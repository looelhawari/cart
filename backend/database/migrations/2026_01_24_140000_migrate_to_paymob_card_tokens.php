<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This migration:
     * 1. Invalidates all existing JWT-based "saved cards" (they won't work anyway)
     * 2. Adds new column for proper Paymob saved card tokens
     * 3. Adds status tracking for active/invalid/revoked cards
     */
    public function up(): void
    {
        // STEP 1: Add status columns if they don't exist
        if (!Schema::hasColumn('payment_methods', 'status')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->enum('status', ['active', 'invalid', 'revoked'])
                      ->default('active')
                      ->after('is_verified');
                $table->string('invalidated_reason')->nullable()->after('status');
                $table->timestamp('invalidated_at')->nullable()->after('invalidated_reason');
            });
        }

        // STEP 2: Invalidate all existing saved cards (they contain JWT payment keys, not Paymob tokens)
        DB::table('payment_methods')
            ->whereNull('deleted_at')
            ->update([
                'status' => 'invalid',
                'invalidated_reason' => 'Migration: Converting from JWT payment keys to Paymob saved card tokens',
                'invalidated_at' => now(),
            ]);

        // STEP 3: Add new column for Paymob saved card token
        Schema::table('payment_methods', function (Blueprint $table) {
            // New column for proper Paymob token (e.g., "3860b033229de1ae77...")
            $table->string('paymob_card_token', 255)->nullable()->after('token');

            // Track token type for migration period
            $table->enum('token_type', ['paymob_saved_card', 'legacy_jwt'])
                  ->default('paymob_saved_card')
                  ->after('paymob_card_token');

            // Index for performance
            $table->index('paymob_card_token');
        });

        // STEP 4: Mark all existing records as legacy
        DB::table('payment_methods')->update(['token_type' => 'legacy_jwt']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove new columns
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropIndex(['paymob_card_token']);
            $table->dropColumn(['paymob_card_token', 'token_type']);
        });

        // Remove status columns
        if (Schema::hasColumn('payment_methods', 'status')) {
            Schema::table('payment_methods', function (Blueprint $table) {
                $table->dropColumn(['status', 'invalidated_reason', 'invalidated_at']);
            });
        }

        // Restore previous cards to active (if rolling back)
        DB::table('payment_methods')
            ->where('invalidated_reason', 'Migration: Converting from JWT payment keys to Paymob saved card tokens')
            ->update([
                'invalidated_reason' => null,
                'invalidated_at' => null,
            ]);
    }
};
