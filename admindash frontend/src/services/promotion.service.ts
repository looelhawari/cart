import { apiClient } from '@/lib/api-client'
import type { Promotion, PromotionAnalytics, PaginatedResponse } from '@/types'

export interface PromotionFilters {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean
    is_featured?: boolean
}

export interface CreatePromotionData {
    title: string
    title_ar: string
    description?: string
    description_ar?: string
    discount_type: 'percentage' | 'fixed' | 'buy_x_get_y'
    discount_value: number
    start_date: string
    end_date: string
    is_active?: boolean
    is_featured?: boolean
    applies_to: 'all' | 'category' | 'products'
    min_purchase?: number
    max_discount?: number
    terms_conditions?: string
    terms_conditions_ar?: string
    category_ids?: number[]
    product_barcodes?: string[]
}

export const promotionService = {
    getPromotions: async (filters?: PromotionFilters): Promise<PaginatedResponse<Promotion>> => {
        return apiClient.get('/admin/promotions', filters)
    },

    getPromotion: async (id: number): Promise<Promotion> => {
        return apiClient.get(`/admin/promotions/${id}`)
    },

    createPromotion: async (data: CreatePromotionData, imageFile?: File, bannerFile?: File): Promise<Promotion> => {
        const formData = new FormData()

        // Add all fields to FormData with proper type handling
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    // Handle arrays
                    value.forEach((item, index) => {
                        formData.append(`${key}[${index}]`, String(item))
                    })
                } else if (typeof value === 'boolean') {
                    // Laravel expects "1" or "0" for boolean fields
                    formData.append(key, value ? '1' : '0')
                } else if (typeof value === 'number') {
                    // Skip NaN values, send 0 for optional numeric fields
                    if (!isNaN(value)) {
                        formData.append(key, String(value))
                    }
                } else {
                    formData.append(key, String(value))
                }
            }
        })

        // Add image files
        if (imageFile) {
            formData.append('image', imageFile)
        }
        if (bannerFile) {
            formData.append('banner_image', bannerFile)
        }

        return apiClient.uploadFormData('/admin/promotions', formData)
    },

    updatePromotion: async (
        id: number,
        data: Partial<CreatePromotionData>,
        imageFile?: File,
        bannerFile?: File
    ): Promise<Promotion> => {
        const formData = new FormData()

        // Add all fields to FormData with proper type handling
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    // Handle arrays
                    value.forEach((item, index) => {
                        formData.append(`${key}[${index}]`, String(item))
                    })
                } else if (typeof value === 'boolean') {
                    // Laravel expects "1" or "0" for boolean fields
                    formData.append(key, value ? '1' : '0')
                } else if (typeof value === 'number') {
                    // Skip NaN values, send 0 for optional numeric fields
                    if (!isNaN(value)) {
                        formData.append(key, String(value))
                    }
                } else {
                    formData.append(key, String(value))
                }
            }
        })

        // Add image files
        if (imageFile) {
            formData.append('image', imageFile)
        }
        if (bannerFile) {
            formData.append('banner_image', bannerFile)
        }

        return apiClient.uploadFormData(`/admin/promotions/${id}`, formData, 'PUT')
    },

    deletePromotion: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/promotions/${id}`)
    },

    setFeatured: async (id: number): Promise<Promotion> => {
        return apiClient.post(`/admin/promotions/${id}/feature`, {})
    },

    getAnalytics: async (id: number): Promise<PromotionAnalytics> => {
        return apiClient.get(`/admin/promotions/${id}/analytics`)
    },

    syncStatus: async (): Promise<{ activated: number; deactivated: number }> => {
        return apiClient.post('/admin/promotions/sync-status', {})
    },

    getSummaryAnalytics: async (): Promise<any> => {
        return apiClient.get('/admin/promotions/summary-analytics')
    },
}
