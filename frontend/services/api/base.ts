import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";

// API Configuration
export const API_BASE_URL = API_CONFIG.BASE_URL;

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
  options: RequestInit = {}
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
    const error = await response.json();
    throw error;
  }

  return await response.json();
};
