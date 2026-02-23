import { apiClient } from '@/lib/api-client'

export interface DateRangeFilter {
    from_date?: string
    to_date?: string
    compare?: boolean
    granularity?: 'daily' | 'weekly' | 'monthly'
}

// Overview Types
export interface OverviewMetrics {
    total_revenue: number
    net_revenue: number
    gross_profit: number
    gross_margin: number
    total_orders: number
    completed_orders: number
    avg_order_value: number
    total_discounts: number
    delivery_fees: number
    tax_collected: number
    new_customers: number
    active_customers: number
    items_sold: number
    status_breakdown: Record<string, number>
    payment_breakdown: Array<{
        payment_method: string
        count: number
        revenue: number
    }>
}

export interface GrowthRates {
    revenue_growth: number
    orders_growth: number
    aov_growth: number
    customers_growth: number
    profit_growth: number
}

export interface OverviewResponse {
    current_period: {
        from: string
        to: string
        metrics: OverviewMetrics
    }
    previous_period: {
        from: string
        to: string
        metrics: OverviewMetrics
    } | null
    growth_rates: GrowthRates | null
}

// Sales Types
export interface RevenueTrendItem {
    period: string
    revenue: number
    net_revenue: number
    orders: number
    avg_order_value: number
    discounts: number
}

export interface CategoryRevenue {
    id: number
    name: string
    revenue: number
    items_sold: number
    orders: number
}

export interface HourlyDistribution {
    hour: number
    orders: number
    revenue: number
}

export interface SalesAnalyticsResponse {
    revenue_trend: RevenueTrendItem[]
    revenue_by_category: CategoryRevenue[]
    revenue_by_payment: Array<{
        payment_method: string
        revenue: number
        orders: number
    }>
    hourly_distribution: HourlyDistribution[]
    day_of_week_distribution: Array<{
        day_of_week: number
        day_name: string
        orders: number
        revenue: number
    }>
    top_products: Array<{
        barcode: string
        name: string
        image: string
        revenue: number
        quantity_sold: number
    }>
}

// Customer Types
export interface CustomerSegment {
    segment: string
    count: number
    color: string
    description: string
}

export interface TopCustomer {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    member_since: string
    total_orders: number
    total_spent: number
    avg_order_value: number
    last_order_date: string
}

export interface CustomerAnalyticsResponse {
    summary: {
        total_customers: number
        new_customers: number
        active_customers: number
        returning_customers: number
        avg_customer_lifetime_value: number
        max_customer_lifetime_value: number
        repeat_purchase_rate: number
    }
    segments: CustomerSegment[]
    top_customers: TopCustomer[]
    acquisition_trend: Array<{
        date: string
        new_customers: number
    }>
    order_distribution: Record<string, number>
}

// Product Types
export interface BestSeller {
    barcode: string
    name: string
    image: string
    price: number
    cost_price: number
    stock_quantity: number
    units_sold: number
    revenue: number
    profit: number
    order_count: number
}

export interface ProductAnalyticsResponse {
    best_sellers: BestSeller[]
    stock_alerts: {
        low_stock: Array<{
            barcode: string
            name: string
            stock_quantity: number
            image: string
        }>
        out_of_stock: Array<{
            barcode: string
            name: string
            stock_quantity: number
            image: string
        }>
        low_stock_count: number
        out_of_stock_count: number
    }
    slow_movers: Array<{
        barcode: string
        name: string
        stock_quantity: number
        price: number
        image: string
        units_sold: number
    }>
    category_performance: Array<{
        id: number
        name: string
        image: string
        product_count: number
        units_sold: number
        revenue: number
    }>
    inventory: {
        retail_value: number
        cost_value: number
        total_units: number
        total_products: number
    }
}

// Order Types
export interface OrderAnalyticsResponse {
    summary: {
        total_orders: number
        delivered_orders: number
        cancelled_orders: number
        cancellation_rate: number
        delivery_success_rate: number
        avg_completion_hours: number
    }
    status_breakdown: Array<{
        status: string
        count: number
        revenue: number
    }>
    payment_status_breakdown: Array<{
        payment_status: string
        count: number
        revenue: number
    }>
    cancellation_analysis: Array<{
        cancellation_reason: string
        count: number
        lost_revenue: number
    }>
    orders_by_delivery_slot: Array<{
        delivery_time_slot: string
        count: number
    }>
    order_value_distribution: Array<{
        value_bucket: string
        count: number
        revenue: number
    }>
    recent_orders: Array<{
        id: number
        order_number: string
        status: string
        total: number
        created_at: string
        user: {
            id: number
            first_name: string
            last_name: string
            email: string
        }
        items: Array<{
            id: number
            product_name: string
            quantity: number
            subtotal: number
        }>
    }>
}

