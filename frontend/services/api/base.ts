import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";
import {
  getCacheData,
  setCacheData,
  removeCacheByPrefix,
} from "../cache/apiCache";
import {
  createSafeApiError,
  normalizeApiErrorPayload,
} from "./errors";

/** Default TTL for cached responses — 24h. Pull-to-refresh always bypasses. */
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// API Configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Language cache for Accept-Language header
let _cachedLanguage: string = "en";
const LANGUAGE_STORAGE_KEY = "app_language";

// Initialize language from storage (called once at import time)
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((lang) => {
  if (lang === "en" || lang === "ar") _cachedLanguage = lang;
});

// Allow external updates (called by i18n when language changes)
export const setApiLanguage = (lang: string) => {
  _cachedLanguage = lang;
};

// Helper: Get common headers for all requests (including ngrok support)
export const getCommonHeaders = (
  includeContentType: boolean = true,
): HeadersInit => {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Accept-Language": _cachedLanguage,
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "CART-Mobile-App",
  };

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

// Helper: Safely parse JSON from response - handles all error cases
export const safeResponseJson = async (response: Response): Promise<any> => {
  try {
    // Use response.text() directly — much faster than blob→FileReader
    const text = await response.text();

    // Check if empty
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        data: {},
        message: "Something went wrong. Please try again later.",
      };
    }

    // Check if response is HTML (error page)
    if (text.charCodeAt(0) === 60 /* '<' */) {
      return {
        success: false,
        data: {},
        message: "Something went wrong. Please try again later.",
      };
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      if (__DEV__) {
        console.error(
          "Failed to parse JSON. Preview:",
          text.substring(0, 200) + "...",
        );
      }
      return {
        success: false,
        data: {},
        message: "Something went wrong. Please try again later.",
      };
    }
  } catch (error) {
    return {
      success: false,
      data: {},
      message: "Something went wrong. Please try again later.",
    };
  }
};

// Helper: Safely parse JSON response (legacy - throws errors)
export const safeJsonParse = async (response: Response): Promise<any> => {
  const text = await response.text();

  if (!text || text.trim().length === 0) {
    throw createSafeApiError("Something went wrong. Please try again later.", response.status);
  }

  // Check if response is HTML (error page)
  if (text.trim().startsWith("<") || text.trim().startsWith("<!DOCTYPE")) {
    throw createSafeApiError("Something went wrong. Please try again later.", response.status);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    // Only log first 200 chars to avoid console overflow
    if (__DEV__) {
      console.error(
        "JSON parse error. Response preview:",
        text.substring(0, 200) + "...",
      );
    }
    throw createSafeApiError("Something went wrong. Please try again later.", response.status);
  }
};

// In-memory token cache to avoid AsyncStorage reads on every request
let _cachedToken: string | null | undefined = undefined; // undefined = not yet loaded

// Helper: Get current access token (with in-memory cache)
export const getAuthToken = async (): Promise<string | null> => {
  if (_cachedToken !== undefined) {
    return _cachedToken;
  }
  _cachedToken = await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
  return _cachedToken;
};

// Helper: Save tokens securely
export const saveTokens = async (accessToken: string, refreshToken: string) => {
  _cachedToken = accessToken; // Update in-memory cache immediately
  await AsyncStorage.multiSet([
    [TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken],
    [TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken],
  ]);
};

// Helper: Clear all auth data
export const clearAuthData = async () => {
  _cachedToken = null; // Clear in-memory cache immediately
  await AsyncStorage.multiRemove([
    TOKEN_CONFIG.ACCESS_TOKEN_KEY,
    TOKEN_CONFIG.REFRESH_TOKEN_KEY,
    TOKEN_CONFIG.USER_CACHE_KEY,
  ]);
};

/**
 * Extra options on top of RequestInit for our cache layer.
 *
 *   cacheKey
 *     Logical name for this read, e.g. "offers:active", "products:list:p=1".
 *     If set on a GET/HEAD: a successful response is persisted to AsyncStorage
 *     keyed by cacheKey, and a forceRefresh=false call returns the cached
 *     value (if still inside ttl) without hitting the network.
 *     Ignored on mutating verbs.
 *
 *   cacheTtlMs
 *     Per-call TTL. Defaults to DEFAULT_CACHE_TTL_MS (24h). Use a small TTL
 *     for time-sensitive data (e.g. cart totals); use the default for
 *     things that change rarely (e.g. categories).
 *
 *   forceRefresh
 *     If true, skip the cache READ but still WRITE the network response
 *     into the cache. This is the pull-to-refresh path: always go to the
 *     server, but refresh the saved snapshot so the next cold open is fast.
 *
 *   invalidatePrefixes
 *     On a successful POST/PUT/PATCH/DELETE, wipe every cache entry whose
 *     key starts with one of these prefixes. E.g. POST /addresses passes
 *     ["addresses"] so the next GET /addresses cannot return a stale list.
 *     Ignored on GET/HEAD.
 */
