import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  Dimensions,
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

import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { getCategoryProducts } from "@/services/api/categoryApi";
import type { Product, Category, SortOption, SortOrder } from "@/types";
import { useStore } from "@/store";
import { getCachedImage } from "@/services/cache/imageCache";
import OfflineIndicator from "@/components/OfflineIndicator";

const { width } = Dimensions.get("window");

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const { cart } = useStore();

  const cartItemsCount =
    cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Initial load only
  useEffect(() => {
    if (id) {
      loadCategoryData(true);
    }
  }, [id]);

  // Filter changes - smooth updates without full loading state
  useEffect(() => {
    if (id && !loading) {
      loadCategoryData(false);
    }
  }, [selectedSubcategoryId, sortBy, sortOrder]);

  const loadCategoryData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const params: any = {
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (selectedSubcategoryId) {
        params.subcategory_id = selectedSubcategoryId;
      }

      const response = await getCategoryProducts(Number(id), params);
      if (response.success) {
        setCategory(response.data.category);
        setProducts(response.data.products);

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
    }
  };

  const hasSubcategories =
    category?.subcategories && category.subcategories.length > 0;

  const sortOptions = [
    { label: "Popularity", value: "popularity", order: "desc" as SortOrder },
    { label: "Price: Low to High", value: "price", order: "asc" as SortOrder },
    { label: "Price: High to Low", value: "price", order: "desc" as SortOrder },
    { label: "Newest", value: "created_at", order: "desc" as SortOrder },
    { label: "Highest Rated", value: "rating", order: "desc" as SortOrder },
  ];

  const currentSortLabel =
    sortOptions.find((opt) => opt.value === sortBy && opt.order === sortOrder)
      ?.label || "Sort";

  const handleSortChange = (value: SortOption, order: SortOrder) => {
    setSortBy(value);
    setSortOrder(order);
    setShowSortModal(false);
  };

  const renderHeroImage = () => {
    if (!category?.image) return null;

    const heroImageUri = cachedHeroImage || category.image;

    return (
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
              All
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
        <Text style={styles.filterButtonText}>Filter</Text>
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
        onPress={() => router.push(`/product/${item.barcode}`)}
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
          <Text style={styles.errorText}>Category not found</Text>
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

      {/* Subcategory Chips */}
      {renderSubcategoryChips()}

      {/* Sort & Filter Bar */}
      {renderSortFilterBar()}

      {/* Sort Modal */}
      {renderSortModal()}

      {/* Products */}
      {refreshing ? (
        <View style={styles.refreshingContainer}>
          <ActivityIndicator size="small" color={Colors.primary900} />
        </View>
      ) : null}

      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.barcode.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsGrid}
          showsVerticalScrollIndicator={false}
          style={{ opacity: refreshing ? 0.6 : 1 }}
        />
      ) : loading ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      ) : (
        <View style={[styles.centered, { flex: 1 }]}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      )}
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
    height: 200,
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
