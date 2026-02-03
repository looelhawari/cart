import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Clock } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { useStore } from "@/store";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";
import { HeroBanner } from "@/components/HeroBanner";
import { getFeaturedProducts, getFlashDeals } from "@/services/api/productsApi";
import { getFeaturedCategoriesWithProducts, getCategories } from "@/services/api/categoryApi";
import type { Product, Category } from "@/types";
import type { CategoryWithProducts } from "@/services/api/categoryApi";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { useResponsive } from "@/hooks/useResponsive";

const { width } = Dimensions.get("window");

// Category icon mapping with ElBaraka brand gradients
const getCategoryIcon = (slug: string): { icon: keyof typeof Ionicons.glyphMap; color: string; gradient: readonly [string, string] } => {
  const iconMap: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; gradient: readonly [string, string] }> = {
    fruits: { icon: "nutrition-outline", color: Colors.accentOrange, gradient: ['#FFF7ED', '#FFEDD5'] as const },
    vegetables: { icon: "leaf-outline", color: Colors.primary900, gradient: ['#F0FDF4', '#DCFCE7'] as const },
    meat: { icon: "restaurant-outline", color: "#DC2626", gradient: ['#FEF2F2', '#FECACA'] as const },
    dairy: { icon: "water-outline", color: "#0EA5E9", gradient: ['#F0F9FF', '#E0F2FE'] as const },
    bakery: { icon: "pizza-outline", color: "#D97706", gradient: ['#FFFBEB', '#FEF3C7'] as const },
    beverages: { icon: "cafe-outline", color: "#7C3AED", gradient: ['#FAF5FF', '#EDE9FE'] as const },
    snacks: { icon: "fast-food-outline", color: "#EC4899", gradient: ['#FDF2F8', '#FCE7F3'] as const },
    frozen: { icon: "snow-outline", color: "#06B6D4", gradient: ['#ECFEFF', '#CFFAFE'] as const },
    cleaning: { icon: "sparkles-outline", color: "#3B82F6", gradient: ['#EFF6FF', '#DBEAFE'] as const },
    personal: { icon: "body-outline", color: "#8B5CF6", gradient: ['#F5F3FF', '#EDE9FE'] as const },
    grocery: { icon: "cart-outline", color: Colors.primary700, gradient: ['#F0FDF4', '#DCFCE7'] as const },
    organic: { icon: "flower-outline", color: "#10B981", gradient: ['#ECFDF5', '#D1FAE5'] as const },
  };

  const normalizedSlug = slug?.toLowerCase().replace(/[^a-z]/g, '') || '';
  for (const [key, value] of Object.entries(iconMap)) {
    if (normalizedSlug.includes(key) || key.includes(normalizedSlug)) {
      return value;
    }
  }
  return { icon: "grid-outline", color: Colors.primary900, gradient: ['#F0FDF4', '#DCFCE7'] as const };
};

