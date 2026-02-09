import React, { useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChevronRight } from "lucide-react-native";

import { useStore } from "@/store";
import Colors from "@/constants/Colors";
import Spacing from "@/constants/Spacing";
import { useTranslation, useLocalizedValue } from "@/i18n";
import { GuestModal } from "@/components/GuestModal";
import { orderApi, Order } from "@/services/api/orderApi";
import { Toast } from "@/components/Toast";

const { width } = Dimensions.get("window");

type TabType = "all" | "processing" | "delivered" | "cancelled";

export default function OrdersScreen() {
  const { t } = useTranslation();
  const { getName } = useLocalizedValue();
  const { user, cart, addToCart } = useStore();

  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Pagination state for infinite scroll
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );
  const [showGoToCart, setShowGoToCart] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const goToCartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchOrders = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setOrdersLoading(true);
      } else {
        setLoadingMore(true);
      }
      const response = await orderApi.getOrders(undefined, page, 15);

      // Handle various response formats
      let ordersData: Order[] = [];
      let lastPage = 1;
      if (response?.data?.orders && Array.isArray(response.data.orders)) {
        ordersData = response.data.orders;
        lastPage =
          response.data?.pagination?.last_page || response.data?.last_page || 1;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        ordersData = response.data.data;
        lastPage =
          response.data?.last_page || response.data?.meta?.last_page || 1;
      } else if (response?.data && Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (Array.isArray(response)) {
        ordersData = response;
      }

      if (append) {
        setUserOrders((prev) => [...prev, ...ordersData]);
      } else {
        setUserOrders(ordersData);
      }
      setCurrentPage(page);
      setHasMore(page < lastPage && ordersData.length > 0);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      if (!append) setUserOrders([]);
    } finally {
      setOrdersLoading(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Skip refetch if we fetched within the last 30 seconds
        const now = Date.now();
        if (now - lastFetchRef.current < 30000 && userOrders.length > 0) {
          return;
        }
        lastFetchRef.current = now;
        const task = InteractionManager.runAfterInteractions(() => {
          setCurrentPage(1);
          setHasMore(true);
          fetchOrders(1, false).then(() => {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          });
        });
        return () => {
          task.cancel();
          if (goToCartTimer.current) clearTimeout(goToCartTimer.current);
        };
      } else {
        setUserOrders([]);
      }
      return () => {
        if (goToCartTimer.current) clearTimeout(goToCartTimer.current);
      };
    }, [user]),
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !ordersLoading) {
      fetchOrders(currentPage + 1, true);
    }
  };

  const tabs: {
    key: TabType;
    label: string;
    iconName: keyof typeof Ionicons.glyphMap;
  }[] = [
      { key: "all", label: t.orders?.all || "All", iconName: "bag-outline" },
      {
        key: "processing",
        label: t.orders?.active || "Active",
        iconName: "time-outline",
      },
      {
        key: "delivered",
        label: t.orders?.delivered || "Delivered",
        iconName: "checkmark-circle-outline",
      },
      {
        key: "cancelled",
        label: t.orders?.cancelled || "Cancelled",
        iconName: "close-circle-outline",
      },
    ];

  const handleTabChange = (tab: TabType, index: number) => {
    setActiveTab(tab);
    Animated.spring(tabIndicatorAnim, {
      toValue: (index * (width - 36)) / 4,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const filteredOrders = Array.isArray(userOrders)
    ? userOrders.filter((order: any) => {
      if (activeTab === "all") return true;
      if (activeTab === "processing") {
        return [
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "out_for_delivery",
          "processing",
        ].includes(order.status);
      }
      return order.status === activeTab;
    })
    : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    await fetchOrders(1, false);
    setRefreshing(false);
  }, []);

  const handleReorder = async (orderId: number) => {
    setReorderingId(orderId);
    setShowGoToCart(false);
    if (goToCartTimer.current) clearTimeout(goToCartTimer.current);
    try {
      // Get order details with items
      const response = await orderApi.getOrder(orderId);
      const orderItems = response.data.order.items || [];

      if (orderItems.length === 0) {
        setToastMessage("No items found in this order");
        setToastType("error");
        setToastVisible(true);
        setReorderingId(null);
        return;
      }

      // Add each item to cart
      let addedCount = 0;
      for (const item of orderItems) {
        try {
          await addToCart(item.product_id, item.quantity);
          addedCount++;
        } catch (error) {
          console.error(`Failed to add product ${item.product_id}:`, error);
        }
      }

      setReorderingId(null);

      // Show Go to Cart banner (single message with redirect)
      setToastMessage(
        `${addedCount} item${addedCount > 1 ? "s" : ""} added to cart`,
      );
      setToastType("success");
      setShowGoToCart(true);

      // Auto-dismiss after 5 seconds
      goToCartTimer.current = setTimeout(() => {
        setShowGoToCart(false);
      }, 5000);
    } catch (error) {
      console.error("Reorder failed:", error);
      setToastMessage("Failed to reorder. Please try again.");
      setToastType("error");
      setToastVisible(true);
      setReorderingId(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: string;
        bgColor: string;
        iconName: keyof typeof Ionicons.glyphMap;
        label: string;
      }
    > = {
      pending: {
        color: Colors.accentOrange,
        bgColor: Colors.accentOrange + "15",
        iconName: "time-outline",
        label: "Pending",
      },
      confirmed: {
        color: Colors.primary700,
        bgColor: Colors.primary700 + "15",
        iconName: "checkmark-circle-outline",
        label: "Confirmed",
      },
      preparing: {
        color: "#3B82F6",
        bgColor: "#3B82F615",
        iconName: "cube-outline",
        label: "Preparing",
      },
      ready: {
        color: Colors.primary700,
        bgColor: Colors.primary700 + "15",
        iconName: "cube-outline",
        label: "Ready",
      },
      out_for_delivery: {
        color: Colors.primary800,
        bgColor: Colors.primary800 + "15",
        iconName: "car-outline",
        label: "On the way",
      },
      processing: {
        color: Colors.accentOrange,
        bgColor: Colors.accentOrange + "15",
        iconName: "time-outline",
        label: "Processing",
      },
      delivered: {
        color: Colors.primary900,
        bgColor: Colors.primary900 + "15",
        iconName: "checkmark-circle",
        label: t.orders?.delivered || "Delivered",
      },
      cancelled: {
        color: Colors.accentRed,
        bgColor: Colors.accentRed + "15",
        iconName: "close-circle",
        label: t.orders?.cancelled || "Cancelled",
      },
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Guest state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <LinearGradient
            colors={[Colors.primary900, Colors.primary800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <View style={styles.brandIcon}>
                  <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
                </View>
                <Text style={styles.brandName}>ElBaraka</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconContainer}>
            <Ionicons
              name="cube-outline"
              size={60}
              color={Colors.neutralGray}
            />
          </View>
          <Text style={styles.guestTitle}>Sign In Required</Text>
          <Text style={styles.guestText}>Sign in to view your orders</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInButtonGradient}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
              <ChevronRight size={18} color={Colors.neutralWhite} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderOrder = ({ item, index }: { item: any; index: number }) => {
    const statusConfig = getStatusConfig(item.status);
    const orderItems = item.items?.slice(0, 3) || [];
    const moreItems = (item.items?.length || 0) - 3;

    return (
      <Animated.View
        style={[
          styles.orderCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderNumber}>
              #{item.id || item.order_number}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.bgColor },
              ]}
            >
              <Ionicons
                name={statusConfig.iconName}
                size={14}
                color={statusConfig.color}
              />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Order Items Preview */}
        <View style={styles.itemsPreview}>
          <View style={styles.itemImages}>
            {orderItems.map((orderItem: any, idx: number) => (
              <View
                key={orderItem.id || idx}
                style={[
                  styles.itemImageContainer,
                  { marginLeft: idx > 0 ? -12 : 0, zIndex: 10 - idx },
                ]}
              >
                {orderItem.product?.image ? (
                  <Image
                    source={{ uri: orderItem.product.image }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color={Colors.neutralMedium}
                    />
                  </View>
                )}
              </View>
            ))}
            {moreItems > 0 && (
              <View style={[styles.moreItemsBadge, { marginLeft: -12 }]}>
                <Text style={styles.moreItemsText}>+{moreItems}</Text>
              </View>
            )}
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.itemsCount}>
              {item.items?.length || 0} items
            </Text>
            <Text style={styles.orderTotal}>
              {parseFloat(item.total?.toString() || "0").toFixed(2)} EGP
            </Text>
          </View>
        </View>

        {/* Order Actions */}
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => router.push(`/orders/${item.id}` as any)}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <ChevronRight size={16} color={Colors.primary900} />
          </TouchableOpacity>

          {item.status === "delivered" && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.accentYellow + "20",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                gap: 4,
              }}
              onPress={() => router.push(`/orders/${item.id}` as any)}
            >
              <Ionicons name="star" size={14} color={Colors.accentOrange} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.accentOrange,
                }}
              >
                Rate
              </Text>
            </TouchableOpacity>
          )}

          {(item.status === "delivered" || item.status === "cancelled") && (
            <TouchableOpacity
              style={[
                styles.reorderButton,
                reorderingId === item.id && styles.reorderButtonDisabled,
              ]}
              onPress={() => handleReorder(item.id)}
              disabled={reorderingId === item.id}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  reorderingId === item.id
                    ? [Colors.neutralGray, Colors.neutralGray]
                    : [Colors.primary700, Colors.primary900]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reorderButtonGradient}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={Colors.neutralWhite}
                />
                <Text style={styles.reorderButtonText}>
                  {reorderingId === item.id ? "..." : "Reorder"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cube-outline" size={50} color={Colors.neutralGray} />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === "all"
          ? "No Orders Yet"
          : `No ${tabs.find((tab) => tab.key === activeTab)?.label} Orders`}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === "all"
          ? "Your orders will appear here"
          : "No orders in this category"}
      </Text>
      {activeTab === "all" && (
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.push("/(tabs)/categories")}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[Colors.primary700, Colors.primary900]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shopButtonGradient}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
            <ChevronRight size={18} color={Colors.neutralWhite} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ═══════════════════════════════════════════════════════════════════════════
          BRANDED HEADER
      ═══════════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.brandContainer}>
              <View style={styles.brandIcon}>
                <Ionicons name="leaf" size={16} color={Colors.neutralWhite} />
              </View>
              <Text style={styles.brandName}>ElBaraka</Text>
            </View>

            <View style={styles.orderCountBadge}>
              <Ionicons
                name="cube-outline"
                size={14}
                color={Colors.neutralWhite}
              />
              <Text style={styles.orderCountText}>
                {userOrders?.length || 0}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: (width - 36) / 4 - 4,
                  transform: [{ translateX: tabIndicatorAnim }],
                },
              ]}
            />
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabChange(tab.key, index)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.iconName}
                  size={14}
                  color={
                    activeTab === tab.key
                      ? Colors.neutralWhite
                      : "rgba(255,255,255,0.7)"
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Reorder Success Banner with Go to Cart - at page top */}
      {showGoToCart && (
        <View style={styles.goToCartBanner}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={Colors.primary900}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.goToCartText}>{toastMessage}</Text>
          </View>
          <TouchableOpacity
            style={styles.goToCartButton}
            onPress={() => {
              setShowGoToCart(false);
              if (goToCartTimer.current) clearTimeout(goToCartTimer.current);
              router.push("/(tabs)/cart");
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.goToCartButtonText}>Go to Cart</Text>
            <ChevronRight size={16} color={Colors.neutralWhite} />
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          ORDERS LIST
      ═══════════════════════════════════════════════════════════════════════════ */}
      {ordersLoading && (userOrders?.length || 0) === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="cube-outline" size={32} color={Colors.primary900} />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color={Colors.primary900} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary900]}
              tintColor={Colors.primary900}
            />
          }
        />
      )}

      <GuestModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        message="Sign in to view your orders"
      />

      {/* Toast for errors */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
        duration={3000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutralCloud,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  brandName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
    letterSpacing: 0.3,
  },
  orderCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  orderCountText: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════════════════════════════════════════
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 3,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    height: "100%",
    backgroundColor: Colors.neutralWhite + "30",
    borderRadius: 12,
    top: 3,
    left: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "rgba(255,255,255,0.7)",
  },
  tabTextActive: {
    color: Colors.neutralWhite,
    fontFamily: "Poppins-SemiBold",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDERS LIST
  // ═══════════════════════════════════════════════════════════════════════════
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: Colors.neutralWhite,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    marginBottom: 14,
  },
  orderIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Poppins-SemiBold",
  },
  orderDate: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEMS PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  itemsPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.neutralLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralLight,
  },
  itemImages: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemImageContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
    overflow: "hidden",
    backgroundColor: Colors.neutralLight,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutralLight,
  },
  moreItemsBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.neutralWhite,
  },
  moreItemsText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    color: Colors.primary900,
  },
  orderSummary: {
    alignItems: "flex-end",
  },
  itemsCount: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.primary900,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  orderActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    color: Colors.primary900,
  },
  reorderButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  reorderButtonDisabled: {
    opacity: 0.7,
  },
  reorderButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  reorderButtonText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY & LOADING STATES
  // ═══════════════════════════════════════════════════════════════════════════
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: Colors.neutralMedium,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  shopButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shopButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 6,
  },
  shopButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST STATE
  // ═══════════════════════════════════════════════════════════════════════════
  guestContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  guestIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutralLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralCharcoal,
    marginBottom: 8,
    textAlign: "center",
  },
  guestText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: Colors.neutralMedium,
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.primary900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 6,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },

  // Go to Cart Banner
  goToCartBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900 + "10",
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary900 + "20",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  goToCartText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: Colors.neutralCharcoal,
  },
  goToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary900,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  goToCartButtonText: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: Colors.neutralWhite,
  },
});
