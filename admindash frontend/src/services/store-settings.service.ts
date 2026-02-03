import { apiClient } from '@/lib/api-client'

export interface StoreSetting {
    id: number
    key: string
    value: string | number | boolean
    type: string
    description_en: string
    description_ar: string
    is_public: boolean
}

export interface StoreStatus {
    is_open: boolean
    reason: string
    open_time?: string
    close_time?: string
    message_en: string
    message_ar: string
}

export interface WorkingHours {
    store_open_time: string
    store_close_time: string
    accept_orders_outside_hours: boolean
}

export interface StoreSettingsGrouped {
    general?: Record<string, StoreSetting>
    working_hours?: Record<string, StoreSetting>
    notifications?: Record<string, StoreSetting>
}

export const storeSettingsService = {
    // Get all settings grouped by category
    getAllSettings: async (): Promise<StoreSettingsGrouped> => {
        const response = await apiClient.get<{ success: boolean; data: StoreSettingsGrouped }>('/admin/store-settings')
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
    toggleStoreClosure: async (isClosed: boolean, reasonEn?: string, reasonAr?: string): Promise<StoreStatus> => {
        const response = await apiClient.post<{ success: boolean; data: StoreStatus }>('/admin/store-settings/toggle-closure', {
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
        const response = await apiClient.put<{ success: boolean; data: { updated: string[] } }>('/admin/store-settings/settings', {
            settings,
        })
        return response.data.updated
    },

    // Clear settings cache
    clearCache: async (): Promise<void> => {
        await apiClient.post('/admin/store-settings/clear-cache')
    },
}
