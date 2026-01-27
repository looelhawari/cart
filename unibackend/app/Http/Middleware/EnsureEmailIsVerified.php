<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->is_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is not verified. Please verify your phone number.',
                'requires_verification' => true,
            ], 403);
        }

        return $next($request);
    }
}
