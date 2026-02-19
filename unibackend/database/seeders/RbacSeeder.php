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
            ['slug' => 'owner',         'display_name' => 'Owner',         'description' => 'Full access to all features',           'is_system' => true],
            ['slug' => 'cashier',       'display_name' => 'Cashier',       'description' => 'Operational day-to-day management',     'is_system' => true],
            ['slug' => 'support',       'display_name' => 'Support',       'description' => 'Customer support and refunds',          'is_system' => true],
            ['slug' => 'store_manager', 'display_name' => 'Store Manager', 'description' => 'Strategy, content, and analytics',      'is_system' => true],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(['slug' => $roleData['slug']], $roleData);
        }

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

        // ─── 4. Create Default Accounts for All 4 Roles ───
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
                'email'      => 'cashier.ops.m4v8@elbarakamarket.com',
                'password'   => 'Cv!48mZr@Nq2xW#7jPsL',
                'first_name' => 'Default',
                'last_name'  => 'Cashier',
                'phone'      => '+212700000002',
                'role'       => 'cashier',
            ],
            [
                'email'      => 'support.desk.t6y3@elbarakamarket.com',
                'password'   => 'Tp#63kRw!Yb9sV@2mXnQ',
                'first_name' => 'Default',
                'last_name'  => 'Support',
                'phone'      => '+212700000003',
                'role'       => 'support',
            ],
            [
                'email'      => 'store.mgr.j7w5@elbarakamarket.com',
                'password'   => 'Jw@75nFx#Qd3tM!8kRvZ',
                'first_name' => 'Default',
                'last_name'  => 'StoreManager',
                'phone'      => '+212700000004',
                'role'       => 'store_manager',
            ],
        ];

        foreach ($accounts as $acc) {
            User::updateOrCreate(
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
