<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\RbacService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        // ─── 1. Create Roles ───
        $roles = [
            ['slug' => 'owner',   'display_name' => 'Owner',   'description' => 'Full access to all features (not editable)', 'is_system' => true],
            ['slug' => 'admin',   'display_name' => 'Admin',   'description' => 'Full access, editable',                      'is_system' => true],
            ['slug' => 'support', 'display_name' => 'Support', 'description' => 'Customer support and refunds',               'is_system' => true],
            ['slug' => 'manager', 'display_name' => 'Manager', 'description' => 'Strategy, content, and analytics',           'is_system' => true],
            ['slug' => 'sales',   'display_name' => 'Sales',   'description' => 'Catalog, pricing and promotions',            'is_system' => true],
            ['slug' => 'cashier', 'display_name' => 'Cashier', 'description' => 'Day-to-day order handling',                  'is_system' => true],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(['slug' => $roleData['slug']], $roleData);
        }

        // Drop roles that are no longer part of the team structure
        Role::whereNotIn('slug', array_column($roles, 'slug'))->delete();

        // ─── 2. Create Permissions ───
        $definitions = RbacService::permissionDefinitions();
        $allPermissionSlugs = [];

        foreach ($definitions as $module => $actions) {
            foreach ($actions as $action => $displayName) {
                $slug = "{$module}.{$action}";
                $allPermissionSlugs[] = $slug;

                Permission::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'module'       => $module,
                        'action'       => $action,
                        'display_name' => $displayName,
                        'description'  => "{$displayName} ({$module})",
                    ]
                );
            }
        }

        // Drop permissions that are no longer defined (e.g. the retired
        // .create/.edit/.delete granularity). role_permissions rows cascade.
        Permission::whereNotIn('slug', $allPermissionSlugs)->delete();

        // ─── 3. Assign Permissions to Roles ───
        $roleMap = RbacService::rolePermissionMap();

        foreach ($roleMap as $roleSlug => $permissions) {
            $role = Role::where('slug', $roleSlug)->first();
            if (!$role) continue;

            if ($permissions === '*') {
                // Owner gets ALL permissions
                $permIds = Permission::pluck('id');
                $role->permissions()->sync($permIds);
            } else {
                $permIds = Permission::whereIn('slug', $permissions)->pluck('id');
                $role->permissions()->sync($permIds);
            }
        }

        // ─── 4. Create Default Accounts (owner + one basic account per team) ───
        $accounts = [
            [
                'email'      => 'elbaraka.owner.x9k2@elbarakamarket.com',
                'password'   => 'Xk$92!qLmT@vR7zW#pNb',
                'first_name' => 'System',
                'last_name'  => 'Owner',
                'phone'      => '+212700000001',
                'role'       => 'owner',
            ],
            [
                'email'      => 'admin@elbarakamarket.com',
                'password'   => 'Admin#Cart2026',
                'first_name' => 'Team',
                'last_name'  => 'Admin',
                'phone'      => '+212700000010',
                'role'       => 'admin',
            ],
            [
                'email'      => 'support@elbarakamarket.com',
                'password'   => 'Support#Cart2026',
                'first_name' => 'Team',
                'last_name'  => 'Support',
                'phone'      => '+212700000011',
                'role'       => 'support',
            ],
            [
                'email'      => 'manager@elbarakamarket.com',
                'password'   => 'Manager#Cart2026',
                'first_name' => 'Team',
                'last_name'  => 'Manager',
                'phone'      => '+212700000012',
                'role'       => 'manager',
            ],
            [
                'email'      => 'sales@elbarakamarket.com',
                'password'   => 'Sales#Cart2026',
                'first_name' => 'Team',
                'last_name'  => 'Sales',
                'phone'      => '+212700000013',
                'role'       => 'sales',
            ],
            [
                'email'      => 'cashier@elbarakamarket.com',
                'password'   => 'Cashier#Cart2026',
                'first_name' => 'Team',
                'last_name'  => 'Cashier',
                'phone'      => '+212700000014',
                'role'       => 'cashier',
            ],
        ];

        foreach ($accounts as $acc) {
            // firstOrCreate, NOT updateOrCreate: re-running the seeder must
            // never reset the password of an account that already exists
            // (it may have been changed in production).
            User::firstOrCreate(
                ['email' => $acc['email']],
                [
                    'first_name'        => $acc['first_name'],
                    'last_name'         => $acc['last_name'],
                    'phone'             => $acc['phone'],
                    'password'          => Hash::make($acc['password']),
                    'role'              => $acc['role'],
                    'is_active'         => true,
                    'is_verified'       => true,
                    'email_verified_at' => now(),
                ]
            );
        }

        $this->command->info('');
        $this->command->info('╔══════════════════════════════════════════════════════════════════════╗');
        $this->command->info('║                    RBAC SETUP COMPLETE                              ║');
        $this->command->info('╠══════════════════════════════════════════════════════════════════════╣');
        $this->command->info('║  Roles: 4 | Permissions: ' . count($allPermissionSlugs) . str_repeat(' ', 40 - strlen((string)count($allPermissionSlugs))) . '║');
        $this->command->info('╠══════════════════════════════════════════════════════════════════════╣');
        foreach ($accounts as $acc) {
            $this->command->info('║  [' . strtoupper(str_pad($acc['role'], 14)) . ']  ' . str_pad($acc['email'], 48) . '║');
            $this->command->info('║  ' . str_pad('Password: ' . $acc['password'], 66) . '║');
            $this->command->info('║' . str_repeat('─', 68) . '║');
        }
        $this->command->info('╚══════════════════════════════════════════════════════════════════════╝');
        $this->command->info('');
    }
}
