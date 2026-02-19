// Social Authentication Service
// Uses native Google Sign-In SDK for secure ID token retrieval
// and Apple Authentication for iOS
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import { authApi } from "./api";

// ────────────────────────────────────────────────────────
//  Expo Go Detection
// ────────────────────────────────────────────────────────
// @react-native-google-signin/google-signin is a native module that requires
// a custom development build. Importing it in Expo Go crashes the entire app
// because TurboModuleRegistry can't find 'RNGoogleSignin' in the binary.
const isExpoGo = Constants.appOwnership === "expo";

// ────────────────────────────────────────────────────────
//  Google OAuth Configuration
// ────────────────────────────────────────────────────────
// Uses native Google Sign-In SDK (Google Play Services on Android).
// No browser redirect needed — the SDK returns an id_token directly.
//
// The Web client ID is critical: it tells the native SDK to return an id_token
// whose audience (aud) matches the web client ID — the backend verifies this.
//
// Google Cloud Project: cart-486910
// Package: app.rork.elbaraka_hypermarket_app
const GOOGLE_WEB_CLIENT_ID =
  "113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com";

// ────────────────────────────────────────────────────────
//  Conditionally load native Google Sign-In (crashes Expo Go)
// ────────────────────────────────────────────────────────
let GoogleSignin: any = null;
let statusCodes: any = {
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
};
let isErrorWithCode: (e: any) => boolean = () => false;

if (!isExpoGo) {
  try {
    const gsModule = require("@react-native-google-signin/google-signin");
    GoogleSignin = gsModule.GoogleSignin;
    statusCodes = gsModule.statusCodes;
    isErrorWithCode = gsModule.isErrorWithCode;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  } catch (e) {
    console.warn("Google Sign-In native module not available:", e);
  }
}

/**
 * Sign in with Google using native SDK
 *
 * Returns the id_token JWT that the backend can cryptographically verify
 * using Google's public JWKS keys. No browser redirect involved.
 *
 * NOTE: Requires a custom dev build — not available in Expo Go.
 */
export async function signInWithGoogle(): Promise<string> {
  if (!GoogleSignin) {
    Alert.alert(
      "Not available in Expo Go",
      "Google Sign-In requires a development build. Run 'npx expo run:android' or use the production app.",
      [{ text: "OK" }]
    );
    throw new Error("CANCELLED");
  }

  try {
    // Check if Google Play Services are available (Android only)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Always sign out first to force the account picker to appear.
    // Without this, the SDK returns the cached session silently —
    // no picker is shown and the id_token may be stale/expired.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore sign-out errors — first-time users won't have a session
    }

    // Perform native Google Sign-In — account picker will now always appear
    const response = await GoogleSignin.signIn();

    // Extract the id_token from the response
    if (response.type === "success" && response.data?.idToken) {
      return response.data.idToken;
    }

    throw new Error("No ID token received from Google Sign-In");
  } catch (error: any) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error("CANCELLED");
        case statusCodes.IN_PROGRESS:
          throw new Error("Google Sign-In is already in progress");
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            "Google Play Services is not available. Please update or install it.",
          );
        default:
          throw new Error(error.message || "Google Sign-In failed");
      }
    }
    throw error;
  }
}

/**
 * Sign out from Google
 * Clears the cached Google session so user can pick a different account next time
 */
export async function signOutGoogle(): Promise<void> {
  if (!GoogleSignin) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore sign out errors
  }
}

/**
 * Apple Sign-In
 * Only available on iOS 13+ and macOS 10.15+
 */
export async function signInWithApple(): Promise<any> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("Apple Sign-In is only available on iOS and Android");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("No identity token received from Apple");
    }

    // credential contains: identityToken (JWT), email, fullName
    const result = await authApi.socialApple({
      token: credential.identityToken,
      user: {
        name: {
          firstName: credential.fullName?.givenName || "User",
          lastName: credential.fullName?.familyName || "",
        },
      },
    });

    return result;
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple Sign-In was canceled");
    }
    throw error;
  }
}

/**
 * Check if Apple Sign-In is available
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS === "ios") {
    return await AppleAuthentication.isAvailableAsync();
  }
  return false;
}
