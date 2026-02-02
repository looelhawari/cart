<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Queue;

/**
 * Health Check Controller
 * 
 * Provides endpoints for monitoring system health and performance.
 * Essential for load balancers and monitoring tools.
 */
class HealthController extends Controller
{
    /**
     * Quick health check (for load balancers)
     * GET /api/health
     * 
     * Returns 200 if app is running, used by load balancers.
     * Should be FAST - no DB queries.
     */
    public function ping(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Detailed health check (for monitoring)
     * GET /api/health/detailed
     * 
     * Checks all critical services.
     */
    public function detailed(): JsonResponse
    {
        $health = [
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
            'services' => [],
        ];

        // Check Database
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $dbTime = round((microtime(true) - $start) * 1000, 2);
            $health['services']['database'] = [
                'status' => 'ok',
                'response_time_ms' => $dbTime,
            ];
        } catch (\Exception $e) {
            $health['status'] = 'degraded';
            $health['services']['database'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }

        // Check Redis
        try {
            $start = microtime(true);
            Cache::store('redis')->put('health_check', 'ok', 10);
            $value = Cache::store('redis')->get('health_check');
            $redisTime = round((microtime(true) - $start) * 1000, 2);
            $health['services']['redis'] = [
                'status' => $value === 'ok' ? 'ok' : 'error',
                'response_time_ms' => $redisTime,
            ];
        } catch (\Exception $e) {
            $health['status'] = 'degraded';
            $health['services']['redis'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }

        // Check Queue (Redis)
        try {
            $queueSize = Redis::llen('queues:default');
            $highQueueSize = Redis::llen('queues:high');
            $emailQueueSize = Redis::llen('queues:emails');
            
            $health['services']['queue'] = [
                'status' => 'ok',
                'pending_jobs' => [
                    'default' => $queueSize ?? 0,
                    'high' => $highQueueSize ?? 0,
                    'emails' => $emailQueueSize ?? 0,
                ],
            ];
        } catch (\Exception $e) {
            $health['services']['queue'] = [
                'status' => 'unknown',
                'error' => $e->getMessage(),
            ];
        }

        // Memory usage
        $health['system'] = [
            'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'memory_peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
            'php_version' => PHP_VERSION,
        ];

        $statusCode = $health['status'] === 'ok' ? 200 : 503;
        
        return response()->json($health, $statusCode);
    }

    /**
     * Get current server metrics
     * GET /api/health/metrics
     * 
     * Returns real-time performance metrics.
     */
    public function metrics(): JsonResponse
    {
        // Get order count for today
        $todayOrders = Cache::remember('metrics:orders:today', 60, function () {
            return \App\Models\Order::whereDate('created_at', today())->count();
        });

        // Get active users (sessions in last 15 min)
        $activeSessions = Cache::remember('metrics:active_sessions', 60, function () {
            try {
                // Count Redis session keys
                $keys = Redis::keys('laravel_database_laravel_cache:session:*');
                return count($keys ?? []);
            } catch (\Exception $e) {
                return 'unknown';
            }
        });

        // Get cache hit rate (if available)
        $cacheStats = [];
        try {
            $info = Redis::info('stats');
            if ($info) {
                $hits = $info['keyspace_hits'] ?? 0;
                $misses = $info['keyspace_misses'] ?? 0;
                $total = $hits + $misses;
                $cacheStats = [
                    'hits' => $hits,
                    'misses' => $misses,
                    'hit_rate' => $total > 0 ? round(($hits / $total) * 100, 2) . '%' : 'N/A',
                ];
            }
        } catch (\Exception $e) {
            $cacheStats = ['error' => 'Unable to fetch Redis stats'];
        }

        return response()->json([
            'timestamp' => now()->toISOString(),
            'orders_today' => $todayOrders,
            'active_sessions' => $activeSessions,
            'cache' => $cacheStats,
            'memory' => [
                'used_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                'peak_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
            ],
        ]);
    }
}
