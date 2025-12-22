import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
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
} from "lucide-react-native";
import { useStore } from "@/store";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { Toast } from "@/components/Toast";
import { getProduct } from "@/services/api/productsApi";
import type { Product } from "@/types";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const { cart, addToCart, updateQuantity, favorites, toggleFavorite } =
    useStore();
  const cartItem = cart?.items?.find(
    (item) => item.product.barcode === Number(id)
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

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      if (response.success) {
        setProduct(response.data.product);
      }
    } catch (error) {
      console.error("Failed to load product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary900} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Product not found</Text>
      </SafeAreaView>
    );
  }

  const productId = product.barcode?.toString() || product.id?.toString() || "";
  const isFavorite = favorites.includes(productId);
  const images = [product.image];
  const price = parseFloat(product.price?.toString() || "0");
  const salePrice = parseFloat(
    (product.sale_price || product.salePrice)?.toString() || "0"
  );
  const discount =
    salePrice > 0 && salePrice < price
      ? Math.round(((price - salePrice) / price) * 100)
      : 0;

  // Related products would need a separate API call - skipping for now
  const relatedProducts: Product[] = [];

  const handleAddToCart = async () => {
    try {
      if (cartItem) {
        await updateQuantity(cartItem.id, cartItem.quantity + quantity);
      } else {
        await addToCart(product.barcode, quantity);
      }
      setToastMessage(
        `${quantity} ${quantity > 1 ? "items" : "item"} added to cart`
      );
      setShowToast(true);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      setToastMessage("Failed to add to cart");
      setShowToast(true);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    router.push("/cart");
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
          onPress={() => toggleFavorite(product.id)}
          style={styles.headerButton}
        >
          <Heart
            size={24}
            color={isFavorite ? Colors.primary900 : Colors.neutralCharcoal}
            fill={isFavorite ? Colors.primary900 : "none"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
          <Share2 size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/cart")}
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
      />
      {discount > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{discount}%</Text>
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
      <Text style={styles.productName}>{product.name_en || product.name}</Text>

      <TouchableOpacity
        onPress={() => router.push(`/product/${product.barcode}/reviews`)}
        style={styles.ratingRow}
      >
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
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
          {product.rating || 0} ({product.review_count || 0} reviews)
        </Text>
      </TouchableOpacity>

      <View style={styles.priceRow}>
        <Text style={styles.currentPrice}>
          SAR{" "}
          {salePrice > 0 && salePrice < price
            ? salePrice.toFixed(2)
            : price.toFixed(2)}
          <Text style={styles.unit}>/{product.unit || "piece"}</Text>
        </Text>
        {salePrice > 0 && salePrice < price && (
          <Text style={styles.oldPrice}>SAR {price.toFixed(2)}</Text>
        )}
        {salePrice > 0 && salePrice < price && (
          <Text style={styles.saveText}>
            Save SAR {(price - salePrice).toFixed(2)}
          </Text>
        )}
      </View>

      <View style={styles.stockRow}>
        {(product.stock_quantity || 0) > 0 ? (
          <>
            <View style={styles.stockDot} />
            <Text style={styles.stockText}>In Stock</Text>
            {product.stock_quantity && product.stock_quantity < 10 && (
              <Text style={styles.limitedStock}>
                Only {product.stock_quantity} left
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.outOfStock}>Out of Stock</Text>
        )}
      </View>
    </View>
  );

  const renderQuantitySelector = () => (
    <View style={styles.quantitySection}>
      <Text style={styles.quantityLabel}>Quantity</Text>
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
          onPress={() => setQuantity(quantity + 1)}
          style={styles.quantityButton}
        >
          <Plus size={20} color={Colors.primary900} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExpandableSection = (
    key: keyof typeof expandedSections,
    title: string,
    content: React.ReactNode
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

  const renderDescription = () =>
    renderExpandableSection(
      "description",
      "About this product",
      <Text style={styles.descriptionText}>
        {product.description_en ||
          product.description ||
          "No description available"}
      </Text>
    );

  const renderNutrition = () => {
    if (!product.nutritionFacts) return null;
    const facts = product.nutritionFacts;
    return renderExpandableSection(
      "nutrition",
      "Nutrition Facts",
      <View style={styles.nutritionTable}>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Serving Size</Text>
          <Text style={styles.nutritionValue}>{facts.servingSize}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={styles.nutritionValue}>{facts.calories}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Total Fat</Text>
          <Text style={styles.nutritionValue}>{facts.totalFat}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Saturated Fat</Text>
          <Text style={styles.nutritionValue}>{facts.saturatedFat}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Cholesterol</Text>
          <Text style={styles.nutritionValue}>{facts.cholesterol}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Sodium</Text>
          <Text style={styles.nutritionValue}>{facts.sodium}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Total Carbohydrate</Text>
          <Text style={styles.nutritionValue}>{facts.totalCarbohydrate}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={styles.nutritionValue}>{facts.protein}</Text>
        </View>
      </View>
    );
  };

  const renderIngredients = () => {
    if (!product.ingredients) return null;
    return renderExpandableSection(
      "ingredients",
      "Ingredients",
      <Text style={styles.descriptionText}>{product.ingredients}</Text>
    );
  };

  const renderSpecs = () =>
    renderExpandableSection(
      "specs",
      "Specifications",
      <View style={styles.specsTable}>
        {product.weight && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Weight</Text>
            <Text style={styles.specValue}>{product.weight}</Text>
          </View>
        )}
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Barcode</Text>
          <Text style={styles.specValue}>{product.barcode}</Text>
        </View>
      </View>
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

  const renderRelatedProducts = () => {
    if (relatedProducts.length === 0) return null;
    return (
      <View style={styles.relatedSection}>
        <Text style={styles.sectionTitle}>You may also like</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedScroll}
        >
          {relatedProducts.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.relatedCard}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <Image source={{ uri: item.image }} style={styles.relatedImage} />
              <Text style={styles.relatedName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.relatedPrice}>
                ${item.salePrice || item.price}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderBottomBar = () => (
    <View style={styles.bottomBar}>
      <View style={styles.bottomPriceSection}>
        <Text style={styles.bottomLabel}>Total Price</Text>
        <Text style={styles.bottomPrice}>
          ${((product.salePrice || product.price) * quantity).toFixed(2)}
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
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderImageGallery()}
        {renderProductInfo()}
        {renderQuantitySelector()}
        {renderAllergens()}
        {renderDescription()}
        {renderNutrition()}
        {renderIngredients()}
        {renderSpecs()}
        {renderRelatedProducts()}
        <View style={{ height: 120 }} />
      </ScrollView>
      {renderBottomBar()}
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
    gap: Spacing.sm,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
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
    width: 140,
    backgroundColor: Colors.neutralLight,
    borderRadius: 16,
    overflow: "hidden",
  },
  relatedImage: {
    width: "100%",
    height: 140,
    resizeMode: "cover",
  },
  relatedName: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralCharcoal,
    padding: Spacing.sm,
    paddingBottom: 4,
  },
  relatedPrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: "bold",
    color: Colors.primary900,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
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
});
