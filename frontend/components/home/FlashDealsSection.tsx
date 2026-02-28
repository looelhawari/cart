import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Clock } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { SectionHeader } from "./SectionHeader";
import { HorizontalProductLane } from "./HorizontalProductLane";
import { useTranslation } from "@/i18n";
import type { Product } from "@/types";

interface FlashDealsSectionProps {
  products: Product[];
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
}

export const FlashDealsSection = memo(function FlashDealsSection({
  products,
  onAddToCart,
}: FlashDealsSectionProps) {
  const { t } = useTranslation();

  const handleViewAll = useCallback(
    () => router.push("/(tabs)/offers"),
    [],
  );

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t.products?.flashDeals || "Flash Deals"}
        actionLabel={t.common?.viewAll || "View All"}
        onActionPress={handleViewAll}
        leftIcon={
          <View style={styles.flashIcon}>
            <Ionicons name="flash" size={14} color={Colors.neutralWhite} />
          </View>
        }
        badge={
          <View style={styles.timerBadge}>
            <Clock size={11} color={Colors.accentRed} />
            <Text style={styles.timerText}>{t.ui?.endsSoon || "Ends Soon"}</Text>
          </View>
        }
      />
      <HorizontalProductLane products={products} onAddToCart={onAddToCart} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  flashIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accentOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentRed + "14",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9,
    gap: 3,
  },
  timerText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: Colors.accentRed,
  },
});
