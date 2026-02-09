import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";

// API Configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper: Get common headers for all requests (including ngrok support)
export const getCommonHeaders = (
  includeContentType: boolean = true,
): HeadersInit => {
  const headers: HeadersInit = {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "ElBaraka-Mobile-App",
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

  const headers: HeadersInit = {
    ...getCommonHeaders(),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Log request for debugging (only in development)
  if (__DEV__) {
    console.log(`[API] ${options.method || "GET"} ${API_BASE_URL}${endpoint}`);
  }

  if (!response.ok) {
    let error;
    try {
      error = await safeJsonParse(response);
    } catch {
      error = { message: `HTTP ${response.status}: ${response.statusText}` };
    }
    throw error;
  }

  return await safeJsonParse(response);
};
