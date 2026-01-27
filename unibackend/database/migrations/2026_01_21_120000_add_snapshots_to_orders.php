<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                // Add JSON column to store address snapshot at time of order
                if (!Schema::hasColumn('orders', 'delivery_address_snapshot')) {
                    $table->json('delivery_address_snapshot')->nullable()->after('delivery_address_id');
                }

                // Add promo code snapshot details
                if (!Schema::hasColumn('orders', 'promo_code_snapshot')) {
                    $table->json('promo_code_snapshot')->nullable()->after('discount');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'delivery_address_snapshot')) {
                    $table->dropColumn('delivery_address_snapshot');
                }
                if (Schema::hasColumn('orders', 'promo_code_snapshot')) {
                    $table->dropColumn('promo_code_snapshot');
                }
            });
        }
    }
};
