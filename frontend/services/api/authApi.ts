import {
  apiRequest,
  saveTokens,
  clearAuthData,
  API_BASE_URL,
  getAuthToken,
} from "./base";
import {
  RegisterData,
  LoginData,
  VerifyEmailData,
  ForgotPasswordData,
  ResetPasswordData,
  AuthResponse,
} from "./types";

// Authentication API
export const authApi = {
  // Register a new user.
  //
  // BUGFIX: previous version returned the response without persisting tokens,
  // so the next authenticated call (orders, profile, etc.) read AsyncStorage,
  // found no token, and 401'd. Logging out and back in masked it because
  // login() persists tokens.
  //
  // We now AWAIT saveTokens() before resolving so the caller can safely
  // navigate to an authenticated screen and trigger an authenticated request
  // immediately. saveTokens() updates BOTH the in-memory _cachedToken in
  // base.ts AND AsyncStorage, so the very next apiRequest sees the token.
  async register(data: RegisterData) {
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    }

    return response;
  },

  // Login user
  async login(data: LoginData) {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });

    // Save tokens after successful login
    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    }

    return response;
  },

  // Verify email with OTP
  async verifyEmail(data: VerifyEmailData) {
    return apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Resend email verification OTP
  async resendEmailVerification(email: string) {
    return apiRequest("/auth/resend-email-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Verify phone with OTP
  async verifyPhone(data: VerifyEmailData) {
    return apiRequest("/auth/verify-phone", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Resend phone verification OTP
  async resendPhoneVerification(phone: string) {
    return apiRequest("/auth/resend-phone-verification", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  },

  // Request password reset
  async forgotPassword(data: ForgotPasswordData) {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Reset password with OTP
  async resetPassword(data: ResetPasswordData) {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Refresh access token
  async refreshToken(refreshToken: string) {
    const response = await apiRequest<AuthResponse>("/auth/refresh", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    }

    return response;
  },

  // Logout user
  async logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      await clearAuthData();
    }
  },

  // Get current user profile (cache-first; pull-to-refresh passes
  // forceRefresh=true to bypass the 24h snapshot).
  async getProfile(options: { forceRefresh?: boolean } = {}) {
    return apiRequest("/profile", {
      method: "GET",
      cacheKey: "profile:me",
      cacheTtlMs: 24 * 60 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    });
  },

  // Update user profile — invalidates the profile cache so the next read
  // cannot serve the pre-update snapshot.
  async updateProfile(data: any) {
    return apiRequest("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      invalidatePrefixes: ["profile"],
    });
  },

  // Social login with Google (sends ID token for server-side verification)
  async socialGoogle(data: { id_token: string; push_token?: string }) {
    const response = await apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    }

    return response;
  },

  // Social login with Apple
  async socialApple(data: { token: string; user?: any; push_token?: string }) {
    const response = await apiRequest<AuthResponse>("/auth/apple", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.data?.access_token && response.data?.refresh_token) {
      await saveTokens(response.data.access_token, response.data.refresh_token);
    }

    return response;
  },
};
