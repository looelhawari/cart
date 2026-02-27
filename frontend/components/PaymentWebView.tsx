import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X } from "lucide-react-native";

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { getPaymentStatus } from "@/services/paymentMethodsApi";
import { useStore } from "@/store";
import {
  clearPendingPayment,
  setActivePaymentFlow,
} from "@/services/payment/paymentRecovery";
import { mapPaymentError } from "@/services/payment/paymentMessages";
import { useTranslation } from "@/i18n";

// STEP 3: Payment polling configuration
const POLLING_CONFIG = {
  MAX_POLLING_DURATION_MS: 30000, // 30 seconds max total polling time
  POLL_INTERVAL_MS: 3000, // 3 seconds between polls
  INITIAL_WAIT_MS: 3000, // Wait 3s for backend webhook before first poll
} as const;

interface PaymentWebViewProps {
  iframeUrl: string;
  orderId: number;
  paymentId?: number; // Preferred: poll by paymentId (more reliable than orderId)
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
  onClose?: () => void;
}

export default function PaymentWebView({
  iframeUrl,
  orderId,
  paymentId,
  onSuccess,
  onFailure,
  onClose,
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const { fetchCart } = useStore();
  const { t } = useTranslation();

  // STEP 3: Polling state management
  const pollingStartTimeRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingActiveRef = useRef(false);

  // STEP 3: Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // STEP 3: Stop all polling activity
  const stopPolling = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    isPollingActiveRef.current = false;
    pollingStartTimeRef.current = null;
  };

  // STEP 3: Check if polling should continue
  const shouldContinuePolling = (): boolean => {
    if (!isPollingActiveRef.current) return false;
    if (!pollingStartTimeRef.current) return false;

    const elapsedTime = Date.now() - pollingStartTimeRef.current;
    return elapsedTime < POLLING_CONFIG.MAX_POLLING_DURATION_MS;
  };

  // STEP 3: Poll payment status with timeout protection
  const pollPaymentStatus = async () => {
    // Stop if polling was cancelled or timed out
    if (!shouldContinuePolling()) {
      console.log("[STEP 3] Polling stopped - timeout or cancelled");
      handlePollingTimeout();
      return;
    }

    try {
      // Use paymentId if available (more reliable), fallback to orderId
      const pollId = paymentId || orderId;
      console.log("[STEP 3] Polling payment status...", {
        paymentId: pollId,
        elapsed: pollingStartTimeRef.current
          ? Date.now() - pollingStartTimeRef.current
          : 0,
      });

      const statusResponse = await getPaymentStatus(pollId);

      if (!statusResponse.success) {
        throw new Error(t.ui.failedToGetPaymentStatus);
      }

      const status = statusResponse.data?.status;
      const orderPaymentStatus = statusResponse.data?.order_payment_status;
      const paymobSuccess = statusResponse.data?.paymob_success;

      console.log("[STEP 3] Payment status:", {
        status: status,
        order_payment_status: orderPaymentStatus,
        paymob_success: paymobSuccess,
      });

      // STEP 3: Handle terminal states - STOP POLLING IMMEDIATELY
      // Check both payment record status AND order payment_status for completed payments
      if (status === "PAID" || orderPaymentStatus === "completed") {
        console.log("[STEP 3] Payment confirmed - stopping polling");
        stopPolling();
        await handlePaymentSuccess();
        return;
      }

      if (status === "FAILED" || orderPaymentStatus === "failed") {
        console.log("[STEP 3] Payment failed - stopping polling");
        stopPolling();
        await handlePaymentFailure("Payment failed");
        return;
      }

      // STEP 3: PENDING/REFUNDED - continue polling ONLY if within timeout
      if (status === "PENDING" || !status) {
        if (shouldContinuePolling()) {
          console.log("[STEP 3] Still pending, scheduling next poll...");
          pollingTimeoutRef.current = setTimeout(
            pollPaymentStatus,
            POLLING_CONFIG.POLL_INTERVAL_MS,
          );
        } else {
          console.log("[STEP 3] Polling timeout reached");
          stopPolling();
          handlePollingTimeout();
        }
        return;
      }

      // Unknown status - stop polling
      console.warn("[STEP 3] Unknown payment status, stopping:", status);
      stopPolling();
      handlePollingTimeout();
    } catch (error) {
      console.error("[STEP 3] Payment status check failed:", error);
      stopPolling();
      handleStatusCheckError();
    }
  };

  // STEP 3: Handle successful payment
  const handlePaymentSuccess = async () => {
    try {
      await clearPendingPayment();
      await fetchCart(); // Refresh cart (should be empty now)

      setProcessing(false);
      onSuccess?.();

      router.replace({
        pathname: "/order-success",
        params: { orderId: orderId.toString() },
      });
    } catch (error) {
      console.error("[STEP 3] Error handling payment success:", error);
      setProcessing(false);
    }
  };

  // STEP 3: Handle failed payment
  const handlePaymentFailure = async (errorMessage: string) => {
    try {
      await clearPendingPayment();
      const errorInfo = mapPaymentError(errorMessage);

      setProcessing(false);

      Alert.alert(errorInfo.title, errorInfo.message, [
        {
          text: t.ui.tryAgain,
          onPress: () => {
            onFailure?.(errorInfo.message);
            router.replace({
              pathname: "/checkout/confirmation",
              params: {
                orderId: orderId.toString(),
                retry: "true",
              },
            });
          },
        },
        {
          text: t.ui.viewOrder,
          style: "cancel",
          onPress: () => router.replace(`/orders/${orderId}`),
        },
      ]);
    } catch (error) {
      console.error("[STEP 3] Error handling payment failure:", error);
      setProcessing(false);
    }
  };

  // STEP 3: Handle polling timeout (30 seconds elapsed)
  const handlePollingTimeout = () => {
    setProcessing(false);

    Alert.alert(t.ui.verifyingPayment, t.ui.verifyingPaymentMessage, [
      {
        text: t.ui.viewOrder,
        onPress: () => router.replace(`/orders/${orderId}`),
      },
      {
        text: t.ui.backToCheckout,
        style: "cancel",
        onPress: () => router.replace("/checkout/confirmation"),
      },
    ]);
  };

  // STEP 3: Handle status check API error
  const handleStatusCheckError = () => {
    setProcessing(false);

    Alert.alert(t.ui.connectionIssue, t.ui.connectionIssueMessage, [
      {
        text: t.ui.viewOrders,
        onPress: () => router.replace("/(tabs)/orders"),
      },
      {
        text: t.ui.goHome,
        onPress: () => router.replace("/(tabs)"),
      },
    ]);
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // STEP 3: Detect Paymob success/response page
    const isPaymobSuccess =
      url.includes("acceptance/post_pay") ||
      url.includes("/payment/response") ||
      url.includes("txn_response_code=APPROVED");

    if (isPaymobSuccess && !isPollingActiveRef.current) {
      console.log("[STEP 3] Payment completed, starting status polling...");
      setProcessing(true);

      // STEP 3: Start polling timer
      pollingStartTimeRef.current = Date.now();
      isPollingActiveRef.current = true;

      // Wait for backend webhook to process, then start polling
      pollingTimeoutRef.current = setTimeout(
        pollPaymentStatus,
        POLLING_CONFIG.INITIAL_WAIT_MS,
      );
    }
  };

  const handleClose = () => {
    // STEP 3: Stop polling if user closes WebView
    stopPolling();
    Alert.alert(t.ui.cancelPayment, t.ui.cancelPaymentConfirm, [
      {
        text: t.ui.no,
        style: "cancel",
      },
      {
        text: t.ui.yes,
        style: "destructive",
        onPress: async () => {
          // Clear active flow flag so recovery can work if user returns later
          await setActivePaymentFlow(false);
          onClose?.();
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.ui.securePayment}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          disabled={processing}
        >
          <X size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary900} />
            <Text style={styles.loadingText}>{t.ui.loadingPaymentGateway}</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: iframeUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>

      {/* Processing Overlay */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color={Colors.primary900} />
            <Text style={styles.processingText}>{t.ui.processingPayment}</Text>
            <Text style={styles.processingSubtext}>{t.ui.pleaseWait}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
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
    zIndex: 1,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.neutralMedium,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  processingContent: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.xl,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  processingSubtext: {
    marginTop: Spacing.xs,
    fontSize: 14,
    color: Colors.neutralMedium,
  },
});
