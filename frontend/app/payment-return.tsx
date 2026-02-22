/**
 * payment-return.tsx — Deep link handler for Paymob redirect
 *
 * WHY THIS EXISTS:
 * After 3DS, Paymob redirects to `elbaraka://payment-return?...`.
 * The WebView's `onShouldStartLoadWithRequest` intercepts this and starts polling.
 * BUT on Android, the WebView ALSO fires an OS-level intent for the `elbaraka://`
 * custom scheme (registered in app.json). Expo Router receives the deep link and
 * tries to navigate to this route. Without this file, it shows +not-found.tsx.
 *
 * This screen acts as a safety net: it reads the Paymob callback params +
 * pending payment data from AsyncStorage, then navigates to /order-success
 * (with polling) so the user sees the correct result screen.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
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
    pending?: string;
    order?: string;
  }>();

  const handled = useRef(false);

  const handleReturn = useCallback(async () => {
    if (handled.current) return;
    handled.current = true;

    try {
      // Try to read pending payment data saved before redirect
      const raw = await AsyncStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
      const pending = raw ? JSON.parse(raw) : null;

      const orderId =
        pending?.orderId?.toString() ||
        params.merchant_order_id ||
        params.order;
      const paymentId = pending?.paymentAttemptId?.toString() || params.id;

      if (orderId && paymentId) {
        // Navigate to order-success with polling enabled
        router.replace({
          pathname: "/order-success",
          params: {
            orderId,
            paymentId,
            polling: "true",
          },
        });
      } else {
        // No context available — go home
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("[payment-return] Error reading pending payment:", error);
      router.replace("/(tabs)");
    }
  }, [router, params.merchant_order_id, params.order, params.id]);

  useEffect(() => {
    handleReturn();
  }, [handleReturn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary900} />
      <Text style={styles.title}>Processing Payment...</Text>
      <Text style={styles.subtitle}>
        Please wait while we confirm your payment...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
