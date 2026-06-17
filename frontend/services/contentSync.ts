import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";
import { API_CONFIG } from "@/config/app.config";
import {
  removeCacheByPrefix,
  clearAllCache,
} from "@/services/cache/apiCache";

/**
 * Content-sync engine for admin → customer realtime updates.
 *
 * Source of truth is the backend global `content_version`. Two triggers:
 *   1. Pusher event `admin.content.updated` on the public `app-content`
 *      channel  → instant (handled by useContentSync hook).
 *   2. GET /api/v1/app/content-version on startup/resume/reconnect → catches
 *      anything missed while offline/closed.
 *
 * On a detected change we (a) clear the matching local caches, (b) let
 * react-query refetch active queries, (c) bump a store signal so manual-fetch
 * screens reload. All logged for verification.
 */

const VERSION_KEY = "content_version";

export interface ContentUpdatePayload {
  type: string; // product | category | settings | map | banner | promotion | global
  action?: string; // created | updated | deleted
  entity_id?: string | number | null;
  version: number;
  timestamp?: string;
}

/** apiCache (AsyncStorage) key-prefixes to drop per content type. */
const CACHE_PREFIXES: Record<string, string[]> = {
  product: ["products", "product:", "offers", "promotions", "home", "flash", "search"],
  category: ["categories", "category:", "home"],
  promotion: ["promotions", "offers", "banners", "home"],
  banner: ["promotions", "offers", "banners", "home"],
  settings: ["store", "settings", "app_config"],
  map: ["delivery", "zones", "map"],
};

export const getStoredVersion = async (): Promise<number> => {
  const raw = await AsyncStorage.getItem(VERSION_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

export const setStoredVersion = async (version: number): Promise<void> => {
  await AsyncStorage.setItem(VERSION_KEY, String(version));
};

/**
 * Clear the local caches affected by a content type and force react-query to
 * refetch. For `global`/`settings` we do a hard, full refresh.
 */
export const invalidateForType = async (
  type: string,
  queryClient?: QueryClient,
): Promise<void> => {
  const full = type === "global" || type === "settings";

  if (full) {
    await clearAllCache();
    console.log("[ContentSync] FULL cache cleared (type:", type, ")");
  } else {
    const prefixes = CACHE_PREFIXES[type] ?? CACHE_PREFIXES.product;
    for (const p of prefixes) {
      await removeCacheByPrefix(p);
    }
    console.log("[ContentSync] cleared apiCache prefixes for", type, ":", prefixes);
  }

  // react-query: invalidate everything → active (visible) queries refetch
  // immediately, inactive ones refetch on next mount. This is the "hard
  // refresh" of cached server state regardless of the exact query keys.
  if (queryClient) {
    await queryClient.invalidateQueries();
    console.log("[ContentSync] react-query invalidated (all active queries refetching)");
  }
};

/**
 * Apply a realtime `admin.content.updated` event. Returns true if it caused a
 * refresh (i.e. the version was newer than what we had).
 */
export const applyContentUpdate = async (
  payload: ContentUpdatePayload,
  queryClient: QueryClient | undefined,
  bumpContentVersion: () => void,
): Promise<boolean> => {
  const local = await getStoredVersion();
  console.log(
    `[ContentSync] event received type=${payload.type} action=${payload.action} ` +
      `serverVersion=${payload.version} localVersion=${local}`,
  );

  // Compare with inequality (not just >): a backend redeploy can reset the
  // counter, and any mismatch still means "your cache may be stale".
  if (payload.version === local) {
    console.log("[ContentSync] version unchanged — no refresh needed");
    return false;
  }

  await invalidateForType(payload.type, queryClient);
  bumpContentVersion();
  await setStoredVersion(payload.version);
  console.log("[ContentSync] ✅ refreshed; local version now", payload.version);
  return true;
};

/**
 * Reconcile against the server (startup / resume / reconnect). Catches updates
 * missed while the app was offline or closed.
 */
export const reconcileContentVersion = async (
  queryClient: QueryClient | undefined,
  bumpContentVersion: () => void,
): Promise<void> => {
  try {
    const res = await fetch(`${API_CONFIG.BASE_URL}/app/content-version`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return;
    const data = await res.json();
    const serverVersion: number = data?.version ?? 0;
    const local = await getStoredVersion();

    console.log(`[ContentSync] reconcile: server=${serverVersion} local=${local}`);

    if (serverVersion !== local) {
      // We don't know exactly what changed → do a full refresh to be safe.
      await invalidateForType("global", queryClient);
      bumpContentVersion();
      await setStoredVersion(serverVersion);
      console.log("[ContentSync] ✅ reconciled; local version now", serverVersion);
    }
  } catch (e) {
    console.log("[ContentSync] reconcile skipped (offline?):", e);
  }
};
