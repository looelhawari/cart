<?php

namespace App\Console\Commands;

use App\Services\RateLimiterService;
use Illuminate\Console\Command;

/**
 * Artisan command for managing the enterprise rate limiter.
 *
 * Usage:
 *   php artisan rate-limit:manage stats          -- Show system overview
 *   php artisan rate-limit:manage offenders      -- List top offenders
 *   php artisan rate-limit:manage check-ip 1.2.3.4
 *   php artisan rate-limit:manage blacklist 1.2.3.4 --duration=3600
 *   php artisan rate-limit:manage unblacklist 1.2.3.4
 *   php artisan rate-limit:manage reset rl:ip:1.2.3.4
 *   php artisan rate-limit:manage key rl:ip:1.2.3.4
 *   php artisan rate-limit:manage flush          -- ⚠ Flush ALL rate limit keys
 */
class RateLimitManageCommand extends Command
{
    protected $signature = 'rate-limit:manage
        {action : stats|offenders|check-ip|blacklist|unblacklist|reset|key|flush}
        {target? : IP address or rate limit key (depends on action)}
        {--duration=3600 : Ban duration in seconds (for blacklist)}
        {--reason= : Reason for blacklisting}
        {--limit=20 : Number of offenders to show}
        {--force : Skip confirmation for destructive operations}';

    protected $description = 'Manage the enterprise rate limiting system';

    public function handle(RateLimiterService $limiter): int
    {
        $action = $this->argument('action');
        $target = $this->argument('target');

        return match ($action) {
            'stats'       => $this->showStats($limiter),
            'offenders'   => $this->showOffenders($limiter),
            'check-ip'    => $this->checkIp($limiter, $target),
            'blacklist'   => $this->blacklistIp($limiter, $target),
            'unblacklist' => $this->unblacklistIp($limiter, $target),
            'reset'       => $this->resetKey($limiter, $target),
            'key'         => $this->inspectKey($limiter, $target),
            'flush'       => $this->flushAll($limiter),
            default       => $this->error("Unknown action: {$action}") ?? 1,
        };
    }

    private function showStats(RateLimiterService $limiter): int
    {
        $stats = $limiter->getStats();
        $config = config('rate-limiting');

        $this->info('╔══════════════════════════════════════════╗');
        $this->info('║     Enterprise Rate Limiter — Stats      ║');
        $this->info('╚══════════════════════════════════════════╝');
        $this->newLine();

        $this->table(
            ['Metric', 'Value'],
            [
                ['Algorithm', $config['algorithm'] ?? 'token_bucket'],
                ['Storage', 'Redis'],
                ['Active Keys', $stats['active_keys']],
                ['Active Violations', $stats['active_violations']],
                ['Global Limit', ($config['global']['enabled'] ?? false) ? ($config['global']['max_per_second'] . ' rps') : 'Disabled'],
                ['IP Limit (per min)', $config['ip']['max_per_minute'] ?? 'N/A'],
                ['User Limit (per min)', $config['user']['max_per_minute'] ?? 'N/A'],
                ['Endpoint Policies', count($config['endpoints'] ?? [])],
                ['Abuse Detection', ($config['abuse_detection']['enabled'] ?? false) ? 'Enabled' : 'Disabled'],
                ['Fail Mode', ($config['fail_open'] ?? true) ? 'Fail-open' : 'Fail-closed'],
                ['Fingerprinting', ($config['fingerprinting']['enabled'] ?? false) ? 'Enabled' : 'Disabled'],
            ]
        );

        return 0;
    }

    private function showOffenders(RateLimiterService $limiter): int
    {
        $limit = (int) $this->option('limit');
        $offenders = $limiter->getTopOffenders($limit);

        if (empty($offenders)) {
            $this->info('✅ No active offenders. System is clean.');
            return 0;
        }

        $this->warn("⚠  {$this->count($offenders)} active offender(s):");
        $this->newLine();

        $rows = [];
        foreach ($offenders as $offender) {
            $tier = $offender['tier'] ?? null;
            $rows[] = [
                $offender['key'],
                $offender['violations'],
                $offender['ttl'] ? $this->formatDuration($offender['ttl']) : '—',
                $tier ? "{$tier['limit_multiplier']}x / {$this->formatDuration($tier['block_duration_seconds'])}" : 'None',
            ];
        }

        $this->table(['Key', 'Violations', 'TTL', 'Abuse Tier'], $rows);

        return 0;
    }

