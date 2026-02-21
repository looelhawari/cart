<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;

/**
 * Enterprise Rate Limiter Service
 * 
 * Production-grade rate limiting with:
 * - Token Bucket algorithm (atomic Redis Lua scripts)
 * - Sliding Window Counter (weighted approximation)
 * - Multi-dimensional key resolution (IP, User, Endpoint, Fingerprint)
 * - Adaptive abuse detection with progressive penalties
 * - Global circuit breaker
 * - Detailed analytics and monitoring
 * 
 * Used by Facebook, Stripe, Shopify at scale.
 */
class RateLimiterService
{
    /**
     * Token Bucket Lua Script (atomic check + consume)
     * 
     * KEYS[1] = bucket key (e.g., "rl:tb:user:123:products")
     * ARGV[1] = max_tokens (bucket capacity)
     * ARGV[2] = refill_rate (tokens per second)
     * ARGV[3] = now (current timestamp in microseconds)
     * ARGV[4] = tokens_to_consume (usually 1)
     * 
     * Returns: {allowed(0/1), remaining_tokens, reset_timestamp, retry_after}
     */
    private const TOKEN_BUCKET_LUA = <<<'LUA'
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local consume = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

-- Initialize bucket if it doesn't exist
if tokens == nil then
    tokens = max_tokens
    last_refill = now
end

-- Calculate token refill based on elapsed time
local elapsed = math.max(0, now - last_refill)
local new_tokens = elapsed * refill_rate
tokens = math.min(max_tokens, tokens + new_tokens)
last_refill = now

-- Try to consume tokens
local allowed = 0
local retry_after = 0

if tokens >= consume then
    tokens = tokens - consume
    allowed = 1
else
    -- Calculate when enough tokens will be available
    local deficit = consume - tokens
    retry_after = math.ceil(deficit / refill_rate)
end

-- Calculate reset time (when bucket will be full)
local empty_tokens = max_tokens - tokens
local reset_time = 0
if empty_tokens > 0 then
    reset_time = math.ceil(now + (empty_tokens / refill_rate))
end

-- Store updated bucket state with TTL
redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(last_refill))
-- TTL: time for bucket to fully refill + buffer
local ttl = math.ceil(max_tokens / refill_rate) + 60
redis.call('EXPIRE', key, ttl)

return {allowed, math.floor(tokens), reset_time, retry_after}
LUA;

    /**
     * Sliding Window Counter Lua Script
     * 
     * KEYS[1] = current window key
     * KEYS[2] = previous window key
     * ARGV[1] = max_requests
     * ARGV[2] = window_size (seconds)
     * ARGV[3] = now (timestamp)
     * 
     * Returns: {allowed(0/1), remaining, reset_timestamp, retry_after}
     */
    private const SLIDING_WINDOW_LUA = <<<'LUA'
local curr_key = KEYS[1]
local prev_key = KEYS[2]
local max_requests = tonumber(ARGV[1])
local window_size = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Get current and previous window counts
local curr_count = tonumber(redis.call('GET', curr_key) or '0')
local prev_count = tonumber(redis.call('GET', prev_key) or '0')

-- Calculate position in current window (0.0 to 1.0)
local window_start = math.floor(now / window_size) * window_size
local position = (now - window_start) / window_size

-- Weighted count: (1 - position) * prev + curr
local weighted = math.floor((1 - position) * prev_count + curr_count)

local allowed = 0
local retry_after = 0

if weighted < max_requests then
    redis.call('INCR', curr_key)
    redis.call('EXPIRE', curr_key, window_size * 2)
    allowed = 1
    weighted = weighted + 1
else
    -- Time until window slides enough to allow a request
    retry_after = math.ceil(window_size * position)
    if retry_after < 1 then retry_after = 1 end
end

local remaining = math.max(0, max_requests - weighted)
local reset_time = window_start + window_size

return {allowed, remaining, reset_time, retry_after}
LUA;

    /**
     * Abuse Tracking Lua Script (atomic increment + check tier)
     */
    private const ABUSE_TRACK_LUA = <<<'LUA'
local key = KEYS[1]
local window = tonumber(ARGV[1])
local now = tonumber(ARGV[2])

