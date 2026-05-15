import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API Response Cache Service
 * Caches API responses with TTL (Time To Live) for offline access
 * Uses a fast in-memory layer + AsyncStorage for persistence
 */

const CACHE_PREFIX = "@api_cache:";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Fast in-memory cache layer (avoids AsyncStorage serialization/deserialization)
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generate cache key
 */
const getCacheKey = (key: string): string => {
  return `${CACHE_PREFIX}${key}`;
};

/**
 * Store data in cache with TTL
 */
export const setCacheData = async <T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): Promise<void> => {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Always update memory cache (instant)
    memoryCache.set(key, entry);

    // Persist to AsyncStorage in background (don't await for speed)
    const cacheKey = getCacheKey(key);
    AsyncStorage.setItem(cacheKey, JSON.stringify(entry)).catch((error) => {
      console.error(`Failed to persist cache for key ${key}:`, error);
    });
  } catch (error) {
    console.error(`Failed to cache data for key ${key}:`, error);
  }
};

/**
 * Get data from cache if valid
 */
export const getCacheData = async <T>(key: string): Promise<T | null> => {
  try {
    // Check memory cache first (instant, no async)
    const memEntry = memoryCache.get(key);
    if (memEntry) {
      const now = Date.now();
      if (now - memEntry.timestamp < memEntry.ttl) {
        return memEntry.data as T;
      }
      // Expired in memory
      memoryCache.delete(key);
    }

    // Fall back to AsyncStorage
    const cacheKey = getCacheKey(key);
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp < entry.ttl) {
      // Populate memory cache for next read
      memoryCache.set(key, entry);
      return entry.data;
    }

    // Cache expired, remove it
    await AsyncStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error(`Failed to get cached data for key ${key}:`, error);
    return null;
  }
};

/**
 * Remove specific cache entry from BOTH the in-memory map and AsyncStorage.
 *
 * BUGFIX: the previous version only removed from AsyncStorage; the
 * in-memory `memoryCache` retained the stale entry and the next
 * getCacheData() returned it without ever hitting the network. That
 * defeated `invalidatePrefixes` in apiRequest — e.g. adding a new
 * address wiped the disk cache but `getAddresses()` still saw the old
 * list from memory until the app was killed.
 */
export const removeCacheData = async (key: string): Promise<void> => {
  try {
    memoryCache.delete(key);
    const cacheKey = getCacheKey(key);
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error(`Failed to remove cache for key ${key}:`, error);
  }
};

/**
 * Remove every cache entry whose logical key starts with `prefix`, from
 * BOTH layers. Used by apiRequest's `invalidatePrefixes` option after
 * mutations (create address → wipe "addresses", place order → wipe
 * "orders", etc.).
 */
export const removeCacheByPrefix = async (prefix: string): Promise<void> => {
  try {
    // In-memory pass: iterate and delete matching keys.
    for (const key of Array.from(memoryCache.keys())) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }

    // AsyncStorage pass: keys are stored with the @api_cache: prefix.
    const allKeys = await AsyncStorage.getAllKeys();
    const targets = allKeys.filter((k) =>
      k.startsWith(`${CACHE_PREFIX}${prefix}`),
    );
    if (targets.length > 0) {
      await AsyncStorage.multiRemove(targets);
    }
  } catch (error) {
    console.error(`Failed to remove cache by prefix ${prefix}:`, error);
  }
};

/**
 * Clear all cache entries from both tiers. Called from logout so a
 * different account never sees the previous user's data.
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    memoryCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  count: number;
  keys: string[];
}> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));

    return {
      count: cacheKeys.length,
      keys: cacheKeys.map((key) => key.replace(CACHE_PREFIX, "")),
    };
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return { count: 0, keys: [] };
  }
};

/**
 * Cache-first fetch strategy
 * Returns cached data immediately if available, then fetches fresh data
 */
export const cacheFirstFetch = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    forceRefresh?: boolean;
    onStale?: (data: T) => void;
  } = {}
): Promise<T> => {
  const { ttl = DEFAULT_TTL, forceRefresh = false, onStale } = options;

  // Return cached data if available and not forcing refresh
  if (!forceRefresh) {
    const cached = await getCacheData<T>(key);
    if (cached) {
      // Trigger background refresh for stale data
      if (onStale) {
        fetchFn()
          .then((freshData) => {
            setCacheData(key, freshData, ttl);
            onStale(freshData);
          })
          .catch((error) => {
            console.warn("Background refresh failed:", error);
          });
      }
      return cached;
    }
  }

  // Fetch fresh data
  try {
    const freshData = await fetchFn();
    await setCacheData(key, freshData, ttl);
    return freshData;
  } catch (error) {
    // On error, try to return stale cache if available
    const staleCache = await getCacheData<T>(key);
    if (staleCache) {
      console.warn("Returning stale cache due to fetch error:", error);
      return staleCache;
    }
    throw error;
  }
};

/**
 * Network-first fetch strategy
 * Tries to fetch fresh data, falls back to cache on error
 */
export const networkFirstFetch = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> => {
  try {
    const freshData = await fetchFn();
    await setCacheData(key, freshData, ttl);
    return freshData;
  } catch (error) {
    // On error, return cached data if available
    const cached = await getCacheData<T>(key);
    if (cached) {
      console.warn("Network request failed, using cached data:", error);
      return cached;
    }
    throw error;
  }
};
