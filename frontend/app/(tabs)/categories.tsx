import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, ShoppingCart } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { getCategories } from "@/services/api/categoryApi";
import type { Category } from "@/types";
import { useStore } from "@/store";
import {
  getCachedImage,
  preloadImages,
  initImageCache,
} from "@/services/cache/imageCache";
import OfflineIndicator from "@/components/OfflineIndicator";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 3) / 2;

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedImages, setCachedImages] = useState<Map<number, string>>(
    new Map(),
  );
  const { cart } = useStore();
  const cartItemsCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  useEffect(() => {
    initImageCache();
    loadCategories();
  }, []);

  const loadCategories = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await getCategories(!forceRefresh); // useCache = !forceRefresh
      console.log(
        "✅ Categories response:",
        JSON.stringify(response).substring(0, 200),
      );
      if (response.success) {
        console.log(
          "✅ Total categories from API:",
          response.data.categories.length,
        );

        // Filter only root categories (parent_id is null) and sort by sort_order
        const rootCategories = response.data.categories
          .filter((cat: Category) => {
            const isRoot = !cat.parent_id;
            console.log(
              `Category ${cat.id} "${cat.name_en}" - parent_id: ${cat.parent_id}, isRoot: ${isRoot}`,
            );
            return isRoot;
          })
          .sort(
            (a: Category, b: Category) =>
              (a.sort_order || 0) - (b.sort_order || 0),
          );

        console.log(
          "✅ Setting",
          rootCategories.length,
          "categories with products",
        );
        setCategories(rootCategories);

        // Preload and cache all category images
        const imageUrls = rootCategories
          .map((cat: Category) => cat.image)
          .filter(Boolean) as string[];

        preloadImages(imageUrls).then(() => {
          // Get cached URIs for all images
          const imageCache = new Map<number, string>();
          Promise.all(
            rootCategories.map(async (cat: Category) => {
              if (cat.image) {
                const cachedUri = await getCachedImage(cat.image);
                if (cachedUri) {
                  imageCache.set(cat.id, cachedUri);
                }
              }
            }),
          ).then(() => {
            setCachedImages(imageCache);
          });
        });
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert(
        "Connection Error",
        "Unable to load categories. Please make sure you're connected to the internet and the server is running.",
        [{ text: "Retry", onPress: loadCategories }, { text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories(true); // Force refresh from server, bypass cache
    setRefreshing(false);
  };

  const renderCategoryCard = ({ item }: { item: Category }) => {
    const defaultImage =
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
    const imageUri = cachedImages.get(item.id) || item.image || defaultImage;

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => router.push(`/categories/${item.id}` as any)}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{ uri: imageUri }}
          style={styles.cardBackground}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
            style={styles.gradient}
          >
            {item.icon && <Text style={styles.iconText}>{item.icon}</Text>}
            <Text style={styles.categoryName} numberOfLines={2}>
              {item.name_en}
            </Text>
            {item.products_count !== undefined && item.products_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.products_count}</Text>
              </View>
            )}
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>Explore All Categories</Text>
      <Text style={styles.sectionSubtitle}>
        Browse {categories.length} categories
      </Text>
    </View>
  );

  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <OfflineIndicator />
        <ActivityIndicator size="large" color={Colors.primary900} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/search")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Search size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/(tabs)/cart")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ShoppingCart size={24} color={Colors.neutralCharcoal} />
            {cartItemsCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemsCount > 99 ? "99+" : cartItemsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2-Column Grid - Premium Design */}
      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary900}
            colors={[Colors.primary900]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralSnow,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  headerIcon: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  cartBadgeText: {
    color: Colors.neutralWhite,
    fontSize: 10,
    fontWeight: "700",
  },
  listHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.neutralMedium,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    backgroundColor: Colors.neutralWhite,
  },
  cardBackground: {
    width: "100%",
    height: "100%",
  },
  cardImage: {
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconText: {
    fontSize: 36,
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.neutralWhite,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.primary900,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: Colors.neutralWhite,
    fontSize: 11,
    fontWeight: "700",
  },
});
