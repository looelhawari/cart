import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ShoppingBag,
  Tag,
  User,
  CheckCircle,
  MessageSquare,
  Bell,
  Megaphone,
  Trash2,
  CheckCheck,
  ChevronRight,
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useResponsive } from "@/hooks/useResponsive";
import { useTranslation } from "@/i18n";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import Colors from "@/constants/Colors";
import Typography from "@/constants/Typography";
import Spacing from "@/constants/Spacing";
import {
  NotificationData,
  getNotifications,
  markAsRead,
  markAllAsRead as markAllRead,
  deleteNotification,
  handleNotificationAction,
} from "@/services/notificationService";
import { useStore } from "@/store";

type Tab = "all" | "order" | "promotion" | "complaint";

export default function NotificationsScreen() {
  const { wp, hp, isSmallDevice } = useResponsive();
  const { t } = useTranslation();
  const { isAuthenticated } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "all", label: t.notifications.all, icon: "notifications-outline" },
    { key: "order", label: t.notifications.orders, icon: "bag-outline" },
    {
      key: "promotion",
      label: t.notifications.offers,
      icon: "megaphone-outline",
    },
    {
      key: "complaint",
      label: t.notifications.account,
      icon: "chatbubble-outline",
    },
  ];

  const fetchNotifications = useCallback(
    async (page: number = 1, refresh: boolean = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        if (page === 1) {
          refresh ? setRefreshing(true) : setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const type = activeTab !== "all" ? activeTab : undefined;
        const result = await getNotifications(page, 20, type);

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
    [isAuthenticated, activeTab],
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [activeTab]);

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
    await handleMarkAsRead(notification);

    // Navigate based on notification data
    if (notification.data) {
      handleNotificationAction(
        notification.data as Record<string, unknown>,
        router,
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

  const getIconConfig = (type: string) => {
    switch (type) {
      case "order":
      case "order_status":
        return {
          icon: <ShoppingBag size={20} color={Colors.primary900} />,
          bgColor: Colors.primary900 + "15",
        };
      case "promotion":
      case "broadcast":
        return {
          icon: <Megaphone size={20} color={Colors.accentOrange} />,
          bgColor: Colors.accentOrange + "15",
        };
      case "wallet":
      case "wallet_credit":
      case "wallet_refund":
        return {
          icon: (
            <Ionicons
              name="wallet-outline"
              size={20}
              color={Colors.successGreen || "#22C55E"}
            />
          ),
          bgColor: (Colors.successGreen || "#22C55E") + "15",
        };
      case "complaint":
      case "complaint_update":
        return {
          icon: <MessageSquare size={20} color={Colors.primary700} />,
          bgColor: Colors.primary700 + "15",
        };
      case "welcome":
        return {
          icon: <Bell size={20} color={Colors.primary900} />,
          bgColor: Colors.primary900 + "15",
        };
      default:
        return {
          icon: <CheckCircle size={20} color={Colors.primary900} />,
          bgColor: Colors.primary900 + "15",
        };
    }
  };

  const renderRightActions = (notificationId: number, isBroadcast: boolean) => {
    if (isBroadcast) return null; // Can't delete broadcast notifications

    return (
      <TouchableOpacity
        style={[styles.deleteAction, { marginLeft: Spacing.sm }]}
        onPress={() => handleDelete(notificationId)}
      >
        <Trash2 size={24} color={Colors.neutralWhite} />
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }: { item: NotificationData }) => {
    const iconConfig = getIconConfig(item.type);
    return (
      <Swipeable
        renderRightActions={() =>
          renderRightActions(item.id, item.is_broadcast)
        }
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconConfig.bgColor },
            ]}
          >
            {iconConfig.icon}
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, !item.is_read && styles.unreadTitle]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            <Text style={styles.timestamp}>{item.time_ago}</Text>
          </View>
          <ChevronRight
            size={16}
            color={Colors.neutralGray}
            style={{ alignSelf: "center" }}
          />
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

  const { width } = Dimensions.get("window");

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralCloud,
    },
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
      marginBottom: 12,
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
      color: Colors.neutralWhite,
      letterSpacing: 0.3,
    },
    markAllButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      gap: 6,
    },
    markAllText: {
      fontSize: 11,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralWhite,
    },
    unreadBadge: {
      backgroundColor: Colors.accentRed || "#EF4444",
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
    },
    unreadBadgeText: {
      fontSize: 11,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralWhite,
    },
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 14,
      padding: 3,
    },
    tab: {
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      borderRadius: 12,
      gap: 2,
    },
    tabActive: {
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    tabText: {
      fontSize: 10,
      fontFamily: "Poppins_500Medium",
      color: "rgba(255,255,255,0.6)",
    },
    tabTextActive: {
      color: Colors.neutralWhite,
      fontFamily: "Poppins_600SemiBold",
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
      gap: 10,
    },
    notificationCard: {
      flexDirection: "row",
      backgroundColor: Colors.neutralWhite,
      borderRadius: 16,
      padding: 14,
      gap: 12,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    unreadCard: {
      backgroundColor: Colors.primary900 + "08",
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary900,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    contentContainer: {
      flex: 1,
      gap: 3,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralCharcoal,
    },
    unreadTitle: {
      fontFamily: "Poppins_700Bold",
    },
    message: {
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      lineHeight: 19,
    },
    timestamp: {
      fontSize: 11,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralGray,
      marginTop: 2,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary900,
    },
    deleteAction: {
      backgroundColor: Colors.accentRed || "#EF4444",
      justifyContent: "center",
      alignItems: "center",
      width: 70,
      borderRadius: 16,
      marginLeft: 8,
    },
    footerLoader: {
      paddingVertical: Spacing.md,
      alignItems: "center",
    },
    loginPrompt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    loginIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: Colors.neutralLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    loginTitle: {
      fontSize: 20,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
      marginBottom: 8,
    },
    loginPromptText: {
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      textAlign: "center",
      marginBottom: 24,
    },
    loginButton: {
      borderRadius: 16,
      overflow: "hidden",
    },
    loginButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 28,
      paddingVertical: 14,
      gap: 6,
    },
    loginButtonText: {
      color: Colors.neutralWhite,
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
    },
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
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      textAlign: "center",
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Branded Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primary900, Colors.primary800]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <ArrowLeft size={20} color={Colors.neutralWhite} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t.notifications.title}</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <CheckCheck size={14} color={Colors.neutralWhite} />
                <Text style={styles.markAllText}>
                  {t.notifications.markAllRead}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={
                    activeTab === tab.key
                      ? Colors.neutralWhite
                      : "rgba(255,255,255,0.5)"
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

      {/* Content */}
      {!isAuthenticated ? (
        <View style={styles.loginPrompt}>
          <View style={styles.loginIconContainer}>
            <Bell size={48} color={Colors.neutralGray} />
          </View>
          <Text style={styles.loginTitle}>
            {t.notifications.loginRequired || "Login Required"}
          </Text>
          <Text style={styles.loginPromptText}>
            {t.notifications.loginMessage ||
              "Please login to view your notifications"}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary700, Colors.primary900]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>
                {t.common?.login || "Login"}
              </Text>
              <ChevronRight size={18} color={Colors.neutralWhite} />
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
          <View style={styles.emptyIconContainer}>
            <Bell size={48} color={Colors.neutralGray} />
          </View>
          <Text style={styles.emptyTitle}>
            {t.notifications.noNotifications}
          </Text>
          <Text style={styles.emptyText}>
            {t.notifications.noNotificationsMessage}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
