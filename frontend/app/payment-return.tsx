/**
 * PaymentReturn Screen — Deep Link Handler
 *
 * This screen handles the Paymob deep link redirect:
 *   elbaraka://payment-return?success=true&id=...
 *
 * WHY THIS EXISTS:
 * When Paymob redirects to `elbaraka://payment-return` after payment,
 * the Android OS resolves the custom scheme as an intent/deep link.
 * Expo Router then navigates to this route. Without this file,
 * the +not-found screen ("This screen doesn't exist") would show.
 *
 * FLOW:
 * 1. Paymob redirects to elbaraka://payment-return
 * 2. Android intent fires → Expo Router navigates here
 * 3. We read pending payment from AsyncStorage
 * 4. Poll backend for payment status
 * 5. Show PaymentResultModal (success/failure)
 * 6. Navigate to order-success or back
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/Colors";
import PaymentResultModal from "@/components/PaymentResultModal";
import { pollPaymentStatus } from "@/services/paymentMethodsApi";
import {
  getPendingPayment,
  clearPendingPayment,
} from "@/services/payment/paymentRecovery";

export default function PaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    success?: string;
    id?: string;
    pending?: string;
    // Paymob may append additional query params
  }>();

  const [isVerifying, setIsVerifying] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const isMounted = useRef(true);
  const pollingStarted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const verifyPayment = useCallback(async () => {
    if (pollingStarted.current) return;
    pollingStarted.current = true;

    try {
      // Read pending payment data from AsyncStorage
      const pendingPayment = await getPendingPayment();

      if (!pendingPayment || !pendingPayment.paymentAttemptId) {
        console.warn("[PaymentReturn] No pending payment found in storage");

        // Check Paymob's query params as fallback
        if (params.success === "true") {
          setPaymentSuccess(true);
          setShowResultModal(true);
          setIsVerifying(false);
          return;
        }
        if (params.success === "false") {
          setPaymentSuccess(false);
          setShowResultModal(true);
          setIsVerifying(false);
          return;
        }

        // No info at all — go home
        Alert.alert(
          "Payment Status",
          "We couldn't determine your payment status. Please check your orders.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
        );
        setIsVerifying(false);
        return;
      }

      const { paymentAttemptId: paymentId, orderId } = pendingPayment;

      console.log(
        `[PaymentReturn] Verifying payment #${paymentId} for order #${orderId}...`,
      );

      // Small delay to let the backend webhook process
      await new Promise((r) => setTimeout(r, 2000));

      if (!isMounted.current) return;

      const result = await pollPaymentStatus(
        paymentId,
        (status) => {
          if (!isMounted.current) return;
          console.log(`[PaymentReturn] Payment status: ${status}`);
        },
        {
          intervalMs: 2000,
          maxAttempts: 15, // 30 seconds total
        },
      );

      if (!isMounted.current) return;

      if (result.status === "PAID") {
        console.log("[PaymentReturn] ✅ Payment successful!");
        setPaymentSuccess(true);
        setShowResultModal(true);
      } else if (result.status === "FAILED") {
        console.log("[PaymentReturn] ❌ Payment failed");
        setPaymentSuccess(false);
        setShowResultModal(true);
      } else {
        // Still PENDING after polling — webhook might be delayed
        console.warn("[PaymentReturn] ⏱️ Payment verification timeout");
        Alert.alert(
          "Payment Verification",
          "We are still processing your payment. You will receive a notification when it's confirmed. Please check your orders.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
        );
      }
    } catch (error) {
      if (!isMounted.current) return;
      console.error("[PaymentReturn] Verification error:", error);
      Alert.alert(
        "Error",
        "Failed to verify payment status. Please check your orders.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/orders") }],
      );
    } finally {
      if (isMounted.current) setIsVerifying(false);
    }
  }, [params.success, router]);

  // Start verification on mount
  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  const handleModalComplete = useCallback(async () => {
    setShowResultModal(false);

    // Read pending payment for orderId
    const pendingPayment = await getPendingPayment();
    const orderId = pendingPayment?.orderId;

    // Clear the pending payment data
    await clearPendingPayment();

    if (paymentSuccess && orderId) {
      router.replace({
        pathname: "/order-success",
        params: {
          orderId: orderId.toString(),
        },
      });
    } else if (paymentSuccess) {
      router.replace("/(tabs)/orders");
    } else {
      // Payment failed — go back to checkout or orders
      router.replace("/(tabs)");
    }
  }, [paymentSuccess, router]);

  return (
    <View style={styles.container}>
      <PaymentResultModal
        visible={showResultModal}
        success={paymentSuccess}
        onComplete={handleModalComplete}
        duration={2000}
      />

      {isVerifying && (
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.verifyingTitle}>Verifying Payment</Text>
          <Text style={styles.verifyingText}>
            Please wait while we confirm your payment...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  verifyingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  verifyingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
