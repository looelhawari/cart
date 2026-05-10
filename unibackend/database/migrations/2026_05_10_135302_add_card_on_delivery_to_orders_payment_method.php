<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds 'card_on_delivery' to orders.payment_method enum.
     *
     * Used for the "Card Machine on Delivery" customer option — flow is
     * identical to cash_on_delivery, but signals that the driver should
     * bring a card machine to collect payment in person.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `payment_method` ENUM(
                'cash_on_delivery',
                'card',
                'wallet',
                'card_on_delivery'
            ) NOT NULL");
    }

    public function down(): void
    {
        // Demote any card_on_delivery rows to cash_on_delivery before shrinking the enum.
        DB::statement("UPDATE `orders` SET `payment_method` = 'cash_on_delivery' WHERE `payment_method` = 'card_on_delivery'");

        DB::statement("ALTER TABLE `orders`
            MODIFY COLUMN `payment_method` ENUM(
                'cash_on_delivery',
                'card',
                'wallet'
            ) NOT NULL");
    }
};
