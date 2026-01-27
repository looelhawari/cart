<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Using raw SQL to alter ENUM column
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support') NOT NULL DEFAULT 'customer'");
        
        // Add two_factor_enabled column if it doesn't exist
        if (!Schema::hasColumn('users', 'two_factor_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('two_factor_enabled')->default(false)->after('is_verified');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer'");
        
        if (Schema::hasColumn('users', 'two_factor_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('two_factor_enabled');
            });
        }
    }
};
