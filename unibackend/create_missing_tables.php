<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$missingTables = [
    'admin_logs',
    'job_batches',
    'order_status_history',
    'pending_registrations',
    'promotion_categories',
    'promotion_products',
    'promotions',
    'refund_locks',
    'user_settings',
    'user_wallets',
    'wallet_transactions',
];

$sqlStatements = [
    'admin_logs' => "CREATE TABLE `admin_logs` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `admin_id` bigint UNSIGNED NOT NULL,
        `action` varchar(255) NOT NULL,
        `entity_type` varchar(255) DEFAULT NULL,
        `entity_id` bigint UNSIGNED DEFAULT NULL,
        `description` text,
        `ip_address` varchar(45) DEFAULT NULL,
        `user_agent` text,
        `old_values` json DEFAULT NULL,
        `new_values` json DEFAULT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        INDEX `idx_admin_id` (`admin_id`),
        INDEX `idx_entity` (`entity_type`, `entity_id`),
        INDEX `idx_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'job_batches' => "CREATE TABLE `job_batches` (
        `id` varchar(255) NOT NULL PRIMARY KEY,
        `name` varchar(255) NOT NULL,
        `total_jobs` int NOT NULL,
        `pending_jobs` int NOT NULL,
        `failed_jobs` int NOT NULL,
        `failed_job_ids` longtext NOT NULL,
        `options` mediumtext,
        `cancelled_at` int DEFAULT NULL,
        `created_at` int NOT NULL,
        `finished_at` int DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'order_status_history' => "CREATE TABLE `order_status_history` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `order_id` bigint UNSIGNED NOT NULL,
        `status` enum('pending','processing','shipped','delivered','cancelled','refunded') NOT NULL,
        `changed_by` bigint UNSIGNED DEFAULT NULL,
        `notes` text,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        INDEX `idx_order_id` (`order_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'pending_registrations' => "CREATE TABLE `pending_registrations` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `email` varchar(255) DEFAULT NULL,
        `phone` varchar(20) DEFAULT NULL,
        `otp` varchar(6) NOT NULL,
        `registration_data` json NOT NULL,
        `expires_at` timestamp NOT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_email` (`email`),
        UNIQUE KEY `unique_phone` (`phone`),
        INDEX `idx_expires_at` (`expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'promotions' => "CREATE TABLE `promotions` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `name` varchar(255) NOT NULL,
        `description` text,
        `type` enum('flash_sale','deal','seasonal','clearance') NOT NULL,
        `discount_type` enum('percentage','fixed') NOT NULL,
        `discount_value` decimal(10,2) NOT NULL,
        `min_purchase` decimal(10,2) DEFAULT NULL,
        `max_discount` decimal(10,2) DEFAULT NULL,
        `starts_at` timestamp NOT NULL,
        `ends_at` timestamp NOT NULL,
        `is_active` tinyint(1) NOT NULL DEFAULT '1',
        `priority` int NOT NULL DEFAULT '0',
        `banner_image` varchar(255) DEFAULT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        INDEX `idx_active_dates` (`is_active`, `starts_at`, `ends_at`),
        INDEX `idx_type` (`type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'promotion_categories' => "CREATE TABLE `promotion_categories` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `promotion_id` bigint UNSIGNED NOT NULL,
        `category_id` bigint UNSIGNED NOT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_promotion_category` (`promotion_id`, `category_id`),
        INDEX `idx_category_id` (`category_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'promotion_products' => "CREATE TABLE `promotion_products` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `promotion_id` bigint UNSIGNED NOT NULL,
        `product_id` bigint UNSIGNED NOT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_promotion_product` (`promotion_id`, `product_id`),
        INDEX `idx_product_id` (`product_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'refund_locks' => "CREATE TABLE `refund_locks` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `order_id` bigint UNSIGNED NOT NULL,
        `locked_at` timestamp NOT NULL,
        `expires_at` timestamp NOT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_order_id` (`order_id`),
        INDEX `idx_expires_at` (`expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'user_settings' => "CREATE TABLE `user_settings` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `user_id` bigint UNSIGNED NOT NULL,
        `notifications_enabled` tinyint(1) NOT NULL DEFAULT '1',
        `email_notifications` tinyint(1) NOT NULL DEFAULT '1',
        `sms_notifications` tinyint(1) NOT NULL DEFAULT '1',
        `push_notifications` tinyint(1) NOT NULL DEFAULT '1',
        `language` varchar(10) NOT NULL DEFAULT 'en',
        `currency` varchar(10) NOT NULL DEFAULT 'EGP',
        `theme` varchar(20) NOT NULL DEFAULT 'light',
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_user_id` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'user_wallets' => "CREATE TABLE `user_wallets` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `user_id` bigint UNSIGNED NOT NULL,
        `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
        `currency` varchar(10) NOT NULL DEFAULT 'EGP',
        `is_active` tinyint(1) NOT NULL DEFAULT '1',
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_user_id` (`user_id`),
        INDEX `idx_balance` (`balance`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'wallet_transactions' => "CREATE TABLE `wallet_transactions` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        `wallet_id` bigint UNSIGNED NOT NULL,
        `type` enum('credit','debit','refund','cashback') NOT NULL,
        `amount` decimal(10,2) NOT NULL,
        `balance_before` decimal(10,2) NOT NULL,
        `balance_after` decimal(10,2) NOT NULL,
        `description` text,
        `reference_type` varchar(255) DEFAULT NULL,
        `reference_id` bigint UNSIGNED DEFAULT NULL,
        `metadata` json DEFAULT NULL,
        `idempotency_key` varchar(255) DEFAULT NULL,
        `created_at` timestamp NULL DEFAULT NULL,
        `updated_at` timestamp NULL DEFAULT NULL,
        UNIQUE KEY `unique_idempotency` (`idempotency_key`),
        INDEX `idx_wallet_id` (`wallet_id`),
        INDEX `idx_reference` (`reference_type`, `reference_id`),
        INDEX `idx_created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($missingTables as $table) {
    try {
        if (isset($sqlStatements[$table])) {
            DB::statement($sqlStatements[$table]);
            echo "✓ Created table: $table\n";
        }
    } catch (Exception $e) {
        echo "✗ Error creating $table: " . $e->getMessage() . "\n";
    }
}

echo "\nDone!\n";
