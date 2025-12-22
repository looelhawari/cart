import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Edit } from "lucide-react-native";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";

export default function CheckoutConfirmationScreen() {
  const router = useRouter();
  const {
    cart,
    addresses,
    selectedAddress,
    paymentMethods,
    selectedPaymentMethod,
    promoCode,
    clearCart,
    addOrder,
  } = useStore();

  const [accepted, setAccepted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const address = addresses.find((a) => a.id === selectedAddress);
  const payment = paymentMethods.find((p) => p.id === selectedPaymentMethod);

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = cart?.delivery_fee || 0;
  const discount = cart?.discount || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;

  const handlePlaceOrder = async () => {
    if (!accepted) {
      Alert.alert(
        "Terms & Conditions",
        "Please accept the terms and conditions to continue"
      );
      return;
    }

    setIsPlacingOrder(true);

    setTimeout(() => {
      const newOrder = {
        id: Date.now().toString(),
        orderNumber: `EB-${Date.now()}`,
        date: new Date().toISOString(),
        status: "processing" as const,
        subtotal,
        deliveryFee,
        discount,
        tax,
        total,
        items: (cart?.items || []).map((item) => ({
          productId: item.product.id.toString(),
          name: item.product.name_en,
          quantity: item.quantity,
          price: item.price,
          image: item.product.image,
        })),
        deliveryAddress: address
          ? `${address.street}, ${address.city}`
          : "No address selected",
        paymentMethod:
          payment?.type === "cod"
            ? "Cash on Delivery"
            : `Card ••••${payment?.cardLastFour}`,
        paymentStatus: "pending" as const,
        estimatedDelivery: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString(),
      };

      addOrder(newOrder);
      clearCart();
      setIsPlacingOrder(false);
      router.replace(`/order-success?orderId=${newOrder.id}`);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressBar}>
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Check size={18} color={Colors.neutralWhite} />
          </View>
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Check size={18} color={Colors.neutralWhite} />
          </View>
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]}>
            <Text style={styles.progressText}>3</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Edit size={18} color={Colors.primary900} />
            </TouchableOpacity>
          </View>
          {address && (
            <View style={styles.addressCard}>
              <Text style={styles.addressLabel}>{address.label}</Text>
              <Text style={styles.addressText}>
                {address.street}
                {address.apartment ? `, ${address.apartment}` : ""}
              </Text>
              <Text style={styles.addressText}>
                {address.city}, {address.postalCode}
              </Text>
              {address.phone && (
                <Text style={styles.addressPhone}>{address.phone}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Edit size={18} color={Colors.primary900} />
            </TouchableOpacity>
          </View>
          {payment && (
            <View style={styles.paymentCard}>
              {payment.type === "card" ? (
                <>
                  <Text style={styles.paymentType}>Credit/Debit Card</Text>
                  <Text style={styles.paymentDetail}>
                    •••• •••• •••• {payment.cardLastFour}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.paymentType}>Cash on Delivery</Text>
                  <Text style={styles.paymentDetail}>Pay when you receive</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.orderItems}>
            {(cart?.items || []).map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product.name_en}
                  </Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {item.subtotal.toFixed(2)} EGP
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>{subtotal.toFixed(2)} EGP</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text
                style={[
                  styles.priceValue,
                  deliveryFee === 0 && styles.freeText,
                ]}
              >
                {deliveryFee === 0 ? "FREE" : `${deliveryFee.toFixed(2)} EGP`}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Discount</Text>
                <Text style={[styles.priceValue, styles.discountText]}>
                  -{discount.toFixed(2)} EGP
                </Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax</Text>
              <Text style={styles.priceValue}>{tax.toFixed(2)} EGP</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} EGP</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
            {accepted && <Check size={16} color={Colors.neutralWhite} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink}>Terms & Conditions</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            isPlacingOrder && styles.buttonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          <Text style={styles.placeOrderText}>
            {isPlacingOrder ? "Placing Order..." : "Place Order"}
          </Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutralWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  scrollView: {
    flex: 1,
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: Colors.primary900,
  },
  progressText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: Colors.neutralGray,
  },
  progressLineActive: {
    backgroundColor: Colors.primary900,
  },
  section: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  addressCard: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.sm,
  },
  addressLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  addressText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  paymentCard: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.sm,
  },
  paymentType: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  paymentDetail: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  orderItems: {
    gap: Spacing.sm,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: Typography.bodyMedium,
    color: Colors.neutralMedium,
  },
  itemPrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  priceSummary: {
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
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralGray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary900,
    borderColor: Colors.primary900,
  },
  termsText: {
    flex: 1,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
  },
  termsLink: {
    color: Colors.primary900,
    fontWeight: Typography.semibold,
  },
  bottomBar: {
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    padding: Spacing.md,
  },
  placeOrderButton: {
    backgroundColor: Colors.primary900,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
  },
  placeOrderText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
