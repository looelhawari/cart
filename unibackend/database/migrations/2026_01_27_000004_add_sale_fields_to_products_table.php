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
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'original_price')) {
                $table->decimal('original_price', 10, 2)->nullable()->after('price');
            }
            if (!Schema::hasColumn('products', 'active_promotion_id')) {
                $table->unsignedBigInteger('active_promotion_id')->nullable()->after('sale_price');
                $table->foreign('active_promotion_id')->references('id')->on('promotions')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'active_promotion_id')) {
                $table->dropForeign(['active_promotion_id']);
                $table->dropColumn('active_promotion_id');
            }
            if (Schema::hasColumn('products', 'original_price')) {
                $table->dropColumn('original_price');
            }
        });
    }
};
