import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  InteractionManager,
  AppState,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/constants/Colors";
import { useStore } from "@/store";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";
import { HeroBanner } from "@/components/HeroBanner";
import { Toast } from "@/components/Toast";
import { getUnreadCount } from "@/services/notificationService";
import { getFeaturedProducts, getFlashDeals } from "@/services/api/productsApi";
import {
  getFeaturedCategoriesWithProducts,
  getCategories,
} from "@/services/api/categoryApi";
import type { Product, Category } from "@/types";
import type { CategoryWithProducts } from "@/services/api/categoryApi";
import { fetchActiveOffersCached } from "@/utils/offerPricing";
import { useTranslation } from "@/i18n";

// Section components
import {
  DeliveryBannerSection,
  FeatureStripSection,
  QuickCategoriesSection,
  FlashDealsSection,
  PromoBannerSection,
  CategoryProductSection,
  FeaturedGridSection,
  BrowseCTASection,
} from "@/components/home";

// ─── Section types ────────────────────────────────────────────────────────────
type SectionType =
  | "delivery-banner"
  | "feature-strip"
  | "hero-banner"
  | "quick-categories"
  | "flash-deals"
  | "promo-banner"
  | "category-products"
  | "featured-grid"
  | "browse-cta";

interface HomeSection {
  key: string;
  type: SectionType;
  /** Payload carried for data-driven sections */
  data?: any;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user, isAuthenticated, cart } = useStore();
  const { t } = useTranslation();

  // ─── Data state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [quickCategories, setQuickCategories] = useState<Category[]>([]);
  const [flashDeals, setFlashDeals] = useState<Product[]>([]);
  const [categoriesWithProducts, setCategoriesWithProducts] = useState<
    CategoryWithProducts[]
  >([]);
  const [categoryDiscounts, setCategoryDiscounts] = useState<
    Map<number, number>
  >(new Map());

  // ─── Toast state ──────────────────────────────────────────────────────────
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info",
  );

  const handleCardAddToCart = useCallback(
    (result: {
      success: boolean;
      message: string;
      type: "success" | "error";
    }) => {
      setToastType(result.type);
      setToastMessage(result.message);
      setShowToast(true);
    },
    [],
  );

  // ─── Animation values ─────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ─── Cart & notifications ─────────────────────────────────────────────────
  const cartItemsCount =
    cart?.items?.reduce(
      (total: number, item: any) => total + item.quantity,
      0,
    ) || 0;

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (isAuthenticated) {
      const count = await getUnreadCount();
      setUnreadNotifCount(count);
    } else {
      setUnreadNotifCount(0);
    }
  }, [isAuthenticated]);

  // ─── Offer / category discount badges ─────────────────────────────────────
  const loadCategoryOffers = async (
    allCategories: Category[],
    displayCats: Category[],
    forceRefresh = false,
  ) => {
    try {
      // Pull-to-refresh: bypass the cached active-offers snapshot so an
      // admin-disabled offer disappears from the home-page badges
      // immediately. Without this, the in-memory cache (5 min TTL) could
      // keep painting a "15% OFF" badge after the offer was deactivated.
      const offers = await fetchActiveOffersCached(forceRefresh);
      const discountMap = new Map<number, number>();

      for (const offer of offers) {
        if (offer.status !== "active") continue;
        if (offer.applies_to !== "category") continue;
        if (offer.type !== "percentage" && offer.type !== "fixed_amount")
          continue;

        for (const target of offer.targets.categories) {
          const directMatch = displayCats.find((c) => c.id === target.id);
          if (directMatch && offer.type === "percentage") {
            const existing = discountMap.get(directMatch.id) || 0;
            if (offer.value > existing)
              discountMap.set(directMatch.id, offer.value);
          }

          if (target.include_subcategories) {
            const parentMatch = displayCats.find((c) =>
              c.subcategories?.some((sub: any) => sub.id === target.id),
            );
            if (parentMatch && offer.type === "percentage") {
              const existing = discountMap.get(parentMatch.id) || 0;
              if (offer.value > existing)
                discountMap.set(parentMatch.id, offer.value);
            }
          }
        }
      }

      setCategoryDiscounts(discountMap);
    } catch {
      // Badges are a nice-to-have — silently fail
    }
  };

  // ─── Data loading ─────────────────────────────────────────────────────────
  //
  // Two paths:
  //   - Initial mount (force=false): show cached snapshot immediately if
  //     present, then refresh in background. The user sees data the
  //     instant the home tab opens — even on a cold app start.
  //   - Pull-to-refresh (force=true): bypass every cache and hit the
  //     network. This is the only path that can evict an offer the
  //     admin disabled while the user was offline.
  const loadData = useCallback(async (force = false) => {
    try {
      if (!force) setLoading(true);

      const [categoriesRes, allCategoriesRes, featuredRes, flashDealsRes] =
        await Promise.all([
          getFeaturedCategoriesWithProducts({ forceRefresh: force }),
          getCategories({ forceRefresh: force }),
          getFeaturedProducts({ forceRefresh: force }),
          getFlashDeals({ forceRefresh: force }),
        ]);

      if (categoriesRes.success) {
        setCategoriesWithProducts(categoriesRes.data.categories);
      }
      if (allCategoriesRes.success) {
        const rootCats = allCategoriesRes.data.categories.slice(0, 8);
        setQuickCategories(rootCats);
        loadCategoryOffers(allCategoriesRes.data.categories, rootCats, force);
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
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadData();
      fetchUnreadCount();
    });
    return () => task.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 120_000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") fetchUnreadCount();
      });
      return () => {
        clearInterval(interval);
        subscription.remove();
      };
    }, [fetchUnreadCount]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // force=true bypasses the AsyncStorage cache and hits the network.
    // The only way an admin-disabled / expired offer disappears from the
    // home page is via this code path.
    await Promise.all([loadData(true), fetchUnreadCount()]);
    setRefreshing(false);
  }, [loadData, fetchUnreadCount]);

  // ─── Greeting ─────────────────────────────────────────────────────────────
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.common?.goodMorning || "Good Morning";
    if (hour < 17) return t.common?.goodAfternoon || "Good Afternoon";
    return t.common?.goodEvening || "Good Evening";
  }, [t]);

  // ─── Fallback categories ─────────────────────────────────────────────────
  const displayCategories = useMemo(
    () =>
      quickCategories.length > 0
        ? quickCategories
        : ([
            { id: 1, name_en: "Fruits", name_ar: "فواكه", slug: "fruits" },
            {
              id: 2,
              name_en: "Vegetables",
              name_ar: "خضروات",
              slug: "vegetables",
            },
            { id: 3, name_en: "Meat", name_ar: "لحوم", slug: "meat" },
            { id: 4, name_en: "Dairy", name_ar: "ألبان", slug: "dairy" },
            { id: 5, name_en: "Bakery", name_ar: "مخبوزات", slug: "bakery" },
            {
              id: 6,
              name_en: "Beverages",
              name_ar: "مشروبات",
              slug: "beverages",
            },
          ] as Category[]),
    [quickCategories],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION LIST — build the array once per render
  // ═══════════════════════════════════════════════════════════════════════════
  const sections: HomeSection[] = useMemo(() => {
    const s: HomeSection[] = [
      { key: "delivery-banner", type: "delivery-banner" },
      { key: "feature-strip", type: "feature-strip" },
      { key: "hero-banner", type: "hero-banner" },
      { key: "quick-categories", type: "quick-categories" },
    ];

    if (flashDeals.length > 0) {
      s.push({ key: "flash-deals", type: "flash-deals" });
    }

    s.push({ key: "promo-banner", type: "promo-banner" });

    // Dynamic category lanes
    categoriesWithProducts.forEach((cat) => {
      s.push({
        key: `cat-${cat.id}`,
        type: "category-products",
        data: cat,
      });
    });

    if (featuredProducts.length > 0) {
      s.push({ key: "featured-grid", type: "featured-grid" });
    }

    s.push({ key: "browse-cta", type: "browse-cta" });

    return s;
  }, [flashDeals, categoriesWithProducts, featuredProducts]);

  // ─── Render each section ──────────────────────────────────────────────────
  const renderSection = useCallback(
    ({ item }: { item: HomeSection }) => {
      switch (item.type) {
        case "delivery-banner":
          return <DeliveryBannerSection />;

        case "feature-strip":
          return <FeatureStripSection />;

        case "hero-banner":
          return <HeroBanner />;

        case "quick-categories":
          return (
            <QuickCategoriesSection
              categories={displayCategories}
              categoryDiscounts={categoryDiscounts}
            />
          );

        case "flash-deals":
          return (
            <FlashDealsSection
              products={flashDeals}
              onAddToCart={handleCardAddToCart}
            />
          );

        case "promo-banner":
          return <PromoBannerSection />;

        case "category-products":
          return (
            <CategoryProductSection
              category={item.data}
              isFirst={
                item.key ===
                sections.find((s) => s.type === "category-products")?.key
              }
              onAddToCart={handleCardAddToCart}
            />
          );

        case "featured-grid":
          return (
            <FeaturedGridSection
              products={featuredProducts}
              onAddToCart={handleCardAddToCart}
            />
          );

        case "browse-cta":
          return <BrowseCTASection />;

        default:
          return null;
      }
    },
    [
      displayCategories,
      categoryDiscounts,
      flashDeals,
      featuredProducts,
      handleCardAddToCart,
      sections,
    ],
  );

  const sectionKeyExtractor = useCallback((item: HomeSection) => item.key, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER (rendered as ListHeaderComponent — stays outside the FlatList)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHeader = useCallback(
    () => (
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
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
              {/* Brand */}
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>{t.nav?.home || "Home"}</Text>
              </View>

              {/* Greeting */}
              <Text style={styles.greeting}>
                {isAuthenticated && user
                  ? `${getGreeting()}, ${user.first_name} 👋`
                  : `${getGreeting()} 👋`}
              </Text>

              {/* Location */}
              <TouchableOpacity
                style={styles.locationButton}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="location"
                  size={13}
                  color={Colors.neutralWhite}
                />
                <Text style={styles.locationText}>{t.ui.cairoEgypt}</Text>
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
                <Ionicons
                  name="notifications"
                  size={21}
                  color={Colors.neutralWhite}
                />
                {unreadNotifCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartButton}
                onPress={() => router.push("/(tabs)/cart")}
                activeOpacity={0.8}
              >
                <Ionicons name="cart" size={21} color={Colors.neutralWhite} />
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

          {/* Search Bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push("/search")}
            activeOpacity={0.95}
          >
            <Ionicons name="search" size={20} color={Colors.neutralMedium} />
            <Text style={styles.searchPlaceholder}>
              {t.common?.searchPlaceholder || "Search for products..."}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    ),
    [
      fadeAnim,
      slideAnim,
      t,
      isAuthenticated,
      user,
      unreadNotifCount,
      cartItemsCount,
      getGreeting,
    ],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SKELETON LOADING
  // ═══════════════════════════════════════════════════════════════════════════
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
          <View style={styles.skeletonFeaturesRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonFeatureCard}>
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
          <View style={styles.skeletonSection}>
            <View style={styles.skeletonSectionHeader}>
              <SkeletonLoader width={130} height={22} borderRadius={8} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ alignItems: "center", width: 76 }}>
                  <SkeletonLoader width={68} height={68} borderRadius={18} />
                  <View style={{ height: 8 }} />
                  <SkeletonLoader width={56} height={12} borderRadius={4} />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Product Lanes Skeleton */}
          {[1, 2].map((section) => (
            <View key={section} style={styles.skeletonSection}>
              <View style={styles.skeletonSectionHeader}>
                <SkeletonLoader width={140} height={22} borderRadius={8} />
                <SkeletonLoader width={75} height={24} borderRadius={12} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
              >
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ width: 160 }}>
                    <SkeletonLoader
                      width="100%"
                      height={130}
                      borderRadius={16}
                    />
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER — FlatList-based section layout
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />

      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={sectionKeyExtractor}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<View style={{ height: 100 }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary900]}
            tintColor={Colors.primary900}
          />
        }
        // ── Performance tuning ──────────────────────────────────────────
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={4}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
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
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primary900,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#fff",
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

  // ─── Search Bar ───────────────────────────────────────────────────────────
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

  // ─── Skeleton ─────────────────────────────────────────────────────────────
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
  skeletonFeaturesRow: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  skeletonFeatureCard: {
    flex: 1,
    alignItems: "center",
  },
  skeletonSection: {
    marginTop: 14,
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
});
