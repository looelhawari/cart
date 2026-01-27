<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify buy_scope to include 'any' (any product in cart)
        DB::statement("ALTER TABLE promo_code_bogo_rules MODIFY COLUMN buy_scope ENUM('any', 'product', 'category') NOT NULL DEFAULT 'any'");
        
        // Modify get_scope to include 'same' (same as buy product)
        DB::statement("ALTER TABLE promo_code_bogo_rules MODIFY COLUMN get_scope ENUM('same', 'product', 'category') NOT NULL DEFAULT 'same'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE promo_code_bogo_rules MODIFY COLUMN buy_scope ENUM('product', 'category') NOT NULL");
        DB::statement("ALTER TABLE promo_code_bogo_rules MODIFY COLUMN get_scope ENUM('product', 'category') NOT NULL");
    }
};
