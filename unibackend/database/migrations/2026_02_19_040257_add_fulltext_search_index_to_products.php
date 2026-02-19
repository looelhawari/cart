<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add FULLTEXT index for fast product search (if not exists)
        try {
            DB::statement('ALTER TABLE products ADD FULLTEXT INDEX ft_products_name (name_en, name_ar)');
        } catch (\Exception $e) {
            // Index may already exist
        }
        
        // Add composite indexes for common query patterns (skip duplicates)
        $existingIndexes = collect(DB::select('SHOW INDEX FROM products'))->pluck('Key_name')->unique()->toArray();
        
        Schema::table('products', function (Blueprint $table) use ($existingIndexes) {
            if (!in_array('idx_products_active_featured_created', $existingIndexes)) {
                $table->index(['is_active', 'is_featured', 'created_at'], 'idx_products_active_featured_created');
            }
            if (!in_array('idx_products_active_sale', $existingIndexes)) {
                $table->index(['is_active', 'sale_price'], 'idx_products_active_sale');
            }
            if (!in_array('idx_products_active_popularity', $existingIndexes)) {
                $table->index(['is_active', 'sales_count'], 'idx_products_active_popularity');
            }
            if (!in_array('idx_products_stock', $existingIndexes)) {
                $table->index(['is_active', 'is_in_stock', 'stock_quantity'], 'idx_products_stock');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE products DROP INDEX ft_products_name');
        
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_active_featured_created');
            $table->dropIndex('idx_products_active_sale');
            $table->dropIndex('idx_products_active_popularity');
            $table->dropIndex('idx_products_stock');
        });
    }
};
