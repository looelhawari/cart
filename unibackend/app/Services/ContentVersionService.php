<?php

namespace App\Services;

use App\Events\AdminContentUpdated;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Central registry + broadcaster for admin→customer realtime content sync.
 *
 * Every admin create/update/delete of dashboard-controlled data calls
 * ContentVersionService::touch($type, $action, $id). That:
 *   1. increments the per-type counter AND the global counter (DB-backed),
 *   2. broadcasts an `admin.content.updated` event on the public
 *      `app-content` Pusher channel so all connected apps react instantly,
 *   3. returns the new global version.
 *
 * The mobile app compares the broadcast/global version with its stored
 * version, clears the matching caches, and refetches.
 */
class ContentVersionService
{
    /** Valid content types ('global' is the master counter). */
    public const TYPES = ['global', 'product', 'category', 'settings', 'map', 'banner', 'promotion'];

    private const SNAPSHOT_CACHE_KEY = 'content:version:snapshot';

    /**
     * Record an admin content change: bump versions + broadcast.
     *
     * @param  string  $type    product|category|settings|map|banner|promotion|global
     * @param  string  $action  created|updated|deleted
     * @param  int|string|null  $entityId
     * @return int  the new global version
     */
    public function touch(string $type, string $action = 'updated', $entityId = null): int
    {
        if (!in_array($type, self::TYPES, true)) {
            $type = 'global';
        }

        $globalVersion = 1;

        try {
            DB::transaction(function () use ($type, &$globalVersion) {
                // Increment the specific type (skip if it IS global to avoid double-count).
                if ($type !== 'global') {
                    DB::table('content_versions')->updateOrInsert(
                        ['type' => $type],
                        ['version' => DB::raw('version + 1'), 'updated_at' => now()]
                    );
                }
                // Always bump the master counter.
                DB::table('content_versions')->updateOrInsert(
                    ['type' => 'global'],
                    ['version' => DB::raw('version + 1'), 'updated_at' => now()]
                );
                $globalVersion = (int) DB::table('content_versions')->where('type', 'global')->value('version');
            });

            Cache::forget(self::SNAPSHOT_CACHE_KEY);

            // Broadcast to all connected apps (public channel — reaches guests too).
            broadcast(new AdminContentUpdated($type, $action, $entityId, $globalVersion));

            Log::info('🔄 content.touched', [
                'type' => $type, 'action' => $action, 'entity_id' => $entityId, 'version' => $globalVersion,
            ]);
        } catch (\Throwable $e) {
            // Never let a sync failure break the admin write.
            Log::warning('ContentVersionService::touch failed: ' . $e->getMessage(), ['type' => $type]);
        }

        return $globalVersion;
    }

    /**
     * Current versions for the /api/app/content-version endpoint.
     * Shape: ['version' => int, 'types' => [type => int], 'last_updated_at' => iso8601].
     */
    public function snapshot(): array
    {
        return Cache::remember(self::SNAPSHOT_CACHE_KEY, 30, function () {
            $rows = DB::table('content_versions')->get(['type', 'version', 'updated_at']);
            $types = [];
            $lastUpdated = null;
            foreach ($rows as $r) {
                $types[$r->type] = (int) $r->version;
                if ($lastUpdated === null || $r->updated_at > $lastUpdated) {
                    $lastUpdated = $r->updated_at;
                }
            }
            return [
                'version'         => $types['global'] ?? 1,
                'types'           => $types,
                'last_updated_at' => $lastUpdated ? \Carbon\Carbon::parse($lastUpdated)->toIso8601String() : now()->toIso8601String(),
            ];
        });
    }
}
