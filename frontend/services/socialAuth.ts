// Social Authentication Service
// Uses native Google Sign-In SDK for secure ID token retrieval
// and Apple Authentication for iOS
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { authApi } from "./api";

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

// Configure Google Sign-In once at module load
GoogleSignin.configure({
  // webClientId makes the SDK return an id_token (JWT) in addition to the access token
  // The id_token's "aud" claim will be this value, which the backend verifies via JWKS
  webClientId: GOOGLE_WEB_CLIENT_ID,
  // Request offline access to get a server auth code (optional, not needed for id_token flow)
  offlineAccess: false,
  // Force account selection every time
  forceCodeForRefreshToken: false,
});

/**
 * Sign in with Google using native SDK
 *
 * Returns the id_token JWT that the backend can cryptographically verify
 * using Google's public JWKS keys. No browser redirect involved.
 */
export async function signInWithGoogle(): Promise<string> {
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
