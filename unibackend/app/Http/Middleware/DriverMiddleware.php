<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DriverMiddleware
{
    /**
     * Ensure the authenticated user has the driver role.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if ($request->user()->role !== 'driver') {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Driver access required.',
            ], 403);
        }

        return $next($request);
    }
}
