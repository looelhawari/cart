<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Base shape only. Several columns + indexes are added by later, NON-idempotent
     * migrations and must NOT be created here, otherwise migrate:fresh collides:
     *   - 2026_01_23_000001_add_security_fields_to_payment_methods adds:
     *       deleted_at, card_holder_name, is_verified, token_fingerprint,
     *       indexes pm_user_default_idx, pm_deleted_at_idx, unique pm_user_token_unique
     *   - 2026_01_24_140000_migrate_to_paymob_card_tokens adds (unguarded):
     *       paymob_card_token, token_type, payment_methods_paymob_card_token_index
     *   - The same migration adds status, invalidated_reason, invalidated_at
     *     guarded behind hasColumn('status'). We include status here, which
     *     causes that whole guarded block to skip — fine, since invalidated_*
     *     are also created here.
     *   - 2026_02_01_000001_fix_payment_schema_alignment adds expires_at
     *     (idempotent hasColumn). We include it here; later migration skips.
     */
    public function up(): void
    {
        if (Schema::hasTable('payment_methods')) {
            return;
        }

        DB::unprepared(<<<'SQL'
        CREATE TABLE `payment_methods` (
          `id` bigint UNSIGNED NOT NULL,
          `user_id` bigint UNSIGNED NOT NULL,
          `type` enum('card') COLLATE utf8mb4_unicode_ci DEFAULT 'card',
          `card_last_four` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
          `card_brand` enum('visa','mastercard','amex','discover','other') COLLATE utf8mb4_unicode_ci NOT NULL,
          `token` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tokenized card from payment gateway',
          `is_default` tinyint(1) DEFAULT '0',
          `status` enum('active','invalid','revoked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
          `invalidated_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `invalidated_at` timestamp NULL DEFAULT NULL,
          `expires_at` date DEFAULT NULL,
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        ALTER TABLE `payment_methods`
          ADD PRIMARY KEY (`id`),
          ADD KEY `idx_user_id` (`user_id`),
          ADD KEY `idx_is_default` (`is_default`);

        ALTER TABLE `payment_methods`
          MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

        ALTER TABLE `payment_methods`
          ADD CONSTRAINT `payment_methods_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
        SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
