import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { LOCATION_CONFIG } from "@/config/app.config";
import { driverService } from "./driver";

const TASK = LOCATION_CONFIG.TASK_NAME;

/** Currently active order ID — if set, location updates will include it so Pusher events fire */
let activeOrderId: number | null = null;

// Register background task
TaskManager.defineTask(TASK, async ({ data, error }: any) => {
    if (error) return;
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const loc = locations?.[0];
        if (loc) {
            try {
                await driverService.updateLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    speed: loc.coords.speed ?? undefined,
                    heading: loc.coords.heading ?? undefined,
                    accuracy: loc.coords.accuracy ?? undefined,
                    order_id: activeOrderId ?? undefined,
                });
            } catch {
                // Silent fail – will retry next interval
            }
        }
    }
});

export const locationService = {
    /** Request location permissions */
    requestPermissions: async (): Promise<boolean> => {
        const { status: fg } = await Location.requestForegroundPermissionsAsync();
        if (fg !== "granted") return false;

        const { status: bg } = await Location.requestBackgroundPermissionsAsync();
        return bg === "granted";
    },

    /** Start background location tracking */
    startTracking: async (): Promise<void> => {
        const isRunning = await TaskManager.isTaskRegisteredAsync(TASK);
        if (isRunning) return;

        await Location.startLocationUpdatesAsync(TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
            distanceInterval: LOCATION_CONFIG.DISTANCE_FILTER,
            deferredUpdatesInterval: LOCATION_CONFIG.UPDATE_INTERVAL,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: "ElBaraka Driver",
                notificationBody: "Tracking your location for deliveries",
                notificationColor: "#16a34a",
            },
        });
    },

    /** Stop background location tracking */
    stopTracking: async (): Promise<void> => {
        const isRunning = await TaskManager.isTaskRegisteredAsync(TASK);
        if (isRunning) {
            await Location.stopLocationUpdatesAsync(TASK);
        }
    },

    /** Send a one-time location update */
    sendCurrentLocation: async (): Promise<void> => {
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            await driverService.updateLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                speed: loc.coords.speed ?? undefined,
                heading: loc.coords.heading ?? undefined,
                accuracy: loc.coords.accuracy ?? undefined,
            });
        } catch {
            // Silent fail
        }
    },

    /** Check if background tracking is active */
    isTracking: async (): Promise<boolean> => {
        return TaskManager.isTaskRegisteredAsync(TASK);
    },

    /** Set the active order ID — location updates will include this order_id so customers get real-time tracking */
    setActiveOrder: (orderId: number | null): void => {
        activeOrderId = orderId;
    },

    /** Get the current active order ID */
    getActiveOrder: (): number | null => {
        return activeOrderId;
    },
};
