import { apiClient } from '@/lib/api-client'
import type { PromoCode, PaginatedResponse } from '@/types'

export interface PromoCodeFilters {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean
}

export interface CreatePromoCodeData {
    code: string
    type: 'percentage' | 'fixed_amount'
    value: number
    min_order_amount?: number
    max_discount?: number
    usage_limit?: number
    valid_from: string
    valid_until: string
    is_active?: boolean
}

export const promoCodeService = {
    getPromoCodes: async (filters?: PromoCodeFilters): Promise<PaginatedResponse<PromoCode>> => {
        return apiClient.get('/admin/financial/promo-codes', filters)
    },

    createPromoCode: async (data: CreatePromoCodeData): Promise<PromoCode> => {
        return apiClient.post('/admin/financial/promo-codes', data)
    },

    updatePromoCode: async (id: number, data: Partial<CreatePromoCodeData>): Promise<PromoCode> => {
        return apiClient.put(`/admin/financial/promo-codes/${id}`, data)
    },

    deletePromoCode: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/financial/promo-codes/${id}`)
    },

    getAnalytics: async (): Promise<any> => {
        return apiClient.get('/admin/financial/promo-codes/analytics')
    },
}
