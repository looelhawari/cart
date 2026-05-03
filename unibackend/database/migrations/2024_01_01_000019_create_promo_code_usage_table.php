<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('promo_code_usage')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `promo_code_usage` (
          `id` bigint UNSIGNED NOT NULL,
          `promo_code_id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `order_id` bigint UNSIGNED NOT NULL,
          `discount_amount` decimal(10,2) NOT NULL,
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `promo_code_usage`
          ADD PRIMARY KEY (`id`),
          ADD KEY `idx_promo_code_id` (`promo_code_id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_order_id` (`order_id`);

        ALTER TABLE `promo_code_usage`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `promo_code_usage`
          ADD CONSTRAINT `promo_code_usage_ibfk_1` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `promo_code_usage_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `promo_code_usage_ibfk_3` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_code_usage');
    }
};
