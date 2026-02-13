import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

// Type imports only (no runtime code)
import type * as NotificationsType from "expo-notifications";

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

// Lazy load expo-notifications only when supported
let Notifications: typeof NotificationsType | null = null;

async function loadNotificationsModule(): Promise<typeof NotificationsType> {
  if (!Notifications && !isExpoGo()) {
    Notifications = await import("expo-notifications");
  }
  if (!Notifications) {
    throw new Error("Push notifications not available in Expo Go");
  }
  return Notifications;
}

// Configure notification behavior (only if not in Expo Go)
if (!isExpoGo()) {
  loadNotificationsModule().then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
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
  // Enterprise fields
  category?: string;
  priority?: "critical" | "high" | "medium" | "low";
  template_code?: string;
}

export interface NotificationPreferences {
  // Global settings
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;

  // Order & Delivery
  order_updates: boolean;
  delivery_updates: boolean;
  payment_alerts: boolean;

  // Marketing
  promotions: boolean;
  flash_sales: boolean;
  price_drops: boolean;

  // Product
  back_in_stock: boolean;
  price_alerts: boolean;

  // Cart
  cart_reminders: boolean;

  // Support
  complaint_updates: boolean;
  chat_messages: boolean;

  // Account & Security
  security_alerts: boolean;

  // Wallet
  wallet_updates: boolean;

  // Smart/AI
  reorder_reminders: boolean;

  // System
  system_updates: boolean;
  marketing: boolean;
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

  const Notifications = await loadNotificationsModule();

