import { apiClient } from '@/lib/api-client'
import type { Transaction, PromoCode, PaginatedResponse } from '@/types'

export interface FinancialDashboard {
    total_revenue: number
    cash_revenue: number
    online_revenue: number
    pending_payments: number
    refunded_amount: number
    total_orders: number
    paid_orders: number
    pending_orders: number
    failed_orders: number
    revenue_by_day: Array<{ date: string; revenue: number }>
    revenue_by_payment_method: Array<{ method: string; amount: number; count: number }>
}

export interface TransactionFilters {
    page?: number
    per_page?: number
    search?: string
    payment_status?: string | string[]
    payment_method?: string
    date_from?: string
    date_to?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface PromoCodeFilters {
    page?: number
    per_page?: number
    search?: string
    is_active?: boolean
    discount_type?: string
}

export interface CreatePromoCodeData {
    code: string
    description: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    max_discount_amount?: number
    min_order_amount: number
    usage_limit?: number
    start_date: string
    end_date: string
    is_active?: boolean
}

export const financialService = {
    getDashboard: async (dateFrom?: string, dateTo?: string): Promise<FinancialDashboard> => {
        const params: Record<string, string> = {}
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo

        return apiClient.get('/admin/financial/dashboard', Object.keys(params).length > 0 ? params : undefined)
    },

    getTransactions: async (filters?: TransactionFilters): Promise<PaginatedResponse<Transaction>> => {
        return apiClient.get('/admin/financial/transactions', filters)
    },

    processRefund: async (transactionId: number, amount: number, reason: string): Promise<Transaction> => {
        return apiClient.post(`/admin/financial/transactions/${transactionId}/refund`, { amount, reason })
    },

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

    getPromoCodeAnalytics: async (id: number): Promise<any> => {
        return apiClient.get(`/admin/financial/promo-codes/${id}/analytics`)
    },

    exportFinancialReport: async (dateFrom: string, dateTo: string, format: 'xlsx' | 'csv'): Promise<Blob> => {
        return apiClient.downloadFile('/admin/financial/export', { date_from: dateFrom, date_to: dateTo, format })
    },
}
