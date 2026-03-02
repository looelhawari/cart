import React, { useEffect } from "react";
import { View, Text, Modal, StyleSheet, Animated, Easing } from "react-native";
import { CheckCircle, XCircle } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { useTranslation } from "@/i18n";

interface PaymentResultModalProps {
  visible: boolean;
  success: boolean;
  onComplete: () => void;
  duration?: number; // Duration to show modal in ms (default 2000)
}

export default function PaymentResultModal({
  visible,
  success,
  onComplete,
  duration = 2000,
}: PaymentResultModalProps) {
  const { t } = useTranslation();
  const scaleAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              success ? styles.successBg : styles.failureBg,
            ]}
          >
            {success ? (
              <CheckCircle size={64} color={Colors.successGreen} />
            ) : (
              <XCircle size={64} color={Colors.accentRed} />
            )}
          </View>

          <Text style={styles.title}>
            {success ? t.ui.paymentSuccessful : t.ui.paymentFailed}
          </Text>

          <Text style={styles.message}>
            {success ? t.ui.orderConfirmed : t.ui.paymentNotSuccessful}
          </Text>

          {success && (
            <View style={styles.successIndicator}>
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 20,
    padding: Spacing.xl,
    alignItems: "center",
    width: "80%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successBg: {
    backgroundColor: "#E8F5E9",
  },
  failureBg: {
    backgroundColor: "#FFEBEE",
  },
  title: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralGray,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  successIndicator: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.successGreen,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: Colors.neutralWhite,
    fontSize: 20,
    fontWeight: Typography.bold,
  },
});