  // Set up Android notification channels for all categories
  if (Platform.OS === "android") {
    // Default channel
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });

    // Order & Delivery - CRITICAL
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order Updates",
      description: "Order status, delivery, and payment notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4CAF50",
      enableVibrate: true,
      showBadge: true,
    });

    // Promotions & Offers - MEDIUM
    await Notifications.setNotificationChannelAsync("promotions", {
      name: "Promotions & Offers",
      description: "Flash sales, coupons, and special offers",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#FF9800",
      showBadge: true,
    });

    // Wallet & Payments - HIGH
    await Notifications.setNotificationChannelAsync("wallet", {
      name: "Wallet & Payments",
      description: "Wallet credits, debits, and payment updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2196F3",
      enableVibrate: true,
      showBadge: true,
    });

    // Support & Chat - HIGH
    await Notifications.setNotificationChannelAsync("support", {
      name: "Support & Chat",
      description: "Support ticket updates and chat messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9C27B0",
      enableVibrate: true,
      showBadge: true,
    });

    // Account & Security - CRITICAL
    await Notifications.setNotificationChannelAsync("account", {
      name: "Account & Security",
      description: "Login alerts, password changes, and security warnings",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: "#F44336",
      enableVibrate: true,
      showBadge: true,
    });

    // Product Updates - LOW
    await Notifications.setNotificationChannelAsync("product", {
      name: "Product Updates",
      description: "Back in stock, price drops, and new products",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#00BCD4",
      showBadge: true,
    });

    // Cart Reminders - LOW
    await Notifications.setNotificationChannelAsync("cart", {
      name: "Cart Reminders",
      description: "Abandoned cart and checkout reminders",
      importance: Notifications.AndroidImportance.LOW,
      lightColor: "#607D8B",
    });

    // System & Updates - MEDIUM
    await Notifications.setNotificationChannelAsync("system", {
      name: "System Updates",
      description: "App updates, maintenance, and policy changes",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#795548",
      showBadge: true,
    });

    // Smart Recommendations - LOW
    await Notifications.setNotificationChannelAsync("smart", {
      name: "Recommendations",
      description: "Personalized product recommendations and reorder reminders",
      importance: Notifications.AndroidImportance.LOW,
      lightColor: "#673AB7",
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
  filter?: "read" | "unread",
): Promise<{
  notifications: PaginatedNotifications;
  unread_count: number;
} | null> {
  try {
    const params: Record<string, unknown> = { page, per_page: perPage };
    if (type) params.type = type;
    if (filter) params.filter = filter;

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
export async function addNotificationReceivedListener(
  callback: (notification: NotificationsType.Notification) => void,
) {
  // Return a no-op subscription in Expo Go
  if (isExpoGo()) {
    return { remove: () => {} };
  }
  const Notifications = await loadNotificationsModule();
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get notification response listener for when user taps on notification
 */
export async function addNotificationResponseListener(
  callback: (response: NotificationsType.NotificationResponse) => void,
) {
  // Return a no-op subscription in Expo Go
  if (isExpoGo()) {
    return { remove: () => {} };
  }
  const Notifications = await loadNotificationsModule();
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  if (isExpoGo()) return;
  const Notifications = await loadNotificationsModule();
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number) {
  if (isExpoGo()) return;
  const Notifications = await loadNotificationsModule();
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Handle notification action (when user taps notification)
 * Supports all 70+ enterprise notification types
 */
export function handleNotificationAction(
  data: Record<string, unknown>,
  router: {
    push: (href: string) => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  },
) {
  const action = data?.action as string;
  const actionTarget = data?.actionTarget as string;
  const category = data?.category as string;
  const templateCode = data?.template_code as string;

  // If actionTarget is provided, use it directly
  if (actionTarget) {
    router.push(actionTarget);
    return;
  }

  // Handle by category first (enterprise notification system)
  if (category || templateCode) {
    handleEnterpriseNotification(data, router);
    return;
  }

  // Legacy action handling
  switch (action) {
    case "open_order":
      if (data.order_id) {
        router.push(`/orders/${data.order_id}`);
      } else {
        router.push("/orders");
      }
      break;
    case "open_promotion":
      if (data.promotion_id) {
        router.push(`/categories?promo=${data.promotion_id}`);
      } else {
        router.push("/(tabs)/categories");
      }
      break;
    case "open_wallet":
      router.push("/profile/wallet");
      break;
    case "open_complaint":
      if (data.complaint_id) {
        router.push(`/complaints/${data.complaint_id}`);
      } else {
        router.push("/complaints");
      }
      break;
    case "open_product":
      if (data.product_barcode) {
        router.push(`/product/${data.product_barcode}`);
      }
      break;
    case "navigate":
      // Generic navigation with target screen
      if (data.screen) {
        router.push(data.screen as string);
      }
      break;
    default:
      // Default: open notifications screen
      router.push("/notifications");
  }
}

/**
 * Handle enterprise notification deep links by category
 */
function handleEnterpriseNotification(
  data: Record<string, unknown>,
  router: { push: (href: string) => void },
) {
  const category = data?.category as string;
  const templateCode = data?.template_code as string;

  // Order & Delivery notifications
  if (
    category === "order" ||
    templateCode?.startsWith("order_") ||
    templateCode?.startsWith("payment_") ||
    templateCode?.startsWith("delivery_") ||
    templateCode?.startsWith("refund_") ||
    templateCode?.startsWith("out_for_") ||
    templateCode?.startsWith("courier_") ||
    templateCode === "invoice_ready"
  ) {
    if (data.order_id) {
      router.push(`/orders/${data.order_id}`);
    } else {
      router.push("/orders");
    }
    return;
  }

  // Product notifications
  if (
    category === "product" ||
    templateCode?.startsWith("product_") ||
    templateCode?.startsWith("new_product_")
  ) {
    if (data.product_id) {
      router.push(`/product/${data.product_id}`);
    } else if (data.category_id) {
      router.push(`/categories/${data.category_id}`);
    } else {
      router.push("/(tabs)/categories");
    }
    return;
  }

  // Promotion & Offer notifications
  if (
    category === "promo" ||
    templateCode?.startsWith("flash_sale_") ||
    templateCode?.startsWith("coupon_") ||
    templateCode?.startsWith("new_offer") ||
    templateCode?.startsWith("loyalty_") ||
    templateCode?.startsWith("personalized_") ||
    templateCode?.includes("_deal") ||
    templateCode?.includes("buy_one_")
  ) {
    if (data.sale_id) {
      router.push(`/flash-sale/${data.sale_id}`);
    } else if (data.offer_id) {
      router.push(`/offers/${data.offer_id}`);
    } else if (data.product_id) {
      router.push(`/product/${data.product_id}`);
    } else {
      router.push("/(tabs)/offers");
    }
    return;
  }

  // Cart notifications
  if (
    category === "cart" ||
    templateCode?.startsWith("cart_") ||
    templateCode?.startsWith("minimum_order") ||
    templateCode?.startsWith("free_delivery")
  ) {
    router.push("/(tabs)/cart");
    return;
  }

  // Chat & Support notifications
  if (
    category === "chat" ||
    templateCode?.startsWith("new_support_") ||
    templateCode?.startsWith("agent_") ||
    templateCode?.startsWith("chat_") ||
    templateCode?.startsWith("support_ticket_")
  ) {
    if (data.complaint_id) {
      router.push(`/complaints/${data.complaint_id}`);
    } else {
      router.push("/complaints");
    }
    return;
  }

  // Account & Security notifications
  if (
    category === "account" ||
    templateCode?.startsWith("new_login_") ||
    templateCode?.startsWith("new_device_") ||
    templateCode?.startsWith("password_") ||
    templateCode?.startsWith("email_") ||
    templateCode?.startsWith("phone_") ||
    templateCode?.startsWith("suspicious_") ||
    templateCode?.startsWith("account_") ||
    templateCode?.startsWith("verification_") ||
    templateCode === "welcome"
  ) {
    if (templateCode === "welcome" || templateCode === "account_verified") {
      router.push("/(tabs)/home");
    } else {
      router.push("/profile/security");
    }
    return;
  }

  // Wallet & Payment notifications
  if (
    category === "wallet" ||
    templateCode?.startsWith("wallet_") ||
    templateCode?.startsWith("cashback_") ||
    templateCode?.startsWith("low_wallet_") ||
    templateCode?.startsWith("card_")
  ) {
    router.push("/profile/wallet");
    return;
  }

  // Address notifications
  if (
    category === "address" ||
    templateCode?.startsWith("address_") ||
    templateCode?.startsWith("delivery_area_") ||
    templateCode?.startsWith("service_unavailable_")
  ) {
    router.push("/profile/addresses");
    return;
  }

  // System & Policy notifications
  if (
    category === "system" ||
    templateCode?.startsWith("terms_") ||
    templateCode?.startsWith("privacy_") ||
    templateCode?.startsWith("refund_policy_") ||
    templateCode?.startsWith("app_update_") ||
    templateCode?.startsWith("service_outage") ||
    templateCode?.startsWith("maintenance_") ||
    templateCode?.startsWith("legal_notice")
  ) {
    if (templateCode === "terms_updated") {
      router.push("/terms");
    } else if (templateCode === "privacy_updated") {
      router.push("/privacy");
    } else if (templateCode?.startsWith("app_update_")) {
      // Could open app store or show update modal
      router.push("/(tabs)/home");
    } else {
      router.push("/(tabs)/home");
    }
    return;
  }

  // Smart/AI notifications
  if (
    category === "smart" ||
    templateCode?.startsWith("reorder_") ||
    templateCode?.startsWith("usually_buy_") ||
    templateCode?.startsWith("forgot_something") ||
    templateCode?.startsWith("recommended_") ||
    templateCode?.startsWith("similar_cheaper")
  ) {
    if (data.product_id) {
      router.push(`/product/${data.product_id}`);
    } else if (data.order_id) {
      router.push(`/orders/${data.order_id}`);
    } else {
      router.push("/(tabs)/home");
    }
    return;
  }

  // Default fallback
  router.push("/notifications");
}

/**
 * Get notification priority level
 */
export function getNotificationPriority(
  data: Record<string, unknown>,
): "critical" | "high" | "medium" | "low" {
  const priority = data?.priority as string;
  if (priority) {
    return priority as "critical" | "high" | "medium" | "low";
  }

  const templateCode = data?.template_code as string;
  const category = data?.category as string;

  // Critical priority notifications
  if (
    templateCode?.includes("security") ||
    templateCode?.includes("suspicious") ||
    templateCode?.includes("account_locked") ||
    templateCode?.includes("payment_failed") ||
    templateCode?.includes("delivery_failed") ||
    templateCode?.startsWith("app_update_required") ||
    templateCode?.startsWith("service_outage")
  ) {
    return "critical";
  }

  // High priority
  if (
    category === "order" ||
    category === "chat" ||
    templateCode?.includes("out_for_delivery") ||
    templateCode?.includes("courier_nearby")
  ) {
    return "high";
  }

  // Medium priority
  if (
    category === "promo" ||
    category === "wallet" ||
    templateCode?.includes("flash_sale")
  ) {
    return "medium";
  }

  return "low";
}