    private function checkIp(RateLimiterService $limiter, ?string $ip): int
    {
        if (!$ip) {
            $this->error('Please provide an IP address.');
            return 1;
        }

        $result = $limiter->checkIpStatus($ip);

        $this->info("IP: {$ip}");
        $this->line("Config blacklisted: " . ($result['config_blacklisted'] ? '❌ YES' : '✅ No'));
        $this->line("Runtime blacklisted: " . ($result['runtime_blacklisted'] ? '❌ YES' : '✅ No'));
        $this->line("Status: " . ($result['status'] === 'blocked' ? '🚫 BLOCKED' : '✅ ALLOWED'));

        return 0;
    }

    private function blacklistIp(RateLimiterService $limiter, ?string $ip): int
    {
        if (!$ip) {
            $this->error('Please provide an IP address.');
            return 1;
        }

        $duration = (int) $this->option('duration');
        $reason = $this->option('reason') ?? 'CLI blacklist';

        if (!$this->option('force') && !$this->confirm("Blacklist {$ip} for {$this->formatDuration($duration)}?")) {
            return 0;
        }

        $limiter->blacklistIp($ip, $duration);
        $this->info("✅ Blacklisted {$ip} for {$this->formatDuration($duration)}. Reason: {$reason}");

        return 0;
    }

    private function unblacklistIp(RateLimiterService $limiter, ?string $ip): int
    {
        if (!$ip) {
            $this->error('Please provide an IP address.');
            return 1;
        }

        $limiter->unblacklistIp($ip);
        $this->info("✅ Removed {$ip} from runtime blacklist.");

        return 0;
    }

    private function resetKey(RateLimiterService $limiter, ?string $key): int
    {
        if (!$key) {
            $this->error('Please provide a rate limit key.');
            return 1;
        }

        if (!$this->option('force') && !$this->confirm("Reset all rate limit data for key '{$key}'?")) {
            return 0;
        }

        $limiter->resetKey($key);
        $this->info("✅ Reset rate limits for: {$key}");

        return 0;
    }

    private function inspectKey(RateLimiterService $limiter, ?string $key): int
    {
        if (!$key) {
            $this->error('Please provide a rate limit key.');
            return 1;
        }

        $info = $limiter->getKeyInfo($key);

        $this->info("Key: {$info['key']}");
        $this->line("Violations: {$info['violations']}");
        $this->line("Violation TTL: " . ($info['violation_ttl'] ? $this->formatDuration($info['violation_ttl']) : '—'));

        if ($info['abuse_tier']) {
            $tier = $info['abuse_tier'];
            $this->warn("Abuse Tier Active:");
            $this->line("  Violations range: {$tier['min_violations']}–{$tier['max_violations']}");
            $this->line("  Limit multiplier: {$tier['limit_multiplier']}x");
            $this->line("  Block duration: {$this->formatDuration($tier['block_duration_seconds'])}");
        }

        if ($info['token_bucket']) {
            $this->info("Token Bucket State:");
            foreach ($info['token_bucket'] as $field => $value) {
                $this->line("  {$field}: {$value}");
            }
        }

        return 0;
    }

    private function flushAll(RateLimiterService $limiter): int
    {
        if (!$this->option('force') && !$this->confirm('⚠️  This will FLUSH ALL rate limit keys in Redis. Are you sure?', false)) {
            return 0;
        }

        $redis = app('redis')->connection(config('rate-limiting.redis_connection', 'default'));
        $keys = $redis->keys('rl:*');
        $count = count($keys);

        if ($count === 0) {
            $this->info('No rate limit keys found.');
            return 0;
        }

        foreach ($keys as $key) {
            // Strip any prefix that phpredis might add
            $cleanKey = preg_replace('/^.*?rl:/', 'rl:', $key);
            $redis->del($cleanKey);
        }

        $this->info("✅ Flushed {$count} rate limit key(s).");

        return 0;
    }

    private function formatDuration(int $seconds): string
    {
        if ($seconds < 60) return "{$seconds}s";
        if ($seconds < 3600) return floor($seconds / 60) . 'm ' . ($seconds % 60) . 's';
        $h = floor($seconds / 3600);
        $m = floor(($seconds % 3600) / 60);
        return "{$h}h {$m}m";
    }

    private function count(array $arr): int
    {
        return \count($arr);
    }
}
