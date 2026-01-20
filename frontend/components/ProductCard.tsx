import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Heart } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Product } from "@/types";
import { useStore } from "@/store";
import RatingStars from "./RatingStars";
import { getCachedImage } from "@/services/cache/imageCache";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { favorites, toggleFavorite, addToCart } = useStore();
  const [cachedImageUri, setCachedImageUri] = useState<string | undefined>();
  const productId = product.barcode || Number(product.id) || 0;
  const isFavorite = favorites.includes(productId.toString());

  // Convert string prices to numbers (database returns DECIMAL as string)
  const displayPrice = parseFloat(product.price?.toString() || "0");
  const displaySalePrice = parseFloat(
    (product.sale_price || product.salePrice)?.toString() || "0"
  );
  const hasDiscount = displaySalePrice > 0 && displaySalePrice < displayPrice;

  const displayName = product.name_en || product.name || "Product";
  const displayImage = product.image || "https://via.placeholder.com/160";

  // Cache product image
  useEffect(() => {
    if (product.image) {
      getCachedImage(product.image).then((uri) => {
        if (uri) {
          setCachedImageUri(uri);
        }
      });
    }
  }, [product.image]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: cachedImageUri || displayImage }}
          style={styles.image}
        />
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(productId.toString())}
        >
          <Heart
            size={20}
            color={isFavorite ? Colors.accentRed : Colors.neutralMedium}
            fill={isFavorite ? Colors.accentRed : "transparent"}
          />
        </TouchableOpacity>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(
                ((displayPrice - displaySalePrice) / displayPrice) * 100
              )}
              % OFF
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {displayName}
        </Text>

        {/* Rating Stars */}
        {(product.rating || 0) > 0 && (
          <View style={styles.ratingContainer}>
            <RatingStars
              rating={product.rating}
              reviewCount={product.review_count}
              size="small"
              showCount={true}
            />
          </View>
        )}

        <View style={styles.priceRow}>
          {hasDiscount ? (
            <>
              <Text style={styles.salePrice}>
                {parseFloat(displaySalePrice.toString()).toFixed(2)} EGP
              </Text>
              <Text style={styles.originalPrice}>
                {parseFloat(displayPrice.toString()).toFixed(2)} EGP
              </Text>
            </>
          ) : (
            <Text style={styles.price}>
              {parseFloat(displayPrice.toString()).toFixed(2)} EGP
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={async (e) => {
            e.stopPropagation();
            try {
              await addToCart(productId, 1);
            } catch (error) {
              console.error("Failed to add to cart:", error);
            }
          }}
        >
          <Text style={styles.addButtonText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: `${Colors.neutralGray}50`,
    width: 180,
    height: 320,  
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 140,
    backgroundColor: Colors.neutralCloud,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  favoriteButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralWhite,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discountBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
  },
  content: {
    padding: Spacing.sm,
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
    height: 36,
  },
  ratingContainer: {
    marginBottom: Spacing.xs,
    height: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    flexWrap: "wrap", 
    minHeight: 28,
  },
  price: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  salePrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
    marginRight: Spacing.xs,
  },
  originalPrice: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.medium,
    color: Colors.neutralMedium,
    textDecorationLine: "line-through",
  },

  addButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
  },
});
