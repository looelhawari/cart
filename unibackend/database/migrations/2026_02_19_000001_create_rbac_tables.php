<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();       // owner, cashier, support, store_manager
            $table->string('display_name', 100);          // Human-readable name
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false); // System roles can't be deleted
            $table->timestamps();
        });

        // 2. Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 100)->unique();       // e.g. orders.view, products.manage
            $table->string('module', 50);                 // e.g. orders, products, analytics
            $table->string('action', 30);                 // e.g. view, create, edit, delete, manage
            $table->string('display_name', 150);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('module');
        });

        // 3. Role → Permission pivot
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['role_id', 'permission_id']);
        });

        // 4. Update users role enum to include new roles
        // Keep old roles for backward compat, add new ones
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support', 'driver', 'owner', 'cashier', 'support', 'store_manager') NOT NULL DEFAULT 'customer'");
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');

        // Revert to previous enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support', 'driver') NOT NULL DEFAULT 'customer'");
    }
};
