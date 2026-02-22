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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  CreditCard,
  Banknote,
  Tag,
} from "lucide-react-native";
import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { getDeliverySlots, DeliverySlot } from "@/services/api/checkoutApi";
import { createOrder } from "@/services/api/orderApi";
import { initiatePayment } from "@/services/paymentMethodsApi";
import { savePendingPayment } from "@/services/payment/paymentRecovery";
import { getStoreStatus } from "@/services/api/storeApi";
import { useTranslation, useLocalizedValue } from "@/i18n";

export default function CheckoutConfirmationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();
  const params = useLocalSearchParams();
  const addressId = params.addressId
    ? parseInt(params.addressId as string)
    : null;
  const paymentType = (params.paymentType as string) || "cod";

  // Phase 5: Saved card params
  const useSavedCard = params.useSavedCard === "true";
  const savedCardId = params.savedCardId
    ? parseInt(params.savedCardId as string)
    : null;
  const saveNewCard = params.saveNewCard === "true";

  // Check if this is a retry attempt
  const isRetry = params.retry === "true";
  const retryOrderId = params.orderId
    ? parseInt(params.orderId as string)
    : null;

  const { cart, fetchCart, user } = useStore();

  const [loading, setLoading] = useState(true);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [allSlots, setAllSlots] = useState<DeliverySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [accepted, setAccepted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Promo code is now handled only on cart page
  // The cart.discount already includes any applied promo code discount

  const subtotal = cart?.subtotal || 0;
  const deliveryFee = cart?.delivery_fee || 0;
  const discount = cart?.discount || 0; // Total discount (promotions + promo code from cart)
  const total = cart?.total || 0; // Already calculated with discount applied

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const slotsRes = await getDeliverySlots();

      const slots = slotsRes.data.delivery_slots || slotsRes.data.slots || [];
      const activeSlots = slots.filter((s: any) => s.is_active !== false);
      setAllSlots(activeSlots);

      // Auto-select today as default date
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      setSelectedDate(todayStr);

      // Filter out slots that have already ended for today
      const currentHour = today.getHours();
      const availableSlots = activeSlots.filter(
        (s: DeliverySlot) => s.end_hour > currentHour,
      );
      setDeliverySlots(availableSlots);

      // Auto-select first available slot
      if (availableSlots.length > 0) {
        setSelectedSlot(availableSlots[0].slot);
      }

      console.log("🛒 [CHECKOUT] Fetching cart in confirmation screen...");
      await fetchCart();
    } catch (error) {
      console.error("❌ [CHECKOUT] Error loading checkout data:", error);
      Alert.alert(t.common.error, t.checkout.failedToLoadCheckout);
    } finally {
      setLoading(false);
    }
  };

  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        value: date.toISOString().split("T")[0],
        label:
          i === 0
            ? t.checkout?.today || "Today"
            : i === 1
              ? t.checkout.tomorrow
              : date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                }),
      });
    }
    return dates;
  };

  const handleDateChange = (dateValue: string) => {
    setSelectedDate(dateValue);
    const todayStr = new Date().toISOString().split("T")[0];
    const isToday = dateValue === todayStr;

    if (isToday) {
      // Filter out slots whose end_hour has already passed
      const currentHour = new Date().getHours();
      const available = allSlots.filter(
        (s: DeliverySlot) => s.end_hour > currentHour,
      );
      setDeliverySlots(available);
      // Auto-select first available or clear
      setSelectedSlot(available.length > 0 ? available[0].slot : "");
    } else {
      // Future date — show all slots
      setDeliverySlots(allSlots);
      setSelectedSlot(allSlots.length > 0 ? allSlots[0].slot : "");
    }
  };

  const handlePlaceOrder = async () => {
    if (!accepted) {
      Alert.alert(t.checkout.termsAndConditions, t.checkout.pleaseAcceptTerms);
      return;
    }

    if (!addressId) {
      Alert.alert(t.common.error, t.checkout.noAddressSelected);
      return;
    }

    if (!selectedDate || !selectedSlot) {
      Alert.alert(t.common.error, t.checkout.selectDateAndSlot);
      return;
    }

    setIsPlacingOrder(true);

    try {
      // Check if store is open before placing order
      const storeStatusResponse = await getStoreStatus();
      if (!storeStatusResponse.data.is_open) {
        setIsPlacingOrder(false);
        Alert.alert(
          t.store?.closed || "Store Closed",
          storeStatusResponse.data.message ||
            t.store?.cannotOrderNow ||
            "Sorry, we are not accepting orders right now",
        );
        return;
      }

      // Determine order ID - reuse existing on retry
      let orderId: number;
      let orderNumber: string;

      if (isRetry && retryOrderId) {
        // Retry existing order - don't create new one
        orderId = retryOrderId;
        orderNumber = `ORD-${retryOrderId}`; // Will be updated from payment response
      } else {
        // Create new order (with pending payment status)
        // Promo code is already applied in cart, so we send the cart's promo code
        const response = await createOrder({
          delivery_address_id: addressId,
          delivery_date: selectedDate,
          delivery_time_slot: selectedSlot,
          payment_method: paymentType === "cod" ? "cash_on_delivery" : "card",
          promo_code: cart?.promo_code || undefined,
          notes: deliveryNotes.trim() || undefined,
        });

        orderId = response.data.order.id;
        orderNumber = response.data.order.order_number;
      }

      if (paymentType === "card") {
        // Initiate Paymob payment AFTER order created
        try {
          let paymentData: any;

          if (useSavedCard && savedCardId) {
            // Tokenization: Payment with saved card (may be MOTO or 3DS)
            const response = await initiatePayment({
              order_id: orderId,
              payment_method: "CARD",
              payment_method_id: savedCardId, // Dual-flow: Decision tree routing
              billing_data: {
                first_name: user?.first_name || "Customer",
                last_name: user?.last_name || "",
                email: user?.email || "customer@example.com",
                phone_number: user?.phone || "+201234567890",
                city: "Cairo",
                street: "Unknown",
              },
            });

            paymentData = response.data;
          } else {
            // New card payment (with optional save_card flag)
            const response = await initiatePayment({
              order_id: orderId,
              payment_method: "CARD",
              save_card: saveNewCard,
              billing_data: {
                first_name: user?.first_name || "Customer",
                last_name: user?.last_name || "",
                email: user?.email || "customer@example.com",
                phone_number: user?.phone || "+201234567890",
                city: "Cairo",
                street: "Unknown",
              },
            });

            paymentData = response.data;
          }

          // Check payment flow type
          const flow = paymentData.flow || "classic_iframe";
          const paymentId = paymentData.payment_id;

          if (flow === "moto") {
            // MOTO: Instant payment, no redirect - start polling
            console.log(
              "[Checkout] MOTO payment initiated, polling for result...",
            );

            // Save pending payment for recovery
            await savePendingPayment({
              orderId,
              orderNumber: orderNumber,
              total: cart?.total || 0,
              paymentAttemptId: paymentId,
              timestamp: Date.now(),
              iframeUrl: "", // No iframe for MOTO
            });

            // Navigate to success screen with polling
            router.replace({
              pathname: "/order-success" as any,
              params: {
                orderId: orderId.toString(),
                paymentId: paymentId.toString(),
                polling: "true", // Trigger polling in success screen
              },
            });
          } else if (
            paymentData &&
            (paymentData.iframe_url || paymentData.redirect_url)
          ) {
            // Unified Checkout or Classic: Redirect to WebView
            const redirectUrl =
              paymentData.redirect_url || paymentData.iframe_url;
            console.log(
              `[Checkout] ${flow} flow initiated, redirecting to WebView...`,
            );

            // Save to AsyncStorage BEFORE redirect (for app kill recovery)
            await savePendingPayment({
              orderId,
              orderNumber: orderNumber,
              total: cart?.total || 0,
              paymentAttemptId: paymentId,
              timestamp: Date.now(),
              iframeUrl: redirectUrl,
            });

            // Navigate to PaymentWebView
            router.replace({
              pathname: "/payment-webview" as any,
              params: {
                iframeUrl: redirectUrl,
                orderId: orderId.toString(),
                paymentId: paymentId.toString(), // For polling
              },
            });
          } else {
            throw new Error("Failed to initiate payment");
          }
        } catch (paymentError: any) {
          Alert.alert(
            t.checkout.paymentError,
            paymentError.message || t.checkout.failedToInitiatePayment,
          );
          setIsPlacingOrder(false);
          return;
        }
      } else {
        // COD - navigate to success (cart already cleared by backend)
        router.replace({
          pathname: "/order-success" as any,
          params: {
            orderId: orderId.toString(),
            orderNumber: orderNumber,
            deliveryDate: selectedDate,
            deliveryTime: selectedSlot,
          },
        });
      }
    } catch (error: any) {
      Alert.alert(
        t.checkout.orderFailed,
        error.message || t.checkout.failedToCreateOrder,
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
          <Text style={styles.loadingText}>{t.checkout.loadingCheckout}</Text>
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
        <Text style={styles.headerTitle}>{t.checkout.reviewOrder}</Text>
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
            <Text style={styles.sectionTitle}>{t.checkout.deliveryDate}</Text>
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
                onPress={() => handleDateChange(date.value)}
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
            <Text style={styles.sectionTitle}>{t.checkout.deliveryTime}</Text>
          </View>
          {deliverySlots.length > 0 ? (
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
          ) : (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: Colors.neutralMedium, fontSize: 14 }}>
                {t.checkout?.noSlotsAvailable ||
                  "No delivery slots available for this date. Please select another day."}
              </Text>
            </View>
          )}
        </View>

        {/* Delivery Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ArrowLeft
              size={20}
              color={Colors.primary900}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
            <Text style={styles.sectionTitle}>
              {t.checkout?.deliveryNotes || "Delivery Notes"}
            </Text>
            <Text style={styles.optionalLabel}>
              {t.common?.optional || "(Optional)"}
            </Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder={
              t.checkout?.deliveryNotesPlaceholder ||
              "Any special instructions for delivery? (e.g., ring doorbell, leave at door)"
            }
            placeholderTextColor={Colors.neutralMedium}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Payment Method Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={20} color={Colors.primary900} />
            <Text style={styles.sectionTitle}>{t.checkout.paymentMethod}</Text>
          </View>
          <View style={styles.summaryRow}>
            {paymentType === "cod" ? (
              <View style={styles.paymentSummary}>
                <Banknote size={20} color={Colors.neutralMedium} />
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentType}>
                    {t.checkout.cashOnDelivery}
                  </Text>
                  <Text style={styles.paymentDetail}>
                    {t.checkout.payWhenReceive}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.paymentSummary}>
                <CreditCard size={20} color={Colors.neutralMedium} />
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.paymentType}>
                    {t.checkout.cardPayment}
                  </Text>
                  <Text style={styles.paymentDetail}>
                    {t.checkout.securePaymentPaymob}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.checkout.orderItems}</Text>
          <View style={styles.orderItems}>
            {(cart?.items || []).map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {getName(item.product)}
                  </Text>
                  <Text style={styles.itemQuantity}>
                    {t.checkout.qty}: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {parseFloat(item.subtotal?.toString() || "0").toFixed(2)}{" "}
                  {t.common.currency}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Show applied promo code from cart (read-only) */}
        {cart?.promo_code && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tag size={20} color={Colors.primary900} />
              <Text style={styles.sectionTitle}>{t.checkout.promoCode}</Text>
            </View>
            <View style={styles.appliedPromoContainer}>
              <View style={styles.appliedPromoContent}>
                <View style={styles.appliedPromoInfo}>
                  <Text style={styles.appliedPromoCode}>{cart.promo_code}</Text>
                  <Text style={styles.appliedPromoDiscount}>
                    -{discount.toFixed(2)} {t.common.currency}{" "}
                    {t.checkout.saved}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.checkout.priceSummary}</Text>
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t.checkout.subtotal}</Text>
              <Text style={styles.priceValue}>
                {subtotal.toFixed(2)} {t.common.currency}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t.checkout.deliveryFee}</Text>
              <Text
                style={[
                  styles.priceValue,
                  deliveryFee === 0 && styles.freeText,
                ]}
              >
                {deliveryFee === 0
                  ? t.common.free
                  : `${deliveryFee.toFixed(2)} ${t.common.currency}`}
              </Text>
            </View>
            {discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.checkout.discount}</Text>
                <Text style={[styles.priceValue, styles.discountText]}>
                  -{discount.toFixed(2)} {t.common.currency}
                </Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{t.checkout.total}</Text>
              <Text style={styles.totalValue}>
                {total.toFixed(2)} {t.common.currency}
              </Text>
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
            {t.checkout.iAgreeTo}{" "}
            <Text style={styles.termsLink}>
              {t.checkout.termsAndConditions}
            </Text>
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
            {isPlacingOrder ? t.checkout.placingOrder : t.checkout.placeOrder}
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
  optionalLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    fontStyle: "italic",
    marginLeft: "auto",
  },
  notesInput: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
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
  summaryRow: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    padding: Spacing.md,
  },
  paymentSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
  promoInputContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  promoInput: {
    flex: 1,
    backgroundColor: Colors.neutralLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    borderWidth: 1,
    borderColor: Colors.neutralGray,
  },
  applyButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralWhite,
  },
  appliedPromoContainer: {
    backgroundColor: Colors.success100,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.success900,
  },
  appliedPromoContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appliedPromoInfo: {
    flex: 1,
  },
  appliedPromoCode: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.success900,
    marginBottom: 2,
  },
  appliedPromoDiscount: {
    fontSize: Typography.bodyMedium,
    color: Colors.success700,
  },
  removePromoButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  promoError: {
    fontSize: Typography.bodyMedium,
    color: Colors.danger900,
    marginTop: Spacing.sm,
  },
});
