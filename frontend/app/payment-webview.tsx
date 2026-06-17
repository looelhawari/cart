/**
 * PaymentWebView Screen (Tokenization Phase 3 — FIXED)
 *
 * Handles 3DS authentication for Unified Checkout and Classic flows.
 *
 * FLOW:
 * 1. WebView loads Paymob Unified Checkout URL
 * 2. User enters card info and completes 3DS
 * 3. Paymob redirects to `cart://payment-return` (deep link)
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
import { useTranslation } from "@/i18n";
import { Colors } from "@/constants/Colors";
import { pollPaymentStatus } from "@/services/paymentMethodsApi";
import PaymentResultModal from "@/components/PaymentResultModal";

export default function PaymentWebViewScreen() {
  const { t } = useTranslation();
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
  // AbortController fed into pollPaymentStatus so the in-flight setTimeout
  // chain is torn down the moment this screen unmounts. Without this, the
  // polling loop kept calling /payments/status/{id} forever (the symptom
  // the user reported as "infinite Verifying Payment").
  const pollAbortRef = useRef<AbortController | null>(null);

  // Track unmount for cleanup
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
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

    // Create one AbortController per polling session. unmount → abort →
    // pollPaymentStatus tears down its setTimeout chain and either resolves
    // (with last seen status) or rejects. Either way: no orphan polling.
    const controller = new AbortController();
    pollAbortRef.current = controller;

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
          // 60s ceiling. Backend's checkStatus now reconciles with Paymob
          // on each tick (was: passive read), so a terminal state should
          // surface within 4-6 ticks even if Paymob's webhook never lands.
          maxAttempts: 30,
          signal: controller.signal,
        },
      );

      if (!isMounted.current) return;

      if (result.status === "PAID") {
        console.log("[PaymentWebView] ✅ Payment successful!");
        setPaymentSuccess(true);
        setShowResultModal(true);
      } else if (result.status === "FAILED") {
        console.log("[PaymentWebView] ❌ Payment failed");
        setPaymentSuccess(false);
        setShowResultModal(true);
      } else {
        // Still PENDING after the ceiling. Route to order-success with the
        // orderId/paymentId so the order detail screen can keep checking on
        // its own cadence (every focus, no infinite loop) and the user is
        // no longer stuck on the verification spinner. The backend will
        // converge via the scheduled ReconcilePendingPayments job at worst.
        console.warn("[PaymentWebView] ⏱️ Payment verification timeout");
        Alert.alert(
          t.paymentFlow.paymentVerification,
          t.paymentFlow.paymentProcessingMessage,
          [
            {
              text: t.common.ok,
              onPress: () => {
                if (!isMounted.current) return;
                router.replace({
                  pathname: "/order-success",
                  params: {
                    orderId: params.orderId,
                    paymentId: params.paymentId,
                    promoCode: params.promoCode,
                    promoDiscount: params.promoDiscount,
                  },
                });
              },
            },
          ],
        );
      }
    } catch (error: any) {
      if (!isMounted.current) return;
      // Abort from unmount is the cleanup path — not a user-visible error.
      if (error?.name === "AbortError" || error?.message === "Polling aborted") {
        return;
      }
      console.error("[PaymentWebView] Polling error:", error);
      Alert.alert(t.common.error, t.paymentFlow.failedToVerify, [
        { text: t.common.ok, onPress: () => router.replace("/(tabs)") },
      ]);
    } finally {
      if (isMounted.current) setIsVerifying(false);
      if (pollAbortRef.current === controller) {
        pollAbortRef.current = null;
      }
    }
  }, [params.paymentId, params.orderId, params.promoCode, params.promoDiscount, router, t]);

  /**
   * Intercept navigation — detect redirect from Paymob after 3DS.
   *
   * Paymob redirects to PAYMOB_REDIRECT_URL after payment.
   * We set that to `cart://payment-return` (deep link).
   * The WebView can't load a deep link, so we intercept it here
   * and start polling instead.
   */
  const handleShouldStartLoadWithRequest = useCallback(
    (request: any) => {
      const { url } = request;

      // Detect deep link redirect from Paymob
      if (
        url.startsWith("cart://payment-return") ||
        url.startsWith("cart://payment")
      ) {
        console.log(
          "[PaymentWebView] 🎯 Deep link redirect detected — starting verification",
        );
        startPollingAfterRedirect();
        return false; // Don't try to load the deep link
      }

      // Detect server redirect (production cartshop.site, dev localhost, etc.)
      if (
        url.includes("/payment-return") &&
        !url.includes("accept.paymob.com")
      ) {
        console.log(
          "[PaymentWebView] 🎯 Server redirect detected — starting verification",
        );
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

    Alert.alert(t.common.error, t.paymentFlow.failedToLoadPage, [
      { text: t.common.retry, onPress: () => setLoading(true) },
      { text: t.common.cancel, onPress: () => router.back(), style: "cancel" },
    ]);
  };

  if (!params.iframeUrl) {
    Alert.alert(t.common.error, t.paymentFlow.paymentUrlNotProvided, [
      { text: t.common.ok, onPress: () => router.back() },
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
          <Text style={styles.loadingText}>{t.paymentFlow.loadingPayment}</Text>
        </View>
      )}

      {/* Verifying overlay — shown ONLY after payment redirect detected */}
      {isVerifying && (
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.verifyingTitle}>
            {t.paymentFlow.verifyingPayment}
          </Text>
          <Text style={styles.verifyingText}>
            {t.paymentFlow.pleaseWaitConfirm}
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
