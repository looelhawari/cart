<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pending_registrations')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `pending_registrations` (
          `id` bigint UNSIGNED NOT NULL,
          `session_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `language` enum('en','ar') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
          `otp` varchar(6) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `otp_expires_at` timestamp NULL DEFAULT NULL,
          `otp_resend_count` int NOT NULL DEFAULT '0',
          `last_otp_sent_at` timestamp NULL DEFAULT NULL,
          `expires_at` timestamp NOT NULL,
          `created_at` timestamp NULL DEFAULT NULL,
          `updated_at` timestamp NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `pending_registrations`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `pending_registrations_session_id_unique` (`session_id`),
          ADD KEY `pending_registrations_session_id_index` (`session_id`),
          ADD KEY `pending_registrations_email_index` (`email`),
          ADD KEY `pending_registrations_phone_index` (`phone`),
          ADD KEY `pending_registrations_expires_at_index` (`expires_at`);

        ALTER TABLE `pending_registrations`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_registrations');
    }
};
