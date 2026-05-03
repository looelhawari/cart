<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `orders` (
          `id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `order_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `status` enum('pending','pending_payment','confirmed','preparing','out_for_delivery','delivered','cancelled','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
          `subtotal` decimal(10,2) NOT NULL,
          `delivery_fee` decimal(10,2) DEFAULT '0.00',
          `discount` decimal(10,2) DEFAULT '0.00',
          `promo_code_snapshot` json DEFAULT NULL,
          `tax` decimal(10,2) DEFAULT '0.00',
          `total` decimal(10,2) NOT NULL,
          `refunded_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
          `payment_method` enum('cash_on_delivery','card','wallet') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `payment_status` enum('pending','completed','failed','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
          `delivery_address_id` bigint UNSIGNED NOT NULL,
          `delivery_address_snapshot` json DEFAULT NULL,
          `delivery_date` date DEFAULT NULL,
          `delivery_time_slot` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '9AM-12PM, 12PM-3PM, etc',
          `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `cancelled_at` timestamp NULL DEFAULT NULL,
          `refunded_at` timestamp NULL DEFAULT NULL,
          `refund_reason` text COLLATE utf8mb4_unicode_ci,
          `refunded_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user ID who initiated refund',
          `cancellation_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `orders`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `order_number` (`order_number`),
          ADD KEY `delivery_address_id` (`delivery_address_id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_order_number` (`order_number`),
          ADD KEY `idx_status` (`status`),
          ADD KEY `idx_payment_status` (`payment_status`),
          ADD KEY `idx_created_at` (`created_at`),
          ADD KEY `idx_delivery_date` (`delivery_date`),
          ADD KEY `orders_refunded_by_foreign` (`refunded_by`);

        ALTER TABLE `orders`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `orders`
          ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
          ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`delivery_address_id`) REFERENCES `addresses` (`id`) ON DELETE RESTRICT,
          ADD CONSTRAINT `orders_refunded_by_foreign` FOREIGN KEY (`refunded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
