/**
 * PaymentWebView Screen (Tokenization Phase 3)
 * Updated: Dual-flow support with polling
 *
 * Handles 3DS authentication for Unified Checkout and Classic flows.
 * Uses polling instead of redirect detection for payment confirmation.
 *
 * CRITICAL: Polling is the ONLY reliable way to detect payment success.
 * - WebView redirects are unreliable (ngrok issues, timing problems)
 * - Backend webhook updates payment status in database
 * - Frontend polls GET /api/v1/payments/status/{paymentId} every 2 seconds
 *
 * Flows handled:
 * 1. Unified Checkout (3DS + Tokenization)
 * 2. Classic Iframe (Legacy)
 * 3. MOTO fallback to 3DS (when bank requires 3DS)
 */

import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { pollPaymentStatus } from "@/services/paymentMethodsApi";
import PaymentResultModal from "@/components/PaymentResultModal";

export default function PaymentWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    iframeUrl: string;
    orderId: string;
    paymentId: string;
    promoCode?: string;
    promoDiscount?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [pollingStatus, setPollingStatus] = useState<string>("Starting...");
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const pollingActive = useRef(false);

  /**
   * Start polling for payment status
   */
  useEffect(() => {
    if (params.paymentId && !pollingActive.current) {
      pollingActive.current = true;

      const startPollingAsync = async () => {
        const paymentId = parseInt(params.paymentId);

        console.log("[PaymentWebView] Starting payment status polling...");
        setPollingStatus("Checking payment status...");

        try {
          const result = await pollPaymentStatus(
            paymentId,
            (status) => {
              console.log(`[PaymentWebView] Payment status: ${status}`);
              setPollingStatus(`Status: ${status}`);
            },
            {
              intervalMs: 2000, // Poll every 2 seconds
              maxAttempts: 30, // 60 seconds total
            },
          );

          // Payment completed
          if (result.status === "PAID") {
            console.log("[PaymentWebView] ✅ Payment successful!");
            // Show success modal for 2 seconds
            setPaymentSuccess(true);
            setShowResultModal(true);
          } else if (result.status === "FAILED") {
            console.log("[PaymentWebView] ❌ Payment failed");
            // Show failure modal for 2 seconds
            setPaymentSuccess(false);
            setShowResultModal(true);
          } else {
            // Timeout or still pending
            console.warn("[PaymentWebView] ⏱️ Payment verification timeout");
            Alert.alert(
              "Payment Verification",
              "We are still processing your payment. Please check your orders.",
              [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
            );
          }
        } catch (error) {
          console.error("[PaymentWebView] Polling error:", error);
          Alert.alert(
            "Error",
            "Failed to verify payment status. Please check your orders.",
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
          );
        }
      };

      startPollingAsync();
    }
  }, [params.paymentId, params.orderId, router]);

  /**
   * Intercept navigation - detect deep link redirects from Paymob
   */
  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;

    console.log("[PaymentWebView] Should start load:", url);

    // Detect deep link redirect from Paymob (elbaraka://payment-return)
    if (url.startsWith("elbaraka://payment-return")) {
      console.log(
        "[PaymentWebView] Deep link redirect detected - polling will verify status",
      );
      setPollingStatus("Payment submitted - verifying...");
      return false; // Don't try to load the deep link
    }

    // Detect localhost redirect (fallback for development)
    if (
      url.includes("localhost:8000/payment-return") ||
      url.includes("127.0.0.1:8000/payment-return")
    ) {
      console.log(
        "[PaymentWebView] Localhost redirect detected - polling will verify status",
      );
      setPollingStatus("Payment submitted - verifying...");
      return false; // Don't try to load localhost
    }

    // Detect payment completion URL but rely on polling for final confirmation
    if (url.includes("/payment/callback") || url.includes("/payment/success")) {
      console.log(
        "[PaymentWebView] Payment completion detected - polling will confirm",
      );
      setPollingStatus("Verifying payment...");
      return false; // Don't load the callback URL
    }

    if (url.includes("/payment/failed") || url.includes("/payment/error")) {
      console.log("[PaymentWebView] Payment failure detected");
      return false;
    }

    return true;
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

  const handleModalComplete = () => {
    setShowResultModal(false);

    if (paymentSuccess) {
      // Navigate to order success
      router.replace({
        pathname: "/order-success",
        params: {
          orderId: params.orderId,
          paymentId: params.paymentId,
          promoCode: params.promoCode,
          promoDiscount: params.promoDiscount,
        },
      });
    } else {
      // Navigate back to checkout or cart
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <PaymentResultModal
        visible={showResultModal}
        success={paymentSuccess}
        onComplete={handleModalComplete}
        duration={2000}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading payment...</Text>
        </View>
      )}

      {/* Polling status indicator */}
      {params.paymentId && (
        <View style={styles.pollingIndicator}>
          <ActivityIndicator size="small" color={Colors.primary900} />
          <Text style={styles.pollingText}>{pollingStatus}</Text>
        </View>
      )}

      <WebView
        source={{
          uri: params.iframeUrl,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={handleError}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.neutralCharcoal,
  },
  pollingIndicator: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 100,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pollingText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.neutralCharcoal,
    fontWeight: "500",
  },
  webview: {
    flex: 1,
  },
});
