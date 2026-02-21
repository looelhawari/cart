<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\RateLimiterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Rate Limit Administration Controller
 * 
 * Admin endpoints for monitoring, managing, and analyzing rate limits.
 * All endpoints require admin authentication + permission.
 */
class RateLimitController extends Controller
{
    public function __construct(
        protected RateLimiterService $rateLimiter,
    ) {}

    /**
     * GET /admin/rate-limits/stats
     * 
     * Overview dashboard: active keys, violations, config summary.
     */
    public function stats(): JsonResponse
    {
        $stats = $this->rateLimiter->getStats();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * GET /admin/rate-limits/config
     * 
     * Return current rate limiting configuration (sanitized).
     */
    public function config(): JsonResponse
    {
        $config = config('rate-limiting');

        // Remove sensitive internals
        unset($config['redis_connection']);

        return response()->json([
            'success' => true,
            'data' => [
                'algorithm' => $config['algorithm'] ?? 'token_bucket',
                'fail_open' => $config['fail_open'] ?? true,
                'global' => $config['global'] ?? [],
                'ip' => [
                    'enabled' => $config['ip']['enabled'] ?? true,
                    'max_per_minute' => $config['ip']['max_per_minute'] ?? 300,
                    'max_per_second' => $config['ip']['max_per_second'] ?? 30,
                    'burst_capacity' => $config['ip']['burst_capacity'] ?? 50,
                    'whitelist_count' => count($config['ip']['whitelist'] ?? []),
                    'blacklist_count' => count($config['ip']['blacklist'] ?? []),
                ],
                'user' => $config['user'] ?? [],
                'endpoints' => $config['endpoints'] ?? [],
                'abuse_detection' => $config['abuse_detection'] ?? [],
                'fingerprinting' => [
                    'enabled' => $config['fingerprinting']['enabled'] ?? false,
                ],
                'logging' => [
                    'enabled' => $config['logging']['enabled'] ?? true,
                ],
            ],
        ]);
    }

    /**
     * GET /admin/rate-limits/offenders
     * 
     * Top offenders with violation counts and abuse tiers.
     */
    public function offenders(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 20);
        $offenders = $this->rateLimiter->getTopOffenders((int) $limit);

        return response()->json([
            'success' => true,
            'data' => $offenders,
        ]);
    }

    /**
     * GET /admin/rate-limits/key/{key}
     * 
     * Detailed info about a specific rate limit key.
     */
    public function keyInfo(string $key): JsonResponse
    {
        $info = $this->rateLimiter->getKeyInfo(urldecode($key));

        return response()->json([
            'success' => true,
            'data' => $info,
        ]);
    }

    /**
     * POST /admin/rate-limits/reset
     * 
     * Reset rate limit counters for a specific key.
     */
    public function resetKey(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string|max:255',
        ]);

        $key = $request->input('key');
        $success = $this->rateLimiter->resetKey($key);

        Log::channel('rate-limiting')->info('Admin rate limit RESET', [
            'admin_id' => $request->user()?->id,
            'admin_email' => $request->user()?->email,
            'key' => $key,
            'success' => $success,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => $success,
            'message' => $success
                ? 'Rate limit reset successfully'
                : 'Failed to reset rate limit',
        ]);
    }

    /**
     * POST /admin/rate-limits/blacklist
     * 
     * Temporarily blacklist an IP address.
     */
    public function blacklistIp(Request $request): JsonResponse
    {
        $request->validate([
            'ip' => 'required|ip',
            'duration' => 'integer|min:60|max:86400', // 1 min to 24 hours
            'reason' => 'string|max:255',
        ]);

        $ip = $request->input('ip');
        $duration = $request->input('duration', 3600);
        $reason = $request->input('reason', 'No reason provided');

        $success = $this->rateLimiter->blacklistIp($ip, $duration);

        Log::channel('rate-limiting')->warning('Admin IP BLACKLIST', [
            'admin_id' => $request->user()?->id,
            'admin_email' => $request->user()?->email,
            'blacklisted_ip' => $ip,
            'duration_seconds' => $duration,
            'reason' => $reason,
            'success' => $success,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => $success,
            'message' => $success
                ? "IP {$ip} blacklisted for {$duration} seconds"
                : 'Failed to blacklist IP',
        ]);
    }

    /**
     * DELETE /admin/rate-limits/blacklist/{ip}
     * 
     * Remove IP from runtime blacklist.
     */
    public function unblacklistIp(string $ip, Request $request): JsonResponse
    {
        $success = $this->rateLimiter->unblacklistIp($ip);

        Log::channel('rate-limiting')->warning('Admin IP UNBLACKLIST', [
            'admin_id' => $request->user()?->id,
            'admin_email' => $request->user()?->email,
            'unblacklisted_ip' => $ip,
            'success' => $success,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'success' => $success,
            'message' => $success
                ? "IP {$ip} removed from blacklist"
                : 'Failed to remove IP from blacklist',
        ]);
    }

    /**
     * GET /admin/rate-limits/check-ip/{ip}
     * 
     * Check if an IP is currently blacklisted.
     */
    public function checkIp(string $ip): JsonResponse
    {
        $configBlacklisted = in_array($ip, config('rate-limiting.ip.blacklist', []), true);
        $runtimeBlacklisted = $this->rateLimiter->isRuntimeBlacklisted($ip);

        return response()->json([
            'success' => true,
            'data' => [
                'ip' => $ip,
                'config_blacklisted' => $configBlacklisted,
                'runtime_blacklisted' => $runtimeBlacklisted,
                'status' => ($configBlacklisted || $runtimeBlacklisted) ? 'blocked' : 'allowed',
            ],
        ]);
    }
}