-- Increment violation counter
local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, window)
end

return count
LUA;

    /**
     * Global Rate Limit Lua Script (sliding window per-second)
     */
    private const GLOBAL_LIMIT_LUA = <<<'LUA'
local key = KEYS[1]
local max_rps = tonumber(ARGV[1])
local now = tonumber(ARGV[2])

local count = redis.call('INCR', key)
if count == 1 then
    redis.call('EXPIRE', key, 2)
end

if count > max_rps then
    return 0
end
return 1
LUA;

    private array $config;
    private string $prefix;
    private string $connection;

    public function __construct()
    {
        $this->config = config('rate-limiting', []);
        $this->prefix = $this->config['key_prefix'] ?? 'rl:';
        $this->connection = $this->config['redis_connection'] ?? 'default';
    }

    /**
     * Check if a request should be allowed through rate limiting.
     * 
     * Returns a RateLimitResult with allowed/blocked status,
     * remaining quota, and headers to attach.
     */
    public function check(Request $request, ?string $endpointOverride = null): RateLimitResult
    {
        $endpoint = $endpointOverride ?? $this->resolveEndpoint($request);
        $endpointConfig = $this->getEndpointConfig($endpoint);
        $dimensions = $this->resolveDimensions($request, $endpointConfig);

        try {
            // 1) Check IP blacklist
            $ip = $request->ip();
            if ($this->isBlacklisted($ip)) {
                return RateLimitResult::blocked('IP is blacklisted', 0, 3600, 'blacklist');
            }

            // 2) Check IP whitelist
            if ($this->isWhitelisted($ip)) {
                return RateLimitResult::allowed(PHP_INT_MAX, PHP_INT_MAX, 'whitelist');
            }

            // 3) Check global circuit breaker
            if ($this->isGlobalLimitEnabled()) {
                $globalResult = $this->checkGlobalLimit();
                if (!$globalResult) {
                    $this->logBlocked($request, 'global', $endpoint);
                    return RateLimitResult::blocked('System is under heavy load', 0, 5, 'global');
                }
            }

            // 4) Check abuse detection (progressive penalties)
            $abuseTier = $this->getAbuseTier($dimensions['primary_key']);
            if ($abuseTier !== null && $abuseTier['limit_multiplier'] === 0) {
                $this->logBlocked($request, 'abuse_ban', $endpoint);
                return RateLimitResult::blocked(
                    'Temporarily blocked due to excessive requests',
                    0,
                    $abuseTier['block_duration_seconds'],
                    'abuse_tier_' . $abuseTier['tier']
                );
            }

            // 5) Apply rate limit with the configured algorithm
            $limit = $endpointConfig['max_per_minute'] ?? $this->config['ip']['max_per_minute'] ?? 300;
            $burstCapacity = $endpointConfig['burst_capacity'] ?? ceil($limit / 4);

            // Apply abuse penalty multiplier if applicable
            if ($abuseTier !== null) {
                $limit = (int) ceil($limit * $abuseTier['limit_multiplier']);
                $burstCapacity = (int) ceil($burstCapacity * $abuseTier['limit_multiplier']);
            }

            $algorithm = $this->config['algorithm'] ?? 'token_bucket';
            $result = match ($algorithm) {
                'token_bucket' => $this->checkTokenBucket($dimensions['primary_key'], $limit, $burstCapacity),
                'sliding_window' => $this->checkSlidingWindow($dimensions['primary_key'], $limit, 60),
                default => $this->checkTokenBucket($dimensions['primary_key'], $limit, $burstCapacity),
            };

            if (!$result->allowed) {
                $this->trackViolation($dimensions['primary_key']);
                $this->logBlocked($request, 'rate_limit', $endpoint);
            } elseif ($result->remaining < ($limit * 0.2)) {
                $this->logWarning($request, $endpoint, $result->remaining, $limit);
            }

            $result->policy = $endpoint;
            return $result;

        } catch (\Throwable $e) {
            // Redis failure — decide fail-open or fail-closed
            Log::error('RateLimiter Redis error', [
                'error' => $e->getMessage(),
                'endpoint' => $endpoint,
                'ip' => $request->ip(),
            ]);

            $failOpen = $endpointConfig['fail_open'] ?? $this->config['fail_open'] ?? true;
            if ($failOpen) {
                return RateLimitResult::allowed(0, 0, 'fail_open');
            }
            return RateLimitResult::blocked('Service temporarily unavailable', 0, 5, 'fail_closed');
        }
    }

    /**
     * Token Bucket algorithm — allows bursts up to bucket capacity
     * while enforcing long-term average rate.
     */
    public function checkTokenBucket(string $key, int $maxPerMinute, int $burstCapacity): RateLimitResult
    {
        $redis = Redis::connection($this->connection);
        $bucketKey = $this->prefix . 'tb:' . $key;
        $refillRate = $maxPerMinute / 60.0; // tokens per second
        $now = microtime(true);

        $result = $redis->eval(
            self::TOKEN_BUCKET_LUA,
            1,
            $bucketKey,
            $burstCapacity,
            $refillRate,
            $now,
            1 // consume 1 token
        );

        $allowed = (int) $result[0] === 1;
        $remaining = (int) $result[1];
        $resetAt = (int) $result[2];
        $retryAfter = (int) $result[3];

        if ($allowed) {
            return RateLimitResult::allowed($remaining, $maxPerMinute);
        }

        return RateLimitResult::blocked(
            'Rate limit exceeded',
            $remaining,
            max(1, $retryAfter),
            'token_bucket',
            $maxPerMinute
        );
    }

    /**
     * Sliding Window Counter — weighted average of current + previous window.
     */
    public function checkSlidingWindow(string $key, int $maxRequests, int $windowSeconds = 60): RateLimitResult
    {
        $redis = Redis::connection($this->connection);
        $now = time();
        $currentWindow = (int) floor($now / $windowSeconds);
        $currKey = $this->prefix . 'sw:' . $key . ':' . $currentWindow;
        $prevKey = $this->prefix . 'sw:' . $key . ':' . ($currentWindow - 1);

        $result = $redis->eval(
            self::SLIDING_WINDOW_LUA,
            2,
            $currKey,
            $prevKey,
            $maxRequests,
            $windowSeconds,
            $now
        );

        $allowed = (int) $result[0] === 1;
        $remaining = (int) $result[1];
        $resetAt = (int) $result[2];
        $retryAfter = (int) $result[3];

        if ($allowed) {
            return RateLimitResult::allowed($remaining, $maxRequests);
        }

        return RateLimitResult::blocked(
            'Rate limit exceeded',
            $remaining,
            max(1, $retryAfter),
            'sliding_window',
            $maxRequests
        );
    }

    /**
     * Global circuit breaker — protects the entire system under extreme load.
     */
    protected function checkGlobalLimit(): bool
    {
        $redis = Redis::connection($this->connection);
        $key = $this->prefix . 'global:' . time();
        $maxRps = $this->config['global']['max_per_second'] ?? 5000;

        $result = $redis->eval(self::GLOBAL_LIMIT_LUA, 1, $key, $maxRps, time());
        return (int) $result === 1;
    }

    /**
     * Track rate limit violations for abuse detection.
     */
    protected function trackViolation(string $key): void
    {
        if (!($this->config['abuse_detection']['enabled'] ?? false)) {
            return;
        }

        try {
            $redis = Redis::connection($this->connection);
            $violationKey = $this->prefix . 'violations:' . $key;
            $window = ($this->config['abuse_detection']['violation_window_minutes'] ?? 15) * 60;

            $redis->eval(self::ABUSE_TRACK_LUA, 1, $violationKey, $window, time());
        } catch (\Throwable $e) {
            // Non-critical, don't block the response
            Log::warning('RateLimiter: Failed to track violation', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Get the current abuse tier for a key.
     * Returns null if no abuse detected, or the matching tier config.
     */
    protected function getAbuseTier(string $key): ?array
    {
        if (!($this->config['abuse_detection']['enabled'] ?? false)) {
            return null;
        }

        try {
            $redis = Redis::connection($this->connection);
            $violationKey = $this->prefix . 'violations:' . $key;
            $violations = (int) $redis->get($violationKey);

            if ($violations < ($this->config['abuse_detection']['violation_threshold'] ?? 5)) {
                return null;
            }

            $tiers = $this->config['abuse_detection']['tiers'] ?? [];
            foreach ($tiers as $index => $tier) {
                if ($violations >= $tier['min_violations'] && $violations <= $tier['max_violations']) {
                    return array_merge($tier, ['tier' => $index + 1, 'violations' => $violations]);
                }
            }

            return null;
        } catch (\Throwable $e) {
            return null; // Fail open for abuse detection
        }
    }

    /**
     * Resolve the rate limit key dimensions based on endpoint config.
     */
    protected function resolveDimensions(Request $request, array $endpointConfig): array
    {
        $keyBy = $endpointConfig['key_by'] ?? 'ip';
        $parts = [];

        foreach (explode('+', $keyBy) as $dimension) {
            $dimension = trim($dimension);

            if ($dimension === 'ip') {
                $parts[] = 'ip:' . $request->ip();
            } elseif ($dimension === 'user') {
                $userId = $request->user()?->id;
                $parts[] = $userId ? 'u:' . $userId : 'ip:' . $request->ip();
            } elseif ($dimension === 'user_or_session') {
                $userId = $request->user()?->id;
                $sessionId = $request->header('X-Session-Id');
                if ($userId) {
                    $parts[] = 'u:' . $userId;
                } elseif ($sessionId) {
                    $parts[] = 's:' . $sessionId;
                } else {
                    $parts[] = 'ip:' . $request->ip();
                }
            } elseif (str_starts_with($dimension, 'input:')) {
                $field = substr($dimension, 6);
                $value = $request->input($field);
                if ($value) {
                    $parts[] = $field . ':' . md5($value);
                }
            } elseif ($dimension === 'fingerprint') {
                $parts[] = 'fp:' . $this->generateFingerprint($request);
            }
        }

        $endpoint = $this->resolveEndpoint($request);
        $primaryKey = implode('|', $parts) . ':' . $endpoint;

        return [
            'primary_key' => $primaryKey,
            'parts' => $parts,
        ];
    }

    /**
     * Generate a request fingerprint from headers.
     */
    protected function generateFingerprint(Request $request): string
    {
        $factors = $this->config['fingerprinting']['factors'] ?? ['user_agent'];
        $data = [];

        foreach ($factors as $factor) {
            match ($factor) {
                'user_agent' => $data[] = $request->userAgent() ?? '',
                'accept_language' => $data[] = $request->header('Accept-Language', ''),
                'accept_encoding' => $data[] = $request->header('Accept-Encoding', ''),
                default => null,
            };
        }

        return md5(implode('|', $data));
    }

    /**
     * Resolve the endpoint pattern from the request.
     */
    protected function resolveEndpoint(Request $request): string
    {
        $path = trim($request->path(), '/');

        // Strip API version prefix
        $path = preg_replace('#^api/v\d+/#', '', $path);
        $path = preg_replace('#^v\d+/#', '', $path);

        return $path;
    }

    /**
     * Get the most specific endpoint configuration.
     * Priority: exact match > prefix match > wildcard > defaults
     */
    protected function getEndpointConfig(string $endpoint): array
    {
        $endpoints = $this->config['endpoints'] ?? [];
        $defaults = [
            'max_per_minute' => $this->config['ip']['max_per_minute'] ?? 300,
            'burst_capacity' => $this->config['ip']['burst_capacity'] ?? 50,
            'key_by' => 'ip',
        ];

        // Exact match
        if (isset($endpoints[$endpoint])) {
            return array_merge($defaults, $endpoints[$endpoint]);
        }

        // Find best matching pattern (most specific wins)
        $bestMatch = null;
        $bestSpecificity = -1;

        foreach ($endpoints as $pattern => $config) {
            if ($this->endpointMatches($endpoint, $pattern)) {
                $specificity = $this->calculateSpecificity($pattern);
                if ($specificity > $bestSpecificity) {
                    $bestMatch = $config;
                    $bestSpecificity = $specificity;
                }
            }
        }

        if ($bestMatch !== null) {
            return array_merge($defaults, $bestMatch);
        }

        return $defaults;
    }

    /**
     * Check if an endpoint matches a pattern (supports * wildcards).
     */
    protected function endpointMatches(string $endpoint, string $pattern): bool
    {
        if ($endpoint === $pattern) {
            return true;
        }

        // Convert wildcard pattern to regex
        $regex = '#^' . str_replace(['*', '/'], ['[^/]*', '\\/'], $pattern) . '$#';
        return (bool) preg_match($regex, $endpoint);
    }

    /**
     * Calculate pattern specificity (more segments = more specific).
     */
    protected function calculateSpecificity(string $pattern): int
    {
        $segments = explode('/', $pattern);
        $score = count($segments) * 10;
        foreach ($segments as $segment) {
            if (!str_contains($segment, '*')) {
                $score += 5; // Exact segments are more specific
            }
        }
        return $score;
    }

    protected function isBlacklisted(string $ip): bool
    {
        // Check config-based blacklist (from rate-limiting.php)
        $blacklist = $this->config['ip']['blacklist'] ?? [];
        if (in_array($ip, $blacklist, true)) {
            return true;
        }

        // Check runtime blacklist (set by admin via dashboard/CLI, stored in Redis)
        return $this->isRuntimeBlacklisted($ip);
    }

    protected function isWhitelisted(string $ip): bool
    {
        $whitelist = $this->config['ip']['whitelist'] ?? [];
        return in_array($ip, $whitelist, true);
    }

    protected function isGlobalLimitEnabled(): bool
    {
        return $this->config['global']['enabled'] ?? false;
    }

    // ─── Logging ─────────────────────────────────────────────────────────

    protected function logBlocked(Request $request, string $reason, string $endpoint): void
    {
        if (!($this->config['logging']['log_blocked'] ?? false)) {
            return;
        }

        $channel = $this->config['logging']['channel'] ?? 'daily';

        Log::channel($channel)->warning('RateLimit BLOCKED', [
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'endpoint' => $endpoint,
            'method' => $request->method(),
            'reason' => $reason,
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    protected function logWarning(Request $request, string $endpoint, int $remaining, int $limit): void
    {
        if (!($this->config['logging']['log_warnings'] ?? false)) {
            return;
        }

        $channel = $this->config['logging']['channel'] ?? 'daily';

        Log::channel($channel)->info('RateLimit WARNING: approaching limit', [
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'endpoint' => $endpoint,
            'remaining' => $remaining,
            'limit' => $limit,
            'usage_pct' => round(($limit - $remaining) / $limit * 100, 1),
        ]);
    }

    // ─── Admin / Monitoring API ──────────────────────────────────────────

    /**
     * Get rate limit stats for monitoring dashboard.
     */
    public function getStats(): array
    {
        try {
            $redis = Redis::connection($this->connection);
            $prefix = $this->prefix;

            // Count active rate limit keys
            $cursor = null;
            $activeKeys = 0;
            $violationKeys = 0;

            do {
                $result = $redis->scan($cursor, ['match' => $prefix . '*', 'count' => 100]);
                if ($result === false) break;
                
                $cursor = $result[0] ?? null;
                $keys = $result[1] ?? $result;

                if (is_array($keys)) {
                    foreach ($keys as $key) {
                        $activeKeys++;
                        if (str_contains((string) $key, 'violations')) {
                            $violationKeys++;
                        }
                    }
                }
            } while ($cursor && $cursor !== '0' && $cursor !== 0);

            return [
                'active_keys' => $activeKeys,
                'active_violations' => $violationKeys,
                'algorithm' => $this->config['algorithm'] ?? 'token_bucket',
                'global_limit_enabled' => $this->isGlobalLimitEnabled(),
                'global_max_rps' => $this->config['global']['max_per_second'] ?? 5000,
                'abuse_detection_enabled' => $this->config['abuse_detection']['enabled'] ?? false,
                'fail_open' => $this->config['fail_open'] ?? true,
                'storage' => $this->config['storage'] ?? 'redis',
                'endpoint_policies' => count($this->config['endpoints'] ?? []),
            ];
        } catch (\Throwable $e) {
            return [
                'error' => 'Unable to fetch stats: ' . $e->getMessage(),
                'active_keys' => 0,
            ];
        }
    }

    /**
     * Get detailed info about a specific rate limit key.
     */
    public function getKeyInfo(string $key): array
    {
        try {
            $redis = Redis::connection($this->connection);

            // Check token bucket state
            $tbKey = $this->prefix . 'tb:' . $key;
            $bucket = $redis->hGetAll($tbKey);

            // Check violations
            $violationKey = $this->prefix . 'violations:' . $key;
            $violations = (int) $redis->get($violationKey);
            $ttl = $redis->ttl($violationKey);

            return [
                'key' => $key,
                'token_bucket' => $bucket ?: null,
                'violations' => $violations,
                'violation_ttl' => $ttl > 0 ? $ttl : null,
                'abuse_tier' => $this->getAbuseTier($key),
            ];
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Reset rate limit for a specific key (admin action).
     */
    public function resetKey(string $key): bool
    {
        try {
            $redis = Redis::connection($this->connection);
            $redis->del(
                $this->prefix . 'tb:' . $key,
                $this->prefix . 'violations:' . $key
            );
            return true;
        } catch (\Throwable $e) {
            Log::error('RateLimiter: Failed to reset key', ['key' => $key, 'error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Manually blacklist an IP (runtime, not persisted to config).
     */
    public function blacklistIp(string $ip, int $durationSeconds = 3600): bool
    {
        try {
            $redis = Redis::connection($this->connection);
            $key = $this->prefix . 'blacklist:' . $ip;
            $redis->setex($key, $durationSeconds, 1);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Remove IP from runtime blacklist.
     */
    public function unblacklistIp(string $ip): bool
    {
        try {
            $redis = Redis::connection($this->connection);
            $key = $this->prefix . 'blacklist:' . $ip;
            $redis->del($key);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Check if IP is in runtime blacklist (in addition to config blacklist).
     */
    public function isRuntimeBlacklisted(string $ip): bool
    {
        try {
            $redis = Redis::connection($this->connection);
            $key = $this->prefix . 'blacklist:' . $ip;
            return (bool) $redis->exists($key);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Full IP status check — config + runtime blacklist.
     */
    public function checkIpStatus(string $ip): array
    {
        $configBlacklisted = in_array($ip, config('rate-limiting.ip.blacklist', []), true);
        $runtimeBlacklisted = $this->isRuntimeBlacklisted($ip);

        return [
            'ip' => $ip,
            'config_blacklisted' => $configBlacklisted,
            'runtime_blacklisted' => $runtimeBlacklisted,
            'status' => ($configBlacklisted || $runtimeBlacklisted) ? 'blocked' : 'allowed',
        ];
    }

    /**
     * Get top offenders (IPs/users with most violations).
     */
    public function getTopOffenders(int $limit = 20): array
    {
        try {
            $redis = Redis::connection($this->connection);
            $cursor = null;
            $offenders = [];
            $pattern = $this->prefix . 'violations:*';

            do {
                $result = $redis->scan($cursor, ['match' => $pattern, 'count' => 100]);
                if ($result === false) break;

                $cursor = $result[0] ?? null;
                $keys = $result[1] ?? $result;

                if (is_array($keys)) {
                    foreach ($keys as $key) {
                        $violations = (int) $redis->get($key);
                        $identifier = str_replace($this->prefix . 'violations:', '', (string) $key);
                        $ttl = $redis->ttl($key);
                        $offenders[] = [
                            'key' => $identifier,
                            'violations' => $violations,
                            'ttl' => $ttl > 0 ? $ttl : null,
                            'tier' => $this->getAbuseTier($identifier),
                        ];
                    }
                }
            } while ($cursor && $cursor !== '0' && $cursor !== 0);

            // Sort by violations descending
            usort($offenders, fn($a, $b) => $b['violations'] - $a['violations']);

            return array_slice($offenders, 0, $limit);
        } catch (\Throwable $e) {
            Log::channel('rate-limiting')->warning('getTopOffenders failed (Redis unavailable?)', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
