<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Performance indexes for high-traffic tables.
     * Targets the most common query patterns under concurrent load:
     * - Order lookups by user + status + date
     * - Cart item lookups by cart + product (add/update/remove)
     * - Token lookups for Sanctum auth
     * - Store settings lookups by key
     */
    public function up(): void
    {
        // ── Orders ───────────────────────────────────────────
        Schema::table('orders', function (Blueprint $table) {
            // Covers: getUserOrders() — WHERE user_id = ? AND status = ? ORDER BY created_at DESC
            $table->index(['user_id', 'status', 'created_at'], 'idx_orders_user_status_created');

            // Covers: payment webhook lookups
            $table->index(['payment_status', 'status'], 'idx_orders_payment_status');
        });

        // ── Cart Items ───────────────────────────────────────
        Schema::table('cart_items', function (Blueprint $table) {
            // Covers: addItem lockForUpdate — WHERE cart_id = ? AND product_id = ?
            // This is the hottest query under concurrent cart operations
            $table->unique(['cart_id', 'product_id'], 'idx_cart_items_cart_product');
        });

        // ── Personal Access Tokens (Sanctum) ─────────────────
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            // Covers: every authenticated request — WHERE tokenable_type = ? AND tokenable_id = ?
            $table->index(['tokenable_type', 'tokenable_id'], 'idx_pat_tokenable');
        });

        // ── Store Settings ───────────────────────────────────
        Schema::table('store_settings', function (Blueprint $table) {
            // Covers: StoreSetting::getValue() — WHERE key = ?
            $table->index('key', 'idx_store_settings_key');
        });

        // ── Carts ────────────────────────────────────────────
        Schema::table('carts', function (Blueprint $table) {
            // Covers: getCart() lookups — WHERE user_id = ? and WHERE session_id = ?
            $table->index('user_id', 'idx_carts_user_id');
            $table->index('session_id', 'idx_carts_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_user_status_created');
            $table->dropIndex('idx_orders_payment_status');
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropIndex('idx_cart_items_cart_product');
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex('idx_pat_tokenable');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropIndex('idx_store_settings_key');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->dropIndex('idx_carts_user_id');
            $table->dropIndex('idx_carts_session_id');
        });
    }
};
