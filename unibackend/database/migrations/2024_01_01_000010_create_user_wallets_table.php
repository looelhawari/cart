<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_wallets')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `user_wallets` (
          `id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `balance` decimal(10,2) DEFAULT '0.00',
          `total_credited` decimal(10,2) DEFAULT '0.00',
          `total_debited` decimal(10,2) DEFAULT '0.00',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `user_wallets`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `user_id` (`user_id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_balance` (`balance`);

        ALTER TABLE `user_wallets`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `user_wallets`
          ADD CONSTRAINT `user_wallets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('user_wallets');
    }
};
