// src/api/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";
import {
  getAuthToken,
  saveTokens,
  clearAuthData,
  API_BASE_URL,
} from "./api/base";

// Types
export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  language: "en" | "ar";
}

export interface LoginData {
  email: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  otp: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  avatar: string | null;
  language: "en" | "ar";
  role: "customer" | "admin" | "super_admin";
  is_verified: boolean;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: true;
  message: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  error_code?: string;
}

// Token functions (getAuthToken, saveTokens, clearAuthData) are imported from
// ./api/base.ts to ensure a SINGLE in-memory token cache across the entire app.
// Previously, api.ts and base.ts each had their own _cachedToken, causing the
// stale-token bug: social login saved via api.ts, but orderApi/favoritesApi
// read from base.ts's stale null cache → 401 Unauthenticated.

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<AuthResponse> | null = null;

// Internal refresh token function
const internalRefreshToken = async (): Promise<AuthResponse> => {
  const refreshToken = await AsyncStorage.getItem(
    TOKEN_CONFIG.REFRESH_TOKEN_KEY,
  );
  if (!refreshToken) throw new Error("No refresh token");

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw data as ApiError;
  }

  await saveTokens(data.data.access_token, data.data.refresh_token);

  return data as AuthResponse;
};

// Main API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0,
): Promise<T> => {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-App-Version": "1.0.0",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "CART-Mobile-App",
  };

  if (token && !endpoint.includes("/auth/")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Merge custom headers
  Object.assign(headers, options.headers || {});

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Handle token expiration - try to refresh
    if (response.status === 401 && retryCount === 0) {
      // Check if it's a token expiration issue
      if (
        data.message?.includes("expired") ||
        data.message?.includes("Unauthenticated")
      ) {
        // Snapshot the token that was used for THIS request.
        // If a concurrent socialLogin has since written a NEW token,
        // we must NOT clear it — we should retry with the new token instead.
        const tokenBeforeRefresh = token;

        try {
          // Use shared refresh promise to prevent multiple refresh attempts
          if (isRefreshing && refreshPromise) {
            await refreshPromise;
          } else {
            isRefreshing = true;
            refreshPromise = internalRefreshToken();
            await refreshPromise;
            refreshPromise = null;
            isRefreshing = false;
          }

          // Retry the original request with new token
          return await apiRequest<T>(endpoint, options, retryCount + 1);
        } catch (refreshError) {
          // Before clearing auth, check if the token has changed since
          // we started this request. If it has, a concurrent socialLogin
          // issued a fresh token — DO NOT wipe it.
          const currentToken = await getAuthToken();
          if (currentToken && currentToken !== tokenBeforeRefresh) {
            // A new token was saved by socialLogin — retry with it
            return await apiRequest<T>(endpoint, options, retryCount + 1);
          }

          // Token hasn't changed — genuinely expired, safe to clear
          await clearAuthData();
          throw {
            success: false,
            message: "Session expired. Please login again.",
            error_code: "TOKEN_EXPIRED",
          } as ApiError;
        }
      }
    }

    if (!response.ok) {
      throw data as ApiError;
    }

    return data as T;
  } catch (error: any) {
    // Network errors
    if (
      error.message === "Network request failed" ||
      error.name === "TypeError"
    ) {
      throw {
        success: false,
        message:
          "Cannot connect to server. Please check your internet connection and ensure the server is running.",
        error_code: "NETWORK_ERROR",
      } as ApiError;
    }
    throw error;
  }
};

// Generic API client for use in other services (axios-style interface)
export const api = {
  async get<T = any>(
    endpoint: string,
    config?: { params?: Record<string, unknown> },
  ): Promise<{ data: T }> {
    let url = endpoint;
    if (config?.params) {
      const queryString = Object.entries(config.params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join("&");
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }
    const result = await apiRequest<T>(url, { method: "GET" });
    return { data: result };
  },

  async post<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await apiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  },

  async put<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await apiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  },

  async delete<T = any>(
    endpoint: string,
    config?: { data?: any },
  ): Promise<{ data: T }> {
    const result = await apiRequest<T>(endpoint, {
      method: "DELETE",
      body: config?.data ? JSON.stringify(config.data) : undefined,
    });
    return { data: result };
  },
};

