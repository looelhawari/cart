// Background notification task - optional feature requiring expo-task-manager
// This file provides safe stubs when expo-task-manager is not installed
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// expo-notifications push support was removed from Expo Go in SDK 53.
const isExpoGo = Constants.appOwnership === "expo";

// Background notification task name
export const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// Try to import expo-task-manager and expo-notifications, but don't fail if not available
let TaskManager: any = null;
let Notifications: any = null;
let modulesLoaded = false;

// Lazy load the modules - this prevents build failures
async function loadModules() {
    if (modulesLoaded) return TaskManager !== null;
    modulesLoaded = true;

    // Push notifications not supported in Expo Go (SDK 53+)
    if (isExpoGo) {
        console.log("Background notification task disabled in Expo Go");
        return false;
    }

    try {
        // Dynamic import with variable to prevent bundler from analyzing
        const taskManagerName = "expo-task-manager";
        const notificationsName = "expo-notifications";

        // @ts-ignore - Dynamic requires to prevent bundler errors
        TaskManager = require(taskManagerName);
        // @ts-ignore
        Notifications = require(notificationsName);
        return true;
    } catch (error) {
        console.log("Background notification task not available (expo-task-manager not installed)");
        return false;
    }
}

// Initialize background task if modules are available
loadModules().then((available) => {
    if (available && TaskManager?.defineTask) {
        TaskManager.defineTask(
            BACKGROUND_NOTIFICATION_TASK,
            async ({ data, error }: { data: any; error: any }) => {
                if (error) {
                    console.error("Background notification task error:", error);
                    return;
                }

                if (data) {
                    console.log("Background notification received:", data);

                    try {
                        const pendingNotifications = await AsyncStorage.getItem(
                            "pending_notifications"
                        );
                        const notifications = pendingNotifications
                            ? JSON.parse(pendingNotifications)
                            : [];

                        notifications.push({
                            id: Date.now(),
                            data: data,
                            receivedAt: new Date().toISOString(),
                        });

                        const trimmed = notifications.slice(-10);
                        await AsyncStorage.setItem(
                            "pending_notifications",
                            JSON.stringify(trimmed)
                        );
                    } catch (e) {
                        console.error("Failed to store background notification:", e);
                    }
                }
            }
        );
    }
});

/**
 * Register background notification task
 * Call this once during app initialization
 */
export async function registerBackgroundNotificationTask(): Promise<boolean> {
    try {
        if (!TaskManager || !Notifications) {
            // Modules not available, try to load them
            const available = await loadModules();
            if (!available) {
                console.log("Background notification task not available");
                return false;
            }
        }

        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK
        );

        if (!isRegistered) {
            await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
            console.log("Background notification task registered");
        }

        return true;
    } catch (error) {
        console.error("Failed to register background notification task:", error);
        return false;
    }
}

/**
 * Unregister background notification task
 */
export async function unregisterBackgroundNotificationTask(): Promise<void> {
    try {
        if (!TaskManager || !Notifications) {
            return;
        }

        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK
        );

        if (isRegistered) {
            await Notifications.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK);
            console.log("Background notification task unregistered");
        }
    } catch (error) {
        console.error("Failed to unregister background notification task:", error);
    }
}

/**
 * Get and clear pending notifications that were received while app was closed
 */
export async function getPendingBackgroundNotifications(): Promise<any[]> {
    try {
        const pendingNotifications = await AsyncStorage.getItem(
            "pending_notifications"
        );

        if (pendingNotifications) {
            // Clear after reading
            await AsyncStorage.removeItem("pending_notifications");
            return JSON.parse(pendingNotifications);
        }

        return [];
    } catch (error) {
        console.error("Failed to get pending notifications:", error);
        return [];
    }
}

/**
 * Get last notification response (when app was opened from notification tap)
 */
export async function getLastNotificationResponse(): Promise<any | null> {
    try {
        if (isExpoGo) return null;
        if (!Notifications) {
            try {
                Notifications = await import("expo-notifications");
            } catch {
                return null;
            }
        }
        return await Notifications.getLastNotificationResponseAsync();
    } catch (error) {
        console.error("Failed to get last notification response:", error);
        return null;
    }
}
