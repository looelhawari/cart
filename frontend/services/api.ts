// src/api/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, TOKEN_CONFIG } from "@/config/app.config";

// API Configuration
const API_BASE_URL = API_CONFIG.BASE_URL;

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

// Helper: Get current access token
const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
};

// Helper: Save tokens securely
const saveTokens = async (accessToken: string, refreshToken: string) => {
  await AsyncStorage.multiSet([
    [TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken],
    [TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken],
  ]);
};

// Helper: Clear all auth data
const clearAuthData = async () => {
  await AsyncStorage.multiRemove([
    TOKEN_CONFIG.ACCESS_TOKEN_KEY,
    TOKEN_CONFIG.REFRESH_TOKEN_KEY,
    TOKEN_CONFIG.USER_CACHE_KEY, // Optional cached user
  ]);
};

// Main API request function
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-App-Version": "1.0.0",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "ElBaraka-Mobile-App",
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

    // Handle token expiration
    if (response.status === 401 && data.message?.includes("expired")) {
      await clearAuthData();
      throw new Error("TOKEN_EXPIRED");
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

// AUTH API SERVICE
export const authApi = {
  // Register
  async register(data: RegisterData): Promise<any> {
    const response = await apiRequest<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Registration doesn't return tokens - user must verify email first
    // No tokens to save at this stage

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

  // Send Phone OTP (for social login users)
  async sendPhoneOtp(data: { phone: string }) {
    return apiRequest("/auth/send-phone-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Verify Phone OTP (for social login users)
  async verifyPhoneOtp(data: { phone: string; otp: string }) {
    return apiRequest("/auth/verify-phone-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
