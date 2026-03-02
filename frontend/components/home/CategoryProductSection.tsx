import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { SectionHeader } from "./SectionHeader";
import { HorizontalProductLane } from "./HorizontalProductLane";
import { useTranslation, useLocalizedValue } from "@/i18n";
import type { CategoryWithProducts } from "@/services/api/categoryApi";

interface CategoryProductSectionProps {
  category: CategoryWithProducts;
  /** Show "Popular" badge on first section */
  isFirst?: boolean;
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
}

export const CategoryProductSection = memo(function CategoryProductSection({
  category,
  isFirst,
  onAddToCart,
}: CategoryProductSectionProps) {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();

  const handleViewAll = useCallback(
    () => router.push(`/categories/${category.id}` as any),
    [category.id],
  );

  if (!category.products || category.products.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={getName(category)}
        actionLabel={`${category.products_count ?? category.products.length} ${t.common?.items || "items"}`}
        onActionPress={handleViewAll}
        badge={
          isFirst ? (
            <View style={styles.popularBadge}>
              <Ionicons name="star" size={9} color={Colors.neutralWhite} />
              <Text style={styles.popularText}>{t.ui.popular}</Text>
            </View>
          ) : undefined
        }
      />
      <HorizontalProductLane
        products={category.products}
        onAddToCart={onAddToCart}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    gap: 3,
  },
  popularText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
});