// Marketing Types
export interface PromoCodePerformance {
    id: number
    code: string
    type: string
    value: number
    usage_limit: number
    used_count: number
    valid_from: string
    valid_until: string
    redemption_rate: number
}

export interface MarketingAnalyticsResponse {
    promo_codes: PromoCodePerformance[]
    discounts_summary: {
        total_discounts_given: number
        orders_with_discount: number
        orders_without_discount: number
        discount_usage_rate: number
    }
    active_promotions: Array<{
        id: number
        title: string
        discount_type: string
        discount_value: number
        start_date: string
        end_date: string
        is_featured: boolean
    }>
    products_on_sale: number
    discounted_product_revenue: number
}

// Financial Types
export interface FinancialAnalyticsResponse {
    revenue: {
        gross_revenue: number
        net_revenue: number
        total_discounts: number
        delivery_fees: number
        tax_collected: number
    }
    profitability: {
        cost_of_goods_sold: number
        gross_profit: number
        gross_margin_percent: number
    }
    refunds: {
        count: number
        total: number
    }
    revenue_by_payment: Array<{
        payment_method: string
        revenue: number
        orders: number
    }>
    daily_revenue: Array<{
        date: string
        revenue: number
        net_revenue: number
        discounts: number
        orders: number
    }>
    wallet_transactions: Array<{
        type: string
        total: number
        count: number
    }>
}

// Inventory Types
export interface InventoryAnalyticsResponse {
    status: {
        in_stock: number
        low_stock: number
        out_of_stock: number
    }
    by_category: Array<{
        id: number
        name: string
        total_units: number
        retail_value: number
        cost_value: number
    }>
    abc_analysis: {
        A: number
        B: number
        C: number
    }
    stock_movement: Array<{
        date: string
        units_sold: number
    }>
    top_stock_value: Array<{
        barcode: string
        name: string
        stock_quantity: number
        price: number
        cost_price: number
        retail_value: number
        cost_value: number
    }>
    total_inventory: {
        total_products: number
        total_units: number
        retail_value: number
        cost_value: number
    }
}

// Operational Types
export interface OperationalAnalyticsResponse {
    processing_metrics: Array<{
        status: string
        count: number
        avg_time_minutes: number
    }>
    peak_hours: Array<{
        hour: number
        orders: number
        revenue: number
    }>
    peak_days: Array<{
        day: string
        day_num: number
        orders: number
        revenue: number
    }>
    fulfillment_rate: number
    avg_items_per_order: number
    delivery_slot_usage: Array<{
        delivery_time_slot: string
        count: number
    }>
    total_orders: number
    delivered_orders: number
}

// Service
export const comprehensiveAnalyticsService = {
    // Overview
    getOverview: async (filters?: DateRangeFilter): Promise<OverviewResponse> => {
        return apiClient.get('/admin/analytics/overview', filters)
    },

    // Sales Analytics
    getSalesAnalytics: async (filters?: DateRangeFilter): Promise<SalesAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/sales', filters)
    },

    // Customer Analytics
    getCustomerAnalytics: async (filters?: DateRangeFilter): Promise<CustomerAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/customers-detailed', filters)
    },

    // Product Analytics
    getProductAnalytics: async (filters?: DateRangeFilter): Promise<ProductAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/products-detailed', filters)
    },

    // Order Analytics
    getOrderAnalytics: async (filters?: DateRangeFilter): Promise<OrderAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/orders-detailed', filters)
    },

    // Marketing Analytics
    getMarketingAnalytics: async (filters?: DateRangeFilter): Promise<MarketingAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/marketing', filters)
    },

    // Financial Analytics
    getFinancialAnalytics: async (filters?: DateRangeFilter): Promise<FinancialAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/financial', filters)
    },

    // Inventory Analytics
    getInventoryAnalytics: async (filters?: DateRangeFilter): Promise<InventoryAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/inventory', filters)
    },

    // Operational Analytics
    getOperationalAnalytics: async (filters?: DateRangeFilter): Promise<OperationalAnalyticsResponse> => {
        return apiClient.get('/admin/analytics/operational', filters)
    },

    // Export
    exportAnalytics: async (type: string, format: string, filters?: DateRangeFilter): Promise<Blob> => {
        return apiClient.downloadFile('/admin/analytics/export', { type, format, ...filters })
    },
}
