<?php

namespace App\Http\Middleware;

use App\Models\AdminLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogAdminActivity
{
    /**
     * Routes that should not be logged
     */
    protected array $excludedRoutes = [
        'admin/analytics',
        'admin/activity-logs',
        'admin/admin-logs',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log for authenticated admin users
        if (!$request->user() || !in_array($request->user()->role, ['admin', 'super_admin', 'employee'])) {
            return $response;
        }

        // Skip excluded routes
        foreach ($this->excludedRoutes as $excluded) {
            if (str_contains($request->path(), $excluded)) {
                return $response;
            }
        }

        // Log all admin actions to the admin_logs table
        try {
            AdminLog::logFromMiddleware(
                $request,
                $response->getStatusCode(),
                [
                    'response_size' => strlen($response->getContent()),
                ]
            );
        } catch (\Exception $e) {
            // Don't let logging failures affect the response
            \Log::error('Failed to log admin activity: ' . $e->getMessage());
        }

        return $response;
    }
}
