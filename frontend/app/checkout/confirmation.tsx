import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  Edit,
  Calendar,
  Clock,
  CreditCard,
  Wallet,
} from "lucide-react-native";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import {
  getDeliverySlots,
  getPaymentMethods,
  DeliverySlot,
  CheckoutPaymentMethod,
} from "@/services/api/checkoutApi";
import { createOrder } from "@/services/api/orderApi";
import { initiatePayment } from "@/services/api/paymentsApi";

export default function CheckoutConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const addressId = params.addressId
    ? parseInt(params.addressId as string)
    : null;

  const { cart, fetchCart } = useStore();

  const [loading, setLoading] = useState(true);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CheckoutPaymentMethod[]>(
    [],
  );

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "cod" | "card"
  >("cod");
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
    null,
  );

  const [accepted, setAccepted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = cart?.delivery_fee || 0;
  const discount = cart?.discount || 0;
  const tax = cart?.tax || 0;
  const total = cart?.total || 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [slotsRes, paymentRes] = await Promise.all([
        getDeliverySlots(),
        getPaymentMethods(),
      ]);

      setDeliverySlots(
        slotsRes.data.delivery_slots?.filter((s) => s.is_active) || [],
      );
      setPaymentMethods(paymentRes.data.payment_methods || []);

      // Auto-select tomorrow as default date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split("T")[0]);

      // Auto-select first slot
      if (slotsRes.data.delivery_slots?.[0]) {
        setSelectedSlot(slotsRes.data.delivery_slots[0].slot);
      }

      // Auto-select default payment method
      const defaultCard = paymentRes.data.payment_methods?.find(
        (p) => p.is_default,
      );
      if (defaultCard) {
        setSelectedPaymentMethod("card");
        setSelectedPaymentId(defaultCard.id);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load checkout data");
    } finally {
      setLoading(false);
    }
  };

  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split("T")[0],
        label:
          i === 1
            ? "Tomorrow"
            : date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              }),
      });
    }
    return dates;
  };

  const handlePlaceOrder = async () => {
    if (!accepted) {
      Alert.alert(
        "Terms & Conditions",
        "Please accept the terms and conditions to continue",
      );
      return;
    }

    if (!addressId) {
      Alert.alert("Error", "No delivery address selected");
      return;
    }

    if (!selectedDate || !selectedSlot) {
      Alert.alert("Error", "Please select a delivery date and time slot");
      return;
    }

    if (selectedPaymentMethod === "card" && !selectedPaymentId) {
      Alert.alert("Error", "Please select a payment card");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const response = await createOrder({
        delivery_address_id: addressId,
        delivery_date: selectedDate,
        delivery_time_slot: selectedSlot,
        payment_method: selectedPaymentMethod,
        payment_method_id: selectedPaymentId || undefined,
        promo_code: cart?.promo_code || undefined,
      });

      const orderId = response.data.order.id;

      // If online payment, initiate Paymob payment
      if (selectedPaymentMethod === "card") {
        try {
          const { user } = useStore.getState();

          // Get delivery address from store
          const deliveryAddress = useStore
            .getState()
            .addresses.find((addr) => addr.id === addressId.toString());

          const paymentResponse = await initiatePayment({
            order_id: orderId,
            payment_method: "CARD", // Use CARD for online payments, WALLET for mobile wallets
            billing_data: {
              first_name: user?.first_name || "Customer",
              last_name: user?.last_name || "",
              email: user?.email || "customer@example.com",
              phone_number: user?.phone || "+201234567890",
              city: deliveryAddress?.city || "Cairo",
              street: deliveryAddress?.address || "Unknown",
            },
          });

          if (paymentResponse.success) {
            // Navigate to payment WebView screen
            router.replace({
              pathname: "/payment" as any,
              params: {
                iframeUrl: paymentResponse.data.iframe_url,
                orderId: orderId.toString(),
              },
            });
          } else {
            throw new Error("Failed to initiate payment");
          }
        } catch (paymentError: any) {
          Alert.alert(
            "Payment Error",
            paymentError.message ||
              "Failed to initiate payment. Please try again.",
          );
          setIsPlacingOrder(false);
          return;
        }
      } else {
        // COD payment - refresh cart and navigate to success
        await fetchCart();
        router.replace({
          pathname: "/order-success" as any,
          params: {
            orderId: orderId.toString(),
            orderNumber: response.data.order.order_number,
            deliveryDate: selectedDate,
            deliveryTime: selectedSlot,
          },
        });
      }
    } catch (error: any) {
      Alert.alert(
        "Order Failed",
        error.message || "Failed to create order. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.progressText}>2</Text>
          </View>
        </View>

        {/* Delivery Date Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.primary900} />
            <Text style={styles.sectionTitle}>Delivery Date</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
          >
            {getDateOptions().map((date) => (
              <TouchableOpacity
                key={date.value}
                style={[
                  styles.dateOption,
                  selectedDate === date.value && styles.dateOptionSelected,
                ]}
                onPress={() => setSelectedDate(date.value)}
              >
                <Text
                  style={[
                    styles.dateText,
                    selectedDate === date.value && styles.dateTextSelected,
                  ]}
                >
                  {date.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Delivery Time Slot Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={Colors.primary900} />
            <Text style={styles.sectionTitle}>Delivery Time</Text>
          </View>
          <View style={styles.slotGrid}>
            {deliverySlots.map((slot) => (
              <TouchableOpacity
                key={slot.slot}
                style={[
                  styles.slotOption,
                  selectedSlot === slot.slot && styles.slotOptionSelected,
                ]}
                onPress={() => setSelectedSlot(slot.slot)}
              >
                <Text
                  style={[
                    styles.slotText,
                    selectedSlot === slot.slot && styles.slotTextSelected,
                  ]}
                >
                  {slot.slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color={Colors.primary900} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>

          {/* Cash on Delivery */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPaymentMethod === "cod" && styles.paymentOptionSelected,
            ]}
            onPress={() => {
              setSelectedPaymentMethod("cod");
              setSelectedPaymentId(null);
            }}
          >
            <View style={styles.paymentInfo}>
              <Wallet
                size={20}
                color={
                  selectedPaymentMethod === "cod"
                    ? Colors.primary900
                    : Colors.neutralMedium
                }
              />
              <View style={styles.paymentTextContainer}>
                <Text style={styles.paymentType}>Cash on Delivery</Text>
                <Text style={styles.paymentDetail}>Pay when you receive</Text>
              </View>
            </View>
            {selectedPaymentMethod === "cod" && (
              <Check size={20} color={Colors.primary900} />
            )}
          </TouchableOpacity>

          {/* Saved Cards */}
          {paymentMethods.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.paymentOption,
                selectedPaymentMethod === "card" &&
                  selectedPaymentId === card.id &&
                  styles.paymentOptionSelected,
              ]}
              onPress={() => {
                setSelectedPaymentMethod("card");
                setSelectedPaymentId(card.id);
              }}
            >
              <View style={styles.paymentInfo}>
                <CreditCard
                  size={20}
                  color={
                    selectedPaymentMethod === "card" &&
                    selectedPaymentId === card.id
                      ? Colors.primary900
                      : Colors.neutralMedium
                  }
                />
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentType}>
                    {card.card_brand} ****{card.card_last4}
                  </Text>
                  <Text style={styles.paymentDetail}>
                    Expires {card.expiry_month}/{card.expiry_year}
                  </Text>
                </View>
              </View>
              {selectedPaymentMethod === "card" &&
                selectedPaymentId === card.id && (
                  <Check size={20} color={Colors.primary900} />
                )}
            </TouchableOpacity>
          ))}
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
                  {parseFloat(item.subtotal?.toString() || "0").toFixed(2)} EGP
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
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  dateScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dateOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.neutralLight,
    marginRight: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  dateOptionSelected: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary900,
  },
  dateText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  dateTextSelected: {
    color: Colors.primary900,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  slotOption: {
    flex: 1,
    minWidth: "48%",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  slotOptionSelected: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary900,
  },
  slotText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralMedium,
  },
  slotTextSelected: {
    color: Colors.primary900,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.neutralLight,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paymentOptionSelected: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary900,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentType: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: 2,
  },
  paymentDetail: {
    fontSize: Typography.bodyMedium,
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
