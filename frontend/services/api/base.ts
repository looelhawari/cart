import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";

// API Configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Helper: Safely parse JSON from response - handles all error cases
export const safeResponseJson = async (response: Response): Promise<any> => {
  try {
    // For React Native, we need to handle UTF-8 encoding properly
    // Read as blob first, then decode as UTF-8
    const blob = await response.blob();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob, "UTF-8");
    });

    // Check if empty
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        data: {},
        message: "Empty response from server",
      };
    }

    // Check if response is HTML (error page)
    if (text.trim().startsWith("<") || text.trim().startsWith("<!DOCTYPE")) {
      return {
        success: false,
        data: {},
        message: "Server error - received HTML instead of JSON",
      };
    }

    try {
      // Parse the UTF-8 text as JSON
      const data = JSON.parse(text);
      return data;
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

// Helper: Get current access token
export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
};

// Helper: Save tokens securely
export const saveTokens = async (accessToken: string, refreshToken: string) => {
  await AsyncStorage.multiSet([
    [TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken],
    [TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken],
  ]);
};

// Helper: Clear all auth data
export const clearAuthData = async () => {
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
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
