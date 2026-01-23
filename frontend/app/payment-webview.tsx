/**
 * PaymentWebView Screen (Phase 5)
 * Updated: Phase 5.5 Stage 1 - Success definition clarified
 *
 * Handles 3DS authentication for both new and saved card payments.
 *
 * CRITICAL SUCCESS DEFINITION (Phase 5.5):
 * - URL redirect to /payment/callback does NOT guarantee payment success
 * - Backend webhook is the ONLY source of truth for payment confirmation
 * - Frontend must NEVER show "success" based on WebView redirect alone
 * - TODO (Stage 2): Implement order status polling after redirect
 *
 * Current behavior (Stage 1):
 * - Detects redirect → routes to order-success
 * - Order-success screen should show "processing" state, not final success
 * - User should check order status for final confirmation
 */

import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";

export default function PaymentWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    iframeUrl: string;
    orderId: string;
  }>();

  const [loading, setLoading] = useState(true);

  /**
   * Intercept navigation BEFORE it loads to prevent ngrok warning page
   * This fires before onNavigationStateChange and can prevent navigation
   */
  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;

    console.log("[PaymentWebView] Should start load:", url);

    // Intercept ngrok success/callback URLs
    if (url.includes("/payment/callback") || url.includes("/payment/success")) {
      console.log(
        "[PaymentWebView] Intercepted success redirect - navigating to order confirmation",
      );
      console.log(
        "[PaymentWebView] WARNING: Payment may still be processing on backend",
      );

      // Prevent WebView from loading the ngrok URL
      // Instead, navigate to order success screen
      router.replace({
        pathname: "/order-success",
        params: { orderId: params.orderId },
      });

      // Return false to prevent navigation
      return false;
    }

    // Intercept failure URLs
    if (url.includes("/payment/failed") || url.includes("/payment/error")) {
      console.log("[PaymentWebView] Intercepted failure redirect");

      Alert.alert(
        "Payment Incomplete",
        "The payment process was not completed. Please try again or use a different payment method.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );

      // Return false to prevent navigation
      return false;
    }

    // Allow all other navigations (Paymob, Mastercard, etc.)
    return true;
  };

  /**
   * Handle navigation state change in WebView (backup detection)
   * This is a fallback in case onShouldStartLoadWithRequest doesn't fire
   */
  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;

    console.log("[PaymentWebView] Navigation state changed:", url);

    // This should rarely trigger now since we intercept in onShouldStartLoadWithRequest
    if (url.includes("/payment/callback") || url.includes("/payment/success")) {
      console.log("[PaymentWebView] (Fallback) Success redirect detected");

      router.replace({
        pathname: "/order-success",
        params: { orderId: params.orderId },
      });
    }
  };

  /**
   * Handle WebView errors
   */
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("[PaymentWebView] Error:", nativeEvent);

    Alert.alert(
      "Error",
      "Failed to load payment page. Please check your internet connection and try again.",
      [
        {
          text: "Retry",
          onPress: () => setLoading(true),
        },
        {
          text: "Cancel",
          onPress: () => router.back(),
          style: "cancel",
        },
      ],
    );
  };

  if (!params.iframeUrl) {
    Alert.alert("Error", "Payment URL not provided", [
      { text: "OK", onPress: () => router.back() },
    ]);
    return null;
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <WebView
        source={{
          uri: params.iframeUrl,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 999,
  },
});
