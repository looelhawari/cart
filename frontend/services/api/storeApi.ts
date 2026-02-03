import httpClient from "@/services/httpClient";

export interface StoreStatus {
    is_open: boolean;
    reason: "open" | "temporarily_closed" | "outside_hours";
    message: string;
    opening_time: string;
    closing_time: string;
    next_open?: string;
}

export interface WorkingHours {
    opening_time: string;
    closing_time: string;
}

export interface DeliverySettings {
    delivery_fee: number;
    minimum_order: number;
    free_delivery_threshold?: number;
}

export interface StoreSettings {
    working_hours: WorkingHours;
    delivery: DeliverySettings;
    store_info: {
        name?: string;
        phone?: string;
        address?: string;
    };
}

export interface StoreStatusResponse {
    success: boolean;
    data: StoreStatus;
}

export interface StoreSettingsResponse {
    success: boolean;
    data: StoreSettings;
}

export interface WorkingHoursResponse {
    success: boolean;
    data: WorkingHours;
}

export interface DeliverySettingsResponse {
    success: boolean;
    data: DeliverySettings;
}

/**
 * Get current store status (open/closed)
 */
export const getStoreStatus = async (): Promise<StoreStatusResponse> => {
    return await httpClient.get<StoreStatusResponse>("/store/status");
};

/**
 * Get all store settings
 */
export const getStoreSettings = async (): Promise<StoreSettingsResponse> => {
    return await httpClient.get<StoreSettingsResponse>("/store/settings");
};

/**
 * Get working hours only
 */
export const getWorkingHours = async (): Promise<WorkingHoursResponse> => {
    return await httpClient.get<WorkingHoursResponse>("/store/working-hours");
};

/**
 * Get delivery settings only
 */
export const getDeliverySettings =
    async (): Promise<DeliverySettingsResponse> => {
        return await httpClient.get<DeliverySettingsResponse>(
            "/store/delivery-settings",
        );
    };

/**
 * Check if store is currently open (convenience function)
 */
export const isStoreOpen = async (): Promise<boolean> => {
    try {
        const response = await getStoreStatus();
        return response.data.is_open;
    } catch {
        // Default to open if API fails
        return true;
    }
};
