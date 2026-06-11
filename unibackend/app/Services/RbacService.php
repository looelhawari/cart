<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class RbacService
{
    /**
     * Cache TTL in seconds (1 hour).
     */
    private const CACHE_TTL = 3600;

    /**
     * Get all permissions for a role (cached).
     */
    public function getPermissionsForRole(string $roleSlug): array
    {
        return Cache::remember("rbac:role:{$roleSlug}:permissions", self::CACHE_TTL, function () use ($roleSlug) {
            $role = Role::where('slug', $roleSlug)->first();
            if (!$role) return [];
            return $role->permissions()->pluck('slug')->toArray();
        });
    }

    /**
     * Check if a user has a specific permission.
     */
    public function userHasPermission(User $user, string $permission): bool
    {
        // Owner always has all permissions
        if ($user->role === 'owner') {
            return true;
        }

        $permissions = $this->getPermissionsForRole($user->role);
        return in_array($permission, $permissions);
    }

    /**
     * Check if a user has ANY of the given permissions.
     */
    public function userHasAnyPermission(User $user, array $permissions): bool
    {
        if ($user->role === 'owner') {
            return true;
        }

        $rolePermissions = $this->getPermissionsForRole($user->role);
        return !empty(array_intersect($permissions, $rolePermissions));
    }

    /**
     * Check if a user has ALL of the given permissions.
     */
    public function userHasAllPermissions(User $user, array $permissions): bool
    {
        if ($user->role === 'owner') {
            return true;
        }

        $rolePermissions = $this->getPermissionsForRole($user->role);
        return empty(array_diff($permissions, $rolePermissions));
    }

    /**
     * Check if role is an admin role (can access dashboard).
     */
    public function isAdminRole(string $role): bool
    {
        return in_array($role, [
            'owner', 'cashier', 'support', 'store_manager',
            // Legacy roles still work
            'super_admin', 'admin', 'sales_manager', 'accountant', 'customer_support',
        ]);
    }

    /**
     * Clear cached permissions for a role.
     */
    public function clearRoleCache(string $roleSlug): void
    {
        Cache::forget("rbac:role:{$roleSlug}:permissions");
    }

    /**
     * Clear all RBAC caches.
     */
    public function clearAllCaches(): void
    {
        $roles = Role::pluck('slug');
        foreach ($roles as $slug) {
            Cache::forget("rbac:role:{$slug}:permissions");
        }
    }

    /**
     * Complete permission map: module → action definitions.
     *
     * Only `view` and `manage` exist: routes never checked the old
     * .create/.edit/.delete slugs, so they only added noise to the roles
     * editor. `view` = read-only GET access, `manage` = all mutations.
     */
    public static function permissionDefinitions(): array
    {
        return [
            'dashboard' => [
                'view' => 'View dashboard',
            ],
            'orders' => [
                'view'   => 'View orders',
                'manage' => 'Full order management',
            ],
            'products' => [
                'view'   => 'View products',
                'manage' => 'Full product management',
            ],
            'categories' => [
                'view'   => 'View categories',
                'manage' => 'Full category management',
            ],
            'promotions' => [
                'view'   => 'View promotions',
                'manage' => 'Full promotion management',
            ],
            'promo_codes' => [
                'view'   => 'View promo codes',
                'manage' => 'Full promo code management',
            ],
            'delivery_zones' => [
                'view'   => 'View delivery zones',
                'manage' => 'Full delivery zone management',
            ],
            'drivers' => [
                'view'   => 'View drivers',
                'manage' => 'Full driver management',
            ],
            'refunds' => [
                'view'   => 'View refunds',
                'manage' => 'Full refund management',
            ],
            'support' => [
                'view'   => 'View support tickets',
                'manage' => 'Full support management',
            ],
            'customers' => [
                'view'   => 'View customers',
                'manage' => 'Full customer management',
            ],
            'users' => [
                'view'   => 'View admin users',
                'manage' => 'Full user management',
            ],
            'analytics' => [
                'view'   => 'View analytics',
                'manage' => 'Full analytics access',
            ],
            'financial' => [
                'view'   => 'View financial data',
                'manage' => 'Full financial management',
            ],
            'admin_logs' => [
                'view'   => 'View admin logs',
            ],
            'app_logs' => [
                'view'   => 'View app/activity logs',
            ],
            'content' => [
                'view'   => 'View content pages',
                'manage' => 'Full content management',
            ],
            'reviews' => [
                'view'   => 'View reviews',
                'manage' => 'Full review management',
            ],
            'settings' => [
                'view'   => 'View store settings',
                'manage' => 'Full settings management',
            ],
            'notifications' => [
                'view'   => 'View notifications',
                'manage' => 'Full notification management',
            ],
        ];
    }

    /**
     * Role → permission mapping (which permissions each role gets).
     */
    public static function rolePermissionMap(): array
    {
        return [
            // ─── OWNER: Full access to everything ───
            'owner' => '*', // Special: gets ALL permissions

            // ─── CASHIER: Operational day-to-day (no dashboard access) ───
            'cashier' => [
                'orders.view', 'orders.manage',
                'products.view', 'products.manage',
                'categories.view', 'categories.manage',
                'promotions.view', 'promotions.manage',
                'promo_codes.view', 'promo_codes.manage',
                'delivery_zones.view', 'delivery_zones.manage',
                'customers.view',
            ],

            // ─── SUPPORT: Customer-facing (no dashboard access) ───
            'support' => [
                'refunds.view', 'refunds.manage',
                'support.view', 'support.manage',
                'customers.view', 'customers.manage',
                'app_logs.view',
                'orders.view', // Read-only: support needs to see orders for context
            ],

            // ─── STORE MANAGER: Strategy & content (has dashboard + read-only ops data) ───
            'store_manager' => [
                'dashboard.view',
                'analytics.view', 'analytics.manage',
                'settings.view', 'settings.manage',
                'reviews.view', 'reviews.manage',
                'content.view', 'content.manage',
                'notifications.view', 'notifications.manage',
                // Read-only access to ops data needed for the dashboard overview
                'orders.view',
                'products.view',
                'promotions.view',
            ],
        ];
    }
}
