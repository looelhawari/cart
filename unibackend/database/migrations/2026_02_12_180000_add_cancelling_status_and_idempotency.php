<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration: Add 'cancelling' to order status enum + idempotency_key to order_refunds.
 *
 * PURPOSE:
 * 1. Race condition guard: 'cancelling' is a transient lock status set inside
 *    Phase 1 (DB transaction + SELECT FOR UPDATE) so that concurrent cancel
 *    requests will see 'cancelling' and abort instead of double-refunding.
 *
 * 2. Idempotency: unique idempotency_key on order_refunds prevents duplicate
 *    refund records even if the same request is retried.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Add 'cancelling' to order status enum
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM(
            'pending','pending_payment','confirmed','preparing',
            'out_for_delivery','delivered','cancelled','failed','cancelling'
        ) NOT NULL DEFAULT 'pending'");

        // 2. Add idempotency_key to order_refunds
        Schema::table('order_refunds', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable()->unique()->after('completed_at');
        });
    }

    public function down(): void
    {
        // Revert 'cancelling' from enum
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM(
            'pending','pending_payment','confirmed','preparing',
            'out_for_delivery','delivered','cancelled','failed'
        ) NOT NULL DEFAULT 'pending'");

        Schema::table('order_refunds', function (Blueprint $table) {
            $table->dropColumn('idempotency_key');
        });
    }
};
