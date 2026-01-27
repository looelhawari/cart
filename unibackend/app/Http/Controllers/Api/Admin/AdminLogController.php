<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminLogController extends Controller
{
    /**
     * Get paginated admin logs with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = AdminLog::with(['user:id,first_name,last_name,email,role'])
            ->orderByDesc('created_at');

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by action type
        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        // Filter by entity type
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        // Filter by module
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        // Filter by success status
        if ($request->has('is_successful')) {
            $query->where('is_successful', filter_var($request->is_successful, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by HTTP method
        if ($request->filled('http_method')) {
            $query->where('http_method', $request->http_method);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Search in multiple fields
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('action_description', 'like', "%{$search}%")
                  ->orWhere('entity_type', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('url', 'like', "%{$search}%");
            });
        }

        $perPage = min($request->get('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
            'from' => $logs->firstItem(),
            'to' => $logs->lastItem(),
        ]);
    }

    /**
     * Get admin log statistics
     */
    public function statistics(): JsonResponse
    {
        // Total activities (all time)
        $totalLogs = AdminLog::count();

        // Today's logs
        $todayLogs = AdminLog::whereDate('created_at', now()->toDateString())->count();

        // This week's logs
        $thisWeekLogs = AdminLog::whereBetween('created_at', [
            now()->startOfWeek()->toDateTimeString(),
            now()->endOfWeek()->toDateTimeString()
        ])->count();

        // This month's logs
        $thisMonthLogs = AdminLog::whereBetween('created_at', [
            now()->startOfMonth()->toDateTimeString(),
            now()->endOfMonth()->toDateTimeString()
        ])->count();

        // Logs by action type (last 30 days)
        $byActionType = AdminLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->selectRaw('action_type, COUNT(*) as count')
            ->groupBy('action_type')
            ->orderByDesc('count')
            ->get();

        // Logs by entity type (last 30 days)
        $byEntityType = AdminLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->whereNotNull('entity_type')
            ->selectRaw('entity_type, COUNT(*) as count')
            ->groupBy('entity_type')
            ->orderByDesc('count')
            ->get();

        // Logs by module (last 30 days)
        $byModule = AdminLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->whereNotNull('module')
            ->selectRaw('module, COUNT(*) as count')
            ->groupBy('module')
            ->orderByDesc('count')
            ->get();

        // Logs by user (last 30 days)
        $byUser = AdminLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->whereNotNull('user_id')
            ->selectRaw('user_id, user_name as name, user_role as role, COUNT(*) as count')
            ->groupBy('user_id', 'user_name', 'user_role')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Failed actions count
        $failedActions = AdminLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->where('is_successful', false)
            ->count();

        // Daily trend (last 14 days)
        $dailyTrend = AdminLog::whereBetween('created_at', [now()->subDays(14), now()])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Hourly distribution (last 24 hours)
        $hourlyDistribution = AdminLog::whereBetween('created_at', [now()->subHours(24), now()])
            ->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Most active users today
        $mostActiveToday = AdminLog::whereDate('created_at', now()->toDateString())
            ->whereNotNull('user_id')
            ->selectRaw('user_id, user_name as name, user_role as role, COUNT(*) as count')
            ->groupBy('user_id', 'user_name', 'user_role')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        return response()->json([
            'total_logs' => $totalLogs,
            'today_logs' => $todayLogs,
            'this_week_logs' => $thisWeekLogs,
            'this_month_logs' => $thisMonthLogs,
            'failed_actions' => $failedActions,
            'by_action_type' => $byActionType,
            'by_entity_type' => $byEntityType,
            'by_module' => $byModule,
            'by_user' => $byUser,
            'daily_trend' => $dailyTrend,
            'hourly_distribution' => $hourlyDistribution,
            'most_active_today' => $mostActiveToday,
        ]);
    }

    /**
     * Get a single admin log detail
     */
    public function show(int $id): JsonResponse
    {
        $log = AdminLog::with('user:id,first_name,last_name,email,role,phone')
            ->findOrFail($id);

        return response()->json($log);
    }

    /**
     * Get list of admin users for filter dropdown
     */
    public function users(): JsonResponse
    {
        $users = User::whereIn('role', ['admin', 'super_admin', 'employee'])
            ->select('id', 'first_name', 'last_name', 'email', 'role')
            ->orderBy('first_name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'email' => $user->email,
                    'role' => $user->role,
                ];
            });

        return response()->json($users);
    }

    /**
     * Get unique entity types for filter dropdown
     */
    public function entityTypes(): JsonResponse
    {
        $types = AdminLog::whereNotNull('entity_type')
            ->distinct()
            ->pluck('entity_type')
            ->sort()
            ->values();

        return response()->json($types);
    }

    /**
     * Get unique modules for filter dropdown
     */
    public function modules(): JsonResponse
    {
        $modules = AdminLog::whereNotNull('module')
            ->distinct()
            ->pluck('module')
            ->sort()
            ->values();

        return response()->json($modules);
    }

    /**
     * Get unique action types for filter dropdown
     */
    public function actionTypes(): JsonResponse
    {
        $types = AdminLog::distinct()
            ->pluck('action_type')
            ->sort()
            ->values();

        return response()->json($types);
    }

    /**
     * Export admin logs as CSV
     */
    public function export(Request $request)
    {
        $query = AdminLog::orderByDesc('created_at');

        // Apply same filters as index
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->limit(10000)->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="admin-logs-' . now()->format('Y-m-d-His') . '.csv"',
        ];

        $callback = function() use ($logs) {
            $file = fopen('php://output', 'w');
            
            // Header row
            fputcsv($file, [
                'ID',
                'Timestamp',
                'User Name',
                'User Email',
                'User Role',
                'Action',
                'Action Type',
                'Description',
                'Entity Type',
                'Entity ID',
                'Entity Name',
                'HTTP Method',
                'URL',
                'Module',
                'IP Address',
                'Status',
                'Successful',
            ]);

            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->user_name,
                    $log->user_email,
                    $log->user_role,
                    $log->action,
                    $log->action_type,
                    $log->action_description,
                    $log->entity_type,
                    $log->entity_id,
                    $log->entity_name,
                    $log->http_method,
                    $log->url,
                    $log->module,
                    $log->ip_address,
                    $log->response_status,
                    $log->is_successful ? 'Yes' : 'No',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Get recent logs for dashboard widget
     */
    public function recent(Request $request): JsonResponse
    {
        $limit = min($request->get('limit', 10), 50);
        
        $logs = AdminLog::orderByDesc('created_at')
            ->limit($limit)
            ->get([
                'id',
                'user_name',
                'user_role',
                'action',
                'action_description',
                'entity_type',
                'entity_id',
                'module',
                'is_successful',
                'created_at',
            ]);

        return response()->json($logs);
    }

    /**
     * Get logs for a specific entity
     */
    public function entityHistory(Request $request): JsonResponse
    {
        $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|integer',
        ]);

        $logs = AdminLog::where('entity_type', $request->entity_type)
            ->where('entity_id', $request->entity_id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json($logs);
    }

    /**
     * Get user activity summary
     */
    public function userActivity(int $userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        $totalActions = AdminLog::where('user_id', $userId)->count();
        $todayActions = AdminLog::where('user_id', $userId)
            ->whereDate('created_at', now()->toDateString())
            ->count();

        $actionsByType = AdminLog::where('user_id', $userId)
            ->selectRaw('action_type, COUNT(*) as count')
            ->groupBy('action_type')
            ->get();

        $actionsByModule = AdminLog::where('user_id', $userId)
            ->whereNotNull('module')
            ->selectRaw('module, COUNT(*) as count')
            ->groupBy('module')
            ->orderByDesc('count')
            ->get();

        $recentActions = AdminLog::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $lastActive = AdminLog::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->first()?->created_at;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'total_actions' => $totalActions,
            'today_actions' => $todayActions,
            'last_active' => $lastActive,
            'actions_by_type' => $actionsByType,
            'actions_by_module' => $actionsByModule,
            'recent_actions' => $recentActions,
        ]);
    }
}
