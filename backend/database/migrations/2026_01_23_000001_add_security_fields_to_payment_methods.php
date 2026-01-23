<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds security and tokenization fields to existing payment_methods table.
     * Does NOT recreate or drop the table.
     */
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Add soft delete for audit trail
            $table->softDeletes()->after('updated_at');

            // Add card holder name for display
            $table->string('card_holder_name')->nullable()->after('card_brand');

            // Add verification status
            $table->boolean('is_verified')->default(false)->after('is_default')
                ->comment('True after first successful payment');

            // Add token fingerprint for duplicate detection
            $table->string('token_fingerprint', 64)->nullable()->after('token')
                ->comment('SHA-256 hash of token for duplicate detection');

            // Add indexes for performance
            $table->index(['user_id', 'is_default'], 'pm_user_default_idx');
            $table->index('deleted_at', 'pm_deleted_at_idx');

            // CRITICAL: Unique constraint on (user_id, token_fingerprint) ONLY
            // Do NOT include deleted_at (NULL behavior allows duplicates)
            // Restoration is the ONLY way to re-add a deleted card
            $table->unique(['user_id', 'token_fingerprint'], 'pm_user_token_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Drop unique constraint first
            $table->dropUnique('pm_user_token_unique');

            // Drop indexes
            $table->dropIndex('pm_user_default_idx');
            $table->dropIndex('pm_deleted_at_idx');

            // Remove added columns
            $table->dropSoftDeletes();
            $table->dropColumn(['card_holder_name', 'is_verified', 'token_fingerprint']);
        });
    }
};
