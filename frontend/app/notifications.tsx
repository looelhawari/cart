import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ShoppingBag,
  CheckCheck,
  MessageSquare,
  Bell,
  Megaphone,
  Trash2,
  Wallet,
  MapPin,
  Shield,
  Sparkles,
  Package,
  ShoppingCart,
  Heart,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "@/i18n";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/Colors";
import {
  NotificationData,
  getNotifications,
  markAsRead,
  markAllAsRead as markAllRead,
  deleteNotification,
  handleNotificationAction,
} from "@/services/notificationService";
import { useStore } from "@/store";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useStore();

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "read" | "unread">(
    "all",
  );

  const fetchNotifications = useCallback(
    async (
      page: number = 1,
      refresh: boolean = false,
      filterOverride?: "all" | "read" | "unread",
    ) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      const currentFilter = filterOverride ?? activeFilter;

      try {
        if (page === 1) {
          if (refresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        // Pass filter to API (undefined for "all")
        const filterParam = currentFilter === "all" ? undefined : currentFilter;
        const result = await getNotifications(page, 20, undefined, filterParam);

        if (result) {
          if (page === 1) {
            setNotifications(result.notifications.data);
          } else {
            setNotifications((prev) => [...prev, ...result.notifications.data]);
          }
          setUnreadCount(result.unread_count);
          setCurrentPage(result.notifications.current_page);
          setHasMore(
            result.notifications.current_page < result.notifications.last_page,
          );
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, activeFilter],
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleFilterChange = (filter: "all" | "read" | "unread") => {
    if (filter === activeFilter) return;
    setActiveFilter(filter);
    setNotifications([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchNotifications(1, false, filter);
  };

  const handleRefresh = () => {
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(currentPage + 1);
    }
  };

  const handleMarkAllAsRead = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await markAllRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      // If filtering by unread, clear the list since all are now read
      if (activeFilter === "unread") {
        setNotifications([]);
      }
    }
  };

  const handleMarkAsRead = async (notification: NotificationData) => {
    if (notification.is_read) return;

    const success = await markAsRead(notification.id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Mark as read first
    await handleMarkAsRead(notification);

    // Navigate to the relevant screen based on notification data
    if (notification.data) {
      handleNotificationAction(
        notification.data as Record<string, unknown>,
        router as unknown as {
          push: (href: string) => void;
          navigate: (screen: string, params?: Record<string, unknown>) => void;
        },
      );
    }
  };

  const handleDelete = async (notificationId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await deleteNotification(notificationId);
    if (success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  // Icon + color mapping by notification type (Instagram/Facebook style colored circles)
  const getIconConfig = (type: string) => {
    switch (type) {
      case "order":
      case "order_status":
        return {
          icon: <ShoppingBag size={18} color="#fff" />,
          bgColor: "#3B82F6",
        };
      case "promotion":
      case "broadcast":
        return {
          icon: <Megaphone size={18} color="#fff" />,
          bgColor: "#F59E0B",
        };
      case "wallet":
      case "wallet_credit":
      case "wallet_refund":
        return {
          icon: <Wallet size={18} color="#fff" />,
          bgColor: "#10B981",
        };
      case "complaint":
      case "complaint_update":
        return {
          icon: <MessageSquare size={18} color="#fff" />,
          bgColor: "#8B5CF6",
        };
      case "product":
      case "product_update":
        return {
          icon: <Package size={18} color="#fff" />,
          bgColor: "#EC4899",
        };
      case "cart":
      case "cart_reminder":
        return {
          icon: <ShoppingCart size={18} color="#fff" />,
          bgColor: "#F97316",
        };
      case "account":
      case "security":
        return {
          icon: <Shield size={18} color="#fff" />,
          bgColor: "#EF4444",
        };
      case "address":
        return {
          icon: <MapPin size={18} color="#fff" />,
          bgColor: "#06B6D4",
        };
      case "smart":
      case "recommendation":
        return {
          icon: <Sparkles size={18} color="#fff" />,
          bgColor: "#6366F1",
        };
      case "welcome":
        return {
          icon: <Heart size={18} color="#fff" />,
          bgColor: Colors.primary900,
        };
      default:
        return {
          icon: <Bell size={18} color="#fff" />,
          bgColor: Colors.primary900,
        };
    }
  };

  const renderRightActions = (notificationId: number, isBroadcast: boolean) => {
    if (isBroadcast) return null;

    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(notificationId)}
      >
        <Trash2 size={20} color="#fff" />
        <Text style={styles.deleteActionText}>
          {t.common?.delete || "Delete"}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }: { item: NotificationData }) => {
    const iconConfig = getIconConfig(item.type);
    const isUnread = !item.is_read;

    return (
      <Swipeable
        renderRightActions={() =>
          renderRightActions(item.id, item.is_broadcast)
        }
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.notificationCard, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.6}
        >
          {/* Left accent bar for unread */}
          {isUnread && <View style={styles.unreadBar} />}

          {/* Colored icon circle */}
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: iconConfig.bgColor },
              ]}
            >
              {iconConfig.icon}
            </View>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          {/* Text content */}
          <View style={styles.contentContainer}>
            <Text
              style={[styles.notifTitle, isUnread && styles.unreadTitle]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.notifMessage, isUnread && styles.unreadMessage]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
            <Text style={styles.notifTime}>{item.time_ago}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary900} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Compact Header — no tabs */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t.notifications.title}</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <CheckCheck size={14} color="#fff" />
                <Text style={styles.markAllText}>
                  {t.notifications.markAllRead}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Filter Tabs */}
      {isAuthenticated && !loading && (
        <View style={styles.filterContainer}>
          {(["all", "unread", "read"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const label =
              filter === "all"
                ? t.notifications?.all || "All"
                : filter === "unread"
                  ? t.notifications?.unread || "Unread"
                  : t.notifications?.read || "Read";
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleFilterChange(filter)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {label}
                </Text>
                {filter === "unread" && unreadCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      {!isAuthenticated ? (
        <View style={styles.loginPrompt}>
          <View style={styles.emptyIconBg}>
            <Bell size={44} color={Colors.neutralGray} />
          </View>
          <Text style={styles.loginTitle}>
            {t.notifications.loginRequired || "Login Required"}
          </Text>
          <Text style={styles.loginSubtitle}>
            {t.notifications.loginMessage ||
              "Please login to view your notifications"}
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtnGradient}
            >
              <Text style={styles.loginBtnText}>
                {t.auth?.login || "Login"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary900} />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary900]}
              tintColor={Colors.primary900}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <Bell size={48} color={Colors.neutralGray} />
          </View>
          <Text style={styles.emptyTitle}>
            {t.notifications.noNotifications}
          </Text>
          <Text style={styles.emptySubtitle}>
            {t.notifications.noNotificationsMessage}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  // ─── Header ───
  header: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  unreadBadge: {
    backgroundColor: "#EF4444",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 6,
  },
  markAllText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  // ─── Filter Tabs ───
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: Colors.primary900,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#6B7280",
  },
  filterTabTextActive: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
  },
  filterBadge: {
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold",
    color: "#fff",
  },
  // ─── List ───
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
  // ─── Notification Card (Instagram/Facebook style) ───
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  unreadCard: {
    backgroundColor: "#F0FDF4",
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.primary900,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconWrapper: {
    position: "relative",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary900,
    borderWidth: 2,
    borderColor: "#F0FDF4",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#374151",
    lineHeight: 20,
  },
  unreadTitle: {
    fontFamily: "Poppins_700Bold",
    color: "#111827",
  },
  notifMessage: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    lineHeight: 18,
  },
  unreadMessage: {
    color: "#4B5563",
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  // ─── Swipe Delete ───
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 16,
    marginLeft: 8,
    marginBottom: 8,
    gap: 4,
  },
  deleteActionText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    color: "#fff",
  },
  // ─── Footer ───
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // ─── Login Prompt ───
  loginPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  loginTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111827",
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  loginBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  loginBtnGradient: {
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  loginBtnText: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
  },
  // ─── Loading / Empty ───
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
