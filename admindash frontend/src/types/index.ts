// User & Auth Types
export type AdminRole = 'super_admin' | 'admin' | 'sales_manager' | 'accountant' | 'customer_support'

export interface User {
    id: number
    first_name: string
    last_name: string
    email: string
    phone: string
    role: AdminRole
    is_active: boolean
    email_verified_at: string | null
    two_factor_enabled: boolean
    last_login_at: string | null
    last_login_ip: string | null
    created_at: string
    updated_at: string
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

// Product Types
export type ProductAvailability = 'in_stock' | 'out_of_stock' | 'discontinued'

export interface Product {
    barcode: string
    name: string
    name_ar: string
    description: string | null
    description_ar: string | null
    price: number
    original_price: number | null
    sale_price: number | null
    cost_price: number
    stock_quantity: number
    min_stock_level: number
    category_id: number
    category?: Category
    image_url: string | null
    availability_status: ProductAvailability
    is_featured: boolean
    weight: number | null
    unit: string | null
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
export type PromoCodeType = 'percentage' | 'fixed_amount'

export interface PromoCode {
    id: number
    code: string
    type: PromoCodeType
    value: number
    minimum_order: number | null
    maximum_discount: number | null
    usage_limit: number | null
    usage_per_user: number | null
    used_count: number
    valid_from: string
    valid_until: string
    is_active: boolean
    created_at: string
    updated_at: string
}
// Category Types
export interface Category {
    id: number
    parent_id: number | null
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
    resolution_notes: string | null
    customer_rating: number | null
    created_at: string
    updated_at: string
    first_response_at: string | null
    resolved_at: string | null
    closed_at: string | null
    customer?: {
        id: number
        first_name: string
        last_name: string
        email: string
        phone: string
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
    messages_count?: number
    unread_messages_count?: number
}

export interface TicketMessage {
    id: number
    complaint_id: number
    user_id: number
    message: string
    is_internal_note: boolean
    is_admin_reply: boolean
    created_at: string
    updated_at: string
    user?: {
        id: number
        first_name: string
        last_name: string
        role?: AdminRole
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

export interface PromoCode {
    id: number
    code: string
    description: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    max_discount_amount: number | null
    min_order_amount: number
    usage_limit: number | null
    usage_count: number
    start_date: string
    end_date: string
    is_active: boolean
    created_at: string
    updated_at: string
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
    per_page: number
    total: number
    last_page: number
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: PaginationMeta
}

// API Error Types
export interface ApiError {
    message: string
    errors?: Record<string, string[]>
}
