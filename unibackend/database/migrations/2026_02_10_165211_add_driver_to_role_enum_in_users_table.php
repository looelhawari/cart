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
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support', 'driver') NOT NULL DEFAULT 'customer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove driver role and set any driver users back to customer
        DB::statement("UPDATE users SET role = 'customer' WHERE role = 'driver'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support') NOT NULL DEFAULT 'customer'");
    }
};
