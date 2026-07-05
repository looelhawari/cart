/**
 * Application Configuration
 *
 * Update these values based on your environment:
 * - For Android Emulator: Use 10.0.2.2 instead of 127.0.0.1
 * - For iOS Simulator: Use 127.0.0.1
 * - For Physical Device: Use your computer's local IP address (e.g., 192.168.1.100)
 */

// Backend API Configuration
//
// Environment-aware so a release build can NEVER ship a localhost/LAN URL
// again: __DEV__ is true only in the Metro dev server, false in every
// EAS/production build. Set your machine's LAN IP in DEV_BASE_URL for
// on-device local testing.
const PROD_BASE_URL = "https://cartshop.site/api/v1";
const DEV_BASE_URL = "http://192.168.100.10:8000/api/v1";

export const API_CONFIG = {
  BASE_URL: __DEV__ ? DEV_BASE_URL : PROD_BASE_URL,

  TIMEOUT: 15000, // 15 seconds
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: "CART",
  VERSION: "1.0.0",
  SUPPORT_EMAIL: "Cart.shopegy@gmail.com",
};

// Auth feature flags
export const AUTH_CONFIG = {
  ENABLE_APPLE_SIGN_IN: true,
  SHOW_APPLE_SIGN_IN_BUTTON: false,
};

// Map Configuration (Leaflet + OpenStreetMap - 100% free, no API keys)
export const MAP_CONFIG = {
  // Optional: Self-hosted Nominatim URL for geocoding (falls back to public server)
  NOMINATIM_URL: "https://nominatim.openstreetmap.org",
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
  AUTH_CONFIG,
  MAP_CONFIG,
  TOKEN_CONFIG,
  OTP_CONFIG,
};
