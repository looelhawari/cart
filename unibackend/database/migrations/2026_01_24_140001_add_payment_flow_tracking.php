<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This migration adds:
     * 1. Flow tracking (classic_iframe, unified_3ds, moto)
     * 2. Intention ID for Unified Checkout API
     * 3. MOTO attempt tracking
     * 4. Removes payment_token (JWT keys should not be persisted)
     */
    public function up(): void
    {
        Schema::table('paymob_payments', function (Blueprint $table) {
            // Track which payment flow was used
            if (!Schema::hasColumn('paymob_payments', 'flow')) {
                $table->enum('flow', ['classic_iframe', 'unified_3ds', 'moto'])
                      ->default('classic_iframe')
                      ->after('payment_method');
            }

            // Store Paymob Intention ID (for Unified Checkout flow)
            if (!Schema::hasColumn('paymob_payments', 'paymob_intention_id')) {
                $table->string('paymob_intention_id', 100)->nullable()->after('paymob_order_id');
                $table->index('paymob_intention_id');
            }

            // Track MOTO attempts and timing
            if (!Schema::hasColumn('paymob_payments', 'moto_attempts')) {
                $table->unsignedTinyInteger('moto_attempts')->default(0)->after('flow');
                $table->index('flow');
                $table->index(['order_id', 'status', 'created_at']);
            }
            if (!Schema::hasColumn('paymob_payments', 'moto_attempted_at')) {
                $table->timestamp('moto_attempted_at')->nullable()->after('moto_attempts');
            }

            // Track if this payment fell back from MOTO to 3DS
            if (!Schema::hasColumn('paymob_payments', 'is_fallback_from_moto')) {
                $table->boolean('is_fallback_from_moto')->default(false)->after('moto_attempted_at');
            }
        });

        // Remove payment_token column (security best practice)
        if (Schema::hasColumn('paymob_payments', 'payment_token')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->dropColumn('payment_token');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('paymob_payments', function (Blueprint $table) {
            // Remove flow tracking columns
            $table->dropIndex(['paymob_intention_id']);
            $table->dropIndex(['flow']);
            $table->dropIndex(['order_id', 'status', 'created_at']);

            $table->dropColumn([
                'flow',
                'paymob_intention_id',
                'moto_attempts',
                'moto_attempted_at',
                'is_fallback_from_moto',
            ]);
        });

        // Restore payment_token column if rolling back
        if (!Schema::hasColumn('paymob_payments', 'payment_token')) {
            Schema::table('paymob_payments', function (Blueprint $table) {
                $table->text('payment_token')->nullable();
            });
        }
    }
};
