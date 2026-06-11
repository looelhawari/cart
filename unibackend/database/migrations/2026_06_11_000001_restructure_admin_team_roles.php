<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Restructure admin team roles to the canonical five teams:
 *   admin, support, manager, sales, cashier
 * (plus the untouchable system roles: owner, customer, driver).
 *
 * Legacy roles are mapped, not dropped with data: the enum is first widened
 * to a superset so rows can be migrated, then narrowed to the final set.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1) Widen enum to superset (old + new values) so updates can run
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'customer','super_admin','admin','sales_manager','accountant','customer_support',
            'driver','owner','cashier','support','store_manager','manager','sales'
        ) NOT NULL DEFAULT 'customer'");

        // 2) Map legacy roles onto the new team roles
        DB::table('users')->where('role', 'super_admin')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'store_manager')->update(['role' => 'manager']);
        DB::table('users')->where('role', 'sales_manager')->update(['role' => 'sales']);
        DB::table('users')->where('role', 'accountant')->update(['role' => 'manager']);
        DB::table('users')->where('role', 'customer_support')->update(['role' => 'support']);

        // 3) Narrow enum to the final role set
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'customer','driver','owner','admin','support','manager','sales','cashier'
        ) NOT NULL DEFAULT 'customer'");

        // 4) Rename the role row used by RBAC (permissions pivot follows role_id)
        DB::table('roles')->where('slug', 'store_manager')->update([
            'slug' => 'manager',
            'display_name' => 'Manager',
        ]);
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'customer','super_admin','admin','sales_manager','accountant','customer_support',
            'driver','owner','cashier','support','store_manager','manager','sales'
        ) NOT NULL DEFAULT 'customer'");

        DB::table('users')->where('role', 'manager')->update(['role' => 'store_manager']);
        DB::table('users')->where('role', 'sales')->update(['role' => 'sales_manager']);
        DB::table('roles')->where('slug', 'manager')->update([
            'slug' => 'store_manager',
            'display_name' => 'Store Manager',
        ]);

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM(
            'customer','super_admin','admin','sales_manager','accountant','customer_support',
            'driver','owner','cashier','support','store_manager'
        ) NOT NULL DEFAULT 'customer'");
    }
};
