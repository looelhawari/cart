<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Performance indexes for the most-queried columns.
     * Eliminates full-table scans on products, categories, and promotions.
     */
    public function up(): void
    {
        // ── Products ─────────────────────────────────────────
        Schema::table('products', function (Blueprint $table) {
            // Covers: featured listing, active filter
            $table->index(['is_active', 'is_featured'], 'idx_products_active_featured');

            // Covers: flash deals sort, price range filters
            $table->index(['is_active', 'sale_price'], 'idx_products_active_sale');

            // Covers: search + sort by popularity
            $table->index(['is_active', 'sales_count'], 'idx_products_active_sales');

            // Covers: stock filter queries
            $table->index(['is_active', 'stock_quantity'], 'idx_products_active_stock');

            // Covers: promotion lookups
            $table->index('active_promotion_id', 'idx_products_promo_id');
        });

        // ── Categories ───────────────────────────────────────
        Schema::table('categories', function (Blueprint $table) {
            // Covers: main category listing, subcategory lookups
            $table->index(['parent_id', 'is_active', 'sort_order'], 'idx_categories_parent_active_sort');
        });

        // ── Promotions ───────────────────────────────────────
        Schema::table('promotions', function (Blueprint $table) {
            // Covers: active() scope + featured() scope
            $table->index(['is_active', 'is_featured'], 'idx_promotions_active_featured');
            $table->index(['is_active', 'start_date', 'end_date'], 'idx_promotions_active_dates');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_active_featured');
            $table->dropIndex('idx_products_active_sale');
            $table->dropIndex('idx_products_active_sales');
            $table->dropIndex('idx_products_active_stock');
            $table->dropIndex('idx_products_promo_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('idx_categories_parent_active_sort');
        });

        Schema::table('promotions', function (Blueprint $table) {
            $table->dropIndex('idx_promotions_active_featured');
            $table->dropIndex('idx_promotions_active_dates');
        });
    }
};
