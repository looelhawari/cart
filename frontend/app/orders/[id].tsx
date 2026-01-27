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
import { useResponsive } from "@/hooks/useResponsive";

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
  const { wp, hp, isSmallDevice, isLargeDevice } = useResponsive();
  const { id } = useLocalSearchParams();
  const { fetchCart } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Create responsive styles
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
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    content: {
      flex: 1,
    },
    orderHeader: {
      backgroundColor: Colors.neutralWhite,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    orderNumberRow: {
      flexDirection: isSmallDevice ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isSmallDevice ? "flex-start" : "center",
      marginBottom: Spacing.xs,
      gap: isSmallDevice ? Spacing.xs : 0,
    },
    orderNumber: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      paddingHorizontal: isSmallDevice ? Spacing.sm : Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: isSmallDevice ? 16 : 20,
    },
    statusText: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      fontWeight: Typography.semibold,
    },
    orderDate: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    section: {
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      marginTop: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    sectionTitle: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h4,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.md,
    },
    timeline: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    timelineItem: {
      flexDirection: "row",
    },
    timelineIconContainer: {
      alignItems: "center",
      marginRight: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    timelineDot: {
      width: isSmallDevice ? 10 : 12,
      height: isSmallDevice ? 10 : 12,
      borderRadius: isSmallDevice ? 5 : 6,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: Colors.neutralGray,
      marginVertical: Spacing.xs,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    timelineStatus: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.neutralCharcoal,
      textTransform: "capitalize",
    },
    timelineDate: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginTop: 2,
    },
    timelineNotes: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginTop: Spacing.xs,
      fontStyle: "italic",
    },
    infoCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    infoRow: {
      flexDirection: "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    infoTextContainer: {
      flex: 1,
    },
    infoLabel: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
      marginBottom: Spacing.xs,
    },
    infoValue: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralCharcoal,
      lineHeight: isSmallDevice ? 18 : 20,
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
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
    },
    orderItem: {
      flexDirection: "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      paddingBottom: isSmallDevice ? Spacing.sm : Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    itemImage: {
      width: isSmallDevice ? 50 : 60,
      height: isSmallDevice ? 50 : 60,
      borderRadius: 8,
      backgroundColor: Colors.neutralGray,
    },
    itemInfo: {
      flex: 1,
      justifyContent: "center",
    },
    itemName: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.neutralCharcoal,
      marginBottom: 4,
    },
    itemQuantity: {
      fontSize: isSmallDevice ? 11 : Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    itemSku: {
      fontSize: isSmallDevice ? 10 : Typography.bodySmall,
      color: Colors.neutralGray,
      marginTop: 2,
    },
    itemPrice: {
      fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.primary900,
      alignSelf: "center",
    },
    summaryCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 12 : 16,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm,
    },
    summaryLabel: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      color: Colors.neutralMedium,
    },
    summaryValue: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
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
    totalLabel: {
      fontSize: isSmallDevice ? Typography.bodyLarge : Typography.h4,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    totalValue: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.primary900,
    },
    footer: {
      flexDirection: isSmallDevice ? "column" : "row",
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      backgroundColor: Colors.neutralWhite,
      borderTopWidth: 1,
      borderTopColor: Colors.neutralGray,
    },
    reorderButton: {
      flex: isSmallDevice ? undefined : 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      backgroundColor: Colors.neutralWhite,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: isSmallDevice ? 12 : 16,
      borderWidth: 2,
      borderColor: Colors.primary900,
    },
    reorderText: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
      fontWeight: Typography.bold,
      color: Colors.primary900,
    },
    cancelButton: {
      flex: isSmallDevice ? undefined : 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      backgroundColor: Colors.neutralWhite,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: isSmallDevice ? 12 : 16,
      borderWidth: 2,
      borderColor: Colors.accentRed,
    },
    cancelText: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
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
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    modalContent: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: isSmallDevice ? 16 : 24,
      padding: isSmallDevice ? Spacing.lg : Spacing.xl,
      width: "100%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.sm,
    },
    modalMessage: {
      fontSize: isSmallDevice ? Typography.bodySmall : Typography.bodyBase,
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

  const fetchOrderDetails = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await getOrder(Number(id));
      const newOrder = response.data.order;

      // Check if status changed
      if (order && newOrder.status !== order.status) {
        console.log("📦 [ORDER] Status changed:", order.status, "->", newOrder.status);

        // Show alert for status change
        Alert.alert(
          "Order Status Updated",
          `Your order status has been updated to: ${newOrder.status_label}`,
          [{ text: "OK" }]
        );

        setPreviousStatus(order.status);
      }

      setOrder(newOrder);
      setLastUpdated(new Date());
    } catch (error: any) {
      if (!silent) {
        Alert.alert("Error", error.message || "Failed to load order details");
        router.back();
      } else {
        console.error("Failed to refresh order:", error);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
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
    if (!order) return;

    // Check if order is in a state that can be reordered
    const canReorderStatus = [
      "delivered",
      "cancelled",
      "failed",
    ];

    if (!canReorderStatus.includes(order.status)) {
      Alert.alert(
        "Cannot Reorder",
        "You can only reorder completed, cancelled, or failed orders. This order is still active.",
        [{ text: "OK" }]
      );
      return;
    }

    setReordering(true);
    try {
      console.log("🛒 [REORDER] Starting reorder for order ID:", id);
      const response = await reorder(Number(id));
      console.log("🛒 [REORDER] API Response:", JSON.stringify(response.data?.summary, null, 2));

      // Force fetch cart from backend to ensure sync
      console.log("🔄 [REORDER] Refreshing cart from backend...");
      await fetchCart();
      console.log("✅ [REORDER] Cart refreshed successfully");

      const summary = response.data?.summary;
      const unavailableItems = response.data?.unavailable_items || [];

      if (!summary) {
        Alert.alert("Success", "Items have been added to your cart!", [
          { text: "OK", style: "cancel" },
          {
            text: "View Cart",
            onPress: async () => {
              // Give store a moment to update before navigating
              await new Promise(resolve => setTimeout(resolve, 200));
              router.push("/(tabs)/cart");
            }
          },
        ]);
        return;
      }

      const { items_added, items_unavailable, total_items_requested } = summary;

      if (items_added === 0) {
        // Build message with unavailable items details
        let message = "Sorry, none of the items from this order are currently available.\n\n";
        if (unavailableItems.length > 0) {
          message += "Unavailable items:\n";
          unavailableItems.forEach((item: any) => {
            const reason =
              item.reason === "discontinued"
                ? "discontinued"
                : item.reason === "inactive"
                  ? "no longer available"
                  : "out of stock";
            message += `• ${item.product_name} (${reason})\n`;
          });
        }

        Alert.alert("Items Unavailable", message, [{ text: "OK" }]);
      } else if (items_unavailable > 0) {
        // Partial reorder
        let message = `${items_added} of ${total_items_requested} items were added to your cart.\n\n`;
        message += "Unavailable items:\n";
        unavailableItems.forEach((item: any) => {
          const reason =
            item.reason === "discontinued"
              ? "discontinued"
              : item.reason === "inactive"
                ? "no longer available"
                : "out of stock";
          message += `• ${item.product_name} (${reason})\n`;
        });

        Alert.alert("Partial Reorder", message, [
          { text: "OK", style: "cancel" },
          {
            text: "View Cart",
            onPress: async () => {
              await new Promise(resolve => setTimeout(resolve, 200));
              router.push("/(tabs)/cart");
            }
          },
        ]);
      } else {
        // All items added successfully
        Alert.alert(
          "Success",
          `All ${items_added} item${items_added > 1 ? "s" : ""} have been added to your cart!`,
          [
            { text: "OK", style: "cancel" },
            {
              text: "View Cart",
              onPress: async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                router.push("/(tabs)/cart");
              }
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reorder");
    } finally {
      setReordering(false);
    }
  };

  const canReorderOrder = (status: string) => {
    return ["delivered", "cancelled", "failed"].includes(status);
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

  useEffect(() => {
    if (id) {
      fetchOrderDetails();

      // Set up polling to refresh order status every 30 seconds
      const pollInterval = setInterval(() => {
        fetchOrderDetails(true); // Silent refresh
      }, 30000); // 30 seconds

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval);
    }
  }, [id]);

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
          {lastUpdated && (
            <Text
              style={{
                fontSize: 10,
                color: Colors.neutralGray,
                marginTop: 4,
              }}
            >
              Last updated: {lastUpdated.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          )}
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
                <Text
                  style={[
                    styles.paymentStatus,
                    order.payment_status === "refunded" && {
                      color: Colors.accentOrange,
                      fontWeight: Typography.semibold,
                    },
                  ]}
                >
                  Status:{" "}
                  {order.payment_status.charAt(0).toUpperCase() +
                    order.payment_status.slice(1)}
                </Text>
                {order.payment_status === "refunded" && (
                  <Text
                    style={{
                      fontSize: isSmallDevice ? 10 : Typography.bodySmall,
                      color: Colors.accentOrange,
                      marginTop: Spacing.xs,
                      fontStyle: "italic",
                    }}
                  >
                    Your payment has been refunded to your original payment method
                  </Text>
                )}
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
            {order.promo_code && (
              <View style={styles.promoRow}>
                <Text style={styles.promoLabel}>
                  Promo Code: {order.promo_code}
                </Text>
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
      {canCancelOrder(order.status) && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelDialog(true)}
          >
            <XCircle size={20} color={Colors.accentRed} />
            <Text style={styles.cancelText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>
      )}

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
