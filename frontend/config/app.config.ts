/**
 * Application Configuration
 *
 * Update these values based on your environment:
 * - For Android Emulator: Use 10.0.2.2 instead of 127.0.0.1
 * - For iOS Simulator: Use 127.0.0.1
 * - For Physical Device: Use your computer's local IP address (e.g., 192.168.1.100)
 */

// Backend API Configuration
export const API_CONFIG = {
  // Development URLs
  // For physical device testing on same WiFi, use local IP
  BASE_URL: "https://cartshop.site/api/v1",

  TIMEOUT: 30000, // 30 seconds
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: "ElBaraka",
  VERSION: "1.0.0",
  SUPPORT_EMAIL: "support@elbaraka.com",
};

// Token Configuration
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: "access_token",
  REFRESH_TOKEN_KEY: "refresh_token",
  USER_CACHE_KEY: "user_cache", // Minimal user data for quick startup
  ACCESS_TOKEN_EXPIRY: 604800, // 7 days in seconds (was 30 min - too short!)
  REFRESH_TOKEN_EXPIRY: 7776000, // 90 days in seconds (was 30 days)
};

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 8,
  EXPIRY_MINUTES: 10,
  RESEND_TIMEOUT: 60, // seconds
};

export default {
  API_CONFIG,
  APP_CONFIG,
  TOKEN_CONFIG,
  OTP_CONFIG,
};
