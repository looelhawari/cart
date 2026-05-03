<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('order_status_history')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `order_status_history` (
          `id` bigint UNSIGNED NOT NULL,
          `order_id` bigint UNSIGNED NOT NULL,
          `status` enum('pending','confirmed','processing','preparing','out_for_delivery','delivered','cancelled','failed') COLLATE utf8mb4_unicode_ci NOT NULL,
          `notes` text COLLATE utf8mb4_unicode_ci,
          `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'User ID who changed status',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `order_status_history`
          ADD PRIMARY KEY (`id`),
          ADD KEY `created_by` (`created_by`),
          ADD KEY `idx_order_id` (`order_id`),
          ADD KEY `idx_status` (`status`),
          ADD KEY `idx_created_at` (`created_at`);

        ALTER TABLE `order_status_history`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `order_status_history`
          ADD CONSTRAINT `order_status_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `order_status_history_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_history');
    }
};
