/**
 * PaymentWebView Screen (Tokenization Phase 3 — FIXED)
 *
 * Handles 3DS authentication for Unified Checkout and Classic flows.
 *
 * FLOW:
 * 1. WebView loads Paymob Unified Checkout URL
 * 2. User enters card info and completes 3DS
 * 3. Paymob redirects to `elbaraka://payment-return` (deep link)
 * 4. WebView intercepts the redirect (handleShouldStartLoadWithRequest)
 * 5. THEN we start polling GET /api/v1/payments/status/{paymentId}
 * 6. Webhook on backend has already updated status (usually ~1s earlier)
 * 7. Polling detects PAID/FAILED → show result modal → navigate
 *
 * CRITICAL FIX: Polling ONLY starts after redirect detection.
 * Previous version polled immediately on mount (wasted 30+ API calls).
 */

import React, { useState, useRef, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { pollPaymentStatus } from "@/services/paymentMethodsApi";
import PaymentResultModal from "@/components/PaymentResultModal";

/**
 * Parse 'success' query param from Paymob redirect URL.
 * Paymob appends ?success=true/false after payment completion.
 * Returns true/false if found, null if not present.
 */
function parseSuccessFromUrl(url: string): boolean | null {
  try {
    const queryStart = url.indexOf("?");
    if (queryStart === -1) return null;
    const queryString = url.substring(queryStart + 1);
    const match = queryString.match(/(?:^|&)success=(true|false)(?:&|$)/i);
    if (!match) return null;
    return match[1].toLowerCase() === "true";
  } catch {
    return null;
  }
}

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
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Refs for cleanup — polling can be cancelled on unmount
  const pollingStarted = useRef(false);
  const isMounted = useRef(true);
  const resultResolved = useRef(false);

  // Track unmount for cleanup
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Start polling ONLY after payment redirect detected.
   * Called from handleShouldStartLoadWithRequest when we intercept
   * the deep link redirect from Paymob.
   */
  const startPollingAfterRedirect = useCallback(async () => {
    if (pollingStarted.current || !params.paymentId) return;
    pollingStarted.current = true;
    setIsVerifying(true);

    const paymentId = parseInt(params.paymentId);

    console.log(
      "[PaymentWebView] 🔄 Redirect detected — starting payment status polling...",
    );

    try {
      // Small delay: give webhook 2s to arrive at backend first
      await new Promise((r) => setTimeout(r, 2000));

      if (!isMounted.current) return;

      const result = await pollPaymentStatus(
        paymentId,
        (status) => {
          if (!isMounted.current) return;
          console.log(`[PaymentWebView] Payment status: ${status}`);
        },
        {
          intervalMs: 2000, // Poll every 2 seconds
          maxAttempts: 15, // 30 seconds total (webhook should arrive within 5s)
        },
      );

      // If URL redirect already resolved the result, skip polling result
      if (!isMounted.current || resultResolved.current) return;

      console.log(
        "[PaymentWebView] Polling result:",
        JSON.stringify({
          status: result.status,
          paymob_success: result.paymob_success,
          paymob_status: result.paymob_status,
          payment_id: result.payment_id,
        }),
      );

      if (result.status === "PAID") {
        console.log("[PaymentWebView] ✅ Payment successful!");
        resultResolved.current = true;
        setPaymentSuccess(true);
        setShowResultModal(true);
      } else if (result.status === "FAILED") {
        console.log("[PaymentWebView] ❌ Payment failed");
        resultResolved.current = true;
        setPaymentSuccess(false);
        setShowResultModal(true);
      } else if (
        result.status === "PENDING" &&
        result.paymob_success !== null &&
        result.paymob_success !== undefined
      ) {
        // Webhook hasn't arrived yet, but Paymob remote query confirms outcome
        console.log(
          `[PaymentWebView] ⚡ Webhook delayed — using Paymob remote: success=${result.paymob_success}`,
        );
        resultResolved.current = true;
        setPaymentSuccess(result.paymob_success === true);
        setShowResultModal(true);
      } else {
        // Still PENDING after 30s — webhook might be delayed
        console.warn("[PaymentWebView] ⏱️ Payment verification timeout");
        Alert.alert(
          "Payment Verification",
          "We are still processing your payment. You will receive a notification when it's confirmed. Please check your orders.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
        );
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error("[PaymentWebView] Polling error:", error);
      Alert.alert(
        "Error",
        "Failed to verify payment status. Please check your orders.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } finally {
      if (isMounted.current) setIsVerifying(false);
    }
  }, [params.paymentId, router]);

  /**
   * Intercept navigation — detect redirect from Paymob after 3DS.
   *
   * Paymob redirects to PAYMOB_REDIRECT_URL after payment.
   * We set that to `elbaraka://payment-return` (deep link).
   * The WebView can't load a deep link, so we intercept it here
   * and start polling instead.
   */
  const handleShouldStartLoadWithRequest = useCallback(
    (request: any) => {
      const { url } = request;

      // Log every navigation for debugging redirect flow
      console.log("[PaymentWebView] 📍 Navigation:", url.substring(0, 150));

      // Detect deep link redirect from Paymob
      if (
        url.startsWith("elbaraka://payment-return") ||
        url.startsWith("elbaraka://payment")
      ) {
        console.log("[PaymentWebView] 🎯 Deep link redirect detected");

        // Paymob appends ?success=true/false to the redirect URL
        // Use this for IMMEDIATE result — no polling needed
        const success = parseSuccessFromUrl(url);
        if (success !== null && !resultResolved.current) {
          console.log(
            `[PaymentWebView] ✅ URL params confirm: success=${success}`,
          );
          resultResolved.current = true;
          pollingStarted.current = true;
          setPaymentSuccess(success);
          setShowResultModal(true);
          return false;
        }

        // No success param — fall back to server polling
        startPollingAfterRedirect();
        return false;
      }

      // Detect server redirect (production cartshop.site, dev localhost, etc.)
      if (
        url.includes("/payment-return") &&
        !url.includes("accept.paymob.com")
      ) {
        console.log("[PaymentWebView] 🎯 Server redirect detected");

        const success = parseSuccessFromUrl(url);
        if (success !== null && !resultResolved.current) {
          console.log(
            `[PaymentWebView] ✅ URL params confirm: success=${success}`,
          );
          resultResolved.current = true;
          pollingStarted.current = true;
          setPaymentSuccess(success);
          setShowResultModal(true);
          return false;
        }

        startPollingAfterRedirect();
        return false;
      }

      // Detect Paymob's own payment status page (sometimes redirects there)
      if (url.includes("accept.paymob.com/unifiedcheckout/payment-status")) {
        console.log(
          "[PaymentWebView] 🎯 Paymob status page detected — starting verification",
        );
        startPollingAfterRedirect();
        return false;
      }

      // Allow all other URLs (Paymob checkout pages, 3DS bank pages, etc.)
      return true;
    },
    [startPollingAfterRedirect],
  );

  /**
   * Handle WebView errors
   */
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error("[PaymentWebView] Error:", nativeEvent);

    // If we're already verifying (redirect happened), ignore WebView errors
    if (isVerifying) return;

    Alert.alert(
      "Error",
      "Failed to load payment page. Please check your internet connection and try again.",
      [
        { text: "Retry", onPress: () => setLoading(true) },
        { text: "Cancel", onPress: () => router.back(), style: "cancel" },
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

      {/* Loading overlay — shown while WebView is loading */}
      {loading && !isVerifying && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading payment...</Text>
        </View>
      )}

      {/* Verifying overlay — shown ONLY after payment redirect detected */}
      {isVerifying && (
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.verifyingTitle}>Verifying Payment</Text>
          <Text style={styles.verifyingText}>
            Please wait while we confirm your payment...
          </Text>
        </View>
      )}

      <WebView
        source={{
          uri: params.iframeUrl,
        }}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={handleError}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        style={[styles.webview, isVerifying && { opacity: 0 }]}
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
  verifyingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    zIndex: 1000,
  },
  verifyingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  verifyingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.neutralGray,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  webview: {
    flex: 1,
  },
});
