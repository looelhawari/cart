import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";

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
        message: "Empty response from server",
      };
    }

    // Check if response is HTML (error page)
    if (text.charCodeAt(0) === 60 /* '<' */) {
      return {
        success: false,
        data: {},
        message: "Server error - received HTML instead of JSON",
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
        message: "Invalid JSON response from server",
      };
    }
  } catch (error) {
    return {
      success: false,
      data: {},
      message: "Failed to read server response",
    };
  }
};

// Helper: Safely parse JSON response (legacy - throws errors)
export const safeJsonParse = async (response: Response): Promise<any> => {
  const text = await response.text();

  if (!text || text.trim().length === 0) {
    throw new Error("Empty response from server");
  }

  // Check if response is HTML (error page)
  if (text.trim().startsWith("<") || text.trim().startsWith("<!DOCTYPE")) {
    throw new Error("Server error - please check if the backend is running");
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
    throw new Error("Invalid JSON response from server");
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

// Main API request function
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAuthToken();

  // Defense-in-depth against the platform fetch caching API GET responses.
  // RN's fetch on iOS goes through NSURLSession.sharedSession.configuration
  // which heuristic-caches GETs that lack Cache-Control. After mutations
  // (POST /addresses, PUT /products/...), the next GET could return a
  // stale cached body — that's how a freshly-added address would silently
  // disappear from the list until the user navigated away and back.
  //
  // Force no-store + a Cache-Control header so the platform doesn't cache.
  // Mutating verbs (POST/PUT/PATCH/DELETE) aren't cached anyway, so the
  // override is harmless there. Callers that genuinely want caching should
  // pass `cache` themselves and that wins via spread order below.
  const method = (options.method || "GET").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD";
  const cacheDefaults: RequestInit = isReadOnly ? { cache: "no-store" } : {};

  const headers: HeadersInit = {
    ...getCommonHeaders(),
    ...(isReadOnly ? { "Cache-Control": "no-cache" } : {}),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...cacheDefaults,
    ...options,
    headers,
  });

  // Log request for debugging (only in development)
  if (__DEV__) {
    console.log(`[API] ${options.method || "GET"} ${API_BASE_URL}${endpoint}`);
    if (!token) {
      console.warn("[API] ⚠️ No auth token available for request");
    }
  }

  if (!response.ok) {
    let error;
    try {
      error = await safeJsonParse(response);
    } catch {
      error = { message: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Log authentication errors
    if (__DEV__ && response.status === 401) {
      console.error("[API] 401 Unauthenticated:", endpoint);
      console.error("[API] Token present:", token ? "YES" : "NO");
    }

    throw error;
  }

  return await safeJsonParse(response);
};
