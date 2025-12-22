import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Grid,
  List,
  ShoppingCart,
  Trash2,
  Heart,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/store";
import { products } from "@/data/products";

export default function FavoritesScreen() {
  const { favorites, toggleFavorite, addToCart } = useStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const favoriteProducts = products.filter((p) => favorites.includes(p.id));

  const handleAddAllToCart = async () => {
    if (favoriteProducts.length === 0) return;

    try {
      for (const product of favoriteProducts) {
        await addToCart(Number(product.id), 1);
      }

      Alert.alert(
        "Added to Cart",
        `${favoriteProducts.length} items added to cart`,
        [
          { text: "View Cart", onPress: () => router.push("/(tabs)/cart") },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.error("Failed to add items to cart:", error);
      Alert.alert("Error", "Failed to add some items to cart");
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear Favorites",
      "Are you sure you want to remove all items from favorites?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            favoriteProducts.forEach((product) => toggleFavorite(product.id));
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Heart size={80} color={Colors.neutralGray} />
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptyText}>
        Start adding products to your favorites{"\n"}for quick access
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.9}
      >
        <Text style={styles.emptyButtonText}>Browse Products</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Favorites</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            activeOpacity={0.7}
          >
            {viewMode === "grid" ? (
              <List size={20} color={Colors.neutralCharcoal} />
            ) : (
              <Grid size={20} color={Colors.neutralCharcoal} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {favoriteProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddAllToCart}
              activeOpacity={0.9}
            >
              <ShoppingCart size={18} color={Colors.neutralWhite} />
              <Text style={styles.actionButtonText}>Add All to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.9}
            >
              <Trash2 size={18} color={Colors.accentRed} />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Products Count */}
            <Text style={styles.countText}>
              {favoriteProducts.length}{" "}
              {favoriteProducts.length === 1 ? "item" : "items"}
            </Text>

            {/* Products Grid/List */}
            <View
              style={
                viewMode === "grid" ? styles.productsGrid : styles.productsList
              }
            >
              {favoriteProducts.map((product) => (
                <View
                  key={product.id}
                  style={
                    viewMode === "grid" ? styles.gridItem : styles.listItem
                  }
                >
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  viewButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accentRed,
  },
  clearButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.accentRed,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  countText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginBottom: Spacing.md,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  gridItem: {
    width: (Dimensions.get("window").width - Spacing.lg * 2 - Spacing.md) / 2,
  },
  productsList: {
    gap: Spacing.md,
  },
  listItem: {
    width: "100%",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
