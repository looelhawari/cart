import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react-native";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
}

export function Toast({
  visible,
  message,
  type = "info",
  duration = 2000,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const icon = {
    success: <CheckCircle size={24} color={Colors.neutralWhite} />,
    error: <AlertCircle size={24} color={Colors.neutralWhite} />,
    info: <Info size={24} color={Colors.neutralWhite} />,
  }[type];

  const backgroundColor = {
    success: Colors.primary700,
    error: Colors.accentRed,
    info: Colors.neutralCharcoal,
  }[type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.overlay, { transform: [{ translateY }], opacity }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={dismissToast}
        style={[styles.toastContainer, { backgroundColor }]}
      >
        {icon}
        <Text style={styles.message}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          {message && <Text style={styles.loadingMessage}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingTop: 50,
    pointerEvents: "box-none",
  },
  toastContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: Spacing.md,
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    gap: Spacing.sm,
    width: "92%",
  },
  message: {
    flex: 1,
    fontSize: Typography.bodyLarge || 16,
    fontFamily: "Poppins_500Medium",
    fontWeight: "600" as const,
    color: Colors.neutralWhite,
    letterSpacing: 0.2,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
    minWidth: 200,
  },
  loadingMessage: {
    fontSize: Typography.bodyBase,
    fontFamily: "Poppins_500Medium",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
});
