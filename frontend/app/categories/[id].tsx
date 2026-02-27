import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "@/i18n";

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { Toast } from "@/components/Toast";
import { getCategoryProducts } from "@/services/api/categoryApi";
import type { Product, Category, SortOption, SortOrder } from "@/types";
import { useStore } from "@/store";
import { getCachedImage } from "@/services/cache/imageCache";
import OfflineIndicator from "@/components/OfflineIndicator";
import {
  fetchActiveOffersCached,
  getProductOfferPricing,
} from "@/utils/offerPricing";
import type { Offer } from "@/services/api/types";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 200;

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    number | null
  >(null);
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showSortModal, setShowSortModal] = useState(false);
  const [cachedHeroImage, setCachedHeroImage] = useState<string | undefined>();
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);

  // Scroll-driven hero collapse animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroHeight = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [HERO_HEIGHT, 0],
    extrapolate: "clamp",
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Pagination state for infinite scrolling
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Page-level toast state for add-to-cart feedback
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info",
  );

  const handleCardAddToCart = (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => {
    setToastType(result.type);
    setToastMessage(result.message);
    setShowToast(true);
  };

  const { cart } = useStore();

  const cartItemsCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Initial load only
  useEffect(() => {
    if (id) {
      loadCategoryData(true);
    }
  }, [id]);

  useEffect(() => {
    fetchActiveOffersCached()
      .then(setActiveOffers)
      .catch((error) => {
        console.error("Failed to load active offers:", error);
        setActiveOffers([]);
      });
  }, []);

  // Filter changes - reset pagination and reload
  useEffect(() => {
    if (id && !loading) {
      setCurrentPage(1);
      setHasMore(true);
      loadCategoryData(false, 1);
    }
  }, [selectedSubcategoryId, sortBy, sortOrder]);

  const loadCategoryData = async (isInitialLoad = false, page = 1) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else if (page === 1) {
        setRefreshing(true);
      }

      const params: any = {
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        per_page: ITEMS_PER_PAGE,
      };

      if (selectedSubcategoryId) {
        params.subcategory_id = selectedSubcategoryId;
      }

      const response = await getCategoryProducts(Number(id), params, false);
      if (response.success) {
        setCategory(response.data.category);

        if (page === 1) {
          setProducts(response.data.products);
        } else {
          setProducts((prev) => [...prev, ...response.data.products]);
        }

        // Update pagination state
        const { pagination } = response.data;
        if (pagination) {
          setCurrentPage(pagination.current_page);
          setHasMore(pagination.current_page < pagination.last_page);
        } else {
          setHasMore(false);
        }

        // Cache hero image only on initial load
        if (isInitialLoad && response.data.category.image) {
          getCachedImage(response.data.category.image).then((cachedUri) => {
            if (cachedUri) {
              setCachedHeroImage(cachedUri);
            }
          });
        }
      }
    } catch (error) {
      console.error("Failed to load category:", error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      setLoadingMore(false);
    }
  };

  const loadMoreProducts = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadCategoryData(false, currentPage + 1);
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setHasMore(true);
    loadCategoryData(false, 1);
  };

  const hasSubcategories =
    category?.subcategories && category.subcategories.length > 0;

  const sortOptions = [
    { label: t.ui.popularity, value: "popularity", order: "desc" as SortOrder },
    { label: t.ui.priceLowToHigh, value: "price", order: "asc" as SortOrder },
    { label: t.ui.priceHighToLow, value: "price", order: "desc" as SortOrder },
    { label: t.ui.newest, value: "created_at", order: "desc" as SortOrder },
    { label: t.ui.highestRated, value: "rating", order: "desc" as SortOrder },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === sortBy && opt.order === sortOrder)
      ?.label || t.ui.sort;

  const handleSortChange = (value: SortOption, order: SortOrder) => {
    setSortBy(value);
    setSortOrder(order);
    setShowSortModal(false);
  };

  const renderHeroImage = () => {
    if (!category?.image) return null;

    const heroImageUri = cachedHeroImage || category.image;

    return (
      <Animated.View
        style={{ height: heroHeight, opacity: heroOpacity, overflow: "hidden" }}
      >
        <ImageBackground
          source={{ uri: heroImageUri }}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle}>{category.name_en}</Text>
            {category.description_en && (
              <Text style={styles.heroDescription} numberOfLines={2}>
                {category.description_en}
              </Text>
            )}
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    );
  };

  const renderSubcategoryChip = ({ item }: { item: Category }) => {
    const isSelected = selectedSubcategoryId === item.id;
    return (
      <TouchableOpacity
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setSelectedSubcategoryId(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        {item.icon && <Text style={styles.chipIcon}>{item.icon}</Text>}
        <Text
          style={[styles.chipText, isSelected && styles.chipTextSelected]}
          numberOfLines={1}
        >
          {item.name_en}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSubcategoryChips = () => {
    if (!hasSubcategories) return null;

    return (
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {/* All Chip */}
          <TouchableOpacity
            style={[
              styles.chip,
              selectedSubcategoryId === null && styles.chipSelected,
            ]}
            onPress={() => setSelectedSubcategoryId(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedSubcategoryId === null && styles.chipTextSelected,
              ]}
            >
              {t.ui.all}
            </Text>
          </TouchableOpacity>

          {/* Subcategory Chips */}
          {category?.subcategories?.map((subcat) => (
            <View key={subcat.id}>
              {renderSubcategoryChip({ item: subcat })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSortFilterBar = () => (
    <View style={styles.sortFilterBar}>
      {/* Sort Dropdown */}
      <TouchableOpacity
        style={styles.sortButton}
        onPress={() => setShowSortModal(!showSortModal)}
        activeOpacity={0.7}
      >
        <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
        <ChevronDown
          size={18}
          color={Colors.neutralCharcoal}
          style={{
            transform: [{ rotate: showSortModal ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          // TODO: Implement filter modal
          console.log("Filter pressed");
        }}
        activeOpacity={0.7}
      >
        <SlidersHorizontal size={18} color={Colors.neutralCharcoal} />
        <Text style={styles.filterButtonText}>{t.ui.filter}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSortModal = () => {
    if (!showSortModal) return null;

    return (
      <View style={styles.sortModal}>
        {sortOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sortOption,
              index < sortOptions.length - 1 && styles.sortOptionBorder,
            ]}
            onPress={() =>
              handleSortChange(option.value as SortOption, option.order)
            }
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.sortOptionText,
                option.value === sortBy &&
                  option.order === sortOrder &&
                  styles.sortOptionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSubcategoryRow = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.subcategoryRow}
      onPress={() => router.push(`/categories/${item.id}` as any)}
      activeOpacity={0.6}
    >
      <Text style={styles.subcategoryName} numberOfLines={1}>
        {item.name_en}
      </Text>
      <ChevronRight size={20} color={Colors.neutralMedium} strokeWidth={2} />
    </TouchableOpacity>
  );

  const renderSubcategorySeparator = () => <View style={styles.separator} />;

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={item}
        offerPricing={getProductOfferPricing(item, activeOffers, {
          categoryId: Number(id),
        })}
        onPress={() => router.push(`/product/${item.barcode}`)}
        onAddToCart={handleCardAddToCart}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <OfflineIndicator />
        <ActivityIndicator size="large" color={Colors.primary900} />
      </SafeAreaView>
    );
  }

  if (!category) {
    return (
      <SafeAreaView style={styles.container}>
        <OfflineIndicator />
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.errorText}>{t.ui.categoryNotFound}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category.name_en}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/search")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Search size={22} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => router.push("/(tabs)/cart")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ShoppingCart size={22} color={Colors.neutralCharcoal} />
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

      {/* Hero Image */}
      {renderHeroImage()}

      {/* Sticky Subcategory + Sort/Filter section */}
      <View style={styles.stickyControls}>
        {/* Subcategory Chips */}
        {renderSubcategoryChips()}

        {/* Sort & Filter Bar */}
        {renderSortFilterBar()}

        {/* Sort Modal */}
        {renderSortModal()}
      </View>

      {/* Products */}
      {products.length > 0 ? (
        <Animated.FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item, index) => `${item.barcode}-${index}`}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsGrid}
          showsVerticalScrollIndicator={false}
          style={{ opacity: refreshing ? 0.6 : 1 }}
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.5}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary900]}
              tintColor={Colors.primary900}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={Colors.primary900} />
              </View>
            ) : null
          }
        />
      ) : loading ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      ) : (
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.emptyText}>{t.ui.noProductsAvailable}</Text>
        </View>
      )}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralLight,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
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
  // Hero Image Styles
  heroImage: {
    width: "100%",
    height: HERO_HEIGHT,
  },
  heroGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.neutralWhite,
    marginBottom: Spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroDescription: {
    fontSize: 14,
    color: Colors.neutralWhite,
    opacity: 0.95,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Sticky controls wrapper
  stickyControls: {
    backgroundColor: Colors.neutralWhite,
    zIndex: 10,
  },
  // Subcategory Chips Styles
  chipsSection: {
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
    paddingVertical: Spacing.sm,
  },
  chipsContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    gap: 6,
  },
  chipSelected: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  chipTextSelected: {
    color: Colors.neutralWhite,
  },
  // Sort & Filter Bar Styles
  sortFilterBar: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
    gap: Spacing.sm,
  },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.neutralLight,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.neutralLight,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  // Sort Modal Styles
  sortModal: {
    backgroundColor: Colors.neutralWhite,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: "hidden",
    zIndex: 1000,
  },
  sortOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sortOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  sortOptionText: {
    fontSize: 15,
    color: Colors.neutralCharcoal,
  },
  sortOptionTextActive: {
    fontWeight: "700",
    color: Colors.primary900,
  },
  // Products Grid Styles
  productsGrid: {
    padding: Spacing.md,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  productItem: {
    width: "48%",
  },
  errorText: {
    fontSize: 16,
    color: Colors.neutralMedium,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.neutralMedium,
  },
  refreshingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  loadingMoreContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshingText: {
    fontSize: 13,
    color: Colors.neutralMedium,
    fontWeight: "500",
  },
  // Old Subcategory Row Styles (kept for backwards compatibility)
  listContent: {
    paddingVertical: 0,
  },
  subcategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    minHeight: 60,
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.neutralCharcoal,
    flex: 1,
    marginRight: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.neutralGray,
    marginLeft: Spacing.lg,
  },
});