// AUTH API SERVICE
export const authApi = {
  // Register
  async register(data: RegisterData): Promise<any> {
    const response = await apiRequest<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // OTP BYPASS: Backend now returns tokens immediately on registration (OTP commented out)
    // Previously: Registration didn't return tokens - user had to verify email first
    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);

      await AsyncStorage.setItem(
        TOKEN_CONFIG.USER_CACHE_KEY,
        JSON.stringify({
          id: response.data.user.id,
          first_name: response.data.user.first_name,
          last_name: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          language: response.data.user.language,
        }),
      );
    }

    return response;
  },

  // Verify Email OTP
  async verifyEmail(data: VerifyEmailData): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    });

    await saveTokens(response.data.access_token, response.data.refresh_token);

    await AsyncStorage.setItem(
      TOKEN_CONFIG.USER_CACHE_KEY,
      JSON.stringify({
        id: response.data.user.id,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        language: response.data.user.language,
      }),
    );

    return response;
  },

  // Login
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    await saveTokens(response.data.access_token, response.data.refresh_token);

    await AsyncStorage.setItem(
      TOKEN_CONFIG.USER_CACHE_KEY,
      JSON.stringify({
        id: response.data.user.id,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        language: response.data.user.language,
      }),
    );

    return response;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      // Even if server fails, clear local data
      console.warn("Logout API failed, clearing locally anyway");
    } finally {
      await clearAuthData();
    }
  },

  // Refresh Token
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = await AsyncStorage.getItem(
      TOKEN_CONFIG.REFRESH_TOKEN_KEY,
    );
    if (!refreshToken) throw new Error("No refresh token");

    const response = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    await saveTokens(response.data.access_token, response.data.refresh_token);

    return response;
  },

  // Forgot Password
  async forgotPassword(data: ForgotPasswordData) {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Verify Reset OTP
  async verifyResetOtp(data: { email: string; otp: string }) {
    return apiRequest("/auth/verify-reset-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Reset Password
  async resetPassword(data: ResetPasswordData) {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get Current User (always fresh from server)
  async getMe(): Promise<User> {
    const response = await apiRequest<{ success: true; data: { user: User } }>(
      "/me",
    );
    return response.data.user;
  },

  // Social Login - Google
  async socialGoogle(data: { token: string }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    });

    await saveTokens(response.data.access_token, response.data.refresh_token);

    await AsyncStorage.setItem(
      TOKEN_CONFIG.USER_CACHE_KEY,
      JSON.stringify({
        id: response.data.user.id,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        language: response.data.user.language,
      }),
    );

    return response;
  },

  // Social Login - Apple
  async socialApple(data: {
    token: string;
    user?: { name: { firstName: string; lastName: string } };
  }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>("/auth/apple", {
      method: "POST",
      body: JSON.stringify(data),
    });

    await saveTokens(response.data.access_token, response.data.refresh_token);

    await AsyncStorage.setItem(
      TOKEN_CONFIG.USER_CACHE_KEY,
      JSON.stringify({
        id: response.data.user.id,
        first_name: response.data.user.first_name,
        last_name: response.data.user.last_name,
        email: response.data.user.email,
        phone: response.data.user.phone,
        language: response.data.user.language,
      }),
    );

    return response;
  },

  // Profile Management

  // Get User Profile
  async getProfile() {
    return apiRequest("/profile", { method: "GET" });
  },

  // Update User Profile
  async updateProfile(data: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: "male" | "female" | "other";
    language?: "en" | "ar";
  }) {
    return apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Upload Avatar
  async uploadAvatar(file: any) {
    const formData = new FormData();
    formData.append("avatar", file);

    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Avatar upload failed");
    }

    return response.json();
  },

  // Delete Avatar
  async deleteAvatar() {
    return apiRequest("/profile/avatar", { method: "DELETE" });
  },

  // Change Password
  async changePassword(data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) {
    return apiRequest("/profile/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Address Management

  // Get All Addresses
  async getAddresses() {
    return apiRequest("/addresses", { method: "GET" });
  },

  // Get Single Address
  async getAddress(id: number) {
    return apiRequest(`/addresses/${id}`, { method: "GET" });
  },

  // Create Address
  async createAddress(data: {
    label: string;
    street: string;
    city: string;
    is_default?: boolean;
  }) {
    return apiRequest("/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update Address
  async updateAddress(
    id: number,
    data: {
      label?: string;
      street?: string;
      city?: string;
      is_default?: boolean;
    },
  ) {
    return apiRequest(`/addresses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete Address
  async deleteAddress(id: number) {
    return apiRequest(`/addresses/${id}`, { method: "DELETE" });
  },

  // Set Default Address
  async setDefaultAddress(id: number) {
    return apiRequest(`/addresses/${id}/default`, { method: "POST" });
  },
};

export default authApi;
