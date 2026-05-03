<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The composite (wallet_id, created_at) index is intentionally omitted
     * here — `2026_01_21_100000_add_idempotency_to_wallet_transactions`
     * adds it unguarded and would fail if it pre-existed on migrate:fresh.
     */
    public function up(): void
    {
        if (Schema::hasTable('wallet_transactions')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `wallet_transactions` (
          `id` bigint UNSIGNED NOT NULL,
          `wallet_id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `type` enum('credit','debit') COLLATE utf8mb4_unicode_ci NOT NULL,
          `amount` decimal(10,2) NOT NULL,
          `balance_before` decimal(10,2) NOT NULL,
          `balance_after` decimal(10,2) NOT NULL,
          `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `reference_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'order, refund, top_up, reward',
          `reference_id` bigint UNSIGNED DEFAULT NULL,
          `idempotency_key` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `wallet_transactions`
          ADD PRIMARY KEY (`id`),
          ADD UNIQUE KEY `wallet_transactions_idempotency_key_unique` (`idempotency_key`),
          ADD KEY `idx_wallet_id` (`wallet_id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_type` (`type`),
          ADD KEY `idx_created_at` (`created_at`);

        ALTER TABLE `wallet_transactions`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `wallet_transactions`
          ADD CONSTRAINT `wallet_transactions_ibfk_1` FOREIGN KEY (`wallet_id`) REFERENCES `user_wallets` (`id`) ON DELETE CASCADE,
          ADD CONSTRAINT `wallet_transactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
