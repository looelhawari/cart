<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DriverMiddleware
{
    /**
     * Ensure the authenticated user has the driver role AND is_active.
     *
     * SECURITY HARDENED (audit Chain E): previously only role was checked,
     * so a driver suspended via is_active=false retained access to
     * location updates, order accept/pickup/deliver actions, and the
     * dashboard. Now suspended drivers get 403.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if ($user->role !== 'driver') {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Driver access required.',
            ], 403);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Driver account is suspended.',
            ], 403);
        }

        return $next($request);
    }
}
