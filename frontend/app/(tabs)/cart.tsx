import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Minus, Plus, Trash2, ShoppingBag, Tag, X } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { Button } from "@/components/Button";
import { useStore } from "@/store";
import { GuestModal } from "@/components/GuestModal";

export default function CartScreen() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromoCodeToCart,
    removePromoCodeFromCart,
    fetchCart,
    user,
    cartLoading,
  } = useStore();
  const [promoCode, setPromoCode] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Refresh cart when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchCart().catch(error => {
        console.error("🛒 [CART SCREEN] Failed to refresh cart:", error);
      });
    }, [])
  );

  const cartItems = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discount || 0;
  const deliveryFee = cart?.delivery_fee || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;
  const appliedPromo = cart?.promo_code || null;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    setIsApplyingPromo(true);
    try {
      await applyPromoCodeToCart(promoCode.trim());
      setPromoCode("");
      Alert.alert("Success", "Promo code applied successfully!");
    } catch (error: any) {
      Alert.alert(
        "Invalid Code",
        error.message || "This promo code is not valid or has expired."
      );
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = async () => {
    try {
      await removePromoCodeFromCart();
    } catch (error) {
      console.error("Failed to remove promo:", error);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      setShowGuestModal(true);
      return;
    }
    router.push("/checkout/address" as any);
  };

  // Show loading state only when cartLoading is true AND cart is null/empty
  if (cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <ShoppingBag size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Add some fresh groceries to get started!
          </Text>
          <Button
            title="Browse Products"
            onPress={() => router.push("/(tabs)/categories")}
            variant="primary"
            fullWidth={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart ({cartItems.length})</Text>
        <TouchableOpacity
          onPress={async () => {
            try {
              await clearCart();
            } catch (error) {
              console.error("Failed to clear cart:", error);
            }
          }}
        >
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {cartItems.map((item: any) => (
          <View key={item.id} style={styles.cartItem}>
            <Image
              source={{ uri: item.product.image }}
              style={styles.itemImage}
            />

            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product.name_en}
              </Text>
              <Text style={styles.itemPrice}>
                {parseFloat(item.price?.toString() || "0").toFixed(2)} EGP
              </Text>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={async () => {
                    try {
                      if (item.quantity > 1) {
                        await updateQuantity(item.id, item.quantity - 1);
                      } else {
                        await removeFromCart(item.id);
                      }
                    } catch (error) {
                      console.error("Failed to update cart:", error);
                    }
                  }}
                >
                  {item.quantity === 1 ? (
                    <Trash2 size={16} color={Colors.accentRed} />
                  ) : (
                    <Minus size={16} color={Colors.primary900} />
                  )}
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
              <Trash2 size={20} color={Colors.neutralMedium} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Promo Code Section */}
        <View style={styles.promoContainer}>
          <Text style={styles.promoTitle}>Have a promo code?</Text>

          {appliedPromo ? (
            <View style={styles.appliedPromoCard}>
              <View style={styles.appliedPromoLeft}>
                <Tag size={20} color={Colors.primary900} />
                <View style={styles.appliedPromoText}>
                  <Text style={styles.appliedPromoCode}>{appliedPromo}</Text>
                  <Text style={styles.appliedPromoSaved}>
                    You saved{" "}
                    {parseFloat(discount?.toString() || "0").toFixed(2)} EGP!
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleRemovePromo}
                style={styles.removePromoButton}
              >
                <X size={20} color={Colors.neutralMedium} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                placeholderTextColor={Colors.neutralGray}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                editable={!isApplyingPromo}
              />
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (!promoCode.trim() || isApplyingPromo) &&
                  styles.applyButtonDisabled,
                ]}
                onPress={handleApplyPromo}
                disabled={!promoCode.trim() || isApplyingPromo}
              >
                {isApplyingPromo ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.applyButtonText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {parseFloat(subtotal?.toString() || "0").toFixed(2)} EGP
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Discount
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{parseFloat(discount?.toString() || "0").toFixed(2)} EGP
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              {deliveryFee === 0
                ? "FREE"
                : `${parseFloat(deliveryFee?.toString() || "0").toFixed(2)} EGP`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (14%)</Text>
            <Text style={styles.summaryValue}>
              {parseFloat(tax?.toString() || "0").toFixed(2)} EGP
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {parseFloat(total?.toString() || "0").toFixed(2)} EGP
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>
            {parseFloat(total?.toString() || "0").toFixed(2)} EGP
          </Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={handleCheckout}
          variant="primary"
        />
      </View>

      <GuestModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        message="Please sign in to proceed with checkout"
      />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  clearText: {
    fontSize: Typography.bodyMedium,
    color: Colors.accentRed,
    fontWeight: Typography.semibold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    borderRadius: 24,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
  },
  itemDetails: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  itemPrice: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    minWidth: 30,
    textAlign: "center",
  },
  removeButton: {
    padding: Spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  summary: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  summaryValue: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutralGray,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  totalValue: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  footer: {
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  footerLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  footerTotal: {
    fontSize: Typography.h2,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  promoContainer: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  promoTitle: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  promoInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  promoInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    backgroundColor: Colors.neutralLight,
  },
  applyButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  applyButtonDisabled: {
    backgroundColor: Colors.neutralGray,
  },
  applyButtonText: {
    color: Colors.neutralWhite,
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
  },
  appliedPromoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary100,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary900,
  },
  appliedPromoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  appliedPromoText: {
    flex: 1,
  },
  appliedPromoCode: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.primary900,
    marginBottom: 2,
  },
  appliedPromoSaved: {
    fontSize: Typography.bodySmall,
    color: Colors.primary700,
  },
  removePromoButton: {
    padding: Spacing.xs,
  },
  discountLabel: {
    color: Colors.primary900,
  },
  discountValue: {
    color: Colors.primary900,
  },
});
