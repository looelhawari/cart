<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('order_items')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `order_items` (
          `id` bigint UNSIGNED NOT NULL,
          `order_id` bigint UNSIGNED NOT NULL,
          `product_id` bigint UNSIGNED NOT NULL,
          `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Snapshot of product name',
          `product_sku` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Snapshot of SKU',
          `quantity` int NOT NULL,
          `price` decimal(10,2) NOT NULL COMMENT 'Price per unit at time of order',
          `subtotal` decimal(10,2) NOT NULL,
          `refunded` tinyint(1) NOT NULL DEFAULT '0',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `order_items`
          ADD PRIMARY KEY (`id`),
          ADD KEY `idx_order_id` (`order_id`),
          ADD KEY `idx_product_id` (`product_id`);

        ALTER TABLE `order_items`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `order_items`
          ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`barcode`) ON DELETE RESTRICT;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
