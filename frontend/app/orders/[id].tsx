import React, { useState, useEffect, useCallback } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  CreditCard,
  Wallet,
  Calendar,
  ShoppingCart,
} from "lucide-react-native";
import { useResponsive } from "@/hooks/useResponsive";

import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import {
  getOrder,
  cancelOrder as cancelOrderApi,
  Order,
} from "@/services/api/orderApi";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import OfflineIndicator from "@/components/OfflineIndicator";

export default function OrderDetailsScreen() {
  const { isSmallDevice } = useResponsive();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
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
      borderRadius: 20,
      backgroundColor: Colors.neutralCloud,
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
      marginHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      marginTop: Spacing.md,
      borderRadius: 20,
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    orderHeaderTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: Spacing.md,
    },
    orderNumberContainer: {
      flex: 1,
    },
    orderNumberLabel: {
      fontSize: Typography.bodySmall,
      color: Colors.neutralMedium,
      marginBottom: 4,
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
    orderMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    orderMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    orderMetaText: {
      fontSize: Typography.bodySmall,
      color: Colors.neutralMedium,
    },
    progressSection: {
      marginTop: Spacing.sm,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: Colors.neutralLight,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: Colors.neutralLight,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: Colors.primary700,
      borderRadius: 3,
    },
    progressSteps: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
    },
    progressStep: {
      alignItems: "center",
      gap: 4,
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    progressStepText: {
      fontSize: 10,
      color: Colors.neutralMedium,
    },
    lastUpdatedText: {
      fontSize: 10,
      color: Colors.neutralGray,
      marginTop: Spacing.sm,
      textAlign: "center",
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

  const fetchOrderDetails = useCallback(
    async (silent: boolean = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        const response = await getOrder(Number(id));
        const newOrder = response.data.order;

        // Check if status changed
        setOrder((prevOrder) => {
          if (prevOrder && newOrder.status !== prevOrder.status) {
            console.log(
              "📦 [ORDER] Status changed:",
              prevOrder.status,
              "->",
              newOrder.status,
            );

            // Show alert for status change
            Alert.alert(
              "Order Status Updated",
              `Your order status has been updated to: ${newOrder.status_label}`,
              [{ text: "OK" }],
            );
          }
          return newOrder;
        });
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
    },
    [id],
  );

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

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending":
        return 15;
      case "processing":
        return 30;
      case "confirmed":
        return 45;
      case "preparing":
        return 55;
      case "shipped":
      case "out_for_delivery":
        return 75;
      case "delivered":
        return 100;
      default:
        return 0;
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
  }, [id, fetchOrderDetails]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <OfflineIndicator />
        <View style={{ padding: Spacing.lg }}>
          {/* Header Skeleton */}
          <View style={{ marginBottom: Spacing.lg }}>
            <SkeletonLoader width={150} height={28} borderRadius={8} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width={200} height={20} borderRadius={6} />
          </View>

          {/* Status Card Skeleton */}
          <View
            style={{
              backgroundColor: Colors.neutralWhite,
              borderRadius: 12,
              padding: Spacing.md,
              marginBottom: Spacing.lg,
            }}
          >
            <SkeletonLoader width={120} height={24} borderRadius={6} />
            <View style={{ height: 12 }} />
            <SkeletonLoader width="80%" height={16} borderRadius={4} />
          </View>

          {/* Items Skeleton */}
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                marginBottom: Spacing.md,
                backgroundColor: Colors.neutralWhite,
                borderRadius: 12,
                padding: Spacing.md,
              }}
            >
              <SkeletonLoader width={80} height={80} borderRadius={8} />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <SkeletonLoader width="70%" height={18} borderRadius={4} />
                <View style={{ height: 8 }} />
                <SkeletonLoader width="40%" height={16} borderRadius={4} />
                <View style={{ height: 8 }} />
                <SkeletonLoader width="30%" height={20} borderRadius={6} />
              </View>
            </View>
          ))}

          {/* Summary Skeleton */}
          <View
            style={{
              backgroundColor: Colors.neutralWhite,
              borderRadius: 12,
              padding: Spacing.md,
            }}
          >
            <SkeletonLoader width={100} height={20} borderRadius={6} />
            <View style={{ height: 12 }} />
            {[1, 2, 3, 4].map((i) => (
              <View key={i}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <SkeletonLoader width={100} height={16} borderRadius={4} />
                  <SkeletonLoader width={60} height={16} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
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
        {/* Order Header Card */}
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderTop}>
            <View style={styles.orderNumberContainer}>
              <Text style={styles.orderNumberLabel}>Order Number</Text>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
            </View>
            <LinearGradient
              colors={[
                getStatusColor(order.status) + "30",
                getStatusColor(order.status) + "10",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusBadge]}
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
            </LinearGradient>
          </View>

          {/* Order Meta Info */}
          <View style={styles.orderMetaRow}>
            <View style={styles.orderMetaItem}>
              <Calendar size={14} color={Colors.neutralMedium} />
              <Text style={styles.orderMetaText}>
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.orderMetaItem}>
              <Clock size={14} color={Colors.neutralMedium} />
              <Text style={styles.orderMetaText}>
                {new Date(order.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View style={styles.orderMetaItem}>
              <ShoppingCart size={14} color={Colors.neutralMedium} />
              <Text style={styles.orderMetaText}>
                {order.items?.length || 0} items
              </Text>
            </View>
          </View>

          {/* Progress Bar for Active Orders */}
          {!["cancelled", "failed", "delivered"].includes(order.status) && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${getProgressPercentage(order.status)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressSteps}>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      { backgroundColor: Colors.primary700 },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Ordered</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 40
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Processing</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 70
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Shipping</Text>
                </View>
                <View style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          getProgressPercentage(order.status) >= 100
                            ? Colors.primary700
                            : Colors.neutralLight,
                      },
                    ]}
                  />
                  <Text style={styles.progressStepText}>Delivered</Text>
                </View>
              </View>
            </View>
          )}

          {lastUpdated && (
            <Text style={styles.lastUpdatedText}>
              Last updated:{" "}
              {lastUpdated.toLocaleTimeString("en-US", {
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
                    Your payment has been refunded to your original payment
                    method
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
