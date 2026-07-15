import React, { useState, useEffect, useRef, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
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
import { findCartItem, getCartItemQuantity } from "@/utils/cart";

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
  // Subscribe with narrow selectors so a card only re-renders when ITS OWN
  // quantity or favorite state changes — not on every unrelated cart mutation.
  // Store actions are stable references, safe to select individually.
  const addToCart = useStore((s) => s.addToCart);
  const updateQuantity = useStore((s) => s.updateQuantity);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const [cachedImageUri, setCachedImageUri] = useState<string | undefined>();
  // When the (locally-cached) image fails to decode/render, fall back to the
  // original remote URL — exactly what the dashboard <img> uses. Without this
  // a corrupt/extensionless cache file shows a blank tile on mobile only.
  const [imageFailed, setImageFailed] = useState(false);
  const productId = product.barcode || Number(product.id) || 0;
  const isFavorite = useStore((s) => s.favorites.includes(productId.toString()));
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

  // Find this product's quantity in the cart via a primitive selector, so the
  // card re-renders only when this specific quantity changes.
  const cartQuantity = useStore((s) => getCartItemQuantity(s.cart, productId));
  const inCart = cartQuantity > 0;

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Quantity interaction (Talabat-style):
  //   not in cart        -> "Add to Cart" button
  //   in cart, collapsed -> [ n ] badge (quantity always visible)
  //   in cart, expanded  -> [ − ] n [ + ] controls, auto-collapse after idle
  const AUTO_COLLAPSE_MS = 2500;
  const [expanded, setExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  // Expand the controls and (re)start the idle timer that collapses them back
  // to the quantity badge after a short period of inactivity.
  const expandWithTimer = () => {
    setExpanded(true);
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      setExpanded(false);
      collapseTimerRef.current = null;
    }, AUTO_COLLAPSE_MS);
  };

  // Subtle "pop" whenever the quantity changes — tactile feedback with no
  // layout shift (native driver, so it never blocks the JS thread while
  // scrolling a long list).
  const popAnim = useRef(new Animated.Value(1)).current;
  const pop = () => {
    popAnim.setValue(0.9);
    Animated.spring(popAnim, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
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

  // Cleanup the collapse timer on unmount
  useEffect(() => clearCollapseTimer, []);

  // Keep the UI coherent when the quantity changes from anywhere (this card,
  // the cart screen, another card for the same product, etc.): pop for
  // feedback, and once the product leaves the cart, drop back to the
  // "Add to Cart" button and stop any pending collapse.
  const prevQtyRef = useRef(cartQuantity);
  useEffect(() => {
    if (cartQuantity !== prevQtyRef.current) {
      pop();
      prevQtyRef.current = cartQuantity;
    }
    if (cartQuantity === 0 && expanded) {
      setExpanded(false);
      clearCollapseTimer();
    }
  }, [cartQuantity, expanded]);

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

  // Tap the collapsed [ n ] badge to reveal the − / + controls.
  const handleExpand = (e: any) => {
    e.stopPropagation();
    expandWithTimer();
  };

  const handleDecrease = (e: any) => {
    e.stopPropagation();
    const item = findCartItem(useStore.getState().cart, productId);
    if (!item) return;
    if ((item.quantity || 0) <= 1) {
      // Quantity hits zero -> remove and return to the "Add to Cart" button.
      clearCollapseTimer();
      setExpanded(false);
      removeFromCart(item.id).catch(() => {});
    } else {
      expandWithTimer();
      updateQuantity(item.id, (item.quantity || 0) - 1).catch(() => {});
    }
  };

  const handleIncrease = (e: any) => {
    e.stopPropagation();
    const item = findCartItem(useStore.getState().cart, productId);
    if (!item) return;
    expandWithTimer();
    updateQuantity(item.id, (item.quantity || 0) + 1).catch(() => {});
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

        <Animated.View style={{ transform: [{ scale: popAnim }] }}>
          {!inCart ? (
            <TouchableOpacity
              style={[styles.addButton, isOutOfStock && styles.addButtonDisabled]}
              onPress={handleAddToCart}
              disabled={isOutOfStock}
            >
              <Text style={styles.addButtonText}>{t.cart.addToCart}</Text>
            </TouchableOpacity>
          ) : expanded ? (
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={handleDecrease}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.quantityBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{cartQuantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={handleIncrease}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.quantityBadge}
              onPress={handleExpand}
              activeOpacity={0.8}
            >
              <Text style={styles.quantityBadgeText}>{cartQuantity}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
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
  quantityBadge: {
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary900,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBadgeText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
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
