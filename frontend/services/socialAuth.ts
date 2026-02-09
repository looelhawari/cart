// Social Authentication Service
// Uses Authorization Code Flow with ID Token for secure server-side verification
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { authApi } from "./api";

WebBrowser.maybeCompleteAuthSession();

// ────────────────────────────────────────────────────────
//  Google OAuth Configuration
// ────────────────────────────────────────────────────────
// The Android client ID is used for the OAuth flow on Android.
// The Web client ID is critical: when provided, Google returns an id_token
// whose audience (aud) matches the web client ID — the backend verifies this.
//
// Google Cloud Project: cart-486910
// Android Debug SHA-1: 7E:7E:0F:57:DF:4C:25:87:3D:96:05:4F:0B:2C:8D:0E:7B:5F:17:B2
// Package: app.rork.elbaraka_hypermarket_app
export const GOOGLE_CONFIG = {
  // Android OAuth Client ID (type: Android)
  androidClientId:
    "113273912716-dcbh50mmcreap5m1ugee133st09s7bjd.apps.googleusercontent.com",
  // Web OAuth Client ID (type: Web application) — MUST match GOOGLE_WEB_CLIENT_ID in backend .env
  // The id_token's "aud" claim will be this value, which the backend verifies
  webClientId:
    "113273912716-ho3k23v05dodf7gq7tpq5u782chrar3t.apps.googleusercontent.com",
  // iOS OAuth Client ID (type: iOS) — Bundle ID: app.rork.elbaraka-hypermarket-app
  iosClientId:
    "113273912716-2rf483g4a0qe43kk1vo857fhp643vjv5.apps.googleusercontent.com",
};

/**
 * Google Sign-In Hook
 *
 * expo-auth-session returns an id_token when webClientId is provided.
 * The id_token is a signed JWT that the backend can cryptographically verify
 * using Google's public keys — much more secure than an access_token.
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CONFIG.androidClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    // Use reverse Android client ID as scheme for redirect
    redirectUri:
      "com.googleusercontent.apps.113273912716-dcbh50mmcreap5m1ugee133st09s7bjd:/oauth2redirect",
    scopes: ["openid", "profile", "email"],
  });

  return {
    request,
    response,
    promptAsync,
    loading: !request,
  };
}

/**
 * Handle Google Authentication Response
 *
 * Extracts the id_token from the response and sends it to the backend.
 * The backend will cryptographically verify the id_token's signature,
 * issuer, audience, expiry, and extract user info from claims.
 */
export async function handleGoogleResponse(response: any) {
  if (response?.type === "success") {
    const { authentication } = response;

    // Prefer id_token (signed JWT) over accessToken for server verification
    const idToken = authentication?.idToken;

    if (idToken) {
      const result = await authApi.socialGoogle({
        id_token: idToken,
      });
      return result;
    }

    // Fallback: if id_token is not available (shouldn't happen with webClientId)
    // This would only happen if the Google OAuth config is missing webClientId
    if (authentication?.accessToken) {
      console.warn(
        "Google Sign-In: id_token not available, falling back to access_token. " +
          "Ensure webClientId is configured for secure ID token flow.",
      );
      // We still send it as id_token key — the backend will reject it since
      // it's not a valid JWT signed by Google. This is intentional to fail safely.
      throw new Error(
        "Google Sign-In configuration error: id_token not received. " +
          "Please configure webClientId.",
      );
    }

    throw new Error("No authentication token received from Google");
  }
  return null;
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
