/**
 * payment-return.tsx — Deep Link Safety Net
 *
 * This screen handles the `elbaraka://payment-return` deep link that fires
 * when the OS intercepts the custom scheme URL from the Paymob redirect page.
 *
 * On Android, even though payment-webview.tsx intercepts the deep link via
 * onShouldStartLoadWithRequest, the OS may also fire an intent for the
 * `elbaraka://` scheme — which Expo Router receives as a navigation event.
 * Without this file, that navigation hits +not-found.tsx.
 *
 * This handler reads the pending payment data from AsyncStorage and navigates
 * to order-success with polling enabled, or falls back to home.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import { PENDING_PAYMENT_ORDER_KEY } from "@/services/payment/paymentRecovery";

export default function PaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    success?: string;
    id?: string;
    merchant_order_id?: string;
  }>();
  const handled = useRef(false);

  const handleReturn = useCallback(async () => {
    if (handled.current) return;
    handled.current = true;

    try {
      // Try to read pending payment data saved before WebView was opened
      const raw = await AsyncStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
      const pending = raw ? JSON.parse(raw) : null;

      const orderId = params.merchant_order_id || pending?.orderId?.toString();
      const paymentId = params.id || pending?.paymentAttemptId?.toString();

      if (orderId || paymentId) {
        // Navigate to order-success with polling so it can verify payment status
        router.replace({
          pathname: "/order-success",
          params: {
            orderId: orderId || "",
            paymentId: paymentId || "",
            polling: "true",
          },
        });
      } else {
        // No payment context available — go home
        console.warn(
          "[PaymentReturn] No pending payment data found, going home",
        );
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("[PaymentReturn] Error handling return:", error);
      router.replace("/(tabs)");
    }
  }, [params, router]);

  useEffect(() => {
    handleReturn();
  }, [handleReturn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary900} />
      <Text style={styles.text}>Processing payment...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutralCharcoal,
  },
});