export interface ApiCacheOptions {
  cacheKey?: string;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
  invalidatePrefixes?: string[];
}

export type ApiRequestInit = RequestInit & ApiCacheOptions;

// Main API request function
export const apiRequest = async <T>(
  endpoint: string,
  options: ApiRequestInit = {},
): Promise<T> => {
  const token = await getAuthToken();

  const {
    cacheKey,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    forceRefresh = false,
    invalidatePrefixes,
    ...fetchInit
  } = options;

  const method = (fetchInit.method || "GET").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD";

  // 1) Read-through cache — only for GET/HEAD with an explicit cacheKey.
  //    Pull-to-refresh paths pass forceRefresh=true to skip this read.
  //    Cache storage is delegated to services/cache/apiCache.ts so we share
  //    a single in-memory + AsyncStorage layer with the legacy cacheFirstFetch
  //    / networkFirstFetch helpers — no two parallel caches.
  if (isReadOnly && cacheKey && !forceRefresh) {
    const cached = await getCacheData<T>(cacheKey);
    if (cached !== null) {
      if (__DEV__) {
        console.log(`[API] CACHE HIT ${cacheKey} (${endpoint})`);
      }
      return cached;
    }
  }

  // Defense-in-depth against the platform fetch caching API GET responses.
  // RN's fetch on iOS goes through NSURLSession.sharedSession.configuration
  // which heuristic-caches GETs that lack Cache-Control. We manage cache
  // ourselves in AsyncStorage (above) — tell the platform layer NOT to
  // cache so its lifetime doesn't surprise us. Mutating verbs aren't cached
  // anyway, so the override is harmless there.
  const cacheDefaults: RequestInit = isReadOnly ? { cache: "no-store" } : {};

  const headers: HeadersInit = {
    ...getCommonHeaders(),
    ...(isReadOnly ? { "Cache-Control": "no-cache" } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...fetchInit.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...cacheDefaults,
      ...fetchInit,
      headers,
    });
  } catch {
    throw createSafeApiError(
      "Please check your internet connection and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  // Log request for debugging (only in development)
  if (__DEV__) {
    const refreshTag = isReadOnly && cacheKey && forceRefresh ? " [REFRESH]" : "";
    console.log(`[API] ${method} ${API_BASE_URL}${endpoint}${refreshTag}`);
    if (!token) {
      console.warn("[API] ⚠️ No auth token available for request");
    }
  }

  if (!response.ok) {
    const error = normalizeApiErrorPayload(
      await safeResponseJson(response),
      response.status,
    );

    // Log authentication errors
    if (__DEV__ && response.status === 401) {
      console.error("[API] 401 Unauthenticated:", endpoint);
      console.error("[API] Token present:", token ? "YES" : "NO");
    }

    throw error;
  }

  const payload = (await safeJsonParse(response)) as T;

  // 2) Persist the fresh body if a cacheKey was provided. Even on
  //    forceRefresh we write — the point of forceRefresh is to skip
  //    READING the cache, not to skip refreshing the saved snapshot.
  if (isReadOnly && cacheKey) {
    await setCacheData(cacheKey, payload, cacheTtlMs);
  }

  // 3) Auto-invalidate on mutations. Callers declare which prefixes the
  //    mutation logically affects (e.g. POST /addresses -> ["addresses"]).
  //    BUGFIX: previously this only wiped AsyncStorage — the in-memory
  //    Map inside services/cache/apiCache.ts kept serving the stale
  //    body, so a freshly-created address never appeared on the list
  //    screen until the app was relaunched. removeCacheByPrefix wipes
  //    both tiers atomically.
  if (!isReadOnly && invalidatePrefixes && invalidatePrefixes.length > 0) {
    try {
      await Promise.all(
        invalidatePrefixes.map((prefix) => removeCacheByPrefix(prefix)),
      );
    } catch {
      /* best-effort — never fail the mutation because cache wipe failed */
    }
  }

  return payload;
};
