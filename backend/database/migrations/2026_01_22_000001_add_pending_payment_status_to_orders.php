<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds 'pending_payment' to status ENUM
     * STEP 4 FINAL: orders.payment_status uses ONLY 'completed' (not 'paid')
     * Required for enterprise payment recovery system
     */
    public function up(): void
    {
        // Add 'pending_payment' to status ENUM
        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `status` ENUM(
                'pending',
                'pending_payment',
                'confirmed',
                'preparing',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'failed'
            ) DEFAULT 'pending'");

        // STEP 4 FINAL: Keep only 'completed' (not 'paid') for payment_status
        // Single source of truth: completed = payment successful
        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `payment_status` ENUM(
                'pending',
                'completed',
                'failed',
                'refunded'
            ) DEFAULT 'pending'");

        // Data migration: Convert any existing 'paid' to 'completed'
        DB::statement("UPDATE `orders` SET `payment_status` = 'completed' WHERE `payment_status` = 'paid'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'pending_payment' from status ENUM
        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `status` ENUM(
                'pending',
                'confirmed',
                'preparing',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'failed'
            ) DEFAULT 'pending'");

        // Remove 'paid' from payment_status ENUM
        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `payment_status` ENUM(
                'pending',
                'completed',
                'failed',
                'refunded'
            ) DEFAULT 'pending'");
    }
};
