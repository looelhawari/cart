import React, { useState, useRef } from "react";
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

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Check if we hit the response callback URL
    if (url.includes("/payment/response")) {
      setProcessing(true);

      // Extract success parameter
      const urlParams = new URL(url);
      const success = urlParams.searchParams.get("success") === "true";

      // Wait a bit for the processed callback to complete
      setTimeout(async () => {
        try {
          // Poll payment status
          const statusResponse = await getPaymentStatus(orderId);

          if (statusResponse.success) {
            const status = statusResponse.data?.status;

            if (status === "PAID") {
              // Clear cart after successful payment
              await fetchCart();

              Alert.alert(
                "Payment Successful",
                "Your payment has been processed successfully!",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      onSuccess?.();
                      router.replace({
                        pathname: "/order-success",
                        params: { orderId: orderId.toString() },
                      });
                    },
                  },
                ],
              );
            } else if (status === "FAILED") {
              const errorMsg = "Payment failed. Please try again.";
              Alert.alert("Payment Failed", errorMsg, [
                {
                  text: "OK",
                  onPress: () => {
                    onFailure?.(errorMsg);
                    router.back();
                  },
                },
              ]);
            } else {
              // Still pending - try again
              setTimeout(() => handleNavigationStateChange(navState), 2000);
            }
          } else {
            throw new Error("Failed to get payment status");
          }
        } catch (error) {
          console.error("Payment status check failed:", error);
          Alert.alert(
            "Payment Error",
            "Unable to verify payment status. Please contact support.",
            [
              {
                text: "OK",
                onPress: () => {
                  onFailure?.("Payment verification failed");
                  router.back();
                },
              },
            ],
          );
        } finally {
          setProcessing(false);
        }
      }, 3000); // Wait 3 seconds for backend callback to process
    }
  };

  const handleClose = () => {
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
          onPress: () => {
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
