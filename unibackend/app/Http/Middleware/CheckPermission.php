<?php

namespace App\Http\Middleware;

use App\Services\RbacService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function __construct(private RbacService $rbac) {}

    /**
     * Handle an incoming request.
     *
     * Usage in routes:
     *   ->middleware('permission:orders.view')
     *   ->middleware('permission:orders.view,orders.edit')  // needs ANY of these
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        // Owner bypasses all checks
        if ($user->role === 'owner') {
            return $next($request);
        }

        // Check if user is an admin role at all
        if (!$this->rbac->isAdminRole($user->role)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Admin access required.',
            ], 403);
        }

        // If no specific permissions required, just admin check is enough
        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has ANY of the required permissions
        if (!$this->rbac->userHasAnyPermission($user, $permissions)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action.',
                'required_permissions' => $permissions,
            ], 403);
        }

        return $next($request);
    }
}
