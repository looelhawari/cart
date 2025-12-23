import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, orderNumber, deliveryDate, deliveryTime } =
    useLocalSearchParams<{
      orderId?: string;
      orderNumber?: string;
      deliveryDate?: string;
      deliveryTime?: string;
    }>();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle
            size={80}
            color={Colors.primary900}
            fill={Colors.primary900 + "20"}
          />
        </View>

        <Text style={styles.title}>Order Placed Successfully!</Text>
        <Text style={styles.subtitle}>
          Thank you for your purchase. Your order has been received and is being
          processed.
        </Text>

        <View style={styles.orderCard}>
          <Text style={styles.orderLabel}>Order Number</Text>
          <Text style={styles.orderNumber}>{orderNumber || "N/A"}</Text>

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
          {orderId && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => router.replace(`/orders/${orderId}` as any)}
            >
              <Text style={styles.trackButtonText}>View Order Details</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
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
    marginBottom: Spacing.xl,
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
