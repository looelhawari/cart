import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Request notification permissions (for local notifications only - works in Expo Go)
 * Note: Remote push notifications require a development build
 */
export async function registerForPushNotifications() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Order Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('⚠️ Notification permissions not granted');
        return null;
    }

    console.log('✅ Local notification permissions granted');
    return true;
}

/**
 * Schedule a local notification for order status change
 */
export async function sendOrderStatusNotification(
    orderId: string,
    newStatus: string,
    orderNumber?: string
) {
    const statusMessages: Record<string, { title: string; body: string }> = {
        pending: {
            title: '⏳ Order Pending',
            body: `Order #${orderNumber || orderId} is being processed`,
        },
        confirmed: {
            title: '✅ Order Confirmed',
            body: `Order #${orderNumber || orderId} has been confirmed!`,
        },
        processing: {
            title: '📦 Order Processing',
            body: `Order #${orderNumber || orderId} is being prepared`,
        },
        shipped: {
            title: '🚚 Order Shipped',
            body: `Order #${orderNumber || orderId} is on the way!`,
        },
        delivered: {
            title: '🎉 Order Delivered',
            body: `Order #${orderNumber || orderId} has been delivered`,
        },
        cancelled: {
            title: '❌ Order Cancelled',
            body: `Order #${orderNumber || orderId} has been cancelled`,
        },
        refunded: {
            title: '💰 Order Refunded',
            body: `Order #${orderNumber || orderId} has been refunded`,
        },
    };

    const notification = statusMessages[newStatus.toLowerCase()] || {
        title: '📋 Order Update',
        body: `Order #${orderNumber || orderId} status: ${newStatus}`,
    };

    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: notification.title,
                body: notification.body,
                data: { orderId, status: newStatus },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                ...(Platform.OS === 'android' && { channelId: 'orders' }),
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

/**
 * Cancel all notifications for a specific order
 */
export async function cancelOrderNotifications(orderId: string) {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of notifications) {
        if (notification.content.data?.orderId === orderId) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

/**
 * Get notification listener for when app is in foreground
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
) {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Get notification response listener for when user taps on notification
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
) {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
}
