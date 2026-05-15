// User & Auth Types
export type AdminRole = 'owner' | 'cashier' | 'support' | 'store_manager'
    // Legacy roles (still accepted by backend for migration period)
    | 'super_admin' | 'admin' | 'sales_manager' | 'accountant' | 'customer_support'

export interface User {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    avatar?: string | null
    role: AdminRole
    is_active: boolean
    email_verified_at: string | null
    two_factor_enabled: boolean
    last_login_at: string | null
    last_login_ip: string | null
    created_at: string
    updated_at: string
    // Customer specific
    orders_count?: number
    orders_sum_total?: number
    orders?: any[]
    complaints?: any[]
    addresses?: any[]
    default_address?: any

    // Enhanced fields
    is_cod_restricted?: boolean
    max_order_value?: number
    registration_source?: string
    loyalty_points?: number
    is_vip?: boolean

    // Loaded relationships
    notes?: any[]
    analytics?: {
        ltv: number
        avg_order_value: number
        cancel_rate: number
        total_orders: number
        total_spent?: number
    }
}

export interface AuthResponse {
    success: boolean
    message: string
    data: {
        user: {
            id: number
            first_name: string
            last_name: string
            full_name: string
            email: string
            phone: string
            avatar: string | null
            language: string
            role: AdminRole
            is_verified: boolean
        }
        access_token: string
        refresh_token: string
        token_type: string
        expires_in: number
    }
}

export interface RefreshTokenResponse {
    success: boolean
    message: string
    data: {
        access_token: string
        refresh_token: string
        token_type: string
        expires_in: number
    }
}

// Product Types
export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'discontinued'

export interface Product {
    id?: number
    barcode: string
    name: string
    name_en?: string
    name_ar: string
    slug?: string
    description: string | null
    description_en?: string | null
    description_ar: string | null
    price: number
    original_price: number | null
    sale_price: number | null
    cost_price: number
    stock_quantity: number
    is_in_stock?: boolean
    min_stock_level: number
    category_id: number
    category?: Category
    categories?: Category[]
    image?: string | null
    image_url: string | null
    availability_status: ProductAvailability
    is_featured: boolean
    is_active?: boolean
    weight: number | null
    unit: string | null
    packaging?: string | null
    nutrition_facts?: string | null
    sales_count?: number
    active_promotion_id: number | null
    active_promotion?: Promotion
    on_sale: boolean
    discount_percentage: number | null
    created_at: string
    updated_at: string
}

// Promotion Types
export type PromotionDiscountType = 'percentage' | 'fixed' | 'buy_x_get_y'
export type PromotionAppliesTo = 'all' | 'category' | 'products'

export interface Promotion {
    id: number
    title: string
    title_ar: string
    description: string | null
    description_ar: string | null
    image_url: string | null
    banner_image_url: string | null
    discount_type: PromotionDiscountType
    discount_value: number
    start_date: string
    end_date: string
    is_active: boolean
    is_featured: boolean
    applies_to: PromotionAppliesTo
    min_purchase: number
    max_discount: number | null
    terms_conditions: string | null
    terms_conditions_ar: string | null
    created_by: number | null
    is_currently_active: boolean
    time_remaining: {
        days: number
        hours: number
        minutes: number
        seconds: number
    } | null
    categories?: Category[]
    products?: Product[]
    creator?: User
    created_at: string
    updated_at: string
}

export interface PromotionAnalytics {
    promotion_id: number
    title: string
    products_count: number
    total_potential_savings: number
    is_active: boolean
    time_remaining: {
        days: number
        hours: number
        minutes: number
        seconds: number
    } | null
}
// Promo Code Types
export type PromoCodeType = 'percentage' | 'fixed_amount' | 'free_delivery' | 'bogo'
export type PromoCodeAppliesTo = 'order' | 'product' | 'category'

export interface PromoCodeBogoRule {
    id: number
    promo_code_id: number
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
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface PromoCodeUsage {
    id: number
    promo_code_id: number
    user_id: number
    order_id: number
    discount_amount: number
    order_total: number
    order_number: string
    used_at: string
    created_at: string
    user?: {
        id: number
        name: string
        email: string
    }
}

export interface PromoCode {
    id: number
    code: string
    type: PromoCodeType
    applies_to: PromoCodeAppliesTo
    first_order_only: boolean
    value: number
    minimum_order: number | null
    maximum_discount: number | null
    usage_limit: number | null
    usage_per_user: number | null

