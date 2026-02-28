import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react-native";

import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import {
  getPendingPayment,
  clearPendingPayment,
} from "@/services/payment/paymentRecovery";
import { getPaymentStatus } from "@/services/paymentMethodsApi";
import { useStore } from "@/store";
import { mapPaymentError } from "@/services/payment/paymentMessages";
import { useTranslation } from "@/i18n";

/**
 * Payment Recovery Screen
 *
 * Handles app resume scenarios:
 * - User killed app mid-payment
 * - User switched apps during payment
 * - Cold start after payment redirect
 *
 * This is CRITICAL for enterprise checkout flow
 */
export default function PaymentRecoveryScreen() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<
    "checking" | "success" | "failed" | "pending"
  >("checking");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { fetchCart } = useStore();

  useEffect(() => {
    checkPendingPayment();
  }, []);

  const checkPendingPayment = async () => {
    try {
      setChecking(true);

      // Get pending payment from storage
      const pendingPayment = await getPendingPayment();

      if (!pendingPayment) {
        // No pending payment - redirect to home
        router.replace("/");
        return;
      }

      const {
        orderId,
        orderNumber: orderNum,
        paymentAttemptId,
      } = pendingPayment;
      setOrderNumber(orderNum);

      // Poll payment status from backend using paymentId (preferred) or orderId
      const pollId = paymentAttemptId || orderId;
      await pollPaymentStatus(pollId, orderId, orderNum);
    } catch (error: any) {
      console.error("Payment recovery error:", error);
      setStatus("failed");
      setErrorMessage(error.message || t.paymentFlow.unableToVerify);
    } finally {
      setChecking(false);
    }
  };

  const pollPaymentStatus = async (
    pollId: number,
    orderId: number,
    orderNum: string,
    attempts: number = 0,
  ) => {
    const MAX_ATTEMPTS = 5;

    try {
      // Get payment status by paymentId
      const statusResponse = await getPaymentStatus(pollId);

      if (statusResponse.success && statusResponse.data) {
        const paymentStatus = statusResponse.data.status;

        if (paymentStatus === "PAID") {
          // Payment successful
          setStatus("success");
          await clearPendingPayment();
          await fetchCart(); // Refresh cart (should be empty now)

          // Navigate to success after brief delay
          setTimeout(() => {
            router.replace({
              pathname: "/order-success",
              params: { orderId: orderId.toString(), orderNumber: orderNum },
            });
          }, 2000);
          return;
        }

        if (paymentStatus === "FAILED") {
          // Payment failed - use a generic failure message for mapPaymentError
          // (checkStatus does not return the Paymob error detail)
          const errorMsg = mapPaymentError("Payment failed", t.paymentErrors);
          setStatus("failed");
          setErrorMessage(errorMsg.message);
          await clearPendingPayment();
          return;
        }

        // Still pending - retry if under max attempts
        if (paymentStatus === "PENDING" && attempts < MAX_ATTEMPTS) {
          setStatus("pending");
          setTimeout(() => {
            pollPaymentStatus(pollId, orderId, orderNum, attempts + 1);
          }, 2000); // Poll every 2 seconds
          return;
        }

        // Max attempts reached - show pending state
        setStatus("pending");
      } else {
        throw new Error(t.paymentFlow.unableToVerify);
      }
    } catch (error: any) {
      if (attempts < MAX_ATTEMPTS) {
        // Retry on error
        setTimeout(() => {
          pollPaymentStatus(pollId, orderId, orderNum, attempts + 1);
        }, 2000);
      } else {
        setStatus("failed");
        setErrorMessage(t.paymentFlow.unableToVerify);
      }
    }
  };

  const handleRetryPayment = async () => {
    const pendingPayment = await getPendingPayment();
    if (!pendingPayment) {
      router.replace("/");
      return;
    }

    // Navigate back to order summary to retry
    router.replace({
      pathname: "/checkout/confirmation",
      params: {
        orderId: pendingPayment.orderId.toString(),
        retry: "true",
      },
    });
  };

  const handleViewOrder = async () => {
    const pendingPayment = await getPendingPayment();
    if (pendingPayment) {
      await clearPendingPayment();
      router.replace({
        pathname: `/orders/${pendingPayment.orderId}`,
      });
    } else {
      router.replace("/orders");
    }
  };

  const handleGoHome = async () => {
    await clearPendingPayment();
    router.replace("/");
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.title}>{t.paymentFlow.checkingStatus}</Text>
          <Text style={styles.subtitle}>{t.paymentFlow.pleaseWait}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "success") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <CheckCircle size={80} color={Colors.primary900} />
          <Text style={styles.title}>{t.paymentFlow.paymentSuccessful}</Text>
          <Text style={styles.subtitle}>
            {t.paymentFlow.orderConfirmed} #{orderNumber}
          </Text>
          <Text style={styles.infoText}>{t.paymentFlow.redirecting}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "failed") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <XCircle size={80} color={Colors.accentRed} />
          <Text style={styles.title}>{t.paymentFlow.paymentFailed}</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Text style={styles.reassurance}>
            {t.paymentFlow.noMoneyDeducted}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRetryPayment}
            >
              <RefreshCw size={20} color={Colors.neutralWhite} />
              <Text style={styles.primaryButtonText}>
                {t.paymentFlow.retryPayment}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewOrder}
            >
              <Text style={styles.secondaryButtonText}>
                {t.paymentFlow.viewOrder}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleGoHome}>
              <Text style={styles.linkText}>{t.paymentFlow.goToHome}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (status === "pending") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.title}>{t.paymentFlow.paymentPending}</Text>
          <Text style={styles.subtitle}>
            {t.paymentFlow.paymentBeingProcessed}
          </Text>
          <Text style={styles.infoText}>{t.paymentFlow.canTakeFewMinutes}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={checkPendingPayment}
            >
              <RefreshCw size={20} color={Colors.neutralWhite} />
              <Text style={styles.primaryButtonText}>
                {t.paymentFlow.checkAgain}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewOrder}
            >
              <Text style={styles.secondaryButtonText}>
                {t.paymentFlow.viewOrder}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.neutralMedium,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
    textAlign: "center",
    lineHeight: 24,
  },
  infoText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginTop: Spacing.md,
    textAlign: "center",
    lineHeight: 22,
  },
  reassurance: {
    fontSize: Typography.bodyBase,
    color: Colors.primary900,
    marginTop: Spacing.md,
    textAlign: "center",
    fontWeight: Typography.semibold,
  },
  actions: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
  },
  secondaryButton: {
    backgroundColor: Colors.neutralLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.neutralCharcoal,
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
  },
  linkText: {
    color: Colors.primary900,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
