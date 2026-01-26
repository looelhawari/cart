import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react-native";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/products";

export default function CartScreen() {
  const router = useRouter();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyPromoCodeToCart,
    removePromoCodeFromCart,
  } = useStore();
  const [promoInput, setPromoInput] = useState("");
  const [promoExpanded, setPromoExpanded] = useState(false);

  const cartItems = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const deliveryFee = cart?.delivery_fee || 0;
  const discount = cart?.discount || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;
  const promoCode = cart?.promo_code ?? null;

  const suggestedProducts = products
    .filter((p) => !cartItems.find((c) => c.product.id === Number(p.id)))
    .slice(0, 4);

  const handleApplyPromo = async () => {
    try {
      await applyPromoCodeToCart(promoInput.toUpperCase());
      setPromoInput("");
      Alert.alert("Success", "Promo code applied!");
    } catch (error) {
      Alert.alert("Invalid Code", "This promo code is not valid");
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearCart();
            } catch (error) {
              console.error("Failed to clear cart:", error);
            }
          },
        },
      ],
    );
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <ShoppingBag size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to get started</Text>
          <TouchableOpacity
            style={styles.startShoppingButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.startShoppingText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cartItems}>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <Image
                source={{ uri: item.product.image }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name_en}
                </Text>
                <Text style={styles.itemPrice}>{item.price} EGP</Text>
                <View style={styles.itemActions}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={async () => {
                        try {
                          if (item.quantity === 1) {
                            await removeFromCart(item.id);
                          } else {
                            await updateQuantity(item.id, item.quantity - 1);
                          }
                        } catch (error) {
                          console.error("Failed to update cart:", error);
                        }
                      }}
                    >
                      <Minus size={16} color={Colors.primary900} />
                    </TouchableOpacity>
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={async () => {
                        try {
                          await updateQuantity(item.id, item.quantity + 1);
                        } catch (error) {
                          console.error("Failed to update cart:", error);
                        }
                      }}
                    >
                      <Plus size={16} color={Colors.primary900} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemTotal}>
                    {item.subtotal.toFixed(2)} EGP
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={async () => {
                  try {
                    await removeFromCart(item.id);
                  } catch (error) {
                    console.error("Failed to remove item:", error);
                  }
                }}
              >
                <Trash2 size={20} color={Colors.accentRed} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {suggestedProducts.length > 0 && (
          <View style={styles.suggestedSection}>
            <Text style={styles.sectionTitle}>You might also like</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedScroll}
            >
              {suggestedProducts.map((product) => (
                <View key={product.id} style={styles.suggestedCard}>
                  <ProductCard
                    product={product}
                    onPress={() => router.push(`/product/${product.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 400 }} />
      </ScrollView>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.promoToggle}
          onPress={() => setPromoExpanded(!promoExpanded)}
        >
          <Text style={styles.promoToggleText}>Have a promo code?</Text>
        </TouchableOpacity>

        {promoExpanded && (
          <View style={styles.promoSection}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoInput}
              onChangeText={setPromoInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.promoApplyButton}
              onPress={handleApplyPromo}
            >
              <Text style={styles.promoApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {promoCode && (
          <View style={styles.appliedPromo}>
            <Text style={styles.appliedPromoText}>
              Promo &ldquo;{promoCode.code}&rdquo; applied!
            </Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await removePromoCodeFromCart();
                } catch (error) {
                  console.error("Failed to remove promo code:", error);
                }
              }}
            >
              <Text style={styles.removePromoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text
              style={[styles.priceValue, deliveryFee === 0 && styles.freeText]}
            >
              {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Discount</Text>
              <Text style={[styles.priceValue, styles.discountText]}>
                -${discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax</Text>
            <Text style={styles.priceValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => router.push("/checkout/address")}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  clearText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: Typography.semibold,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  startShoppingButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    marginTop: Spacing.lg,
  },
  startShoppingText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  scrollView: {
    flex: 1,
  },
  cartItems: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  itemPrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  itemUnit: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutralWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    minWidth: 24,
    textAlign: "center",
  },
  itemTotal: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  suggestedSection: {
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  suggestedScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  suggestedCard: {
    width: 160,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  promoToggle: {
    paddingVertical: Spacing.xs,
  },
  promoToggleText: {
    fontSize: Typography.bodyBase,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  promoSection: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyBase,
  },
  promoApplyButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    justifyContent: "center",
  },
  promoApplyText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  appliedPromo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primary900 + "10",
    padding: Spacing.sm,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  appliedPromoText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  removePromoText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: Typography.semibold,
  },
  priceBreakdown: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  priceValue: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    fontWeight: Typography.semibold,
  },
  freeText: {
    color: Colors.primary900,
  },
  discountText: {
    color: Colors.primary700,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  totalValue: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  checkoutButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  checkoutText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
