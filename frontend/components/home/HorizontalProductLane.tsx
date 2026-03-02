import React, { memo, useCallback } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types";

const CARD_WIDTH = 160;

interface HorizontalProductLaneProps {
  products: Product[];
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
}

const keyExtractor = (item: Product) =>
  item.barcode?.toString() || item.id?.toString() || "";

export const HorizontalProductLane = memo(function HorizontalProductLane({
  products,
  onAddToCart,
}: HorizontalProductLaneProps) {
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

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
      // Performance optimizations
      removeClippedSubviews
      initialNumToRender={4}
      maxToRenderPerBatch={6}
      windowSize={5}
      getItemLayout={(_data, index) => ({
        length: CARD_WIDTH + 10,
        offset: (CARD_WIDTH + 10) * index + 14, // 14 = left padding
        index,
      })}
    />
  );
});

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  card: {
    width: CARD_WIDTH,
  },
});