    used_count: number
    // Targeting
    target_audience?: 'all_users' | 'new_users' | 'high_spenders' | 'active_users' | 'delivery_lovers' | 'high_rated' | 'inactive_users' | 'offline_users' | 'custom'
    promotional_message?: string | null
    promotional_message_ar?: string | null
    minimum_spend_30days?: number | null
    minimum_orders_30days?: number | null
    last_order_date_from?: string | null
    last_order_date_to?: string | null
    registration_date_from?: string | null
    registration_date_to?: string | null
    location?: string | null
    specific_user_ids?: number[] | null
    valid_from: string
    valid_until: string
    is_active: boolean
    created_at: string
    updated_at: string
    // Relationships
    products?: Product[]
    categories?: Category[]
    bogo_rules?: PromoCodeBogoRule[]
    usages?: PromoCodeUsage[]
    // Computed
    status?: 'active' | 'expired' | 'scheduled' | 'inactive' | 'limit_reached'
    remaining_uses?: number | null
    is_expired?: boolean
    discount_display?: string
}
// Category Types
export interface Category {
    id: number
    parent_id: number | null
    name?: string
    name_en: string
    name_ar: string
    slug: string
    description_en: string | null
    description_ar: string | null
    image: string | null
    icon: string | null
    sort_order: number
    is_active: boolean
    created_at: string
    updated_at: string
    children?: Category[]
    products_count?: number
}

// Order Types
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash_on_delivery' | 'online_paymob' | 'online_stripe'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Order {
    id: number
    order_number: string
    user_id: number
    user?: {
        id: number
        first_name: string
        last_name: string
        email: string
        phone: string
    }
    total_amount: number
    total?: number  // Alias for total_amount
    discount_amount: number
    delivery_fee: number
    final_amount: number
    status: OrderStatus
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    delivery_address: string
    delivery_address_details?: {
        street: string
        building: string
        floor: string
        apartment: string
        area: string
        city: string
        landmark?: string
        recipient_name?: string
    }
    delivery_latitude: number | null
    delivery_longitude: number | null
    delivery_notes: string | null
    // Wave 5 — Task 4: scheduled-order fields. Both nullable; if
    // delivery_date is present, treat as scheduled.
    delivery_date: string | null
    delivery_time_slot: string | null
    is_scheduled: boolean
    estimated_delivery_time: string | null
    actual_delivery_time: string | null
    promo_code_id: number | null
    created_at: string
    updated_at: string
    items?: OrderItem[]
}

export interface OrderItem {
    id: number
    order_id: number
    product_barcode: string
    product_name: string
    /** Arabic name from the live product row; falls back to product_name. */
    product_name_ar?: string
    /** English name from the live product row; falls back to product_name. */
    product_name_en?: string
    product_image?: string | null
    product_price: number
    quantity: number
    subtotal: number
}

// Support Ticket Types
export type TicketStatus = 'open' | 'in_progress' | 'awaiting_response' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketCategory = 'order_issue' | 'product_quality' | 'delivery_problem' | 'payment_issue' | 'technical_issue' | 'general_inquiry' | 'suggestion' | 'other'

export interface Ticket {
    id: number
    ticket_number: string
    user_id: number
    order_id: number | null
    assigned_to: number | null
    subject: string
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    description: string
    resolved_at: string | null
    resolved_by: number | null
    created_at: string
    updated_at: string
    // Relationships
    customer?: {
        id: number
        first_name: string
        last_name: string
        email: string
        phone: string
        avatar?: string | null
    }
    user?: { // Alias for customer to match some contexts
        id: number
        first_name: string
        last_name: string
        email: string
        phone: string
        avatar?: string | null
    }
    order?: {
        id: number
        order_number: string
    }
    assigned_to_user?: {
        id: number
        first_name: string
        last_name: string
        role: AdminRole
    }
    assignedTo?: { // Alias
        id: number
        first_name: string
        last_name: string
    }
    messages?: TicketMessage[]
    attachments?: any[]
    messages_count?: number
    unread_messages_count?: number
    bot_handled?: boolean
    escalated_to_agent?: boolean
    escalated_at?: string | null
    bot_satisfaction_rating?: number | null
}

export interface TicketMessage {
    id: number
    complaint_id: number
    user_id: number
    message: string
    is_admin_reply: boolean
    is_bot_reply?: boolean
    bot_intent?: string
    created_at: string
    updated_at: string
    user?: {
        id: number
        first_name: string
        last_name: string
        role?: AdminRole
        avatar?: string | null
    }
}

// Financial Types
export interface Transaction {
    id: number
    order_id: number
    paymob_transaction_id: string | null
    amount: number
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    transaction_date: string
    refund_amount: number
    refund_date: string | null
    refund_reason: string | null
    created_at: string
    updated_at: string
    order?: Order
}

// Analytics Types
export interface SalesAnalytics {
    total_revenue: number
    total_orders: number
    average_order_value: number
    period_comparison: {
        revenue_change: number
        orders_change: number
    }
    daily_sales: Array<{
        date: string
        revenue: number
        orders: number
    }>
    top_products: Array<{
        barcode: string
        name: string
        quantity_sold: number
        revenue: number
    }>
    top_categories: Array<{
        id: number
        name: string
        revenue: number
        orders_count: number
    }>
}

// Pagination Types
export interface PaginationMeta {
    current_page: number
    from: number | null
    to: number | null
    per_page: number
    total: number
    last_page: number
    path?: string
    prev_page_url?: string | null
    next_page_url?: string | null
    links?: Array<{
        url: string | null
        label: string
        active: boolean
    }>
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: PaginationMeta
    // Top-level pagination fields (some APIs return these at top level)
    total?: number
    last_page?: number
    current_page?: number
    per_page?: number
}

// API Error Types
export interface ApiError {
    message: string
    errors?: Record<string, string[]>
}
