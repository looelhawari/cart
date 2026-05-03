<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('product_categories')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `product_categories` (
          `product_id` bigint UNSIGNED NOT NULL,
          `category_id` bigint UNSIGNED NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `product_categories`
          ADD PRIMARY KEY (`product_id`,`category_id`),
          ADD KEY `idx_product_id` (`product_id`),
          ADD KEY `idx_category_id` (`category_id`);

        ALTER TABLE `product_categories`
          ADD CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`barcode`) ON DELETE CASCADE,
          ADD CONSTRAINT `product_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('product_categories');
    }
};
