<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Services\RbacService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RbacController extends Controller
{
    public function __construct(private RbacService $rbac) {}

    /**
     * Get current user's permissions.
     * Every admin user calls this on login to know what they can access.
     */
    public function myPermissions(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->role;

        // Owner gets everything
        if ($role === 'owner') {
            $allPermissions = Permission::pluck('slug')->toArray();
            return response()->json([
                'success' => true,
                'data' => [
                    'role'        => $role,
                    'role_name'   => 'Owner',
                    'permissions' => $allPermissions,
                    'is_owner'    => true,
                ],
            ]);
        }

        $permissions = $this->rbac->getPermissionsForRole($role);
        $roleModel = Role::where('slug', $role)->first();

        return response()->json([
            'success' => true,
            'data' => [
                'role'        => $role,
                'role_name'   => $roleModel?->display_name ?? ucfirst(str_replace('_', ' ', $role)),
                'permissions' => $permissions,
                'is_owner'    => false,
            ],
        ]);
    }

    /**
     * List all roles (Owner only).
     */
    public function roles(Request $request): JsonResponse
    {
        $roles = Role::with('permissions:id,slug,module,display_name')->get();

        return response()->json([
            'success' => true,
            'data' => $roles->map(fn ($role) => [
                'id'           => $role->id,
                'slug'         => $role->slug,
                'display_name' => $role->display_name,
                'description'  => $role->description,
                'is_system'    => $role->is_system,
                'permissions'  => $role->permissions->pluck('slug'),
                'permission_count' => $role->permissions->count(),
            ]),
        ]);
    }

    /**
     * List all permissions grouped by module.
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('module')->orderBy('action')->get();

        $grouped = $permissions->groupBy('module')->map(function ($perms, $module) {
            return [
                'module'      => $module,
                'permissions' => $perms->map(fn ($p) => [
                    'id'           => $p->id,
                    'slug'         => $p->slug,
                    'action'       => $p->action,
                    'display_name' => $p->display_name,
                ]),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $grouped,
        ]);
    }

    /**
     * Update a role's permissions (Owner only).
     */
    public function updateRolePermissions(Request $request, int $roleId): JsonResponse
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,slug',
        ]);

        $role = Role::findOrFail($roleId);

        // Cannot modify owner role
        if ($role->slug === 'owner') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify the Owner role permissions.',
            ], 403);
        }

        $role->syncPermissionsBySlugs($request->permissions);
        $this->rbac->clearRoleCache($role->slug);

        return response()->json([
            'success' => true,
            'message' => 'Role permissions updated successfully.',
            'data' => [
                'role'        => $role->slug,
                'permissions' => $request->permissions,
            ],
        ]);
    }
}
