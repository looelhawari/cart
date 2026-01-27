import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
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
  HeartOff,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/store";
import {
  listFavorites,
  removeFavorite,
  FavoriteItem,
} from "@/services/api/favoritesApi";
import {
  fetchActiveOffersCached,
  getProductOfferPricing,
} from "@/utils/offerPricing";
import type { Offer } from "@/services/api/types";
import { useTranslation } from "@/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FavoritesScreen() {
  const { addToCart, user } = useStore();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Load favorites from API
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await listFavorites(100);
      if (response.success && response.data?.favorites) {
        setFavoriteItems(response.data.favorites);
      } else {
        setFavoriteItems([]);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavoriteItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get products from favorites
  const favoriteProducts = favoriteItems
    .map((fav) => fav.product)
    .filter((p) => p != null);

  useEffect(() => {
    loadFavorites();
    fetchActiveOffersCached()
      .then(setActiveOffers)
      .catch((error) => {
        console.error("Failed to load active offers:", error);
        setActiveOffers([]);
      });
  }, [loadFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  }, [loadFavorites]);

  const handleRemoveFavorite = async (productId: number) => {
    try {
      await removeFavorite(productId);
      setFavoriteItems((prev) =>
        prev.filter(
          (fav) =>
            fav.product?.id !== productId && fav.product?.barcode !== productId,
        ),
      );
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    }
  };

  const handleAddAllToCart = async () => {
    if (favoriteProducts.length === 0) return;

    try {
      setActionLoading(true);
      for (const product of favoriteProducts) {
        const productId = product.barcode || product.id;
        if (!productId) continue;
        await addToCart(Number(productId), 1);
      }

      Alert.alert(
        t.favorites.addedToCart,
        `${favoriteProducts.length} ${t.favorites.itemsAddedToCart}`,
        [
          { text: t.cart.continueShopping, style: "cancel" },
          {
            text: t.orders.viewCart,
            onPress: () => router.push("/(tabs)/cart"),
          },
        ],
      );
    } catch (error) {
      console.error("Failed to add items to cart:", error);
      Alert.alert(t.common.error, t.favorites.failedToAddToCart);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      t.favorites.clearAllFavorites,
      `${t.favorites.removeAll} ${favoriteProducts.length} ${t.favorites.itemsFromFavorites}`,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.favorites.clearAll,
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              for (const product of favoriteProducts) {
                const productId = product.barcode || product.id;
                if (productId) {
                  await removeFavorite(Number(productId));
                }
              }
              setFavoriteItems([]);
            } catch (error) {
              console.error("Failed to clear favorites:", error);
              Alert.alert(t.common.error, t.favorites.failedToClear);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <HeartOff size={60} color={Colors.neutralGray} />
      </View>
      <Text style={styles.emptyTitle}>{t.favorites.noFavoritesYet}</Text>
      <Text style={styles.emptyText}>{t.favorites.tapHeartIcon}</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push("/(tabs)")}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>
          {t.favorites.discoverProducts}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Not logged in state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.profile.myFavorites}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Heart size={60} color={Colors.neutralGray} />
          </View>
          <Text style={styles.emptyTitle}>{t.favorites.loginRequired}</Text>
          <Text style={styles.emptyText}>{t.favorites.pleaseLoginToView}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>{t.auth.login}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.profile.myFavorites}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>{t.favorites.loadingFavorites}</Text>
        </View>
      </SafeAreaView>
    );
  }

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

        <Text style={styles.headerTitle}>{t.profile.myFavorites}</Text>

        <View style={styles.headerRight}>
          {favoriteProducts.length > 0 && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              activeOpacity={0.7}
            >
              {viewMode === "grid" ? (
                <List size={22} color={Colors.neutralCharcoal} />
              ) : (
                <Grid size={22} color={Colors.neutralCharcoal} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {favoriteProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statsLeft}>
              <Heart size={16} color={Colors.primary900} />
              <Text style={styles.statsText}>
                {favoriteProducts.length}{" "}
                {favoriteProducts.length === 1
                  ? t.favorites.itemSaved
                  : t.favorites.itemsSaved}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddAllToCart}
              activeOpacity={0.8}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={Colors.neutralWhite} />
              ) : (
                <>
                  <ShoppingCart size={18} color={Colors.neutralWhite} />
                  <Text style={styles.actionButtonText}>
                    {t.favorites.addAllToCart}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.8}
              disabled={actionLoading}
            >
              <Trash2 size={16} color={Colors.accentRed} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary900]}
                tintColor={Colors.primary900}
              />
            }
          >
            {/* Products Grid/List */}
            <View
              style={
                viewMode === "grid" ? styles.productsGrid : styles.productsList
              }
            >
              {favoriteProducts.map((product) => (
                <View
                  key={product.barcode || product.id}
                  style={
                    viewMode === "grid" ? styles.gridItem : styles.listItem
                  }
                >
                  <ProductCard
                    product={product}
                    offerPricing={getProductOfferPricing(product, activeOffers)}
                    onPress={() =>
                      router.push(`/product/${product.barcode || product.id}`)
                    }
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginTop: Spacing.sm,
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
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  viewButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary100,
  },
  statsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statsText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.primary900,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    minHeight: 44,
  },
  actionButtonText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.accentRed,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: Spacing.md,
    columnGap: Spacing.sm,
  },
  gridItem: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
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
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
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
