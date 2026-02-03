import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  RefreshControl,
  Dimensions,
  Alert,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
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
import { useLocalizedValue, useTranslation } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedImages, setCachedImages] = useState<Map<number, string>>(new Map());
  const { cart } = useStore();
  const cartItemsCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
  const { getName } = useLocalizedValue();
  const { t, isRTL } = useTranslation();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    initImageCache();
    loadCategories();
  }, []);

  const loadCategories = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await getCategories(!forceRefresh);

      if (response.success) {
        const rootCategories = response.data.categories
          .filter((cat: Category) => !cat.parent_id)
          .sort((a: Category, b: Category) => (a.sort_order || 0) - (b.sort_order || 0));

        setCategories(rootCategories);

        // Preload images
        const imageUrls = rootCategories
          .map((cat: Category) => cat.image)
          .filter(Boolean) as string[];

        preloadImages(imageUrls).then(() => {
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

        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert(
        t.common?.error || "Error",
        "Unable to load categories. Please check your connection.",
        [{ text: t.common?.retry || "Retry", onPress: () => loadCategories() }, { text: t.common?.ok || "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories(true);
    setRefreshing(false);
  };

  const renderCategoryCard = ({ item, index }: { item: Category; index: number }) => {
    const defaultImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
    const imageUri = cachedImages.get(item.id) || item.image || defaultImage;

    return (
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
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
              colors={["transparent", "rgba(0,0,0,0.75)"]}
              style={styles.gradient}
            >
              {/* Products count badge */}
              {item.products_count !== undefined && item.products_count > 0 && (
                <View style={styles.productsBadge}>
                  <Text style={styles.productsBadgeText}>{item.products_count}</Text>
                </View>
              )}

              {/* Category name */}
              <View style={styles.cardContent}>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {getName(item)}
                </Text>
                <View style={styles.exploreButton}>
                  <Text style={styles.exploreText}>{t.common?.browse || "Browse"}</Text>
                  <ChevronRight size={14} color={Colors.neutralWhite} />
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Loading skeleton
  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        {/* Header Skeleton */}
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonBrand}>
            <SkeletonLoader width={32} height={32} borderRadius={8} />
            <SkeletonLoader width={120} height={24} borderRadius={6} />
          </View>
          <View style={styles.skeletonActions}>
            <SkeletonLoader width={42} height={42} borderRadius={21} />
            <SkeletonLoader width={42} height={42} borderRadius={21} />
          </View>
        </View>

        {/* Content Skeleton */}
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonTitleRow}>
            <SkeletonLoader width={180} height={26} borderRadius={8} />
            <SkeletonLoader width={60} height={18} borderRadius={6} />
          </View>

          <View style={styles.gridContainer}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <SkeletonLoader width={CARD_WIDTH} height={CARD_WIDTH * 1.2} borderRadius={20} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <View style={styles.brandIcon}>
                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.brandName}>ElBaraka</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/search")}
                activeOpacity={0.8}
              >
                <Ionicons name="search" size={21} color={Colors.neutralWhite} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => router.push("/(tabs)/cart")}
                activeOpacity={0.8}
              >
                <Ionicons name="bag" size={21} color={Colors.neutralWhite} />
                {cartItemsCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>
                      {cartItemsCount > 9 ? "9+" : cartItemsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION TITLE
      ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t.nav?.categories || "Categories"}</Text>
          <Text style={styles.sectionSubtitle}>
            {t.common?.browse || "Browse"} {categories.length} {t.nav?.categories?.toLowerCase() || "categories"}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Ionicons name="grid" size={14} color={Colors.primary900} />
          <Text style={styles.countText}>{categories.length}</Text>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════
          CATEGORIES GRID
      ═══════════════════════════════════════════════════════════════════════════ */}
      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
    backgroundColor: Colors.neutralCloud,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accentRed,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary900,
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  countText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GRID
  // ═══════════════════════════════════════════════════════════════════════════
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    backgroundColor: Colors.neutralWhite,
  },
  cardBackground: {
    width: "100%",
    height: "100%",
  },
  cardImage: {
    borderRadius: 20,
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  productsBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.primary900,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: "center",
  },
  productsBadgeText: {
    color: Colors.neutralWhite,
    fontSize: 11,
    fontFamily: "Poppins-Bold",
  },
  cardContent: {
    gap: 6,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  exploreText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKELETON
  // ═══════════════════════════════════════════════════════════════════════════
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: Colors.primary900,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  skeletonBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  skeletonActions: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonContent: {
    padding: 18,
  },
  skeletonTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  skeletonCard: {
    width: CARD_WIDTH,
    height: 160,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
});
