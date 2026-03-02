<?php

namespace App\Services;

use App\Models\PendingRegistration;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * Hybrid Redis + DB service for pending registrations.
 *
 * Architecture:
 *  - DB (pending_registrations) is the SOURCE OF TRUTH.
 *  - Redis is the FAST CACHE LAYER (read-first, write-through).
 *  - On write: DB first, then cache in Redis.
 *  - On read: Redis first, fallback to DB (re-cache on miss).
 *  - On delete: both.
 *  - If Redis is down, everything still works via DB.
 */
class PendingRegistrationService
{
    private const REDIS_PREFIX = 'pending_reg:';
    private const TTL_SECONDS = 1800; // 30 minutes

    /**
     * Create a new pending registration.
     */
    public function create(array $data): PendingRegistration
    {
        $record = PendingRegistration::create($data);

        $this->cacheRecord($record);

        return $record;
    }

    /**
     * Find a pending registration by token.
     * Tries Redis first, falls back to DB.
     */
    public function find(string $token): ?PendingRegistration
    {
        // Try Redis first (fast path)
        try {
            $cached = Redis::get($this->cacheKey($token));
            if ($cached) {
                $data = json_decode($cached, true);
                $record = new PendingRegistration();
                $record->forceFill($data);
                $record->exists = true;

                if ($record->isExpired()) {
                    $this->delete($token);
                    return null;
                }

                return $record;
            }
        } catch (\Exception $e) {
            Log::warning("Redis read failed for pending registration: {$e->getMessage()}");
        }

        // Fallback to DB
        $record = PendingRegistration::where('registration_token', $token)
            ->where('expires_at', '>', now())
            ->first();

        if ($record) {
            // Re-cache in Redis on DB hit
            $this->cacheRecord($record);
        }

        return $record;
    }

    /**
     * Update a pending registration.
     * Extends expiration on every update.
     */
    public function update(string $token, array $data): ?PendingRegistration
    {
        $record = PendingRegistration::where('registration_token', $token)->first();
        if (!$record) {
            return null;
        }

        // Extend expiration on every update
        $data['expires_at'] = now()->addSeconds(self::TTL_SECONDS);

        $record->update($data);
        $record = $record->fresh();

        $this->cacheRecord($record);

        return $record;
    }

    /**
     * Delete a pending registration from both DB and Redis.
     */
    public function delete(string $token): void
    {
        PendingRegistration::where('registration_token', $token)->delete();
        $this->removeCacheRecord($token);
    }

    /**
     * Cleanup all expired pending registrations.
     * Called by the scheduled command.
     *
     * @return int Number of records deleted
     */
    public function cleanupExpired(): int
    {
        $expired = PendingRegistration::where('expires_at', '<', now())->get();
        $count = $expired->count();

        foreach ($expired as $record) {
            $this->removeCacheRecord($record->registration_token);
        }

        PendingRegistration::where('expires_at', '<', now())->delete();

        return $count;
    }

    // ──────────────────────────────────────────────────────
    //  Redis cache helpers
    // ──────────────────────────────────────────────────────

    private function cacheKey(string $token): string
    {
        return self::REDIS_PREFIX . $token;
    }

    private function cacheRecord(PendingRegistration $record): void
    {
        try {
            $ttl = max(1, (int) $record->expires_at->diffInSeconds(now()));
            Redis::setex(
                $this->cacheKey($record->registration_token),
                $ttl,
                json_encode($record->toArray())
            );
        } catch (\Exception $e) {
            Log::warning("Redis cache write failed for pending registration: {$e->getMessage()}");
        }
    }

    private function removeCacheRecord(string $token): void
    {
        try {
            Redis::del($this->cacheKey($token));
        } catch (\Exception $e) {
            Log::warning("Redis cache delete failed for pending registration: {$e->getMessage()}");
        }
    }
}
