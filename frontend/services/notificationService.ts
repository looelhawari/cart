import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

/**
 * Check if running in Expo Go (where push notifications are not supported since SDK 53)
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Check if push notifications are supported in current environment
 */
export function isPushNotificationsSupported(): boolean {
  // Push notifications are NOT supported in Expo Go since SDK 53
  if (isExpoGo()) {
    return false;
  }
  // Must be a physical device
  if (!Device.isDevice) {
    return false;
  }
  return true;
}

// Configure notification behavior (only if not in Expo Go)
if (!isExpoGo()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Types
export interface NotificationData {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  is_broadcast: boolean;
  created_at: string;
  time_ago: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  order_updates: boolean;
  promotions: boolean;
  wallet_updates: boolean;
  complaint_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface PaginatedNotifications {
  data: NotificationData[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check if push notifications are supported
  if (!isPushNotificationsSupported()) {
    if (isExpoGo()) {
      console.log(
        "⚠️ Push notifications are not supported in Expo Go (SDK 53+). Use a development build.",
      );
    } else if (!Device.isDevice) {
      console.log("⚠️ Push notifications require a physical device");
    }
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order Updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    await Notifications.setNotificationChannelAsync("promotions", {
      name: "Promotions & Offers",
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    await Notifications.setNotificationChannelAsync("wallet", {
      name: "Wallet Updates",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("⚠️ Push notification permissions not granted");
    return null;
  }

  // Get Expo push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("⚠️ No project ID found for push notifications");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("✅ Push token obtained:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(
  token: string,
  deviceName?: string,
): Promise<boolean> {
  try {
    const response = await api.post("/notifications/token", {
      token,
      platform: Platform.OS,
      device_name: deviceName || `${Platform.OS} Device`,
    });

    if (response.data?.success) {
      console.log("✅ Push token registered with backend");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error registering push token:", error);
    return false;
  }
}

/**
 * Remove push token from backend (on logout)
 */
export async function removePushToken(token: string): Promise<boolean> {
  try {
    const response = await api.delete("/notifications/token", {
      data: { token },
    });

    if (response.data?.success) {
      console.log("✅ Push token removed from backend");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing push token:", error);
    return false;
  }
}

/**
 * Initialize push notifications (call on app start/login)
 */
export async function initializePushNotifications(): Promise<string | null> {
  const token = await registerForPushNotifications();

  if (token) {
    await registerPushToken(token);
  }

  return token;
}

/**
 * Get paginated notifications from API
 */
export async function getNotifications(
  page: number = 1,
  perPage: number = 20,
  type?: string,
): Promise<{
  notifications: PaginatedNotifications;
  unread_count: number;
} | null> {
  try {
    const params: Record<string, unknown> = { page, per_page: perPage };
    if (type) params.type = type;

    const response = await api.get("/notifications", { params });

    if (response.data?.success) {
      return {
        notifications: response.data.data,
        unread_count: response.data.unread_count,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return null;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get("/notifications/unread-count");
    return response.data?.unread_count ?? 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number): Promise<boolean> {
  try {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data?.success ?? false;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const response = await api.post("/notifications/read-all");
    return response.data?.success ?? false;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: number,
): Promise<boolean> {
  try {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data?.success ?? false;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
}

/**
 * Get notification preferences
 */
export async function getPreferences(): Promise<NotificationPreferences | null> {
  try {
    const response = await api.get("/notifications/preferences");
    return response.data?.data ?? null;
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return null;
  }
}

/**
 * Update notification preferences
 */
export async function updatePreferences(
  preferences: Partial<NotificationPreferences>,
): Promise<NotificationPreferences | null> {
  try {
    const response = await api.put("/notifications/preferences", preferences);
    return response.data?.data ?? null;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return null;
  }
}

/**
 * Schedule a local notification for order status change
 */
export async function sendOrderStatusNotification(
  orderId: string,
  newStatus: string,
  orderNumber?: string,
) {
  const statusMessages: Record<string, { title: string; body: string }> = {
    pending: {
      title: "⏳ Order Pending",
      body: `Order #${orderNumber || orderId} is being processed`,
    },
    confirmed: {
      title: "✅ Order Confirmed",
      body: `Order #${orderNumber || orderId} has been confirmed!`,
    },
    processing: {
      title: "📦 Order Processing",
      body: `Order #${orderNumber || orderId} is being prepared`,
    },
    shipped: {
      title: "🚚 Order Shipped",
      body: `Order #${orderNumber || orderId} is on the way!`,
    },
    out_for_delivery: {
      title: "🚚 Out for Delivery",
      body: `Order #${orderNumber || orderId} is on its way to you!`,
    },
    delivered: {
      title: "🎉 Order Delivered",
      body: `Order #${orderNumber || orderId} has been delivered`,
    },
    cancelled: {
      title: "❌ Order Cancelled",
      body: `Order #${orderNumber || orderId} has been cancelled`,
    },
    refunded: {
      title: "💰 Order Refunded",
      body: `Order #${orderNumber || orderId} has been refunded`,
    },
  };

  const notification = statusMessages[newStatus.toLowerCase()] || {
    title: "📋 Order Update",
    body: `Order #${orderNumber || orderId} status: ${newStatus}`,
  };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: { orderId, status: newStatus, action: "open_order" },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === "android" && { channelId: "orders" }),
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

/**
 * Cancel all notifications for a specific order
 */
export async function cancelOrderNotifications(orderId: string) {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of notifications) {
    if (notification.content.data?.orderId === orderId) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }
  }
}

/**
 * Get notification listener for when app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
) {
  // Return a no-op subscription in Expo Go
  if (isExpoGo()) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get notification response listener for when user taps on notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  // Return a no-op subscription in Expo Go
  if (isExpoGo()) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  if (isExpoGo()) return;
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
  if (isExpoGo()) return;
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Handle notification action (when user taps notification)
 */
export function handleNotificationAction(
  data: Record<string, unknown>,
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  },
) {
  const action = data?.action as string;

  switch (action) {
    case "open_order":
      if (data.order_id) {
        navigation.navigate("OrderDetails", { orderId: data.order_id });
      }
      break;
    case "open_promotion":
      if (data.promotion_id) {
        navigation.navigate("PromotionDetails", {
          promotionId: data.promotion_id,
        });
      }
      break;
    case "open_wallet":
      navigation.navigate("Wallet");
      break;
    case "open_complaint":
      if (data.complaint_id) {
        navigation.navigate("ComplaintDetails", {
          complaintId: data.complaint_id,
        });
      }
      break;
    case "open_product":
      if (data.product_barcode) {
        navigation.navigate("ProductDetails", {
          barcode: data.product_barcode,
        });
      }
      break;
    default:
      // Default: open notifications screen
      navigation.navigate("Notifications");
  }
}
