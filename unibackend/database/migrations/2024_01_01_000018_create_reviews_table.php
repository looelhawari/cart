<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sparse base shape from the production dump. Later migrations
     * (2026_02_03_100000, 2026_02_10_223814) idempotently add `images`,
     * `status`, `rating_type`, `response`, `responded_at`, `responded_by`,
     * and `rated_user_id` — leave them out here.
     */
    public function up(): void
    {
        if (Schema::hasTable('reviews')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `reviews` (
          `id` bigint UNSIGNED NOT NULL,
          `order_id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `product_id` bigint UNSIGNED NOT NULL,
          `rating` tinyint NOT NULL,
          `comment` text COLLATE utf8mb4_unicode_ci,
          `is_approved` tinyint(1) DEFAULT '0',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `reviews`
          ADD PRIMARY KEY (`id`),
          ADD KEY `idx_order_id` (`order_id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_product_id` (`product_id`),
          ADD KEY `idx_is_approved` (`is_approved`),
          ADD KEY `idx_rating` (`rating`);

        ALTER TABLE `reviews`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `reviews`
          ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`barcode`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
