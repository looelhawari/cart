import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  ShoppingBag,
  Bell,
  MapPin,
  ChevronRight,
  Sparkles,
  Truck,
  Leaf,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useResponsive } from "@/hooks/useResponsive";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { useStore } from "@/store";
import { getFeaturedProducts, getFlashDeals } from "@/services/api/productsApi";
import { getFeaturedCategoriesWithProducts } from "@/services/api/categoryApi";
import type { Product } from "@/types";
import type { CategoryWithProducts } from "@/services/api/categoryApi";
import { useLocalizedValue, useTranslation } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

export default function HomeScreen() {
  const { wp, hp, isSmallDevice, width } = useResponsive();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const { cart, user, isAuthenticated } = useStore();
  const cartItemsCount =
    cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ||
    0;
  const { getName } = useLocalizedValue();
  const { t, isRTL } = useTranslation();

  const [categoriesWithProducts, setCategoriesWithProducts] = useState<
    CategoryWithProducts[]
  >([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [categoriesRes, featuredRes, flashDealsRes] = await Promise.all([
        getFeaturedCategoriesWithProducts(),
        getFeaturedProducts(),
        getFlashDeals(),
      ]);

      if (categoriesRes.success)
        setCategoriesWithProducts(categoriesRes.data.categories);
      if (featuredRes.success) setFeaturedProducts(featuredRes.data.products);
      if (flashDealsRes.success) setFlashDeals(flashDealsRes.data.products);
    } catch (error) {
      console.error("Failed to load home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralLight,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    // HEADER
    header: {
      backgroundColor: Colors.neutralWhite,
      paddingHorizontal: wp(4),
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.md,
    },
    headerLeft: {
      flex: 1,
    },
    greeting: {
      fontSize: isSmallDevice ? 12 : Typography.bodySmall,
      color: Colors.neutralMedium,
      fontFamily: "Poppins_400Regular",
    },
    location: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    locationText: {
      fontSize: isSmallDevice ? 16 : Typography.h4,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
    },
    headerActions: {
      flexDirection: "row",
      gap: Spacing.sm,
    },
    iconButton: {
      width: isSmallDevice ? 40 : 44,
      height: isSmallDevice ? 40 : 44,
      borderRadius: isSmallDevice ? 20 : 22,
      backgroundColor: Colors.neutralLight,
      alignItems: "center",
      justifyContent: "center",
    },
    cartBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: Colors.accentRed,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: Colors.neutralWhite,
    },
    cartBadgeText: {
      color: Colors.neutralWhite,
      fontSize: 9,
      fontFamily: "Poppins_700Bold",
    },

    // SEARCH
    searchContainer: {
      paddingHorizontal: wp(4),
      paddingVertical: Spacing.md,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.neutralWhite,
      borderRadius: 12,
      paddingHorizontal: Spacing.md,
      paddingVertical: isSmallDevice ? 12 : 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.bodyBase,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      marginLeft: Spacing.sm,
    },

    // FEATURE CARDS
    featuresContainer: {
      flexDirection: "row",
      paddingHorizontal: wp(4),
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    featureCard: {
      flex: 1,
      backgroundColor: Colors.neutralWhite,
      borderRadius: 12,
      padding: Spacing.sm,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    featureIcon: {
      width: isSmallDevice ? 36 : 40,
      height: isSmallDevice ? 36 : 40,
      borderRadius: isSmallDevice ? 18 : 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.xs,
    },
    featureTitle: {
      fontSize: isSmallDevice ? 10 : Typography.bodySmall,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralCharcoal,
      textAlign: "center",
    },

    // CATEGORIES
    categoriesSection: {
      marginBottom: Spacing.lg,
    },
    categoriesScroll: {
      paddingLeft: wp(4),
    },
    categoryCard: {
      alignItems: "center",
      marginRight: Spacing.md,
      width: isSmallDevice ? 70 : 80,
    },
    categoryIcon: {
      width: isSmallDevice ? 60 : 70,
      height: isSmallDevice ? 60 : 70,
      borderRadius: isSmallDevice ? 30 : 35,
      backgroundColor: Colors.neutralWhite,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.xs,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    categoryEmoji: {
      fontSize: isSmallDevice ? 28 : 32,
    },
    categoryName: {
      fontSize: Typography.bodySmall,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralCharcoal,
      textAlign: "center",
    },

    // SECTION
    section: {
      marginBottom: Spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: wp(4),
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: isSmallDevice ? 18 : Typography.h3,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
    },
    viewAllButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewAllText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.primary900,
    },

    // DEALS
    dealsScroll: {
      paddingLeft: wp(4),
      paddingRight: wp(4),
    },
    dealCard: {
      width: isSmallDevice ? wp(38) : 150,
      marginRight: Spacing.sm,
    },

    // PRODUCTS GRID
    productsGrid: {
      paddingHorizontal: wp(4),
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: Spacing.md,
      columnGap: Spacing.sm,
      marginBottom: Spacing.xl,
    },
    productCard: {
      width: isSmallDevice
        ? (width - wp(4) * 2 - Spacing.sm) / 2
        : (width - wp(4) * 2 - Spacing.md * 2) / 3,
      marginBottom: 0,
    },
  });

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <SkeletonLoader width={100} height={14} borderRadius={4} />
              <View style={{ height: 4 }} />
              <SkeletonLoader width={140} height={20} borderRadius={4} />
            </View>
            <View style={styles.headerActions}>
              <SkeletonLoader width={44} height={44} borderRadius={22} />
              <SkeletonLoader width={44} height={44} borderRadius={22} />
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Search Bar Skeleton */}
          <View style={styles.searchContainer}>
            <SkeletonLoader width="100%" height={50} borderRadius={12} />
          </View>

          {/* Hero Banner Skeleton */}
          <View style={{ paddingHorizontal: wp(4), marginBottom: Spacing.md }}>
            <SkeletonLoader width="100%" height={hp(20)} borderRadius={16} />
          </View>

          {/* Feature Cards Skeleton */}
          <View style={styles.featuresContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.featureCard}>
                <SkeletonLoader width={40} height={40} borderRadius={20} />
                <View style={{ height: 4 }} />
                <SkeletonLoader width={60} height={14} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* Categories Skeleton */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={i} style={styles.categoryCard}>
                  <SkeletonLoader width={60} height={60} borderRadius={30} />
                  <View style={{ height: 4 }} />
                  <SkeletonLoader width={50} height={12} borderRadius={4} />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Section Skeleton (Products) */}
          {[1, 2, 3].map((section) => (
            <View key={section} style={styles.section}>
              <View style={styles.sectionHeader}>
                <SkeletonLoader width={150} height={24} borderRadius={6} />
                <SkeletonLoader width={80} height={20} borderRadius={6} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dealsScroll}
              >
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.dealCard}>
                    <SkeletonLoader
                      width="100%"
                      height={140}
                      borderRadius={12}
                    />
                    <View style={{ height: 8 }} />
                    <SkeletonLoader width="80%" height={16} borderRadius={4} />
                    <View style={{ height: 4 }} />
                    <SkeletonLoader width="60%" height={14} borderRadius={4} />
                    <View style={{ height: 8 }} />
                    <SkeletonLoader width="50%" height={20} borderRadius={6} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const quickCategories = [
    { id: 1, name: t.common.fruits, emoji: "🍎" },
    { id: 2, name: t.common.vegetables, emoji: "🥕" },
    { id: 3, name: t.common.meat, emoji: "🥩" },
    { id: 4, name: t.common.dairy, emoji: "🥛" },
    { id: 5, name: t.common.bakery, emoji: "🍞" },
    { id: 6, name: t.common.snacks, emoji: "🍿" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {isAuthenticated && user
                ? `${t.common.hello}, ${user.first_name}`
                : t.common.hello}
            </Text>
            <View style={styles.location}>
              <MapPin size={16} color={Colors.primary900} />
              <Text style={styles.locationText}>Cairo, Egypt</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/notifications")}
            >
              <Bell size={20} color={Colors.neutralCharcoal} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/(tabs)/cart")}
            >
              <ShoppingBag size={20} color={Colors.neutralCharcoal} />
              {cartItemsCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary900]}
            tintColor={Colors.primary900}
          />
        }
      >
        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push("/search")}
            activeOpacity={0.7}
          >
            <Search size={20} color={Colors.neutralMedium} />
            <Text style={styles.searchInput}>{t.common.searchPlaceholder}</Text>
          </TouchableOpacity>
        </View>

        {/* HERO BANNER - PROMOTIONS */}
        <HeroBanner />

        {/* FEATURE HIGHLIGHTS */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: Colors.primary900 + "15" },
              ]}
            >
              <Truck size={isSmallDevice ? 18 : 20} color={Colors.primary900} />
            </View>
            <Text style={styles.featureTitle}>{t.common.freeDelivery}</Text>
          </View>
          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: Colors.accentOrange + "15" },
              ]}
            >
              <Sparkles
                size={isSmallDevice ? 18 : 20}
                color={Colors.accentOrange}
              />
            </View>
            <Text style={styles.featureTitle}>{t.common.freshDaily}</Text>
          </View>
          <View style={styles.featureCard}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: Colors.primary700 + "15" },
              ]}
            >
              <Leaf size={isSmallDevice ? 18 : 20} color={Colors.primary700} />
            </View>
            <Text style={styles.featureTitle}>{t.common.organic}</Text>
          </View>
        </View>

        {/* QUICK CATEGORIES */}
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {quickCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => router.push("/(tabs)/categories")}
              >
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FLASH DEALS */}
        {flashDeals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t.products.flashDeals} ⚡
              </Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/deals/flash")}
              >
                <Text style={styles.viewAllText}>{t.common.viewAll}</Text>
                <ChevronRight size={18} color={Colors.primary900} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsScroll}
            >
              {flashDeals.map((product) => (
                <View key={product.barcode} style={styles.dealCard}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.barcode}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* CATEGORY PRODUCTS */}
        {categoriesWithProducts.map((category) => (
          <View key={category.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{getName(category)}</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push(`/categories/${category.id}` as any)}
              >
                <Text style={styles.viewAllText}>
                  {category.products_count} {t.common.items}
                </Text>
                <ChevronRight size={18} color={Colors.primary900} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsScroll}
            >
              {category.products.map((product) => (
                <View key={product.barcode} style={styles.dealCard}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.barcode}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ))}

        {/* FEATURED PRODUCTS */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.products.featured}</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/(tabs)/categories")}
              >
                <Text style={styles.viewAllText}>{t.common.seeAll}</Text>
                <ChevronRight size={18} color={Colors.primary900} />
              </TouchableOpacity>
            </View>

            <View style={styles.productsGrid}>
              {Array.isArray(featuredProducts) &&
                featuredProducts.map((product) => (
                  <View key={product.barcode} style={styles.productCard}>
                    <ProductCard
                      product={product}
                      onPress={() => router.push(`/product/${product.barcode}`)}
                    />
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
