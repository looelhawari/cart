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
  Tag,
  User,
  CheckCircle,
  Wallet,
  MessageSquare,
  Bell,
  Megaphone,
  Trash2,
} from "lucide-react-native";
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

type Tab = "all" | "order" | "promotion" | "wallet" | "complaint";

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: t.notifications.all },
    { key: "order", label: t.notifications.orders },
    { key: "promotion", label: t.notifications.offers },
    { key: "wallet", label: t.notifications.wallet || "Wallet" },
    { key: "complaint", label: t.notifications.account },
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

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
      case "order_status":
        return <ShoppingBag size={24} color={Colors.primary900} />;
      case "promotion":
      case "broadcast":
        return <Megaphone size={24} color={Colors.accentOrange} />;
      case "wallet":
      case "wallet_credit":
      case "wallet_refund":
        return <Wallet size={24} color={Colors.successGreen} />;
      case "complaint":
      case "complaint_update":
        return <MessageSquare size={24} color={Colors.primary700} />;
      case "welcome":
        return <Bell size={24} color={Colors.primary900} />;
      default:
        return <CheckCircle size={24} color={Colors.primary900} />;
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

  const renderNotification = ({ item }: { item: NotificationData }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item.id, item.is_broadcast)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>{getIcon(item.type)}</View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.is_read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>{item.time_ago}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary900} />
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.neutralCloud,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: Colors.neutralWhite,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
      flex: 1,
      textAlign: "center",
    },
    markAllText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.primary900,
    },
    tabsContainer: {
      flexDirection: "row",
      backgroundColor: Colors.neutralWhite,
      paddingHorizontal: isSmallDevice ? Spacing.md : Spacing.lg,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: Colors.neutralGray,
    },
    tab: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: isSmallDevice ? Spacing.sm : Spacing.md,
      borderRadius: 20,
    },
    activeTab: {
      backgroundColor: Colors.primary900,
    },
    tabText: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralMedium,
    },
    activeTabText: {
      color: Colors.neutralWhite,
    },
    listContent: {
      padding: isSmallDevice ? Spacing.md : Spacing.lg,
      gap: Spacing.sm,
    },
    notificationCard: {
      flexDirection: "row",
      backgroundColor: Colors.neutralWhite,
      borderRadius: 16,
      padding: isSmallDevice ? Spacing.sm : Spacing.md,
      gap: isSmallDevice ? Spacing.sm : Spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    unreadCard: {
      backgroundColor: Colors.neutralLight,
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary900,
    },
    iconContainer: {
      width: isSmallDevice ? 40 : 48,
      height: isSmallDevice ? 40 : 48,
      borderRadius: isSmallDevice ? 20 : 24,
      backgroundColor: Colors.neutralLight,
      alignItems: "center",
      justifyContent: "center",
    },
    contentContainer: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: isSmallDevice ? Typography.bodyMedium : Typography.bodyBase,
      fontFamily: "Poppins_600SemiBold",
      color: Colors.neutralCharcoal,
    },
    unreadTitle: {
      fontFamily: "Poppins_700Bold",
    },
    message: {
      fontSize: Typography.bodyMedium,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      lineHeight: 20,
    },
    timestamp: {
      fontSize: Typography.bodySmall,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary900,
      alignSelf: "center",
    },
    deleteAction: {
      backgroundColor: Colors.accentRed || "#FF4444",
      justifyContent: "center",
      alignItems: "center",
      width: 70,
      borderRadius: 16,
      marginVertical: 2,
    },
    footerLoader: {
      paddingVertical: Spacing.md,
      alignItems: "center",
    },
    loginPrompt: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.xxl,
    },
    loginPromptText: {
      fontSize: Typography.bodyBase,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      textAlign: "center",
      marginBottom: Spacing.md,
    },
    loginButton: {
      backgroundColor: Colors.primary900,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.sm,
      borderRadius: 8,
    },
    loginButtonText: {
      color: Colors.neutralWhite,
      fontFamily: "Poppins_600SemiBold",
      fontSize: Typography.bodyBase,
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
      paddingHorizontal: Spacing.xxl,
    },
    emptyTitle: {
      fontSize: isSmallDevice ? Typography.h4 : Typography.h3,
      fontFamily: "Poppins_700Bold",
      color: Colors.neutralCharcoal,
      marginBottom: Spacing.sm,
    },
    emptyText: {
      fontSize: Typography.bodyBase,
      fontFamily: "Poppins_400Regular",
      color: Colors.neutralMedium,
      textAlign: "center",
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.neutralCharcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t.notifications.title}
          {unreadCount > 0 && ` (${unreadCount})`}
        </Text>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text
            style={[styles.markAllText, unreadCount === 0 && { opacity: 0.5 }]}
          >
            {t.notifications.markAllRead}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {!isAuthenticated ? (
        <View style={styles.loginPrompt}>
          <Bell size={64} color={Colors.neutralMedium} />
          <Text style={[styles.emptyTitle, { marginTop: Spacing.md }]}>
            {t.notifications.loginRequired || "Login Required"}
          </Text>
          <Text style={styles.loginPromptText}>
            {t.notifications.loginMessage ||
              "Please login to view your notifications"}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.loginButtonText}>
              {t.common?.login || "Login"}
            </Text>
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
          <Bell size={64} color={Colors.neutralMedium} />
          <Text style={[styles.emptyTitle, { marginTop: Spacing.md }]}>
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
