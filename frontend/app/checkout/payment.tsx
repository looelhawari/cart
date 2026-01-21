import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CreditCard, Banknote, Check } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addressId = params.addressId as string;

  const [paymentType, setPaymentType] = useState<"card" | "cod">("cod");

  const handleContinue = () => {
    router.push({
      pathname: "/checkout/confirmation",
      params: {
        addressId,
        paymentType,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={router.back}>
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Method</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Check size={18} color={Colors.neutralWhite} />
          </View>
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Text style={styles.progressText}>2</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressDot}>
            <Text style={styles.progressTextInactive}>3</Text>
          </View>
        </View>

        {/* Payment Types */}
        <View style={styles.paymentTypes}>
          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "card" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("card")}
          >
            <CreditCard size={24} color={Colors.primary900} />
            <Text style={styles.paymentTypeText}>Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeCard,
              paymentType === "cod" && styles.paymentTypeCardActive,
            ]}
            onPress={() => setPaymentType("cod")}
          >
            <Banknote size={24} color={Colors.primary900} />
            <Text style={styles.paymentTypeText}>Cash</Text>
          </TouchableOpacity>
        </View>

        {/* Card Payment Description */}
        {paymentType === "card" && (
          <View style={styles.paymentDescription}>
            <CreditCard size={48} color={Colors.primary900} />
            <Text style={styles.descriptionTitle}>Secure Card Payment</Text>
            <Text style={styles.descriptionText}>
              You will be redirected to our secure payment gateway to enter your
              card details.
            </Text>
          </View>
        )}

        {/* COD */}
        {paymentType === "cod" && (
          <View style={styles.codInfo}>
            <Banknote size={48} color={Colors.primary900} />
            <Text style={styles.codTitle}>Cash on Delivery</Text>
            <Text style={styles.codDescription}>
              Pay when your order arrives.
            </Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    backgroundColor: Colors.neutralWhite,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },

  progressBar: {
    flexDirection: "row",
    justifyContent: "center",
    padding: Spacing.lg,
  },

  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },

  progressDotActive: {
    backgroundColor: Colors.primary900,
  },

  progressText: {
    color: Colors.neutralWhite,
    fontWeight: "bold",
  },

  progressTextInactive: {
    color: Colors.neutralMedium,
  },

  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neutralGray,
  },

  progressLineActive: {
    backgroundColor: Colors.primary900,
  },

  paymentTypes: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  paymentTypeCard: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: "center",
  },

  paymentTypeCardActive: {
    borderWidth: 2,
    borderColor: Colors.primary900,
  },

  paymentTypeText: {
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },

  paymentDescription: {
    backgroundColor: Colors.neutralWhite,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },

  descriptionTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    color: Colors.neutralCharcoal,
  },

  descriptionText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 22,
  },

  codInfo: {
    backgroundColor: Colors.neutralWhite,
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: 16,
    alignItems: "center",
  },

  codTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    marginTop: Spacing.sm,
    color: Colors.neutralCharcoal,
  },

  codDescription: {
    color: Colors.neutralMedium,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
  },

  continueButton: {
    backgroundColor: Colors.primary900,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },

  continueText: {
    color: Colors.neutralWhite,
    fontWeight: "bold",
  },
});
