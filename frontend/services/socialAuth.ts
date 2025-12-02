// Social Authentication Service
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { authApi } from "./api";

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
// Android Debug SHA-1: 7E:7E:0F:57:DF:4C:25:87:3D:96:05:4F:0B:2C:8D:0E:7B:5F:17:B2
// Package: app.rork.elbaraka_hypermarket_app
export const GOOGLE_CONFIG = {
  // Android OAuth Client ID (supports custom URI schemes)
  androidClientId:
    "1094715104270-j7eosq5vui80pt5fhv634mkmd7fqvn92.apps.googleusercontent.com",
};

/**
 * Google Sign-In Hook
 * Using redirectUri with custom scheme to avoid IP-based redirects
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CONFIG.androidClientId,
    // Use reverse client ID as scheme (required for proper OAuth flow)
    redirectUri:
      "com.googleusercontent.apps.1094715104270-j7eosq5vui80pt5fhv634mkmd7fqvn92:/oauth2redirect",
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
 */
export async function handleGoogleResponse(response: any) {
  if (response?.type === "success") {
    const { authentication } = response;
    if (authentication?.accessToken) {
      // Send token to backend
      const result = await authApi.socialGoogle({
        token: authentication.accessToken,
      });
      return result;
    }
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

    // credential contains: identityToken, email, fullName
    const result = await authApi.socialApple({
      token: credential.identityToken || "",
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
