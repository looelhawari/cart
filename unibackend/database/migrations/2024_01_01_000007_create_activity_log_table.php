<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Spatie laravel-activitylog table (singular `activity_log`).
     * Distinct from the project's own `activity_logs` table.
     */
    public function up(): void
    {
        if (Schema::hasTable('activity_log')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `activity_log` (
          `id` bigint UNSIGNED NOT NULL,
          `log_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
          `subject_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `event` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `subject_id` bigint UNSIGNED DEFAULT NULL,
          `causer_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `causer_id` bigint UNSIGNED DEFAULT NULL,
          `properties` json DEFAULT NULL,
          `batch_uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT NULL,
          `updated_at` timestamp NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `activity_log`
          ADD PRIMARY KEY (`id`),
          ADD KEY `subject` (`subject_type`,`subject_id`),
          ADD KEY `causer` (`causer_type`,`causer_id`),
          ADD KEY `activity_log_log_name_index` (`log_name`);

        ALTER TABLE `activity_log`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
