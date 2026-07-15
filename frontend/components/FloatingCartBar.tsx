import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import { getCartCount, getCartTotal, formatPrice } from "@/utils/cart";

interface FloatingCartBarProps {
  /**
   * Distance (in px) from the bottom of the screen at which the bar floats,
   * BEFORE the safe-area inset is added. On tab screens pass the tab bar
   * height so the bar clears it; elsewhere leave the default.
   */
  bottomOffset?: number;
  /** Force-hide the bar (e.g. while already on the cart screen). */
  suppressed?: boolean;
}

/**
 * Persistent floating "View Cart" summary (Talabat-style). Reads the cart from
 * the global store via primitive selectors, animates in/out, and navigates to
 * the cart on tap. Renders nothing when the cart is empty.
 */
export default function FloatingCartBar({
  bottomOffset = 0,
  suppressed = false,
}: FloatingCartBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Narrow selectors: the bar re-renders only when the count/total change.
  const count = useStore((s) => getCartCount(s.cart));
  const total = useStore((s) => getCartTotal(s.cart));

  const visible = count > 0 && !suppressed;

  // Keep the bar mounted through its exit animation, then unmount.
  const [rendered, setRendered] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) setRendered(true);
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setRendered(false);
    });
  }, [visible, anim]);

  if (!rendered) return null;

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset + insets.bottom + Spacing.xs,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bar}
        activeOpacity={0.9}
        onPress={() => router.push("/(tabs)/cart")}
        accessibilityRole="button"
        accessibilityLabel={t.cart.viewCart}
      >
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>

        <View style={styles.labelWrap}>
          <Ionicons name="cart" size={18} color={Colors.neutralWhite} />
          <Text style={styles.label}>{t.cart.viewCart}</Text>
        </View>

        <Text style={styles.total} numberOfLines={1}>
          {formatPrice(total)} {t.common.currency}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 50,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900,
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
    // Elevated above the content it floats over.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  countPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
  },
  labelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  label: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
  },
  total: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
  },
});
