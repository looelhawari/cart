import { useCallback, useEffect, useRef, useState } from "react";
import { getCacheData, setCacheData } from "@/services/cache/apiCache";

const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — survives app reopens

/**
 * Stale-while-revalidate hook for any "fetch a snapshot of data" screen.
 *
 * On mount:
 *   1. Read AsyncStorage cache. If a fresh-enough entry exists, render
 *      it immediately (no spinner). The user sees data the moment the
 *      screen opens — including across cold app restarts.
 *   2. In parallel, fire the network fetcher. When it returns, update
 *      state AND persist the result so the next mount is fast too.
 *
 * On `refresh()` (called from RefreshControl's onRefresh):
 *   - Skip the cache, hit the network, persist the fresh result.
 *
 * Errors during the background refetch DO NOT clobber cached data on
 * screen — the user still sees the last good snapshot until they refresh
 * manually. This is the same pattern React Query / SWR follow.
 *
 * Usage:
 *
 *   const { data, loading, refreshing, refresh } = useCachedFetch({
 *     key: 'home:bootstrap',
 *     fetcher: () => homeApi.bootstrap(),
 *     ttlMs: 5 * 60 * 1000,
 *   });
 *
 *   <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
 *     {loading ? <Skeleton /> : <Home data={data} />}
 *   </ScrollView>
 */
export interface UseCachedFetchOptions<T> {
  /** Cache key — see services/api/cache.ts conventions. */
  key: string;
  /** Network fetcher. Must return the same shape every call. */
  fetcher: () => Promise<T>;
  /** How long a cached snapshot is considered "fresh enough" to show. */
  ttlMs?: number;
  /** If false, skip the cache entirely (useful for ephemeral data). */
  enabled?: boolean;
  /** Run the fetcher only when this resolves to true. */
  ready?: boolean;
}

export interface UseCachedFetchResult<T> {
  /** Current snapshot — cached on first paint, then fresh. */
  data: T | undefined;
  /** True only on the very first load when no cache existed. */
  loading: boolean;
  /** True while a refresh() call is in flight. */
  refreshing: boolean;
  /** Last network error, if any. UI may show a banner, never clobbers data. */
  error: Error | null;
  /** Force a network fetch, bypassing the cache. */
  refresh: () => Promise<void>;
  /** Optimistically replace local data without hitting the network. */
  mutate: (next: T) => Promise<void>;
}

export function useCachedFetch<T>(
  opts: UseCachedFetchOptions<T>,
): UseCachedFetchResult<T> {
  const { key, fetcher, ttlMs = DEFAULT_CACHE_TTL_MS, enabled = true, ready = true } = opts;

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track unmount to drop late results.
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // Use refs for fetcher + key so the load callback identity is stable
  // and a re-render with a new fetcher closure doesn't re-trigger fetch.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;
  const ttlRef = useRef(ttlMs);
  ttlRef.current = ttlMs;

  const load = useCallback(
    async (forceNetwork: boolean) => {
      if (!aliveRef.current) return;
      if (!enabled) {
        setLoading(false);
        return;
      }

      let hadCache = false;
      if (!forceNetwork) {
        const cached = await getCacheData<T>(keyRef.current);
        if (cached !== null && aliveRef.current) {
          setData(cached);
          setLoading(false);
          hadCache = true;
        }
      }

      if (forceNetwork) {
        setRefreshing(true);
      } else if (!hadCache) {
        setLoading(true);
      }

      try {
        const fresh = await fetcherRef.current();
        if (!aliveRef.current) return;
        setData(fresh);
        setError(null);
        await setCacheData(keyRef.current, fresh, ttlRef.current);
      } catch (e: any) {
        if (!aliveRef.current) return;
        setError(e instanceof Error ? e : new Error(String(e?.message ?? "fetch failed")));
        // Intentional: do NOT clear `data` here. A failed refresh on a
        // page that already has cached data should leave the cached UI
        // in place — error banner / toast is the caller's call.
      } finally {
        if (!aliveRef.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
  );

  // Initial load (and re-load when `ready` flips from false to true).
  useEffect(() => {
    if (!ready) {
      setLoading(false);
      return;
    }
    load(false);
  }, [ready, load]);

  const refresh = useCallback(() => load(true), [load]);
  const mutate = useCallback(async (next: T) => {
    setData(next);
    await setCacheData(keyRef.current, next, ttlRef.current);
  }, []);

  return { data, loading, refreshing, error, refresh, mutate };
}
