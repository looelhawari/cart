import { apiClient } from '@/lib/api-client'
import type { SalesAnalytics } from '@/types'

export interface AnalyticsFilters {
    date_from?: string
    date_to?: string
    compare_previous_period?: boolean
}

export interface ProductPerformance {
    barcode: string
    name: string
    category_name: string
    quantity_sold: number
    revenue: number
    profit: number
    average_rating: number | null
    stock_quantity: number
}

export interface CustomerAnalytics {
    total_customers: number
    new_customers: number
    returning_customers: number
    average_order_value: number
    customer_lifetime_value: number
    top_customers: Array<{
        id: number
        first_name: string
        last_name: string
        total_orders: number
        total_spent: number
    }>
    customer_segments: Array<{
        segment: string
        count: number
        percentage: number
    }>
}

export const analyticsService = {
    getSalesAnalytics: async (filters?: AnalyticsFilters): Promise<SalesAnalytics> => {
        return apiClient.get('/admin/analytics/dashboard', filters)
    },

    getProductPerformance: async (filters?: AnalyticsFilters): Promise<ProductPerformance[]> => {
        return apiClient.get('/admin/analytics/products', filters)
    },

    getCustomerAnalytics: async (filters?: AnalyticsFilters): Promise<CustomerAnalytics> => {
        return apiClient.get('/admin/analytics/customers', filters)
    },

    getCategoryPerformance: async (filters?: AnalyticsFilters): Promise<any[]> => {
        return apiClient.get('/admin/analytics/dashboard', filters)
    },

    getRevenueOverview: async (filters?: AnalyticsFilters): Promise<any> => {
        return apiClient.get('/admin/financial/dashboard', filters)
    },

    exportReport: async (reportType: string, filters?: AnalyticsFilters): Promise<Blob> => {
        return apiClient.downloadFile(`/admin/analytics/export/${reportType}`, filters)
    },
}
