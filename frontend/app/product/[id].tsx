import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Share2,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Send,
  X,
  ThumbsUp,
  Check,
  User,
} from "lucide-react-native";
import { useStore } from "@/store";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { Toast } from "@/components/Toast";
import { getProduct, getProducts } from "@/services/api/productsApi";
import {
  getProductReviews,
  canReviewProduct,
  createReview,
  updateReview,
  markReviewHelpful,
  type CreateReviewPayload,
  type UpdateReviewPayload,
  type CanReviewResponse,
} from "@/services/api/reviewsApi";
import type { Product, Review } from "@/types";
import {
  fetchActiveOffersCached,
  getProductOfferPricing,
} from "@/utils/offerPricing";
import type { Offer } from "@/services/api/types";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { getMaxPerOrder } from "@/utils/quantityLimits";
import { Ionicons } from "@expo/vector-icons";
import OfflineIndicator from "@/components/OfflineIndicator";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const { getName, getDescription } = useLocalizedValue();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [canReview, setCanReview] = useState<CanReviewResponse["data"] | null>(
    null,
  );
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [favoriteAnimValue] = useState(new Animated.Value(1));
  const scrollViewRef = React.useRef<ScrollView>(null);
  const reviewsSectionY = React.useRef<number>(0);

  const {
    cart,
    addToCart,
    updateQuantity,
    favorites,
    toggleFavorite,
    isAuthenticated,
    fetchFavorites,
  } = useStore();
  const cartItem = cart?.items?.find(
    (item: { product: { barcode: number } }) =>
      item.product.barcode === Number(id),
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    description: false,
    nutrition: false,
    ingredients: false,
    specs: false,
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );

  useEffect(() => {
    if (id) {
      loadProduct();
      loadReviews();
      checkCanReview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch favorites on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      if (response.success) {
        setProduct(response.data.product);

        // Load related products from the same category
        if (
          response.data.product.categories &&
          response.data.product.categories.length > 0
        ) {
          const categoryId = response.data.product.categories[0].id;
          try {
            const relatedResponse = await getProducts({
              category_id: categoryId,
              per_page: 10,
            });
            if (relatedResponse.success) {
              // Filter out current product and limit to 10
              const filtered = relatedResponse.data.products
                .filter((p) => p.barcode !== response.data.product.barcode)
                .slice(0, 10);
              setRelatedProducts(filtered);
            }
          } catch (error) {
            console.error("Failed to load related products:", error);
          }
        }
      }
      try {
        const offers = await fetchActiveOffersCached();
        setActiveOffers(offers);
      } catch (error) {
        console.error("Failed to load active offers:", error);
        setActiveOffers([]);
      }
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await getProductReviews(id);
      // Handle both wrapped response {success, data} and direct array/paginated response
      if (response.data) {
        setReviews(response.data);
      } else if (Array.isArray(response)) {
        setReviews(response);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkCanReview = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await canReviewProduct(id);
      if (response.success) {
        setCanReview(response.data);
        // Store existing review if user has already reviewed
        if (response.data.existing_review) {
          setExistingReview(response.data.existing_review as Review);
        } else {
          setExistingReview(null);
        }
        // Auto-select first eligible order
        if (response.data.eligible_orders?.length > 0) {
          setSelectedOrderId(response.data.eligible_orders[0].order_id);
        }
      }
    } catch (error) {
      console.error("Failed to check review eligibility:", error);
    }
  };

  const handleEditReview = () => {
    if (existingReview) {
      setReviewRating(existingReview.rating);
      setReviewComment(existingReview.comment || "");
      setIsEditingReview(true);
      setShowReviewModal(true);
    }
  };

  const handleToggleFavorite = useCallback(async () => {
    if (!product) return;

    // Animate heart
    Animated.sequence([
      Animated.timing(favoriteAnimValue, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(favoriteAnimValue, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Use barcode as the consistent ID for favorites
    const favId = product.barcode || product.id || 0;
    await toggleFavorite(favId);
  }, [product, toggleFavorite, favoriteAnimValue]);

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) return;

    try {
      setSubmittingReview(true);

      if (isEditingReview && existingReview) {
        // Update existing review
        const payload: UpdateReviewPayload = {
          rating: reviewRating,
          comment: reviewComment.trim(),
        };
        await updateReview(existingReview.id, payload);
        setToastMessage("Review updated successfully!");
      } else {
        // Create new review
        if (!selectedOrderId) return;
        const payload: CreateReviewPayload = {
          product_id: Number(id),
          order_id: selectedOrderId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        };
        await createReview(payload);
        setToastMessage("Review submitted successfully!");
      }

      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
      setIsEditingReview(false);
      setToastType("success");
      setShowToast(true);

      // Reload reviews and eligibility
      loadReviews();
      checkCanReview();
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      setToastType("error");
      setToastMessage(error.message || "Failed to submit review");
      setShowToast(true);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMarkHelpful = async (reviewId: number) => {
    try {
      await markReviewHelpful(reviewId);
      setToastMessage("Marked as helpful!");
      setShowToast(true);
      loadReviews();
    } catch (error) {
      console.error("Failed to mark helpful:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container]}>
        <OfflineIndicator />

        {/* Header Skeleton */}
        <View style={styles.headerSkeleton}>
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1 }} />
          <SkeletonLoader width={40} height={40} borderRadius={20} />
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>

        <ScrollView>
          {/* Image Skeleton */}
          <SkeletonLoader width={width} height={width} />

          <View style={{ padding: Spacing.lg }}>
            {/* Title Skeleton */}
            <SkeletonLoader width="80%" height={24} borderRadius={8} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width="60%" height={20} borderRadius={8} />

            {/* Price Skeleton */}
            <View style={{ height: 16 }} />
            <SkeletonLoader width="40%" height={32} borderRadius={8} />

            {/* Description Skeleton */}
            <View style={{ height: 24 }} />
            <SkeletonLoader width="100%" height={16} borderRadius={8} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width="90%" height={16} borderRadius={8} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width="95%" height={16} borderRadius={8} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>{t.products.productNotFound}</Text>
      </SafeAreaView>
    );
  }

  // Use barcode as primary ID for consistency with favorites
  const favId = String(product.barcode || product.id);
  const isFavorite = favorites.includes(favId);
  const images = [product.image];
  const price = parseFloat(product.price?.toString() || "0");
  const salePrice = parseFloat(
    (product.sale_price || product.salePrice)?.toString() || "0",
  );
  const discount =
    salePrice > 0 && salePrice < price
      ? Math.round(((price - salePrice) / price) * 100)
      : 0;
  const basePrice = salePrice > 0 && salePrice < price ? salePrice : price;
  const offerPricing = getProductOfferPricing(product, activeOffers);
  const promoPrice =
    offerPricing && offerPricing.discountedPrice < basePrice
      ? offerPricing.discountedPrice
      : null;

  const handleAddToCart = async () => {
    // Check per-order quantity limit for restricted products
    const maxQty = getMaxPerOrder(product.barcode);
    if (maxQty !== null) {
      const existingQty = cartItem?.quantity || 0;
      if (existingQty + quantity > maxQty) {
        const limitMsg = (
          t.quantityLimit?.maxPerOrder ||
          "Maximum {{max}} units per order for this product."
        ).replace("{{max}}", String(maxQty));
        setToastType("error");
        setToastMessage(limitMsg);
        setShowToast(true);
        return;
      }
    }

    try {
      if (cartItem) {
        await updateQuantity(cartItem.id, cartItem.quantity + quantity);
      } else {
        await addToCart(product.barcode, quantity);
      }
      setToastType("success");
      setToastMessage(`${quantity} ${t.cart.itemAdded}`);
      setShowToast(true);
    } catch (error) {
      const err: any = error;
      const msg = err?.message || err?.error || t.products.failedToAddToCart;
      setToastType("error");
      setToastMessage(msg);
      setShowToast(true);
    }
  };

  const handleBuyNow = async () => {
    if ((product.stock_quantity || 0) <= 0 || product.is_in_stock === false) {
      setToastType("error");
      setToastMessage(t.products.outOfStock);
      setShowToast(true);
      return;
    }
    await handleAddToCart();
    router.push("/(tabs)/cart");
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.headerButton}
      >
        <ArrowLeft size={24} color={Colors.neutralCharcoal} />
      </TouchableOpacity>
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={[styles.headerButton, isFavorite && styles.favoriteActive]}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale: favoriteAnimValue }] }}>
            <Heart
              size={24}
              color={isFavorite ? Colors.neutralWhite : Colors.neutralCharcoal}
              fill={isFavorite ? Colors.neutralWhite : "none"}
            />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              const productName = getName(product) || "Product";
              const productUrl = `https://elbaraka.com/product/${product.barcode}`;
              const deepLinkUrl = `elbaraka://product/${product.barcode}`;

              // Build dynamic share message with pricing info
              let shareMessage = `🛒 ${productName}\n`;

              if (promoPrice && offerPricing) {
                const promoDiscount = Math.round(
                  ((offerPricing.originalPrice - offerPricing.discountedPrice) /
                    offerPricing.originalPrice) *
                    100,
                );
                shareMessage += `🔥 ${promoDiscount}% OFF! Now ${offerPricing.discountedPrice.toFixed(2)} EGP (was ${offerPricing.originalPrice.toFixed(2)} EGP)\n`;
              } else if (discount > 0) {
                shareMessage += `💰 ${discount}% OFF! Now ${basePrice.toFixed(2)} EGP (was ${price.toFixed(2)} EGP)\n`;
              } else {
                shareMessage += `💰 ${basePrice.toFixed(2)} EGP\n`;
              }

              shareMessage += `\n🛍️ Shop on El Baraka!\n${productUrl}`;

              await Share.share({
                message: shareMessage,
                title: productName,
                url: Platform.OS === "ios" ? productUrl : undefined,
              });
            } catch (error) {
              // User cancelled sharing, no action needed
            }
          }}
          style={styles.headerButton}
        >
          <Share2 size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/cart")}
          style={styles.headerButton}
        >
          <ShoppingCart size={24} color={Colors.neutralCharcoal} />
          {cart?.items_count > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.items_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImageGallery = () => (
    <View style={styles.imageSection}>
      <Image
        source={{ uri: images[selectedImageIndex] }}
        style={styles.mainImage}
        resizeMode="contain"
      />
      {discount > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{discount}%</Text>
        </View>
      )}
      {offerPricing && offerPricing.discountedPrice < basePrice && (
        <View
          style={[
            styles.discountBadge,
            { top: 60, backgroundColor: Colors.accentOrange },
          ]}
        >
          <Text style={styles.discountText}>🎁 PROMO</Text>
        </View>
      )}
      {product.is_featured && (
        <View
          style={[
            styles.discountBadge,
            {
              top:
                discount > 0 ||
                (offerPricing && offerPricing.discountedPrice < basePrice)
                  ? 100
                  : 60,
              backgroundColor: Colors.accentYellow,
              paddingHorizontal: 16,
            },
          ]}
        >
          <Text
            style={[styles.discountText, { color: Colors.neutralCharcoal }]}
          >
            ⭐ FEATURED
          </Text>
        </View>
      )}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {images.map((img, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImageIndex(index)}
              style={[
                styles.thumbnail,
                selectedImageIndex === index && styles.thumbnailActive,
              ]}
            >
              <Image source={{ uri: img }} style={styles.thumbnailImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderProductInfo = () => (
    <View style={styles.productInfo}>
      {/* Product Name */}
      <Text style={styles.productName}>{getName(product)}</Text>

      {/* Rating and Reviews */}
      <TouchableOpacity
        onPress={() => {
          if (reviewsSectionY.current > 0) {
            scrollViewRef.current?.scrollTo({
              y: reviewsSectionY.current,
              animated: true,
            });
          }
        }}
        style={styles.ratingRow}
      >
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={18}
              fill={
                star <= (product.rating || 0) ? Colors.accentYellow : "none"
              }
              color={
                star <= (product.rating || 0)
                  ? Colors.accentYellow
                  : Colors.neutralGray
              }
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {Number(product.rating || 0).toFixed(1)} ({product.review_count || 0}{" "}
          {t.products.reviews})
        </Text>
        <ChevronDown
          size={16}
          color={Colors.primary900}
          style={{ transform: [{ rotate: "-90deg" }] }}
        />
      </TouchableOpacity>

      {/* Price Section with Enhanced UI */}
      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.priceLabel}>{t.products.price}</Text>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text style={styles.currentPrice}>
                {t.common.currency}{" "}
                {promoPrice !== null
                  ? promoPrice.toFixed(2)
                  : salePrice > 0 && salePrice < price
                    ? salePrice.toFixed(2)
                    : price.toFixed(2)}
              </Text>
              <Text style={styles.unit}>
                {product.packaging ? `/ ${product.packaging}` : ""}
              </Text>
            </View>
          </View>
          {(discount > 0 || promoPrice !== null) && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                {t.products.save} {t.common.currency}{" "}
                {promoPrice !== null
                  ? (basePrice - promoPrice).toFixed(2)
                  : (price - salePrice).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {(promoPrice !== null || (salePrice > 0 && salePrice < price)) && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Text style={styles.oldPrice}>
              {t.common.currency}{" "}
              {promoPrice !== null ? basePrice.toFixed(2) : price.toFixed(2)}
            </Text>
            {offerPricing?.code && (
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{offerPricing.code}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Stock Status with Better UI */}
      <View style={styles.stockSection}>
        {product.is_in_stock !== false && (product.stock_quantity || 0) > 0 ? (
          <>
            <View style={[styles.stockIndicator, styles.inStockIndicator]}>
              <View style={styles.stockDot} />
              <Text style={styles.stockText}>{t.products.inStock}</Text>
            </View>
            {product.stock_quantity && product.stock_quantity <= 3 && (
              <View style={styles.limitedStockBadge}>
                <Text style={styles.limitedStockText}>
                  ⚠️ {t.products.lowStock}{" "}
                  {t.products.onlyLeft.replace(
                    "{count}",
                    product.stock_quantity.toString(),
                  )}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.stockIndicator, styles.outOfStockIndicator]}>
            <Text style={styles.outOfStockText}>{t.products.outOfStock}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderQuantitySelector = () => {
    const maxQty = getMaxPerOrder(product.barcode);
    const existingQty = cartItem?.quantity || 0;
    const canIncrease = maxQty === null || existingQty + quantity < maxQty;

    return (
      <View style={styles.quantitySection}>
        <Text style={styles.quantityLabel}>{t.products.quantity}</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            style={styles.quantityButton}
            disabled={quantity <= 1}
          >
            <Minus
              size={20}
              color={quantity <= 1 ? Colors.neutralGray : Colors.primary900}
            />
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <TouchableOpacity
            onPress={() => {
              if (canIncrease) setQuantity(quantity + 1);
            }}
            style={styles.quantityButton}
            disabled={!canIncrease}
          >
            <Plus
              size={20}
              color={canIncrease ? Colors.primary900 : Colors.neutralGray}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderExpandableSection = (
    key: keyof typeof expandedSections,
    title: string,
    content: React.ReactNode,
  ) => (
    <View style={styles.expandableSection}>
      <TouchableOpacity
        onPress={() => toggleSection(key)}
        style={styles.expandableHeader}
      >
        <Text style={styles.expandableTitle}>{title}</Text>
        {expandedSections[key] ? (
          <ChevronUp size={20} color={Colors.neutralCharcoal} />
        ) : (
          <ChevronDown size={20} color={Colors.neutralCharcoal} />
        )}
      </TouchableOpacity>
      {expandedSections[key] && (
        <View style={styles.expandableContent}>
          <Text>{content}</Text>
        </View>
      )}
    </View>
  );

  const renderCategories = () => {
    if (!product.categories || product.categories.length === 0) return null;
    return (
      <View style={styles.categoriesSection}>
        <Text style={styles.categoriesTitle}>{t.nav.categories}</Text>
        <View style={styles.categoryTags}>
          {product.categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryTag}
              onPress={() => router.push(`/categories/${category.id}`)}
            >
              <Text style={styles.categoryText}>{getName(category)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDescription = () =>
    renderExpandableSection(
      "description",
      t.products.aboutThisProduct,
      <View>
        <Text style={styles.descriptionText}>
          {getDescription(product) || t.products.noDescription}
        </Text>
      </View>,
    );

  const renderNutrition = () => {
    // Try to parse nutrition_facts from database (JSON field)
    let facts = null;
    if (product.nutrition_facts) {
      try {
        facts =
          typeof product.nutrition_facts === "string"
            ? JSON.parse(product.nutrition_facts)
            : product.nutrition_facts;
      } catch (e) {
        console.error("Failed to parse nutrition facts:", e);
      }
    }
    // Fallback to old nutritionFacts property
    if (!facts && product.nutritionFacts) {
      facts = product.nutritionFacts;
    }

    if (!facts) return null;

    return renderExpandableSection(
      "nutrition",
      "Nutrition Facts",
      <View style={styles.nutritionTable}>
        {facts.servingSize && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Serving Size</Text>
            <Text style={styles.nutritionValue}>{facts.servingSize}</Text>
          </View>
        )}
        {facts.calories && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>{facts.calories}</Text>
          </View>
        )}
        {facts.totalFat && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Total Fat</Text>
            <Text style={styles.nutritionValue}>{facts.totalFat}</Text>
          </View>
        )}
        {facts.saturatedFat && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Saturated Fat</Text>
            <Text style={styles.nutritionValue}>{facts.saturatedFat}</Text>
          </View>
        )}
        {facts.cholesterol && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Cholesterol</Text>
            <Text style={styles.nutritionValue}>{facts.cholesterol}</Text>
          </View>
        )}
        {facts.sodium && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Sodium</Text>
            <Text style={styles.nutritionValue}>{facts.sodium}</Text>
          </View>
        )}
        {facts.totalCarbohydrate && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Total Carbohydrate</Text>
            <Text style={styles.nutritionValue}>{facts.totalCarbohydrate}</Text>
          </View>
        )}
        {facts.protein && (
          <View style={styles.nutritionRow}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{facts.protein}</Text>
          </View>
        )}
      </View>,
    );
  };

  const renderIngredients = () => {
    if (!product.ingredients) return null;
    return renderExpandableSection(
      "ingredients",
      "Ingredients",
      <Text style={styles.descriptionText}>{product.ingredients}</Text>,
    );
  };

  const renderSpecs = () =>
    renderExpandableSection(
      "specs",
      "Product Details & Specifications",
      <View style={styles.specsTable}>
        {product.packaging && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Packaging</Text>
            <Text style={styles.specValue}>{product.packaging}</Text>
          </View>
        )}
        {product.weight && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Package Weight</Text>
            <Text style={styles.specValue}>{product.weight}g</Text>
          </View>
        )}
      </View>,
    );

  const renderAllergens = () => {
    if (!product.allergens || product.allergens.length === 0) return null;
    return (
      <View style={styles.allergensSection}>
        <Text style={styles.allergensTitle}>⚠️ Allergen Information</Text>
        <View style={styles.allergenTags}>
          {product.allergens.map((allergen, index) => (
            <View key={index} style={styles.allergenTag}>
              <Text style={styles.allergenText}>{allergen}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderReviewsSection = () => {
    // Use product rating from database, but only show if there are actual reviews
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 ? Number(product?.rating || 0) : 0;

    // Calculate rating distribution
    const ratingCounts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating - 1]++;
      }
    });

    return (
      <View style={styles.reviewsSection}>
        {/* Reviews Header */}
        <View style={styles.reviewsHeader}>
          <View style={styles.reviewsTitleRow}>
            <MessageCircle size={22} color={Colors.primary900} />
            <Text style={styles.reviewsSectionTitle}>Customer Reviews</Text>
          </View>
          {canReview?.can_review && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => {
                setIsEditingReview(false);
                setReviewRating(5);
                setReviewComment("");
                setShowReviewModal(true);
              }}
            >
              <Plus size={20} color={Colors.neutralWhite} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>

        {/* Rating Summary */}
        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryLeft}>
            <Text style={styles.bigRating}>{averageRating.toFixed(1)}</Text>
            <View style={styles.starsRowLarge}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  fill={
                    star <= Math.round(averageRating)
                      ? Colors.accentYellow
                      : Colors.neutralLight
                  }
                  color={
                    star <= Math.round(averageRating)
                      ? Colors.accentYellow
                      : Colors.neutralLight
                  }
                />
              ))}
            </View>
            <Text style={styles.totalReviews}>
              Based on {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </Text>
          </View>

          <View style={styles.ratingBarsContainer}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingCounts[rating - 1];
              const percentage =
                reviewCount > 0 ? (count / reviewCount) * 100 : 0;
              return (
                <View key={rating} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{rating}</Text>
                  <Star
                    size={12}
                    color={Colors.accentYellow}
                    fill={Colors.accentYellow}
                  />
                  <View style={styles.ratingBarBg}>
                    <View
                      style={[
                        styles.ratingBarFill,
                        { width: `${percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Purchase Required Notice */}
        {isAuthenticated &&
          canReview &&
          !canReview.can_review &&
          !canReview.has_purchased && (
            <View style={styles.purchaseNotice}>
              <View style={styles.purchaseNoticeIcon}>
                <ShoppingCart size={20} color={Colors.primary900} />
              </View>
              <View style={styles.purchaseNoticeText}>
                <Text style={styles.purchaseNoticeTitle}>
                  Purchase to Review
                </Text>
                <Text style={styles.purchaseNoticeDesc}>
                  Only customers who have purchased this product can leave a
                  review
                </Text>
              </View>
            </View>
          )}

        {/* Already Reviewed Notice with Edit Button */}
        {canReview?.already_reviewed && existingReview && (
          <View
            style={[
              styles.purchaseNotice,
              { backgroundColor: Colors.primary900 + "10" },
            ]}
          >
            <View
              style={[
                styles.purchaseNoticeIcon,
                { backgroundColor: Colors.primary900 },
              ]}
            >
              <Check size={20} color={Colors.neutralWhite} />
            </View>
            <View style={[styles.purchaseNoticeText, { flex: 1 }]}>
              <Text style={styles.purchaseNoticeTitle}>
                You&apos;ve Already Reviewed
              </Text>
              <Text style={styles.purchaseNoticeDesc}>
                Thank you for sharing your feedback!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editReviewButton}
              onPress={handleEditReview}
            >
              <Text style={styles.editReviewButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reviews List */}
        {reviewsLoading ? (
          <View style={styles.reviewsLoading}>
            <ActivityIndicator size="small" color={Colors.primary900} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.slice(0, 3).map((review, index) => (
              <View key={review.id || index} style={styles.reviewCard}>
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      {review.user?.avatar ? (
                        <Image
                          source={{ uri: review.user.avatar }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <User size={20} color={Colors.neutralMedium} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.reviewerName}>
                        {review.user?.full_name ||
                          review.user?.first_name ||
                          "Customer"}
                      </Text>
                      <View style={styles.reviewMeta}>
                        <View style={styles.verifiedBadge}>
                          <Check size={10} color={Colors.primary700} />
                          <Text style={styles.verifiedText}>
                            Verified Purchase
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        fill={
                          star <= review.rating
                            ? Colors.accentYellow
                            : Colors.neutralLight
                        }
                        color={
                          star <= review.rating
                            ? Colors.accentYellow
                            : Colors.neutralLight
                        }
                      />
                    ))}
                  </View>
                </View>

                <Text style={styles.reviewComment}>{review.comment}</Text>

                <View style={styles.reviewFooter}>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.helpfulButton}
                    onPress={() => handleMarkHelpful(review.id)}
                  >
                    <ThumbsUp size={14} color={Colors.neutralMedium} />
                    <Text style={styles.helpfulText}>
                      Helpful{" "}
                      {review.helpful_count ? `(${review.helpful_count})` : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {reviews.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllReviews}
                onPress={() =>
                  router.push(`/product/reviews/${product?.barcode}`)
                }
              >
                <Text style={styles.viewAllReviewsText}>
                  View All {reviews.length} Reviews
                </Text>
                <ChevronDown
                  size={18}
                  color={Colors.primary900}
                  style={{ transform: [{ rotate: "-90deg" }] }}
                />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <MessageCircle size={48} color={Colors.neutralLight} />
            <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
            <Text style={styles.noReviewsText}>
              Be the first to share your experience with this product
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowReviewModal(false);
        setIsEditingReview(false);
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowReviewModal(false);
              setIsEditingReview(false);
            }}
          >
            <X size={24} color={Colors.neutralCharcoal} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditingReview ? "Edit Your Review" : "Write a Review"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Info */}
          <View style={styles.modalProductInfo}>
            <Image
              source={{ uri: product?.image }}
              style={styles.modalProductImage}
            />
            <Text style={styles.modalProductName} numberOfLines={2}>
              {getName(product)}
            </Text>
          </View>

          {/* Order Selection - only show when creating new review */}
          {!isEditingReview &&
            canReview?.eligible_orders &&
            canReview.eligible_orders.length > 1 && (
              <View style={styles.orderSelection}>
                <Text style={styles.orderSelectionLabel}>Select Order</Text>
                {canReview.eligible_orders.map((order) => (
                  <TouchableOpacity
                    key={order.order_id}
                    style={[
                      styles.orderOption,
                      selectedOrderId === order.order_id &&
                        styles.orderOptionSelected,
                    ]}
                    onPress={() => setSelectedOrderId(order.order_id)}
                  >
                    <View style={styles.orderOptionRadio}>
                      {selectedOrderId === order.order_id && (
                        <View style={styles.orderOptionRadioInner} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.orderOptionNumber}>
                        Order #{order.order_number}
                      </Text>
                      <Text style={styles.orderOptionDate}>
                        Delivered{" "}
                        {new Date(order.delivered_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {/* Rating Selection */}
          <View style={styles.ratingSelection}>
            <Text style={styles.ratingLabel}>Your Rating</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.ratingStar}
                >
                  <Star
                    size={36}
                    fill={
                      star <= reviewRating
                        ? Colors.accentYellow
                        : Colors.neutralLight
                    }
                    color={
                      star <= reviewRating
                        ? Colors.accentYellow
                        : Colors.neutralLight
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingDescription}>
              {reviewRating === 5
                ? "Excellent!"
                : reviewRating === 4
                  ? "Very Good"
                  : reviewRating === 3
                    ? "Good"
                    : reviewRating === 2
                      ? "Fair"
                      : "Poor"}
            </Text>
          </View>

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Your Review</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience with this product..."
              placeholderTextColor={Colors.neutralMedium}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <Text style={styles.commentHint}>
              Min. 10 characters ({reviewComment.length}/500)
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[
              styles.submitReviewButton,
              (!reviewComment.trim() || reviewComment.length < 10) &&
                styles.submitReviewDisabled,
            ]}
            onPress={handleSubmitReview}
            disabled={
              submittingReview ||
              !reviewComment.trim() ||
              reviewComment.length < 10
            }
          >
            {submittingReview ? (
              <ActivityIndicator size="small" color={Colors.neutralWhite} />
            ) : (
              <>
                <Send size={20} color={Colors.neutralWhite} />
                <Text style={styles.submitReviewText}>
                  {isEditingReview ? "Update Review" : "Submit Review"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderRelatedProducts = () => {
    if (relatedProducts.length === 0) return null;
    return (
      <View style={styles.relatedSection}>
        <Text style={styles.sectionTitle}>{t.products.youMightLike}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedScroll}
        >
          {relatedProducts.map((item) => {
            const itemPrice = parseFloat(item.price?.toString() || "0");
            const itemSalePrice = parseFloat(
              (item.sale_price || item.salePrice)?.toString() || "0",
            );
            const finalPrice =
              itemSalePrice > 0 && itemSalePrice < itemPrice
                ? itemSalePrice
                : itemPrice;
            const itemDiscount =
              itemSalePrice > 0 && itemSalePrice < itemPrice
                ? Math.round(((itemPrice - itemSalePrice) / itemPrice) * 100)
                : 0;
            const itemOutOfStock =
              item.is_in_stock === false || (item.stock_quantity || 0) <= 0;

            return (
              <TouchableOpacity
                key={item.barcode || item.id}
                style={styles.relatedCard}
                onPress={() => router.push(`/product/${item.barcode}`)}
                activeOpacity={0.85}
              >
                {itemDiscount > 0 && (
                  <View style={styles.relatedDiscountBadge}>
                    <Text style={styles.relatedDiscountText}>
                      -{itemDiscount}%
                    </Text>
                  </View>
                )}
                <Image
                  source={{ uri: item.image }}
                  style={styles.relatedImage}
                />
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedName} numberOfLines={2}>
                    {getName(item)}
                  </Text>
                  {item.packaging ? (
                    <Text style={styles.relatedUnit}>{item.packaging}</Text>
                  ) : null}
                  <View style={styles.relatedPriceRow}>
                    <Text style={styles.relatedPrice} numberOfLines={1}>
                      {t.common.currency} {finalPrice.toFixed(2)}
                    </Text>
                    {itemDiscount > 0 && (
                      <Text style={styles.relatedOldPrice} numberOfLines={1}>
                        {t.common.currency} {itemPrice.toFixed(2)}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.relatedAddToCartBtn,
                      itemOutOfStock && styles.relatedAddToCartBtnDisabled,
                    ]}
                    onPress={async (e) => {
                      e.stopPropagation();
                      if (itemOutOfStock) {
                        setToastType("error");
                        setToastMessage(t.products.outOfStock);
                        setShowToast(true);
                        return;
                      }
                      try {
                        await addToCart(item.barcode, 1);
                        setToastType("success");
                        setToastMessage(t.cart.itemAdded);
                        setShowToast(true);
                      } catch (err: any) {
                        const msg =
                          err?.message ||
                          err?.error ||
                          t.products.failedToAddToCart;
                        setToastType("error");
                        setToastMessage(msg);
                        setShowToast(true);
                      }
                    }}
                    disabled={itemOutOfStock}
                  >
                    <ShoppingCart
                      size={18}
                      color={
                        itemOutOfStock
                          ? Colors.neutralMedium
                          : Colors.neutralWhite
                      }
                    />
                    <Text
                      style={[
                        styles.relatedAddToCartText,
                        itemOutOfStock && styles.relatedAddToCartTextDisabled,
                      ]}
                    >
                      {itemOutOfStock
                        ? t.products.outOfStock
                        : t.cart.addToCart}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderBottomBar = () => (
    <View style={styles.bottomBar}>
      <View style={styles.bottomPriceSection}>
        <Text style={styles.bottomLabel}>Total Price</Text>
        <Text style={styles.bottomPrice}>
          EGP {((product.salePrice || product.price) * quantity).toFixed(2)}
        </Text>
      </View>
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            !product.inStock && styles.buttonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={(product.stock_quantity || 0) <= 0}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.buyNowButton,
            (product.stock_quantity || 0) <= 0 && styles.buttonDisabled,
          ]}
          onPress={handleBuyNow}
          disabled={(product.stock_quantity || 0) <= 0}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineIndicator />
      {renderHeader()}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderImageGallery()}
        {getMaxPerOrder(product.barcode) !== null && (
          <View style={styles.quantityLimitBanner}>
            <View style={styles.quantityLimitIconContainer}>
              <Ionicons
                name="alert-circle"
                size={18}
                color={Colors.accentOrange}
              />
            </View>
            <Text style={styles.quantityLimitBannerText}>
              {(
                t.quantityLimit?.maxPerOrder ||
                "Maximum {{max}} units per order for this product."
              ).replace("{{max}}", String(getMaxPerOrder(product.barcode)))}
            </Text>
          </View>
        )}
        {renderProductInfo()}
        {renderCategories()}
        {renderQuantitySelector()}
        {renderAllergens()}
        {renderDescription()}
        {renderNutrition()}
        {renderIngredients()}
        {renderSpecs()}
        <View
          onLayout={(e) => {
            reviewsSectionY.current = e.nativeEvent.layout.y;
          }}
          collapsable={false}
        >
          {renderReviewsSection()}
        </View>
        {renderRelatedProducts()}
        <View style={{ height: 120 }} />
      </ScrollView>
      {renderBottomBar()}
      {renderReviewModal()}
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
    backgroundColor: Colors.neutralCloud,
  },
  quantityLimitBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentOrange + "14",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accentOrange + "30",
  },
  quantityLimitIconContainer: {
    marginRight: 10,
  },
  quantityLimitBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.accentOrange,
    lineHeight: 18,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteActive: {
    backgroundColor: Colors.accentRed,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.primary900,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: Colors.neutralWhite,
    fontSize: 10,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: Colors.neutralWhite,
    paddingBottom: Spacing.md,
  },
  mainImage: {
    width: width,
    height: width,
    resizeMode: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: Colors.neutralWhite,
    fontSize: 14,
    fontWeight: "bold",
  },
  thumbnailScroll: {
    marginTop: Spacing.md,
  },
  thumbnailContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  thumbnailActive: {
    borderColor: Colors.primary900,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productInfo: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  productName: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
  },
  brand: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  ratingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  currentPrice: {
    fontSize: Typography.h2,
    fontWeight: "bold",
    color: Colors.primary900,
  },
  unit: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  oldPrice: {
    fontSize: Typography.bodyLarge,
    color: Colors.neutralMedium,
    textDecorationLine: "line-through",
  },
  saveText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentLime,
    fontWeight: "600",
  },
  offerNote: {
    fontSize: Typography.bodySmall,
    color: Colors.accentOrange,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary700,
  },
  stockText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary700,
    fontWeight: "600",
  },
  limitedStock: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentOrange,
    marginLeft: Spacing.sm,
  },
  outOfStock: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: "600",
  },
  quantitySection: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
    minWidth: 40,
    textAlign: "center",
  },
  allergensSection: {
    backgroundColor: Colors.accentRed + "10",
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  allergensTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.accentRed,
    marginBottom: Spacing.sm,
  },
  allergenTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  allergenTag: {
    backgroundColor: Colors.neutralWhite,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accentRed,
  },
  allergenText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: "600",
  },
  categoriesSection: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  categoriesTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  categoryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryTag: {
    backgroundColor: Colors.primary900 + "15",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary900 + "30",
  },
  categoryText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: "600",
  },
  arabicSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  arabicLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
    textAlign: "right",
  },
  arabicText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  featuredBadge: {
    color: Colors.accentYellow,
    fontWeight: "bold",
  },
  expandableSection: {
    backgroundColor: Colors.neutralWhite,
    marginTop: Spacing.sm,
  },
  expandableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  expandableTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
  },
  expandableContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  descriptionText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    lineHeight: 22,
  },
  nutritionTable: {
    gap: Spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  nutritionLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  nutritionValue: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    fontWeight: "600",
  },
  specsTable: {
    gap: 0,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  specLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  specValue: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontWeight: "600",
  },
  relatedSection: {
    backgroundColor: Colors.neutralWhite,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  relatedScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  relatedCard: {
    width: 160,
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.neutralLight,
    marginRight: Spacing.sm,
  },
  relatedImage: {
    width: "100%",
    height: 160,
    resizeMode: "contain",
    backgroundColor: Colors.neutralLight,
  },
  relatedInfo: {
    padding: Spacing.sm,
  },
  relatedName: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
    minHeight: 40,
  },
  relatedPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  relatedPrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.primary900,
    flexShrink: 1,
  },
  relatedOldPrice: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textDecorationLine: "line-through",
    flexShrink: 1,
  },
  relatedUnit: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: -2,
  },
  relatedDiscountBadge: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  relatedDiscountText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: "bold",
  },
  relatedAddToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  relatedAddToCartBtnDisabled: {
    backgroundColor: Colors.neutralLight,
  },
  relatedAddToCartText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralWhite,
  },
  relatedAddToCartTextDisabled: {
    color: Colors.neutralMedium,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  bottomPriceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  bottomPrice: {
    fontSize: Typography.h3,
    fontWeight: "bold",
    color: Colors.primary900,
  },
  bottomActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: Colors.neutralLight,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartText: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.primary900,
  },
  buyNowButton: {
    flex: 1,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.neutralWhite,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Enhanced UI Styles
  priceContainer: {
    backgroundColor: Colors.primary900 + "08",
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  priceLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  savingsBadge: {
    backgroundColor: Colors.accentLime + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentLime,
  },
  savingsText: {
    fontSize: Typography.bodySmall,
    color: Colors.accentLime,
    fontWeight: "700",
  },
  codeBadge: {
    backgroundColor: Colors.accentOrange + "20",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accentOrange,
  },
  codeText: {
    fontSize: Typography.bodySmall,
    color: Colors.accentOrange,
    fontWeight: "700",
  },
  stockSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stockIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inStockIndicator: {
    backgroundColor: Colors.primary700 + "15",
  },
  outOfStockIndicator: {
    backgroundColor: Colors.accentRed + "15",
    paddingHorizontal: Spacing.md,
  },
  outOfStockText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: "700",
  },
  limitedStockBadge: {
    backgroundColor: Colors.accentOrange + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentOrange + "40",
  },
  limitedStockText: {
    fontSize: Typography.bodySmall,
    color: Colors.accentOrange,
    fontWeight: "600",
  },

  // Reviews Section Styles
  reviewsSection: {
    backgroundColor: Colors.neutralWhite,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  reviewsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewsSectionTitle: {
    fontSize: Typography.h4,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
  },
  writeReviewButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary900,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  writeReviewText: {
    fontSize: Typography.bodySmall,
    fontWeight: "600",
    color: Colors.neutralWhite,
  },
  ratingSummaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.neutralCloud,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ratingSummaryLeft: {
    alignItems: "center",
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.neutralLight,
    minWidth: 100,
  },
  bigRating: {
    fontSize: 40,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
  },
  starsRowLarge: {
    flexDirection: "row",
    gap: 2,
    marginVertical: Spacing.xs,
  },
  totalReviews: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    textAlign: "center",
  },
  ratingBarsContainer: {
    flex: 1,
    paddingLeft: Spacing.md,
    justifyContent: "center",
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBarLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralCharcoal,
    width: 12,
    textAlign: "right",
  },
  ratingBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.neutralLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: Colors.accentYellow,
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    width: 24,
  },
  purchaseNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accentYellow + "15",
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  purchaseNoticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentYellow,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseNoticeText: {
    flex: 1,
  },
  purchaseNoticeTitle: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  purchaseNoticeDesc: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  editReviewButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  editReviewButtonText: {
    fontSize: Typography.bodySmall,
    fontWeight: "600",
    color: Colors.neutralWhite,
  },
  reviewsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  reviewsList: {
    gap: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    padding: Spacing.md,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  reviewerName: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary700 + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    color: Colors.primary700,
    fontWeight: "600",
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    paddingTop: Spacing.sm,
  },
  reviewDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  helpfulText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  viewAllReviews: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    marginTop: Spacing.sm,
  },
  viewAllReviewsText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.primary900,
  },
  noReviews: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  noReviewsTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  noReviewsText: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  // Review Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.neutralWhite,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  modalTitle: {
    fontSize: Typography.h4,
    fontWeight: "bold",
    color: Colors.neutralCharcoal,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  modalProductInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.neutralCloud,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.neutralLight,
  },
  modalProductName: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  orderSelection: {
    marginBottom: Spacing.lg,
  },
  orderSelectionLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  orderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  orderOptionSelected: {
    borderColor: Colors.primary900,
    backgroundColor: Colors.primary900 + "10",
  },
  orderOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
  orderOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary900,
  },
  orderOptionNumber: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
  },
  orderOptionDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  ratingSelection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  ratingStars: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  ratingStar: {
    padding: 4,
  },
  ratingDescription: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  commentSection: {
    marginBottom: Spacing.lg,
  },
  commentLabel: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.neutralLight,
  },
  commentHint: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
    textAlign: "right",
  },
  modalFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
  },
  submitReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
  },
  submitReviewDisabled: {
    opacity: 0.5,
  },
  submitReviewText: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.neutralWhite,
  },
});
