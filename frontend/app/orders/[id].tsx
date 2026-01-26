import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  CreditCard,
  Wallet,
} from "lucide-react-native";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import {
  getOrder,
  cancelOrder as cancelOrderApi,
  reorder,
  Order,
} from "@/services/api/orderApi";
import { useStore } from "@/store";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { fetchCart } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await getOrder(Number(id));
      setOrder(response.data.order);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load order details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await cancelOrderApi(
        Number(id),
        cancelReason.trim() || "Cancelled by user",
      );
      Alert.alert("Success", "Order cancelled successfully");
      setShowCancelDialog(false);
      fetchOrderDetails(); // Refresh order
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      await reorder(Number(id));
      await fetchCart();
      Alert.alert("Success", "Items added to cart!", [
        { text: "View Cart", onPress: () => router.push("/(tabs)/cart") },
        { text: "OK" },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reorder");
    } finally {
      setReordering(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return Clock;
      case "confirmed":
      case "preparing":
        return Package;
      case "out_for_delivery":
      case "shipped":
        return Truck;
      case "delivered":
        return CheckCircle;
      case "cancelled":
      case "failed":
        return XCircle;
      default:
        return Package;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return Colors.accentOrange;
      case "confirmed":
      case "preparing":
        return Colors.primary700;
      case "out_for_delivery":
      case "shipped":
        return Colors.primary900;
      case "delivered":
        return Colors.primary700;
      case "cancelled":
      case "failed":
        return Colors.accentRed;
      default:
        return Colors.neutralMedium;
    }
  };

  const canCancelOrder = (status: string) => {
    return ["pending", "processing", "confirmed"].includes(status);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Package size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>Order Not Found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const StatusIcon = getStatusIcon(order.status);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) + "20" },
              ]}
            >
              <StatusIcon size={16} color={getStatusColor(order.status)} />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(order.status) },
                ]}
              >
                {order.status_label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            Placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* Status History Timeline */}
        {order.status_history && order.status_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            <View style={styles.timeline}>
              {order.status_history.map((history, index) => (
                <View key={history.id} style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: getStatusColor(history.status) },
                      ]}
                    />
                    {index < order.status_history!.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{history.status}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(history.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </Text>
                    {history.notes && (
                      <Text style={styles.timelineNotes}>{history.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Delivery Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MapPin size={20} color={Colors.primary900} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                {order.delivery_address && (
                  <View>
                    <Text style={styles.infoValue}>
                      {order.delivery_address.recipient_name}
                    </Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_address.phone_number}
                    </Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_address.street_address}
                    </Text>
                    <Text style={styles.infoValue}>
                      {order.delivery_address.city},{" "}
                      {order.delivery_address.governorate}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Clock size={20} color={Colors.primary900} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Delivery Schedule</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.delivery_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={styles.infoValue}>{order.delivery_time_slot}</Text>
              </View>
            </View>
            {order.delivery_notes && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Package size={20} color={Colors.primary900} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Delivery Notes</Text>
                    <Text style={styles.infoValue}>{order.delivery_notes}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              {order.payment_method === "cod" ? (
                <Wallet size={20} color={Colors.primary900} />
              ) : (
                <CreditCard size={20} color={Colors.primary900} />
              )}
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoValue}>
                  {order.payment_method === "cod"
                    ? "Cash on Delivery"
                    : "Card Payment"}
                </Text>
                <Text style={styles.paymentStatus}>
                  Status:{" "}
                  {order.payment_status.charAt(0).toUpperCase() +
                    order.payment_status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsContainer}>
            {order.items?.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                {item.product?.image && (
                  <Image
                    source={{ uri: item.product.image }}
                    style={styles.itemImage}
                  />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemSku}>SKU: {item.product_sku}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {parseFloat(item.subtotal.toString()).toFixed(2)} EGP
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {parseFloat(order.subtotal.toString()).toFixed(2)} EGP
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                {order.delivery_fee === 0
                  ? "FREE"
                  : `${parseFloat(order.delivery_fee.toString()).toFixed(2)} EGP`}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (14%)</Text>
              <Text style={styles.summaryValue}>
                {parseFloat(order.tax.toString()).toFixed(2)} EGP
              </Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>
                  Discount
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -{parseFloat(order.discount.toString()).toFixed(2)} EGP
                </Text>
              </View>
            )}
            {order.promo_code_snapshot?.promo_code && (
              <View style={styles.promoRow}>
                <Text style={styles.promoLabel}>
                  Promo Code: {order.promo_code_snapshot.promo_code}
                </Text>
                {order.promo_code_snapshot.discount_amount > 0 && (
                  <Text style={styles.promoValue}>
                    -{order.promo_code_snapshot.discount_amount.toFixed(2)} EGP
                  </Text>
                )}
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {parseFloat(order.total.toString()).toFixed(2)} EGP
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.reorderButton}
          onPress={handleReorder}
          disabled={reordering}
        >
          {reordering ? (
            <ActivityIndicator size="small" color={Colors.primary900} />
          ) : (
            <>
              <RotateCcw size={20} color={Colors.primary900} />
              <Text style={styles.reorderText}>Reorder</Text>
            </>
          )}
        </TouchableOpacity>

        {canCancelOrder(order.status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelDialog(true)}
          >
            <XCircle size={20} color={Colors.accentRed} />
            <Text style={styles.cancelText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalMessage}>
              Please provide a reason for cancellation:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Changed my mind, Found better price"
              placeholderTextColor={Colors.neutralGray}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setShowCancelDialog(false);
                  setCancelReason("");
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.neutralWhite} />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>
                    Cancel Order
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  backButton: {
    backgroundColor: Colors.primary900,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    marginTop: Spacing.md,
  },
  backButtonText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
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
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  content: {
    flex: 1,
  },
  orderHeader: {
    backgroundColor: Colors.neutralWhite,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  orderNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  orderNumber: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
  },
  statusText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.semibold,
  },
  orderDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.md,
  },
  timeline: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  timelineItem: {
    flexDirection: "row",
  },
  timelineIconContainer: {
    alignItems: "center",
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.neutralGray,
    marginVertical: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineStatus: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    textTransform: "capitalize",
  },
  timelineDate: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: 2,
  },
  timelineNotes: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
  infoCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginBottom: Spacing.xs,
  },
  infoValue: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    lineHeight: 20,
  },
  paymentStatus: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
    marginTop: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralGray,
    marginVertical: Spacing.md,
  },
  itemsContainer: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  orderItem: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralGray,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.neutralGray,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.semibold,
    color: Colors.neutralCharcoal,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralMedium,
  },
  itemSku: {
    fontSize: Typography.bodySmall,
    color: Colors.neutralGray,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.bold,
    color: Colors.primary900,
    alignSelf: "center",
  },
  summaryCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 16,
    padding: Spacing.lg,
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
    color: Colors.neutralCharcoal,
  },
  discountLabel: {
    color: Colors.accentRed,
  },
  discountValue: {
    color: Colors.accentRed,
  },
  promoRow: {
    marginBottom: Spacing.sm,
  },
  promoLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.primary700,
    fontWeight: Typography.semibold,
  },
  promoValue: {
    fontSize: Typography.bodySmall,
    color: Colors.primary900,
    fontWeight: Typography.bold,
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
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.neutralWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralGray,
  },
  reorderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary900,
  },
  reorderText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.primary900,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutralWhite,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.accentRed,
  },
  cancelText: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.accentRed,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 24,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: Typography.bodyBase,
    color: Colors.neutralMedium,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: Colors.neutralCloud,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: Typography.bodyBase,
    color: Colors.neutralCharcoal,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonSecondary: {
    backgroundColor: Colors.neutralCloud,
  },
  modalButtonPrimary: {
    backgroundColor: Colors.accentRed,
  },
  modalButtonTextSecondary: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralCharcoal,
  },
  modalButtonTextPrimary: {
    fontSize: Typography.bodyBase,
    fontWeight: Typography.bold,
    color: Colors.neutralWhite,
  },
});
