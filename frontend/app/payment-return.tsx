/**
 * payment-return.tsx — Deep Link Safety Net
 *
 * This screen handles the `cart://payment-return` deep link that fires
 * when the OS intercepts the custom scheme URL from the Paymob redirect page.
 *
 * On Android, even though payment-webview.tsx intercepts the deep link via
 * onShouldStartLoadWithRequest, the OS may also fire an intent for the
 * `cart://` scheme — which Expo Router receives as a navigation event.
 * Without this file, that navigation hits +not-found.tsx.
 *
 * This handler reads the pending payment data from AsyncStorage and navigates
 * to order-success with polling enabled, or falls back to home.
 */

import React, { useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "@/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import {
  PENDING_PAYMENT_ORDER_KEY,
  isActivePaymentFlow,
} from "@/services/payment/paymentRecovery";

export default function PaymentReturnScreen() {
  const { t } = useTranslation();
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
      // If the WebView (payment-webview) is already handling this redirect,
      // just go back and let it finish polling. This prevents a dual-polling
      // race condition where both screens poll simultaneously with different IDs.
      const isActive = await isActivePaymentFlow();
      if (isActive && router.canGoBack()) {
        console.log(
          "[PaymentReturn] WebView is already handling payment — going back",
        );
        router.back();
        return;
      }

      // Fallback: app was opened fresh from a deep link (WebView gone).
      // Read pending payment data and navigate to order-success with polling.
      const raw = await AsyncStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
      const pending = raw ? JSON.parse(raw) : null;

      const orderId = params.merchant_order_id || pending?.orderId?.toString();
      const paymentId = pending?.paymentAttemptId?.toString() || params.id;

      if (orderId || paymentId) {
        router.replace({
          pathname: "/order-success",
          params: {
            orderId: orderId || "",
            paymentId: paymentId || "",
            polling: "true",
          },
        });
      } else {
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
      <Text style={styles.text}>{t.paymentFlow.processingPayment}</Text>
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
