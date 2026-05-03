<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backfills the categories table that was originally created directly in
     * production without a migration. Idempotent so it no-ops on prod-shaped DBs.
     */
    public function up(): void
    {
        if (Schema::hasTable('categories')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `categories` (
          `id` bigint UNSIGNED NOT NULL,
          `parent_id` bigint UNSIGNED DEFAULT NULL COMMENT 'NULL for main categories, ID for subcategories',
          `name_en` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `name_ar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `description_en` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `description_ar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
          `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `icon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Emoji or icon identifier for UI',
          `sort_order` int DEFAULT '0' COMMENT 'Display order within parent',
          `is_active` tinyint(1) DEFAULT '1',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `categories`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `slug` (`slug`),
          ADD KEY `idx_parent_id` (`parent_id`),
          ADD KEY `idx_slug` (`slug`),
          ADD KEY `idx_is_active` (`is_active`),
          ADD KEY `idx_sort_order` (`sort_order`);

        ALTER TABLE `categories`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `categories`
          ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
