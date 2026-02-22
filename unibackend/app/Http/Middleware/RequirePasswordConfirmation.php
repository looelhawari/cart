<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Carbon\Carbon;

class RequirePasswordConfirmation
{
    /**
     * Handle an incoming request.
     * Require password re-verification for sensitive actions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // API routes (Sanctum token auth) don't have session stores.
        // Skip session-based password confirmation for stateless API requests.
        if (!$request->hasSession()) {
            return $next($request);
        }

        // Check if user has confirmed password recently (within last 30 minutes)
        $confirmedAt = $request->session()->get('auth.password_confirmed_at');

        if (!$confirmedAt || Carbon::parse($confirmedAt)->addMinutes(30)->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Password confirmation required',
                'error_code' => 'PASSWORD_CONFIRMATION_REQUIRED',
                'requires_password' => true,
            ], 423); // 423 Locked - requires action
        }

        return $next($request);
    }
}
