import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CheckCircle, AlertCircle } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { pollPaymentStatus } from "@/services/paymentMethodsApi";
import { getOrder } from "@/services/api/orderApi";
import { useStore } from "@/store";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { fetchCart } = useStore();
  const {
    orderId,
    paymentId,
    polling,
    orderNumber,
    deliveryDate,
    deliveryTime,
    promoCode,
    promoDiscount,
  } = useLocalSearchParams<{
    orderId?: string;
    paymentId?: string;
    polling?: string;
    orderNumber?: string;
    deliveryDate?: string;
    deliveryTime?: string;
    promoCode?: string;
    promoDiscount?: string;
  }>();

  const [paymentStatus, setPaymentStatus] = useState<
    "processing" | "confirmed" | "failed"
  >("processing");
  const [isPolling, setIsPolling] = useState(false);
  const [promoInfo, setPromoInfo] = useState<{
    code: string;
    discount: string;
  } | null>(null);

  /**
   * Refetch cart on mount to ensure it's cleared
   */
  useEffect(() => {
    const refetchCart = async () => {
      try {
        await fetchCart();
        console.log("[OrderSuccess] Cart refetched successfully");
      } catch (error) {
        console.error("[OrderSuccess] Failed to refetch cart:", error);
      }
    };

    refetchCart();
  }, []);

  useEffect(() => {
    const fetchPromoFromOrder = async () => {
      if (!orderId || promoCode) return;

      try {
        const response = await getOrder(parseInt(orderId));
        const order = response.data?.order;
        const snapshot = order?.promo_code_snapshot;
        if (snapshot?.promo_code && snapshot?.discount_amount !== undefined) {
          setPromoInfo({
            code: snapshot.promo_code,
            discount: Number(snapshot.discount_amount).toFixed(2),
          });
        }
      } catch (error) {
        console.error("[OrderSuccess] Failed to fetch order promo:", error);
      }
    };

    fetchPromoFromOrder();
  }, [orderId, promoCode]);

  /**
   * Poll payment status for MOTO instant payments
   */
  useEffect(() => {
    if (polling === "true" && paymentId && !isPolling) {
      setIsPolling(true);
      startPolling();
    }
  }, [polling, paymentId]);

  const startPolling = async () => {
    if (!paymentId) return;

    console.log("[OrderSuccess] Starting payment status polling...");
    setPaymentStatus("processing");

    try {
      const result = await pollPaymentStatus(
        parseInt(paymentId),
        (status) => {
          console.log(`[OrderSuccess] Payment status: ${status}`);
        },
        {
          intervalMs: 2000,
          maxAttempts: 30,
        },
      );

      if (result.status === "PAID") {
        console.log("[OrderSuccess] ✅ Payment confirmed!");
        setPaymentStatus("confirmed");
      } else if (result.status === "FAILED") {
        console.log("[OrderSuccess] ❌ Payment failed");
        setPaymentStatus("failed");
      } else {
        console.warn("[OrderSuccess] ⏱️ Payment verification timeout");
        setPaymentStatus("processing");
      }
    } catch (error) {
      console.error("[OrderSuccess] Polling error:", error);
      setPaymentStatus("processing");
    } finally {
      setIsPolling(false);
    }
  };

  const renderStatusMessage = () => {
    if (polling !== "true") {
      // Regular flow (from WebView or COD)
      return (
        <>
          <Text style={styles.title}>Order Placed Successfully!</Text>
          <Text style={styles.subtitle}>
            Thank you for your purchase. Your order has been received and is
            being processed.
          </Text>
          <Text style={styles.paymentNote}>
            If you paid by card, your payment is being confirmed. You can check
            your order status for updates.
          </Text>
        </>
      );
    }

    // MOTO instant payment flow with polling
    if (paymentStatus === "processing") {
      return (
        <>
          <View style={styles.processingIconContainer}>
            <ActivityIndicator size="large" color={Colors.primary900} />
          </View>
          <Text style={styles.title}>Processing Payment...</Text>
          <Text style={styles.subtitle}>
            Please wait while we confirm your payment. This usually takes just a
            few seconds.
          </Text>
        </>
      );
    } else if (paymentStatus === "confirmed") {
      return (
        <>
          <Text style={styles.title}>Payment Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your payment has been successfully processed. Thank you for your
            purchase!
          </Text>
        </>
      );
    } else if (paymentStatus === "failed") {
      return (
        <>
          <View style={styles.iconContainer}>
            <AlertCircle
              size={80}
              color={Colors.error}
              fill={Colors.error + "20"}
            />
          </View>
          <Text style={[styles.title, { color: Colors.error }]}>
            Payment Failed
          </Text>
          <Text style={styles.subtitle}>
            Unfortunately, your payment could not be processed. Please try again
            or contact support.
          </Text>
        </>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {paymentStatus !== "processing" && paymentStatus !== "failed" && (
          <View style={styles.iconContainer}>
            <CheckCircle
              size={80}
              color={Colors.primary900}
              fill={Colors.primary900 + "20"}
            />
          </View>
        )}

        {renderStatusMessage()}

        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>Order Number</Text>
          <Text style={styles.orderNumber}>{orderNumber || "N/A"}</Text>

          {(promoCode && promoDiscount) || promoInfo ? (
            <>
              <Text style={styles.estimatedLabel}>Promo Applied</Text>
              <Text style={styles.promoValue}>
                {promoCode || promoInfo?.code} (-{promoDiscount || promoInfo?.discount} EGP)
              </Text>
            </>
          ) : null}

          {deliveryDate && deliveryTime && (
            <>
              <Text style={styles.estimatedLabel}>Estimated Delivery</Text>
              <Text style={styles.estimatedTime}>
                {new Date(deliveryDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.estimatedTime}>{deliveryTime}</Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {orderId && paymentStatus !== "failed" && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => router.replace(`/orders/${orderId}` as any)}
            >
              <Text style={styles.trackButtonText}>View Order Details</Text>
            </TouchableOpacity>
          )}

          {paymentStatus === "failed" ? (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => router.replace("/checkout/payment")}
            >
              <Text style={styles.trackButtonText}>Try Again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.continueButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  processingIconContainer: {
    marginBottom: Spacing.lg,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  paymentNote: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  orderCard: {
    width: "100%",
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  orderLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
    marginBottom: Spacing.md,
  },
  estimatedLabel: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  estimatedTime: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  promoValue: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  actions: {
    width: "100%",
    gap: Spacing.sm,
  },
  trackButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  trackButtonText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  continueButton: {
    backgroundColor: Colors.neutralLight,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
});
