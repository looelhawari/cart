import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "biometric_auth_enabled";
const SAVED_CREDENTIALS_KEY = "saved_login_credentials";

export interface BiometricType {
  available: boolean;
  type: "fingerprint" | "face" | "iris" | "none";
  enrolled: boolean;
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricSupport(): Promise<BiometricType> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { available: false, type: "none", enrolled: false };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let type: "fingerprint" | "face" | "iris" | "none" = "none";

    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      type = "face";
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      type = "fingerprint";
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      type = "iris";
    }

    return {
      available: compatible && enrolled,
      type,
      enrolled,
    };
  } catch (error) {
    console.error("Error checking biometric support:", error);
    return { available: false, type: "none", enrolled: false };
  }
}

/**
 * Authenticate user with biometrics
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const support = await checkBiometricSupport();

    if (!support.available) {
      throw new Error("Biometric authentication not available");
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to login",
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allow PIN/Pattern as fallback
    });

    return result.success;
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return false;
  }
}

/**
 * Check if biometric login is enabled
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch (error) {
    console.error("Error checking biometric login status:", error);
    return false;
  }
}

/**
 * Enable biometric login
 */
export async function enableBiometricLogin(
  email: string,
  password: string,
): Promise<void> {
  try {
    // Verify biometric first
    const authenticated = await authenticateWithBiometric();

    if (!authenticated) {
      throw new Error("Biometric authentication failed");
    }

    // Save credentials securely (only on device, encrypted)
    const credentials = JSON.stringify({ email, password });
    await SecureStore.setItemAsync(SAVED_CREDENTIALS_KEY, credentials);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
  } catch (error) {
    console.error("Error enabling biometric login:", error);
    throw error;
  }
}

/**
 * Disable biometric login
 */
export async function disableBiometricLogin(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SAVED_CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    console.error("Error disabling biometric login:", error);
    throw error;
  }
}

/**
 * Get saved credentials after biometric authentication
 */
export async function getSavedCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  try {
    const enabled = await isBiometricLoginEnabled();

    if (!enabled) {
      return null;
    }

    const authenticated = await authenticateWithBiometric();

    if (!authenticated) {
      return null;
    }

    const credentials = await SecureStore.getItemAsync(SAVED_CREDENTIALS_KEY);

    if (!credentials) {
      return null;
    }

    return JSON.parse(credentials);
  } catch (error) {
    console.error("Error getting saved credentials:", error);
    return null;
  }
}

/**
 * Biometric type name translations interface
 */
export interface BiometricTypeNames {
  faceId: string;
  faceRecognition: string;
  touchId: string;
  fingerprint: string;
  irisRecognition: string;
  biometric: string;
}

/**
 * Get biometric type name for UI display (localized)
 */
export function getBiometricTypeName(
  type: string,
  names?: BiometricTypeNames,
): string {
  if (names) {
    switch (type) {
      case "face":
        return Platform.OS === "ios" ? names.faceId : names.faceRecognition;
      case "fingerprint":
        return Platform.OS === "ios" ? names.touchId : names.fingerprint;
      case "iris":
        return names.irisRecognition;
      default:
        return names.biometric;
    }
  }
  // Fallback to English if no translations provided
  switch (type) {
    case "face":
      return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
    case "fingerprint":
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris Recognition";
    default:
      return "Biometric";
  }
}
