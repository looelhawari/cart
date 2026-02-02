<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    /**
     * Get paginated activity logs with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with(['user:id,first_name,last_name,email,role'])
            ->orderByDesc('created_at');

        // Filter by user
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by action type
        if ($request->has('action') && $request->action) {
            $query->where('action', 'like', '%' . $request->action . '%');
        }

        // Filter by entity type
        if ($request->has('entity_type') && $request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }

        // Filter by date range
        if ($request->has('from_date') && $request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date') && $request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Search in metadata
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('entity_type', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = min($request->get('per_page', 25), 100);
        $logs = $query->paginate($perPage);

        // Transform user data for frontend
        $transformedLogs = collect($logs->items())->map(function ($log) {
            $logArray = $log->toArray();
            if (isset($logArray['user']) && $logArray['user']) {
                $logArray['user']['name'] = ($logArray['user']['first_name'] ?? '') . ' ' . ($logArray['user']['last_name'] ?? '');
            }
            return $logArray;
        });

        return response()->json([
            'data' => $transformedLogs,
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
            'from' => $logs->firstItem(),
            'to' => $logs->lastItem(),
        ]);
    }

    /**
     * Get activity log statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        // Total activities (all time)
        $totalActivities = ActivityLog::count();

        // Today's activities
        $todayActivities = ActivityLog::whereDate('created_at', now()->toDateString())->count();

        // This week's activities
        $thisWeekActivities = ActivityLog::whereBetween('created_at', [
            now()->startOfWeek()->toDateTimeString(),
            now()->endOfWeek()->toDateTimeString()
        ])->count();

        // This month's activities
        $thisMonthActivities = ActivityLog::whereBetween('created_at', [
            now()->startOfMonth()->toDateTimeString(),
            now()->endOfMonth()->toDateTimeString()
        ])->count();

        // Activities by action type (last 30 days)
        $byAction = ActivityLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->selectRaw('action, COUNT(*) as count')
            ->groupBy('action')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Activities by entity type (last 30 days)
        $byEntityType = ActivityLog::whereBetween('created_at', [now()->subDays(30), now()])
            ->whereNotNull('entity_type')
            ->selectRaw('entity_type, COUNT(*) as count')
            ->groupBy('entity_type')
            ->orderByDesc('count')
            ->get();

        // Activities by user (last 30 days)
        $byUser = ActivityLog::whereBetween('activity_logs.created_at', [now()->subDays(30), now()])
            ->whereNotNull('user_id')
            ->join('users', 'activity_logs.user_id', '=', 'users.id')
            ->selectRaw('user_id, CONCAT(users.first_name, " ", users.last_name) as name, COUNT(*) as count')
            ->groupBy('user_id', 'users.first_name', 'users.last_name')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Daily activity trend (last 14 days)
        $dailyTrend = ActivityLog::whereBetween('created_at', [now()->subDays(14), now()])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'total_activities' => $totalActivities,
            'today_activities' => $todayActivities,
            'this_week_activities' => $thisWeekActivities,
            'this_month_activities' => $thisMonthActivities,
            'activities_by_action' => $byAction,
            'activities_by_entity' => $byEntityType,
            'activities_by_user' => $byUser,
            'daily_trend' => $dailyTrend,
        ]);
    }

    /**
     * Get a single activity log detail
     */
    public function show(int $id): JsonResponse
    {
        $log = ActivityLog::with('user:id,first_name,last_name,email,role,phone')
            ->findOrFail($id);

        return response()->json($log);
    }

    /**
     * Get list of users for filter dropdown
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
        $types = ActivityLog::whereNotNull('entity_type')
            ->distinct()
            ->pluck('entity_type')
            ->sort()
            ->values();

        return response()->json($types);
    }

    /**
     * Export activity logs
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $query = ActivityLog::with(['user:id,first_name,last_name,email,role'])
            ->orderByDesc('created_at');

        // Apply same filters as index
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('entity_type') && $request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->has('from_date') && $request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date') && $request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $logs = $query->limit(10000)->get();

        $csv = "ID,Date,Time,User,Email,Role,Action,Entity Type,Entity ID,IP Address,Status Code\n";
        
        foreach ($logs as $log) {
            $userName = $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System';
            $userEmail = $log->user?->email ?? '';
            $userRole = $log->user?->role ?? '';
            $date = $log->created_at->format('Y-m-d');
            $time = $log->created_at->format('H:i:s');
            $statusCode = $log->metadata['status_code'] ?? '';

            $csv .= "\"{$log->id}\",\"{$date}\",\"{$time}\",\"{$userName}\",\"{$userEmail}\",\"{$userRole}\",\"{$log->action}\",\"{$log->entity_type}\",\"{$log->entity_id}\",\"{$log->ip_address}\",\"{$statusCode}\"\n";
        }

        $filename = 'activity-logs-' . now()->format('Y-m-d') . '.csv';

        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }
}
