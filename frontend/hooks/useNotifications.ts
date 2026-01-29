import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store";
import {
  NotificationData,
  NotificationPreferences,
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
  deleteNotification as deleteNotificationApi,
  getPreferences,
  updatePreferences as updatePreferencesApi,
  initializePushNotifications,
  setBadgeCount,
} from "@/services/notificationService";

interface UseNotificationsReturn {
  notifications: NotificationData[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  unreadCount: number;
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  fetchNotifications: (page?: number, type?: string) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: number) => Promise<boolean>;
  fetchUnreadCount: () => Promise<number>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (
    prefs: Partial<NotificationPreferences>,
  ) => Promise<boolean>;
  initializePush: () => Promise<string | null>;
}

/**
 * Custom hook for managing notifications state and actions
 */
export function useNotifications(): UseNotificationsReturn {
  const { isAuthenticated } = useStore();

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentType, setCurrentType] = useState<string | undefined>();

  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (page: number = 1, type?: string) => {
      if (!isAuthenticated) return;

      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

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
          setCurrentType(type);

          // Update badge
          setBadgeCount(result.unread_count);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated],
  );

  // Refresh notifications
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1, currentType);
    setRefreshing(false);
  }, [fetchNotifications, currentType]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchNotifications(currentPage + 1, currentType);
    }
  }, [loadingMore, hasMore, currentPage, currentType, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: number): Promise<boolean> => {
    const success = await markAsReadApi(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        setBadgeCount(newCount);
        return newCount;
      });
    }
    return success;
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    const success = await markAllAsReadApi();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setBadgeCount(0);
    }
    return success;
  }, []);

  // Delete notification
  const deleteNotification = useCallback(
    async (id: number): Promise<boolean> => {
      const notification = notifications.find((n) => n.id === id);
      const success = await deleteNotificationApi(id);
      if (success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => {
            const newCount = Math.max(0, prev - 1);
            setBadgeCount(newCount);
            return newCount;
          });
        }
      }
      return success;
    },
    [notifications],
  );

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    if (!isAuthenticated) return 0;
    const count = await getUnreadCount();
    setUnreadCount(count);
    setBadgeCount(count);
    return count;
  }, [isAuthenticated]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setPreferencesLoading(true);
      const prefs = await getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setPreferencesLoading(false);
    }
  }, [isAuthenticated]);

  // Update preferences
  const updatePreferences = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
      const updated = await updatePreferencesApi(prefs);
      if (updated) {
        setPreferences(updated);
        return true;
      }
      return false;
    },
    [],
  );

  // Initialize push notifications
  const initializePush = useCallback(async (): Promise<string | null> => {
    return await initializePushNotifications();
  }, []);

  // Fetch initial unread count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      setBadgeCount(0);
    }
  }, [isAuthenticated, fetchUnreadCount]);

  return {
    notifications,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    unreadCount,
    preferences,
    preferencesLoading,
    fetchNotifications,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchUnreadCount,
    fetchPreferences,
    updatePreferences,
    initializePush,
  };
}

export default useNotifications;
