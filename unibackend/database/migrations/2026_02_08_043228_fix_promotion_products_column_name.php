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
        Schema::table('promotion_products', function (Blueprint $table) {
            if (Schema::hasColumn('promotion_products', 'product_id') && !Schema::hasColumn('promotion_products', 'product_barcode')) {
                $table->renameColumn('product_id', 'product_barcode');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promotion_products', function (Blueprint $table) {
            if (Schema::hasColumn('promotion_products', 'product_barcode') && !Schema::hasColumn('promotion_products', 'product_id')) {
                $table->renameColumn('product_barcode', 'product_id');
            }
        });
    }
};
