import { apiClient } from '@/lib/api-client'
import type { PromoCode, PaginatedResponse } from '@/types'

// ==========================================
// EXTRAORDINARY PROMO CODE SERVICE
// Comprehensive API for managing promo codes
// ==========================================

export interface PromoCodeFilters {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean
    type?: 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo'
    applies_to?: 'order' | 'product' | 'category'
    status?: 'active' | 'expired' | 'scheduled' | 'limit_reached'
    sort_by?: 'code' | 'used_count' | 'value' | 'valid_from' | 'valid_until' | 'created_at'
    sort_order?: 'asc' | 'desc'
}

export interface BogoRule {
    buy_scope: 'any' | 'product' | 'category'
    buy_product_id?: number
    buy_category_id?: number
    buy_include_subcategories?: boolean
    buy_qty: number
    get_scope: 'same' | 'product' | 'category'
    get_product_id?: number
    get_category_id?: number
    get_include_subcategories?: boolean
    get_qty: number
    get_discount_type: 'free' | 'percentage' | 'fixed_amount'
    get_discount_value?: number
    max_applications_per_order?: number
    is_active?: boolean
}

export interface CreatePromoCodeData {
    code: string
    type: 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo'
    applies_to: 'order' | 'product' | 'category'
    value: number
    minimum_order?: number
    maximum_discount?: number
    usage_limit?: number
    usage_per_user?: number
    first_order_only?: boolean
    valid_from: string
    valid_until: string
    is_active?: boolean
    // Product/Category targeting
    product_ids?: number[]
    category_ids?: { id: number; include_subcategories?: boolean }[]
    // BOGO rules
    bogo_rules?: BogoRule[]
}

export interface PromoCodeAnalytics {
    total_uses: number
    total_discount_amount: number
    average_order_value: number
    total_revenue_generated: number
    unique_users: number
    roi: number
    conversion_rate: number
    usage_by_day: { date: string; uses: number; discount: number }[]
    usage_by_hour: { hour: number; uses: number }[]
    top_users: { user_id: number; name: string; email: string; uses: number; total_discount: number }[]
}

export interface PromoCodeComparison {
    promo_codes: {
        id: number
        code: string
        total_uses: number
        total_discount: number
        avg_order_value: number
        unique_users: number
        roi: number
    }[]
    winner: {
        by_uses: string
        by_discount: string
        by_roi: string
    }
}

export const promoCodeService = {
    // ==========================================
    // CORE CRUD OPERATIONS
    // ==========================================

    /**
     * Get all promo codes with advanced filtering
     */
    getPromoCodes: async (filters?: PromoCodeFilters): Promise<PaginatedResponse<PromoCode>> => {
        return apiClient.get('/admin/promo-codes', filters)
    },

    /**
     * Get single promo code with all relationships
     */
    getPromoCode: async (id: number): Promise<PromoCode> => {
        return apiClient.get(`/admin/promo-codes/${id}`)
    },

    /**
     * Create a new promo code with all advanced features
     */
    createPromoCode: async (data: CreatePromoCodeData): Promise<PromoCode> => {
        return apiClient.post('/admin/promo-codes', data)
    },

    /**
     * Update an existing promo code
     */
    updatePromoCode: async (id: number, data: Partial<CreatePromoCodeData>): Promise<PromoCode> => {
        return apiClient.put(`/admin/promo-codes/${id}`, data)
    },

    /**
     * Delete a promo code
     */
    deletePromoCode: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/promo-codes/${id}`)
    },

    /**
     * Duplicate an existing promo code
     */
    duplicatePromoCode: async (id: number, newCode?: string): Promise<PromoCode> => {
        return apiClient.post(`/admin/promo-codes/${id}/duplicate`, { new_code: newCode })
    },

    // ==========================================
    // BULK OPERATIONS
    // ==========================================

    /**
     * Bulk update status of multiple promo codes
     */
    bulkUpdateStatus: async (ids: number[], isActive: boolean): Promise<{ updated: number }> => {
        return apiClient.post('/admin/promo-codes/bulk-status', {
            promo_code_ids: ids,
            is_active: isActive
        })
    },

    /**
     * Export promo codes as CSV/Excel
     */
    exportPromoCodes: async (format: 'csv' | 'excel' = 'csv'): Promise<any> => {
        return apiClient.get('/admin/promo-codes/export', { format })
    },

    // ==========================================
    // ANALYTICS & INSIGHTS
    // ==========================================

    /**
     * Get global promo codes analytics
     */
    getAnalytics: async (): Promise<any> => {
        return apiClient.get('/admin/financial/promo-codes/analytics')
    },

    /**
     * Get detailed analytics for a specific promo code
     */
    getPromoCodeAnalytics: async (id: number, dateRange?: '7days' | '30days' | '90days' | 'all'): Promise<any> => {
        return apiClient.get(`/admin/promo-codes/${id}/analytics`, { date_range: dateRange })
    },

    /**
     * Compare multiple promo codes performance
     */
    comparePromoCodes: async (ids: number[], dateRange?: string): Promise<PromoCodeComparison> => {
        return apiClient.post('/admin/promo-codes/compare', {
            promo_code_ids: ids,
            date_range: dateRange
        })
    },

    // ==========================================
    // USAGE TRACKING
    // ==========================================

    /**
     * Get paginated usage history for a promo code
     */
    getUsageHistory: async (id: number, params?: { page?: number; per_page?: number }): Promise<any> => {
        return apiClient.get(`/admin/promo-codes/${id}/usage-history`, params)
    },

    /**
     * Get all users who used a specific promo code
     */
    getPromoCodeUsers: async (id: number): Promise<any> => {
        return apiClient.get(`/admin/promo-codes/${id}/users`)
    },

    /**
     * Get specific user's usage of a promo code
     */
    getUserUsage: async (id: number, userId: number): Promise<any> => {
        return apiClient.get(`/admin/promo-codes/${id}/user/${userId}`)
    },

    // ==========================================
    // PRODUCT & CATEGORY TARGETING
    // ==========================================

    /**
     * Get all products for targeting
     */
    getProducts: async (search?: string): Promise<any> => {
        return apiClient.get('/admin/promo-codes/products', { search })
    },

    /**
     * Get all categories for targeting
     */
    getCategories: async (): Promise<any> => {
        return apiClient.get('/admin/promo-codes/categories')
    },

    // ==========================================
    // LEGACY ENDPOINTS (for backward compatibility)
    // ==========================================

    getLegacyPromoCodes: async (filters?: PromoCodeFilters): Promise<PaginatedResponse<PromoCode>> => {
        return apiClient.get('/admin/financial/promo-codes', filters)
    },

    createLegacyPromoCode: async (data: any): Promise<PromoCode> => {
        return apiClient.post('/admin/financial/promo-codes', data)
    },

    updateLegacyPromoCode: async (id: number, data: any): Promise<PromoCode> => {
        return apiClient.put(`/admin/financial/promo-codes/${id}`, data)
    },

    deleteLegacyPromoCode: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/financial/promo-codes/${id}`)
    },
}
