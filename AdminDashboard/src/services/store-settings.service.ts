import { apiClient } from '@/lib/api-client'

export interface StoreSetting {
    id: number
    key: string
    value: string | number | boolean
    type: string
    description_en: string
    description_ar: string
    category: string
    is_public: boolean
}

export interface StoreStatus {
    status: string
    is_open: boolean
    reason: string
    message: string
    message_ar: string
    working_hours_today: {
        open: string
        close: string
    }
    is_temporarily_closed: boolean
    temporary_closure_reason: string
}

export interface WorkingHours {
    open_time: string
    close_time: string
    accept_orders_outside_hours?: boolean
}

export interface StoreSettingsGrouped {
    general?: Record<string, { key: string; value: any; type: string; description_en: string; description_ar: string }>
    working_hours?: Record<string, { key: string; value: any; type: string; description_en: string; description_ar: string }>
    notifications?: Record<string, { key: string; value: any; type: string; description_en: string; description_ar: string }>
}

export interface StoreSettingsResponse {
    grouped: StoreSettingsGrouped
    settings: StoreSetting[]
    store_name: string
    currency: string
    timezone: string
}

export const storeSettingsService = {
    // Get all settings grouped by category
    getAllSettings: async (): Promise<StoreSettingsResponse> => {
        const response = await apiClient.get<{ success: boolean; data: StoreSettingsResponse }>('/admin/store-settings')
        return response.data
    },

    // Get current store status
    getStoreStatus: async (): Promise<StoreStatus> => {
        const response = await apiClient.get<{ success: boolean; data: StoreStatus }>('/admin/store-settings/status')
        return response.data
    },

    // Update working hours
    updateWorkingHours: async (data: WorkingHours): Promise<WorkingHours> => {
        const response = await apiClient.put<{ success: boolean; data: WorkingHours }>('/admin/store-settings/working-hours', data)
        return response.data
    },

    // Toggle store closure
    toggleStoreClosure: async (isClosed: boolean, reasonEn?: string, reasonAr?: string): Promise<any> => {
        const response = await apiClient.post<{ success: boolean; data: any }>('/admin/store-settings/toggle-closure', {
            is_closed: isClosed,
            reason_en: reasonEn,
            reason_ar: reasonAr,
        })
        return response.data
    },

    // Update a single setting
    updateSetting: async (key: string, value: string | number | boolean): Promise<{ key: string; value: any }> => {
        const response = await apiClient.put<{ success: boolean; data: { key: string; value: any } }>('/admin/store-settings/setting', {
            key,
            value,
        })
        return response.data
    },

    // Update multiple settings
    updateSettings: async (settings: Array<{ key: string; value: any }>): Promise<string[]> => {
        const response = await apiClient.put<{ success: boolean; data: { updated_keys: string[] } }>('/admin/store-settings/settings', {
            settings,
        })
        return response.data.updated_keys
    },

    // Update delivery settings
    updateDeliverySettings: async (data: { minimum_order_amount?: number; delivery_fee?: number; free_delivery_threshold?: number }): Promise<any> => {
        const response = await apiClient.put<{ success: boolean; data: any }>('/admin/store-settings/delivery', data)
        return response.data
    },

    // Clear settings cache
    clearCache: async (): Promise<void> => {
        await apiClient.post('/admin/store-settings/clear-cache')
    },
}
