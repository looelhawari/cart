<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('promo_codes')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `promo_codes` (
          `id` bigint UNSIGNED NOT NULL,
          `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `type` enum('percentage','fixed_amount','free_delivery','bogo') COLLATE utf8mb4_unicode_ci NOT NULL,
          `applies_to` enum('order','category','product') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'order',
          `first_order_only` tinyint(1) NOT NULL DEFAULT '0',
          `value` decimal(10,2) NOT NULL COMMENT 'Percentage or fixed amount',
          `minimum_order` decimal(10,2) DEFAULT '0.00',
          `maximum_discount` decimal(10,2) DEFAULT NULL,
          `usage_limit` int DEFAULT NULL COMMENT 'Total usage limit, NULL for unlimited',
          `usage_per_user` int DEFAULT '1' COMMENT 'Max uses per user',
          `used_count` int DEFAULT '0',
          `valid_from` timestamp NULL DEFAULT NULL,
          `valid_until` timestamp NULL DEFAULT NULL,
          `is_active` tinyint(1) DEFAULT '1',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `promo_codes`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `code` (`code`),
          ADD KEY `idx_code` (`code`),
          ADD KEY `idx_is_active` (`is_active`),
          ADD KEY `idx_valid_dates` (`valid_from`,`valid_until`),
          ADD KEY `idx_type` (`type`),
          ADD KEY `idx_first_order_only` (`first_order_only`),
          ADD KEY `idx_valid_from` (`valid_from`),
          ADD KEY `idx_valid_until` (`valid_until`),
          ADD KEY `idx_applies_to` (`applies_to`);

        ALTER TABLE `promo_codes`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
    }
};