export default function HomeScreen() {
  const { wp, hp, isSmallDevice } = useResponsive();
  const { user, isAuthenticated, cart } = useStore();
  const { t, isRTL } = useTranslation();
  const { getName } = useLocalizedValue();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [quickCategories, setQuickCategories] = useState<Category[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<CategoryWithProducts[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  // Calculate cart items count
  const cartItemsCount = cart?.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);

      const [categoriesRes, allCategoriesRes, featuredRes, flashDealsRes] = await Promise.all([
        getFeaturedCategoriesWithProducts(),
        getCategories(),
        getFeaturedProducts(),
        getFlashDeals(),
      ]);

      if (categoriesRes.success) {
        setCategoriesWithProducts(categoriesRes.data.categories);
      }
      if (allCategoriesRes.success) {
        setQuickCategories(allCategoriesRes.data.categories.slice(0, 8));
      }
      if (featuredRes.success) {
        setFeaturedProducts(featuredRes.data.products);
      }
      if (flashDealsRes.success) {
        setFlashDeals(flashDealsRes.data.products);
      }
    } catch (error) {
      console.error("Error loading home data:", error);
    } finally {
      setLoading(false);
      // Start entrance animations
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [refreshing, fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.common?.goodMorning || "Good Morning";
    if (hour < 17) return t.common?.goodAfternoon || "Good Afternoon";
    return t.common?.goodEvening || "Good Evening";
  };

  // Loading skeleton
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonHeaderLeft}>
            <SkeletonLoader width={140} height={26} borderRadius={8} />
            <View style={{ height: 6 }} />
            <SkeletonLoader width={100} height={16} borderRadius={6} />
          </View>
          <View style={styles.skeletonHeaderRight}>
            <SkeletonLoader width={42} height={42} borderRadius={21} />
            <SkeletonLoader width={42} height={42} borderRadius={21} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.skeletonSearchContainer}>
            <SkeletonLoader width="100%" height={50} borderRadius={25} />
          </View>

          {/* Features Skeleton */}
          <View style={styles.featuresContainer}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.featureCard}>
                <SkeletonLoader width={44} height={44} borderRadius={22} />
                <View style={{ height: 6 }} />
                <SkeletonLoader width={50} height={12} borderRadius={4} />
              </View>
            ))}
          </View>

          {/* Banner Skeleton */}
          <View style={{ paddingHorizontal: 16, marginVertical: 12 }}>
            <SkeletonLoader width="100%" height={160} borderRadius={20} />
          </View>

          {/* Categories Skeleton */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <SkeletonLoader width={130} height={22} borderRadius={8} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.categoryCard}>
                  <SkeletonLoader width={68} height={68} borderRadius={18} />
                  <View style={{ height: 8 }} />
                  <SkeletonLoader width={56} height={12} borderRadius={4} />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Products Skeleton */}
          {[1, 2].map((section) => (
            <View key={section} style={styles.section}>
              <View style={styles.sectionHeader}>
                <SkeletonLoader width={140} height={22} borderRadius={8} />
                <SkeletonLoader width={75} height={24} borderRadius={12} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dealsScroll}
              >
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.dealCard}>
                    <SkeletonLoader width="100%" height={130} borderRadius={16} />
                    <View style={{ height: 10 }} />
                    <SkeletonLoader width="75%" height={16} borderRadius={5} />
                    <View style={{ height: 6 }} />
                    <SkeletonLoader width="45%" height={20} borderRadius={5} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Fallback categories
  const displayCategories = quickCategories.length > 0 ? quickCategories : [
    { id: 1, name_en: "Fruits", name_ar: "فواكه", slug: "fruits" },
    { id: 2, name_en: "Vegetables", name_ar: "خضروات", slug: "vegetables" },
    { id: 3, name_en: "Meat", name_ar: "لحوم", slug: "meat" },
    { id: 4, name_en: "Dairy", name_ar: "ألبان", slug: "dairy" },
    { id: 5, name_en: "Bakery", name_ar: "مخبوزات", slug: "bakery" },
    { id: 6, name_en: "Beverages", name_ar: "مشروبات", slug: "beverages" },
  ] as Category[];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      {/* ═══════════════════════════════════════════════════════════════════════════
          PREMIUM BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              {/* Brand Identity */}
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>ElBaraka</Text>
              </View>

              {/* Personalized Greeting */}
              <Text style={styles.greeting}>
                {isAuthenticated && user
                  ? `${getGreeting()}, ${user.first_name} 👋`
                  : `${getGreeting()} 👋`}
              </Text>

              {/* Location Selector */}
              <TouchableOpacity style={styles.locationButton} activeOpacity={0.8}>
                <Ionicons name="location" size={13} color={Colors.neutralWhite} />
                <Text style={styles.locationText}>Cairo, Egypt</Text>
                <ChevronRight size={13} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.push("/notifications")}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications" size={21} color={Colors.neutralWhite} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => router.push("/(tabs)/cart")}
                activeOpacity={0.8}
              >
                <Ionicons name="bag" size={21} color={Colors.neutralWhite} />
                {cartItemsCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItemsCount > 9 ? '9+' : cartItemsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══════════════════════════════════════════════════════════════════════════
              SEARCH BAR - Floating Design
          ═══════════════════════════════════════════════════════════════════════════ */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push("/search")}
            activeOpacity={0.95}
          >
            <Ionicons name="search" size={20} color={Colors.neutralMedium} />
            <Text style={styles.searchPlaceholder}>{t.common?.searchPlaceholder || "Search for products..."}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

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
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════════════════════════════════════════════
            FEATURE HIGHLIGHTS STRIP
        ═══════════════════════════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            styles.featuresContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primary900 + "18" }]}>
              <Ionicons name="car" size={19} color={Colors.primary900} />
            </View>
            <Text style={styles.featureTitle}>{t.common?.freeDelivery || "Free Delivery"}</Text>
            <Text style={styles.featureSubtitle}>200+ EGP</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.accentOrange + "18" }]}>
              <Ionicons name="time" size={19} color={Colors.accentOrange} />
            </View>
            <Text style={styles.featureTitle}>Fast Delivery</Text>
            <Text style={styles.featureSubtitle}>30-45 mins</Text>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: "#3B82F6" + "18" }]}>
              <Ionicons name="shield-checkmark-outline" size={19} color="#3B82F6" />
            </View>
            <Text style={styles.featureTitle}>Quality</Text>
            <Text style={styles.featureSubtitle}>Guaranteed</Text>
          </View>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            PROMOTIONAL BANNERS CAROUSEL
        ═══════════════════════════════════════════════════════════════════════════ */}
        <HeroBanner />

        {/* ═══════════════════════════════════════════════════════════════════════════
            QUICK CATEGORIES
        ═══════════════════════════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            styles.categoriesSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.common?.browse || "Browse Categories"}</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push("/(tabs)/categories")}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllText}>{t.common?.viewAll || "View All"}</Text>
              <ChevronRight size={15} color={Colors.primary900} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {displayCategories.map((cat) => {
              const iconInfo = getCategoryIcon(cat.slug || "");
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => router.push(`/categories/${cat.id}` as any)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={iconInfo.gradient}
                    style={styles.categoryIconContainer}
                  >
                    <Ionicons name={iconInfo.icon} size={26} color={iconInfo.color} />
                  </LinearGradient>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {getName(cat)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════════════════════
            FLASH DEALS with Timer Badge
        ═══════════════════════════════════════════════════════════════════════════ */}
        {flashDeals.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.flashDealsTitleRow}>
                <View style={styles.flashIcon}>
                  <Ionicons name="flash" size={14} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.sectionTitle}>{t.products?.flashDeals || "Flash Deals"}</Text>
                <View style={styles.timerBadge}>
                  <Clock size={11} color={Colors.accentRed} />
                  <Text style={styles.timerText}>Ends Soon!</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewAllButtonAlt}
                onPress={() => router.push("/deals/flash")}
                activeOpacity={0.85}
              >
                <Text style={styles.viewAllTextAlt}>{t.common?.viewAll || "View All"}</Text>
                <ChevronRight size={15} color={Colors.neutralWhite} />
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
          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            EXCLUSIVE OFFERS BANNER
        ═══════════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={styles.promoBanner}
          onPress={() => router.push("/(tabs)/offers")}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={[Colors.primary700, Colors.primary900]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoBannerGradient}
          >
            <View style={styles.promoBannerContent}>
              <View style={styles.promoBannerLeft}>
                <View style={styles.promoIconContainer}>
                  <Ionicons name="gift-outline" size={22} color={Colors.neutralWhite} />
                </View>
                <View>
                  <Text style={styles.promoBannerTitle}>Exclusive Offers</Text>
                  <Text style={styles.promoBannerSubtitle}>Get up to 50% off fresh items</Text>
                </View>
              </View>
              <View style={styles.promoBannerArrow}>
                <ChevronRight size={22} color="rgba(255,255,255,0.75)" />
              </View>
            </View>
            {/* Decorative circles */}
            <View style={styles.promoBannerDecor1} />
            <View style={styles.promoBannerDecor2} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════════════════
            CATEGORY PRODUCT SECTIONS
        ═══════════════════════════════════════════════════════════════════════════ */}
        {categoriesWithProducts.map((category, index) => (
          <Animated.View
            key={category.id}
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{getName(category)}</Text>
                {index === 0 && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={9} color={Colors.neutralWhite} />
                    <Text style={styles.popularBadgeText}>Popular</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push(`/categories/${category.id}` as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllText}>
                  {category.products_count} {t.common?.items || "items"}
                </Text>
                <ChevronRight size={15} color={Colors.primary900} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dealsScroll}
            >
              {category.products.map((product: Product) => (
                <View key={product.barcode} style={styles.dealCard}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.barcode}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        ))}

        {/* ═══════════════════════════════════════════════════════════════════════════
            FEATURED PRODUCTS GRID
        ═══════════════════════════════════════════════════════════════════════════ */}
        {featuredProducts.length > 0 && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.crownIcon}>
                  <Ionicons name="trophy" size={13} color={Colors.accentYellow} />
                </View>
                <Text style={styles.sectionTitle}>{t.products?.featured || "Featured Products"}</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/(tabs)/categories")}
                activeOpacity={0.8}
              >
                <Text style={styles.viewAllText}>{t.common?.seeAll || "See All"}</Text>
                <ChevronRight size={15} color={Colors.primary900} />
              </TouchableOpacity>
            </View>

            <View style={styles.productsGrid}>
              {featuredProducts.slice(0, 6).map((product) => (
                <View key={product.barcode} style={styles.productCard}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.barcode}`)}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER STYLES - Premium Branded Design
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
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  brandIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.88)",
    marginBottom: 5,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    alignSelf: "flex-start",
  },
  locationText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralWhite,
    marginLeft: 4,
    marginRight: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.accentRed,
    borderWidth: 1.5,
    borderColor: Colors.primary900,
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
  // SEARCH BAR
  // ═══════════════════════════════════════════════════════════════════════════
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  searchPlaceholder: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginLeft: 10,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURES STRIP
  // ═══════════════════════════════════════════════════════════════════════════
  featuresContainer: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureCard: {
    flex: 1,
    alignItems: "center",
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  featureTitle: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },
  featureSubtitle: {
    fontSize: 9,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  featureDivider: {
    width: 1,
    height: "55%",
    backgroundColor: Colors.neutralGray,
    alignSelf: "center",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORIES SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  categoriesSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  categoriesScroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  categoryCard: {
    alignItems: "center",
    width: 76,
  },
  categoryIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  categoryName: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralCharcoal,
    textAlign: "center",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW ALL BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary100,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  viewAllText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
    marginRight: 1,
  },
  viewAllButtonAlt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentRed,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  viewAllTextAlt: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
    marginRight: 1,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  section: {
    marginTop: 14,
  },
  flashDealsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
  dealsScroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  dealCard: {
    width: 160,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMO BANNER
  // ═══════════════════════════════════════════════════════════════════════════
  promoBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  promoBannerGradient: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    position: "relative",
    overflow: "hidden",
  },
  promoBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  promoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  promoBannerTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    marginBottom: 1,
  },
  promoBannerSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins-Regular",
    color: "rgba(255,255,255,0.82)",
  },
  promoBannerArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  promoBannerDecor1: {
    position: "absolute",
    top: -28,
    right: -28,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  promoBannerDecor2: {
    position: "absolute",
    bottom: -35,
    right: 55,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BADGES
  // ═══════════════════════════════════════════════════════════════════════════
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    gap: 3,
  },
  popularBadgeText: {
    fontSize: 9,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },
  crownIcon: {
    marginRight: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCTS GRID
  // ═══════════════════════════════════════════════════════════════════════════
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
  },
  productCard: {
    width: (width - 44) / 2,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SKELETON LOADING
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
  skeletonHeaderLeft: {
    flex: 1,
  },
  skeletonHeaderRight: {
    flexDirection: "row",
    gap: 7,
  },
  skeletonSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
