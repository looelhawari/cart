<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Products use `barcode` as PK (not auto-increment) — barcodes are real-world
     * GTIN values supplied by the catalog, not generated.
     *
     * Trims:
     *   - `active_promotion_id` column + its KEY are deferred. The existing
     *     `2026_01_27_000004_add_sale_fields_to_products_table` adds both the
     *     column and the FK to promotions (idempotently), and runs after the
     *     promotions table is created.
     *   - 2026_02_18 / 2026_02_20 performance index migrations add their own
     *     composite indexes (NOT idempotent); those are net-new and not in
     *     the dump's CREATE-time index set, so nothing to omit here.
     */
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `products` (
          `barcode` bigint UNSIGNED NOT NULL,
          `name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `packaging` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `price` decimal(10,2) NOT NULL,
          `sale_price` decimal(10,2) DEFAULT NULL,
          `cost_price` decimal(10,2) DEFAULT NULL,
          `stock_quantity` int DEFAULT '0',
          `weight` decimal(8,2) DEFAULT NULL COMMENT 'Weight in grams',
          `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'piece' COMMENT 'piece, kg, liter, etc',
          `nutrition_facts` json DEFAULT NULL COMMENT 'Nutritional information',
          `is_featured` tinyint(1) DEFAULT '0',
          `is_active` tinyint(1) DEFAULT '1',
          `sales_count` int DEFAULT '0',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `products`
          ADD PRIMARY KEY (`barcode`),
          ADD UNIQUE KEY `slug` (`slug`),
          ADD KEY `idx_slug` (`slug`),
          ADD KEY `idx_is_active` (`is_active`),
          ADD KEY `idx_is_featured` (`is_featured`),
          ADD KEY `idx_price` (`price`),
          ADD KEY `idx_created_at` (`created_at`),
          ADD KEY `idx_stock_quantity` (`stock_quantity`);

        ALTER TABLE `products` ADD FULLTEXT KEY `idx_fulltext_search` (`name_en`,`name_ar`,`description_en`,`description_ar`);
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
