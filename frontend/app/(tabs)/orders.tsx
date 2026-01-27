import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ShoppingBag,
  RotateCcw,
} from "lucide-react-native";
import { router } from "expo-router";
import { useResponsive } from "@/hooks/useResponsive";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import { getOrders, reorder, Order } from "@/services/api/orderApi";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";

type TabType = "all" | "active" | "delivered" | "cancelled";

export default function OrdersScreen() {
  const { t } = useTranslation();
  const { wp, hp, isSmallDevice } = useResponsive();
  const { user, fetchCart } = useStore();
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();

      // Set up polling to refresh orders every 60 seconds
      const pollInterval = setInterval(() => {
        fetchOrders();
      }, 60000); // 60 seconds

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval);
    }
  }, [user, activeTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const statusFilter = activeTab === "all" ? undefined : activeTab;
      const response = await getOrders(statusFilter);

      // Backend returns { success, data: { orders: [...], pagination: {...} } }
      // orders is an array, not a paginated object
      const ordersData = response.data.orders || [];
      setOrders(ordersData);
    } catch (error: any) {
      Alert.alert(t.common.error, error.message || t.alerts.errorOccurred);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleReorder = async (orderId: number, e: any) => {
    e.stopPropagation(); // Prevent navigation to order details

    setReorderingId(orderId);
    try {
      const response = await reorder(orderId);
      await fetchCart();

      const summary = response.data?.summary;
      const unavailableItems = response.data?.unavailable_items || [];

      if (!summary || summary.items_added > 0) {
        const itemsAdded = summary?.items_added || 0;
        Alert.alert(
          t.common.success,
          itemsAdded > 0
            ? `${itemsAdded} ${t.orders.itemsAddedToCart}`
            : t.orders.itemsAddedToCart,
          [
            { text: t.cart.continueShopping, style: "cancel" },
            {
              text: t.orders.viewCart,
              onPress: () => router.push("/(tabs)/cart"),
            },
          ],
        );
      } else {
        Alert.alert(t.orders.unavailable, t.orders.itemsUnavailable);
      }
    } catch (error: any) {
      Alert.alert(t.common.error, error.message || t.orders.reorderFailed);
    } finally {
      setReorderingId(null);
    }
  };

  const canReorder = (status: string) => {
    return ["delivered", "cancelled", "failed"].includes(status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return <Clock size={20} color={Colors.accentOrange} />;
      case "confirmed":
      case "preparing":
        return <Package size={20} color={Colors.primary700} />;
      case "out_for_delivery":
      case "shipped":
        return <Truck size={20} color={Colors.primary900} />;
      case "delivered":
        return <CheckCircle size={20} color={Colors.primary700} />;
      case "cancelled":
      case "failed":
        return <XCircle size={20} color={Colors.accentRed} />;
      default:
        return <Package size={20} color={Colors.neutralMedium} />;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralCloud,
    },
    header: {
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingVertical: Spacing.md,
    },
    title: {
      fontSize: isSmallDevice ? Typography.h2 : Typography.h1,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
    },
    tabContainer: {
      flexDirection: "row",
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      marginBottom: Spacing.md,
      gap: isSmallDevice ? 4 : Spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: Colors.neutralWhite,
    },
    activeTab: {
      backgroundColor: Colors.primary900,
    },
    tabText: {
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.neutralMedium,
    },
    activeTabText: {
      color: Colors.neutralWhite,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
      fontSize: isSmallDevice ? Typography.h3 : Typography.h2,
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
    shopButton: {
      backgroundColor: Colors.primary900,
      paddingHorizontal: Spacing.xl,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 16,
      minHeight: isSmallDevice ? 44 : 50,
    },
    shopButtonText: {
      fontSize: Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
    },
    loginButton: {
      backgroundColor: Colors.primary900,
      paddingHorizontal: Spacing.xl,
      paddingVertical: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 16,
      minHeight: isSmallDevice ? 44 : 50,
    },
    loginButtonText: {
      fontSize: Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.neutralWhite,
    },
    content: {
      flex: 1,
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
    },
    orderCard: {
      backgroundColor: Colors.neutralWhite,
      borderRadius: 24,
      padding: isSmallDevice ? Spacing.sm : Spacing.md,
      marginBottom: isSmallDevice ? Spacing.sm : Spacing.md,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: Spacing.md,
    },
    orderHeaderLeft: {
      flex: 1,
    },
    orderNumber: {
      fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.neutralCharcoal,
      marginBottom: 4,
    },
    orderDate: {
      fontSize: Typography.bodyMedium,
      color: Colors.neutralMedium,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: Typography.bodySmall,
      fontWeight: Typography.semibold,
    },
    orderItems: {
      flexDirection: "row",
      gap: Spacing.xs,
      marginBottom: Spacing.md,
    },
    miniItem: {
      width: isSmallDevice ? 45 : 50,
      height: isSmallDevice ? 45 : 50,
      borderRadius: 12,
      overflow: "hidden",
    },
    miniImage: {
      width: "100%",
      height: "100%",
      backgroundColor: Colors.neutralLight,
    },
    moreItems: {
      width: isSmallDevice ? 45 : 50,
      height: isSmallDevice ? 45 : 50,
      borderRadius: 12,
      backgroundColor: Colors.neutralLight,
      justifyContent: "center",
      alignItems: "center",
    },
    moreItemsText: {
      fontSize: Typography.bodySmall,
      fontWeight: Typography.bold,
      color: Colors.neutralMedium,
    },
    orderFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: Colors.neutralLight,
    },
    orderTotal: {
      fontSize: isSmallDevice ? Typography.bodyBase : Typography.bodyLarge,
      fontWeight: Typography.bold,
      color: Colors.primary900,
    },
    viewDetails: {
      fontSize: Typography.bodyBase,
      fontWeight: Typography.semibold,
      color: Colors.primary900,
    },
    footerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    reorderButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: Colors.primary100,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reorderButtonText: {
      fontSize: Typography.bodySmall,
      fontWeight: Typography.semibold,
      color: Colors.primary900,
    },
  });

  // Early return for non-logged-in users (after styles are defined)
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Package size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>{t.orders.pleaseLogin}</Text>
          <Text style={styles.emptyText}>{t.orders.signInToView}</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>{t.auth.login}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.orders.title}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(["all", "active", "delivered", "cancelled"] as TabType[]).map(
          (tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={80} color={Colors.neutralGray} />
          <Text style={styles.emptyTitle}>{t.orders.noOrdersYet}</Text>
          <Text style={styles.emptyText}>{t.orders.startShoppingToSee}</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.shopButtonText}>{t.orders.startShopping}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary900]}
            />
          }
        >
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/orders/${order.id}` as any)}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) + "20" },
                  ]}
                >
                  {getStatusIcon(order.status)}
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

              <View style={styles.orderItems}>
                {order.items?.slice(0, 2).map((item) => (
                  <View key={item.id} style={styles.miniItem}>
                    {item.product?.image && (
                      <Image
                        source={{ uri: item.product.image }}
                        style={styles.miniImage}
                      />
                    )}
                  </View>
                ))}
                {(order.items?.length || 0) > 2 && (
                  <View style={styles.moreItems}>
                    <Text style={styles.moreItemsText}>
                      +{(order.items?.length || 0) - 2}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>
                  {t.orders.total}:{" "}
                  {parseFloat(order.total.toString()).toFixed(2)}{" "}
                  {t.common.currency}
                </Text>
                <View style={styles.footerActions}>
                  {canReorder(order.status) && (
                    <TouchableOpacity
                      style={styles.reorderButton}
                      onPress={(e) => handleReorder(order.id, e)}
                      disabled={reorderingId === order.id}
                      activeOpacity={0.7}
                    >
                      {reorderingId === order.id ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.primary900}
                        />
                      ) : (
                        <>
                          <RotateCcw size={14} color={Colors.primary900} />
                          <Text style={styles.reorderButtonText}>
                            {t.orders.reorder}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <Text style={styles.viewDetails}>{t.orders.details} →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
