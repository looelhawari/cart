<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_settings')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `user_settings` (
          `id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `push_notifications` tinyint(1) DEFAULT '1',
          `email_notifications` tinyint(1) DEFAULT '1',
          `sms_notifications` tinyint(1) DEFAULT '0',
          `order_updates` tinyint(1) DEFAULT '1',
          `promotional_emails` tinyint(1) DEFAULT '1',
          `language` enum('en','ar') COLLATE utf8mb4_unicode_ci DEFAULT 'en',
          `dark_mode` tinyint(1) DEFAULT '0',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `user_settings`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `user_id` (`user_id`),
          ADD KEY `idx_user_id` (`user_id`);

        ALTER TABLE `user_settings`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `user_settings`
          ADD CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
