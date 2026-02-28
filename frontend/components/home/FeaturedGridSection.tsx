import React, { memo, useCallback } from "react";
import { View, FlatList, StyleSheet, Dimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { SectionHeader } from "./SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { useTranslation } from "@/i18n";
import type { Product } from "@/types";

const { width } = Dimensions.get("window");
const COLUMN_GAP = 10;
const CARD_WIDTH = (width - 44) / 2; // 12px padding each side + 10 gap / 2

interface FeaturedGridSectionProps {
  products: Product[];
  /** Max number of products to show. Default 6 */
  maxItems?: number;
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
}

const keyExtractor = (item: Product) =>
  item.barcode?.toString() || item.id?.toString() || "";

export const FeaturedGridSection = memo(function FeaturedGridSection({
  products,
  maxItems = 6,
  onAddToCart,
}: FeaturedGridSectionProps) {
  const { t } = useTranslation();

  const handleViewAll = useCallback(
    () => router.push("/(tabs)/categories"),
    [],
  );

  const displayed = products.slice(0, maxItems);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.card}>
        <ProductCard
          product={item}
          onPress={() => router.push(`/product/${item.barcode}`)}
          onAddToCart={onAddToCart}
        />
      </View>
    ),
    [onAddToCart],
  );

  if (displayed.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t.products?.featured || "Featured Products"}
        actionLabel={t.common?.seeAll || "See All"}
        onActionPress={handleViewAll}
        leftIcon={
          <View style={styles.crownIcon}>
            <Ionicons name="trophy" size={13} color={Colors.accentYellow} />
          </View>
        }
      />
      <FlatList
        data={displayed}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        removeClippedSubviews
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  crownIcon: {
    marginRight: 3,
  },
  grid: {
    paddingHorizontal: 12,
  },
  row: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
});
