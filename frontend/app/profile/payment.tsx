import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  CheckCircle,
  Info,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

export default function PaymentMethodsScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t.payment.title,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: -8 }}
            >
              <ArrowLeft size={24} color={Colors.neutralCharcoal} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Info size={20} color={Colors.primary900} />
              <Text style={styles.infoText}>{t.payment.securelyProcessed}</Text>
            </View>

            {/* Available Payment Methods */}
            <Text style={styles.sectionTitle}>
              {t.payment.availablePaymentMethods}
            </Text>

            {/* Card Payment */}
            <View style={styles.methodCard}>
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${Colors.primary900}15` },
                  ]}
                >
                  <CreditCard size={28} color={Colors.primary900} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodType}>{t.payment.cardPayment}</Text>
                  <Text style={styles.methodDescription}>
                    {t.payment.cardsAccepted}
                  </Text>
                  <View style={styles.secureRow}>
                    <CheckCircle size={14} color={Colors.success} />
                    <Text style={styles.secureText}>
                      Secure payment via Paymob
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mobile Wallet */}
            <View style={styles.methodCard}>
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${Colors.accentOrange}15` },
                  ]}
                >
                  <Wallet size={28} color={Colors.accentOrange} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodType}>
                    {t.payment.mobileWallet}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {t.payment.mobilleWalletsAccepted}
                  </Text>
                  <View style={styles.secureRow}>
                    <CheckCircle size={14} color={Colors.success} />
                    <Text style={styles.secureText}>Fast & convenient</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>💳 How it works</Text>
              <Text style={styles.noteText}>
                • Select your payment method during checkout{"\n"}• Complete
                payment securely through Paymob{"\n"}• Your payment info is
                never stored on our servers{"\n"}• All transactions are
                encrypted and PCI-compliant
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  content: {
    padding: Spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${Colors.primary900}10`,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.primary900}20`,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  methodCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  methodLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodType: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: Spacing.sm,
  },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureText: {
    fontSize: Typography.bodySmall,
    color: Colors.success,
    fontWeight: Typography.medium,
  },
  noteContainer: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  noteTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  noteText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    lineHeight: 22,
  },
});
