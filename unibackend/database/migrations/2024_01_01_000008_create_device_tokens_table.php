<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('device_tokens')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `device_tokens` (
          `id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `token` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `platform` enum('ios','android') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `device_tokens`
          ADD PRIMARY KEY (`id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_platform` (`platform`);

        ALTER TABLE `device_tokens`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `device_tokens`
          ADD CONSTRAINT `device_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('device_tokens');
    }
};
