import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Promotion } from "@/types/promotion";
import type { Product } from "@/types";
import {
  getPromotion,
  getPromotionProducts,
} from "@/services/api/promotionApi";
import { CountdownTimer } from "@/components/CountdownTimer";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

const { width } = Dimensions.get("window");

export default function PromotionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPromotionDetails();
  }, [id]);

  const loadPromotionDetails = async () => {
    try {
      setLoading(true);
      const response = await getPromotion(Number(id));
      if (response.success) {
        setPromotion(response.data.promotion);

        // Load products if promotion is product-based
        if (response.data.promotion.applies_to === "products") {
          loadProducts();
        }
      }
    } catch (error) {
      console.error("Failed to load promotion details:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (page: number = 1) => {
    if (loadingProducts) return;

    try {
      setLoadingProducts(true);
      const response = await getPromotionProducts(Number(id), page);

      if (response.success) {
        if (page === 1) {
          setProducts(response.data.products);
        } else {
          setProducts([...products, ...response.data.products]);
        }

        const pagination = response.data.pagination;
        setHasMore(
          pagination ? pagination.current_page < pagination.last_page : false,
        );
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("Failed to load promotion products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingProducts) {
      loadProducts(currentPage + 1);
    }
  };

  const getDiscountInfo = () => {
    if (!promotion) return "";

    if (promotion.discount_type === "percentage") {
      return `${promotion.discount_value}% OFF`;
    } else if (promotion.discount_type === "fixed") {
      return `$${promotion.discount_value} OFF`;
    } else if (promotion.discount_type === "buy_x_get_y") {
      return `Buy X Get Y Free`;
    }
    return "Special Offer";
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <OfflineIndicator />
        {/* Header Skeleton */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backIcon}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Promotion Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Image Skeleton */}
          <SkeletonLoader width={width} height={250} borderRadius={0} />

          <View style={{ padding: 16 }}>
            {/* Badge Skeleton */}
            <SkeletonLoader width={120} height={32} borderRadius={16} />
            <View style={{ height: 12 }} />

            {/* Title Skeleton */}
            <SkeletonLoader width="80%" height={28} borderRadius={8} />
            <View style={{ height: 12 }} />

            {/* Description Skeleton */}
            <SkeletonLoader width="100%" height={16} borderRadius={4} />
            <View style={{ height: 6 }} />
            <SkeletonLoader width="90%" height={16} borderRadius={4} />
            <View style={{ height: 16 }} />

            {/* Timer Skeleton */}
            <SkeletonLoader width={200} height={24} borderRadius={12} />
            <View style={{ height: 24 }} />

            {/* Info Cards Skeleton */}
            <SkeletonLoader width="100%" height={80} borderRadius={12} />
            <View style={{ height: 16 }} />
            <SkeletonLoader width="100%" height={80} borderRadius={12} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!promotion) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Promotion not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promotion Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Promotion Image */}
        <Image source={{ uri: promotion.image_url }} style={styles.image} />

        {/* Content */}
        <View style={styles.content}>
          {/* Featured Badge */}
          {promotion.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>⭐ Featured Promotion</Text>
            </View>
          )}

          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{getDiscountInfo()}</Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>{promotion.title}</Text>
          <Text style={styles.description}>{promotion.description}</Text>

          {/* Countdown Timer */}
          {promotion.end_date && (
            <View style={styles.timerSection}>
              <CountdownTimer endDate={promotion.end_date} />
            </View>
          )}

          {/* Type Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag" size={20} color="#FF3B30" />
              <Text style={styles.infoLabel}>Promotion Type:</Text>
              <Text style={styles.infoValue}>
                {promotion.applies_to === "all"
                  ? "Sitewide"
                  : promotion.applies_to === "category"
                    ? "Category Sale"
                    : "Product Deal"}
              </Text>
            </View>

            {promotion.min_purchase && (
              <View style={styles.infoRow}>
                <Ionicons name="cash" size={20} color="#FF3B30" />
                <Text style={styles.infoLabel}>Min. Purchase:</Text>
                <Text style={styles.infoValue}>${promotion.min_purchase}</Text>
              </View>
            )}

            {promotion.max_discount && (
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={20} color="#FF3B30" />
                <Text style={styles.infoLabel}>Max. Discount:</Text>
                <Text style={styles.infoValue}>${promotion.max_discount}</Text>
              </View>
            )}
          </View>

          {/* Terms & Conditions */}
          {promotion.terms_conditions && (
            <View style={styles.termsSection}>
              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              <Text style={styles.termsText}>{promotion.terms_conditions}</Text>
            </View>
          )}

          {/* Products List (if product promotion) */}
          {promotion.applies_to === "products" && products.length > 0 && (
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Products on Sale</Text>
              <FlatList
                data={products}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onPress={() =>
                      router.push(`/products/${item.barcode}` as any)
                    }
                  />
                )}
                keyExtractor={(item) =>
                  (item.id || item.barcode)?.toString() || ""
                }
                numColumns={2}
                columnWrapperStyle={styles.productRow}
                scrollEnabled={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingProducts ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : null
                }
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backIcon: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  image: {
    width,
    height: 250,
    backgroundColor: "#f0f0f0",
  },
  content: {
    padding: 20,
  },
  featuredBadge: {
    backgroundColor: "#FFD700",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  featuredText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  discountBadge: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  discountText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },
  timerSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  termsSection: {
    backgroundColor: "#FFF9F0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  productsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
});
