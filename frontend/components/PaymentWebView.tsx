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
import { getPaymentStatus } from "@/services/api/paymentsApi";
import { useStore } from "@/store";
import {
  clearPendingPayment,
  setActivePaymentFlow,
} from "@/services/payment/paymentRecovery";
import { mapPaymentError } from "@/services/payment/paymentMessages";

// STEP 3: Payment polling configuration
const POLLING_CONFIG = {
  MAX_POLLING_DURATION_MS: 30000, // 30 seconds max total polling time
  POLL_INTERVAL_MS: 3000, // 3 seconds between polls
  INITIAL_WAIT_MS: 3000, // Wait 3s for backend webhook before first poll
} as const;

interface PaymentWebViewProps {
  iframeUrl: string;
  orderId: number;
  onSuccess?: () => void;
  onFailure?: (error: string) => void;
  onClose?: () => void;
}

export default function PaymentWebView({
  iframeUrl,
  orderId,
  onSuccess,
  onFailure,
  onClose,
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const { fetchCart } = useStore();

  // STEP 3: Polling state management
  const pollingStartTimeRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      console.log("[STEP 3] Polling payment status...", {
        orderId,
        elapsed: pollingStartTimeRef.current
          ? Date.now() - pollingStartTimeRef.current
          : 0,
      });

      const statusResponse = await getPaymentStatus(orderId);

      if (!statusResponse.success) {
        throw new Error("Failed to get payment status");
      }

      const status = statusResponse.data?.status;
      const orderStatus = statusResponse.data?.order_status;
      const paymentStatus = statusResponse.data?.payment_status;

      console.log("[STEP 3] Payment status:", {
        paymob_status: status,
        order_status: orderStatus,
        payment_status: paymentStatus,
      });

      // STEP 3: Handle terminal states - STOP POLLING IMMEDIATELY
      // Check both Paymob status AND order payment_status for completed payments
      if (status === "PAID" || paymentStatus === "completed") {
        console.log("[STEP 3] Payment confirmed - stopping polling");
        stopPolling();
        await handlePaymentSuccess();
        return;
      }

      if (status === "FAILED" || paymentStatus === "failed") {
        console.log("[STEP 3] Payment failed - stopping polling");
        stopPolling();
        await handlePaymentFailure(
          statusResponse.data?.error_message || "Payment failed",
        );
        return;
      }

      if (status === "CANCELLED") {
        console.log("[STEP 3] Payment cancelled - stopping polling");
        stopPolling();
        await handlePaymentCancelled();
        return;
      }

      // STEP 3: UNKNOWN/PENDING - continue polling ONLY if within timeout
      if (status === "PENDING" || status === "UNKNOWN" || !status) {
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
          text: "Try Again",
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
          text: "View Order",
          style: "cancel",
          onPress: () => router.replace(`/orders/${orderId}`),
        },
      ]);
    } catch (error) {
      console.error("[STEP 3] Error handling payment failure:", error);
      setProcessing(false);
    }
  };

  // STEP 3: Handle cancelled payment
  const handlePaymentCancelled = async () => {
    try {
      await clearPendingPayment();
      setProcessing(false);

      Alert.alert(
        "Payment Cancelled",
        "Your payment was cancelled. Would you like to try again?",
        [
          {
            text: "Try Again",
            onPress: () => {
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
            text: "Back to Cart",
            style: "cancel",
            onPress: () => router.replace("/(tabs)/cart"),
          },
        ],
      );
    } catch (error) {
      console.error("[STEP 3] Error handling payment cancellation:", error);
      setProcessing(false);
    }
  };

  // STEP 3: Handle polling timeout (30 seconds elapsed)
  const handlePollingTimeout = () => {
    setProcessing(false);

    Alert.alert(
      "Verifying Payment",
      "We're still verifying your payment. This may take a few moments. You can check your order status in the Orders section.",
      [
        {
          text: "View Order",
          onPress: () => router.replace(`/orders/${orderId}`),
        },
        {
          text: "Back to Checkout",
          style: "cancel",
          onPress: () => router.replace("/checkout/confirmation"),
        },
      ],
    );
  };

  // STEP 3: Handle status check API error
  const handleStatusCheckError = () => {
    setProcessing(false);

    Alert.alert(
      "Connection Issue",
      "We couldn't verify your payment status. Please check your internet connection and view your order details.",
      [
        {
          text: "View Orders",
          onPress: () => router.replace("/(tabs)/orders"),
        },
        {
          text: "Go Home",
          onPress: () => router.replace("/(tabs)"),
        },
      ],
    );
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
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            // Clear active flow flag so recovery can work if user returns later
            await setActivePaymentFlow(false);
            onClose?.();
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Secure Payment</Text>
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
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
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
            <Text style={styles.processingText}>Processing payment...</Text>
            <Text style={styles.processingSubtext}>Please wait</Text>
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
