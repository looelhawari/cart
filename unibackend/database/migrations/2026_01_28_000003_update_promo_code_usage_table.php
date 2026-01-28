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
        // Add missing columns to existing promo_code_usage table
        if (Schema::hasTable('promo_code_usage')) {
            Schema::table('promo_code_usage', function (Blueprint $table) {
                if (!Schema::hasColumn('promo_code_usage', 'order_total')) {
                    $table->decimal('order_total', 10, 2)->default(0)->after('discount_amount');
                }
                if (!Schema::hasColumn('promo_code_usage', 'order_number')) {
                    $table->string('order_number')->nullable()->after('order_total');
                }
                if (!Schema::hasColumn('promo_code_usage', 'used_at')) {
                    $table->timestamp('used_at')->nullable()->after('order_number');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promo_code_usage', function (Blueprint $table) {
            $table->dropColumn(['order_total', 'order_number', 'used_at']);
        });
    }
};
