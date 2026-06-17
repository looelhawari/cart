import React, { useState, useEffect, useRef, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Heart } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Product } from "@/types";
import { useStore } from "@/store";
import RatingStars from "./RatingStars";
import { getCachedImage } from "@/services/cache/imageCache";
import { SaleBadge } from "./SaleBadge";
import { useLocalizedValue, useTranslation } from "@/i18n";
import { Toast } from "@/components/Toast";
import type { ProductOfferPricing } from "@/utils/offerPricing";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart?: (result: {
    success: boolean;
    message: string;
    type: "success" | "error";
  }) => void;
  offerPricing?: ProductOfferPricing | null;
}

export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  onAddToCart,
  offerPricing,
}: ProductCardProps) {
  const { favorites, toggleFavorite, addToCart, cart, updateQuantity, removeFromCart } = useStore();
  const [cachedImageUri, setCachedImageUri] = useState<string | undefined>();
  // When the (locally-cached) image fails to decode/render, fall back to the
  // original remote URL — exactly what the dashboard <img> uses. Without this
  // a corrupt/extensionless cache file shows a blank tile on mobile only.
  const [imageFailed, setImageFailed] = useState(false);
  const productId = product.barcode || Number(product.id) || 0;
  const isFavorite = favorites.includes(productId.toString());
  const { getName } = useLocalizedValue();
  const { t } = useTranslation();

  // Convert string prices to numbers (database returns DECIMAL as string)
  const displayPrice = parseFloat(product.price?.toString() || "0");
  const displaySalePrice = parseFloat(
    (product.sale_price || product.salePrice)?.toString() || "0",
  );
  const hasDiscount = displaySalePrice > 0 && displaySalePrice < displayPrice;

  const displayName = getName(product) || "Product";
  const displayImage = product.image || "https://via.placeholder.com/160";

  const isOutOfStock =
    product.is_in_stock === false || (product.stock_quantity || 0) <= 0;
  const isLowStock = !isOutOfStock && (product.stock_quantity || 0) <= 3;

  // Find this product in cart
  const cartItem = cart?.items?.find((item: any) => item.product_id === productId);
  const cartQuantity = cartItem?.quantity || 0;
  const inCart = cartQuantity > 0;

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Stepper auto-revert: show the +/- stepper only briefly after interaction,
  // then revert to the "Add to Cart" button so the user can quickly add other
  // items without each card sticking in stepper mode.
  const STEPPER_VISIBLE_MS = 1500;
  const [stepperVisible, setStepperVisible] = useState(false);
  const stepperTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStepperBriefly = () => {
    setStepperVisible(true);
    if (stepperTimerRef.current) clearTimeout(stepperTimerRef.current);
    stepperTimerRef.current = setTimeout(() => {
      setStepperVisible(false);
      stepperTimerRef.current = null;
    }, STEPPER_VISIBLE_MS);
  };

  // Cache product image
  useEffect(() => {
    setImageFailed(false); // reset when the product (image) changes
    if (product.image) {
      getCachedImage(product.image).then((uri) => {
        if (uri) {
          setCachedImageUri(uri);
        }
      });
    }
  }, [product.image]);

  // Cleanup the stepper timer on unmount
  useEffect(() => {
    return () => {
      if (stepperTimerRef.current) clearTimeout(stepperTimerRef.current);
    };
  }, []);

  const handleAddToCart = (e: any) => {
    e.stopPropagation();
    if (isOutOfStock) {
      if (onAddToCart) {
        onAddToCart({ success: false, message: t.products.outOfStock, type: "error" });
      } else {
        setToastType("error");
        setToastMessage(t.products.outOfStock);
        setShowToast(true);
      }
      return;
    }

    showStepperBriefly();
    addToCart(productId, 1).catch((error: any) => {
      const msg =
        error?.message ||
        error?.error ||
        (typeof error === "string" ? error : null) ||
        t.products.failedToAddToCart;
      if (onAddToCart) {
        onAddToCart({ success: false, message: msg, type: "error" });
      } else {
        setToastType("error");
        setToastMessage(msg);
        setShowToast(true);
      }
    });
  };

  const handleDecrease = (e: any) => {
    e.stopPropagation();
    if (!cartItem) return;
    showStepperBriefly();
    if (cartQuantity === 1) {
      removeFromCart(cartItem.id).catch(() => {});
    } else {
      updateQuantity(cartItem.id, cartQuantity - 1).catch(() => {});
    }
  };

  const handleIncrease = (e: any) => {
    e.stopPropagation();
    if (!cartItem) return;
    showStepperBriefly();
    updateQuantity(cartItem.id, cartQuantity + 1).catch(() => {});
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageFailed ? displayImage : (cachedImageUri || displayImage) }}
          style={styles.image}
          onError={() => {
            // Local/cached uri failed to render — fall back to the remote URL.
            if (!imageFailed) setImageFailed(true);
          }}
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
          <SaleBadge
            discountPercentage={Math.round(
              ((displayPrice - displaySalePrice) / displayPrice) * 100,
            )}
            small
            position="top-left"
          />
        )}

        {isOutOfStock && (
          <View style={styles.stockBadgeOut}>
            <Text style={styles.stockBadgeText}>{t.products.outOfStock}</Text>
          </View>
        )}

        {isLowStock && (
          <View style={styles.stockBadgeLow}>
            <Text style={styles.stockBadgeText}>
              {t.products.lowStock} •{" "}
              {t.products.onlyLeft.replace(
                "{count}",
                (product.stock_quantity || 0).toString(),
              )}
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

        {/* Packaging */}
        {product.packaging ? (
          <Text style={styles.unitText}>{product.packaging}</Text>
        ) : null}

        <View style={styles.priceRow}>
          {hasDiscount ? (
            <>
              <Text style={styles.salePrice}>
                {parseFloat(displaySalePrice.toString()).toFixed(2)}{" "}
                {t.common.currency}
              </Text>
              <Text style={styles.originalPrice}>
                {parseFloat(displayPrice.toString()).toFixed(2)}{" "}
                {t.common.currency}
              </Text>
            </>
          ) : (
            <Text style={styles.price}>
              {parseFloat(displayPrice.toString()).toFixed(2)}{" "}
              {t.common.currency}
            </Text>
          )}
        </View>

        {inCart && stepperVisible ? (
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={handleDecrease}
              activeOpacity={0.7}
            >
              <Text style={styles.quantityBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{cartQuantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={handleIncrease}
              activeOpacity={0.7}
            >
              <Text style={styles.quantityBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
            onPress={handleAddToCart}
            disabled={isOutOfStock}
          >
            <Text style={styles.addButtonText}>{t.cart.addToCart}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
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
  },
  name: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.xs,
    minHeight: 34,
  },
  ratingContainer: {
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
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
  unitText: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: Spacing.sm,
    marginTop: -2,
  },
  addButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  addButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.semibold,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900,
    borderRadius: 12,
    overflow: "hidden",
    height: 40,
  },
  quantityBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    flex: 1,
    textAlign: "center",
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  quantityBtnText: {
    fontSize: 20,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
    lineHeight: 22,
  },
  stockBadgeOut: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accentRed,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockBadgeLow: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accentOrange,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockBadgeText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodySmall,
    fontWeight: Typography.bold,
  },
});

export default ProductCard;
