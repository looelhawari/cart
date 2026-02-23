import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types'

export interface Review {
    id: number
    rating_type: 'product' | 'order' | 'store'
    order_id: number | null
    user_id: number
    product_id: number | null
    rating: number
    comment: string
    images: string[] | null
    status: 'pending' | 'approved' | 'rejected'
    is_approved: boolean
    response: string | null
    responded_at: string | null
    responded_by: number | null
    created_at: string
    updated_at: string
    user?: {
        id: number
        first_name: string
        last_name: string
        email: string
    }
    order?: {
        id: number
        order_number: string
    }
    product?: {
        barcode: string
        name_en: string
        name_ar: string
    }
    logs?: ReviewLog[]
}

export interface ReviewLog {
    id: number
    review_id: number
    admin_id: number | null
    action: string
    old_values: any
    new_values: any
    ip_address: string | null
    created_at: string
    admin?: {
        id: number
        first_name: string
        last_name: string
    }
}

export interface ReviewFilters {
    page?: number
    per_page?: number
    rating_type?: 'product' | 'order' | 'store'
    status?: 'pending' | 'approved' | 'rejected'
    rating?: number
    date_from?: string
    date_to?: string
    order_id?: number
    user_id?: number
    product_id?: number
    search?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface RatingDistribution {
    1: number
    2: number
    3: number
    4: number
    5: number
}

export interface ReviewAnalytics {
    overview: {
        total_reviews: number
        average_rating: number
        pending_reviews: number
        rating_distribution: RatingDistribution
    }
    by_type: {
        product: { count: number; average: number }
        order: { count: number; average: number }
        store: { count: number; average: number }
    }
    by_status: Record<string, number>
    trend: Array<{
        date: string
        count: number
        average_rating: number
    }>
    top_products: Array<{
        product_id: number
        review_count: number
        average_rating: number
        product?: {
            barcode: string
            name_en: string
            name_ar: string
        }
    }>
    order_rating_rate: number
    date_range: {
        from: string
        to: string
    }
}

export interface OrderReviews {
    order_rating: Review | null
    product_reviews: Review[]
    has_order_rating: boolean
    average_product_rating: number | null
}

export const reviewService = {
    // Get all reviews with filtering
    getReviews: async (filters?: ReviewFilters): Promise<PaginatedResponse<Review>> => {
        const response = await apiClient.get<{ success: boolean; data: PaginatedResponse<Review> }>('/admin/reviews', filters)
        return response.data
    },

    // Get review analytics
    getAnalytics: async (dateFrom?: string, dateTo?: string): Promise<ReviewAnalytics> => {
        const response = await apiClient.get<{ success: boolean; data: ReviewAnalytics }>('/admin/reviews/analytics', {
            date_from: dateFrom,
            date_to: dateTo,
        })
        return response.data
    },

    // Get a single review with details
    getReview: async (id: number): Promise<Review> => {
        const response = await apiClient.get<{ success: boolean; data: Review }>(`/admin/reviews/${id}`)
        return response.data
    },

    // Get reviews for a specific order
    getOrderReviews: async (orderId: number): Promise<OrderReviews> => {
        const response = await apiClient.get<{ success: boolean; data: OrderReviews }>(`/admin/reviews/order/${orderId}`)
        return response.data
    },

    // Get review history log
    getReviewHistory: async (id: number): Promise<ReviewLog[]> => {
        const response = await apiClient.get<{ success: boolean; data: ReviewLog[] }>(`/admin/reviews/${id}/history`)
        return response.data
    },

    // Update review status
    updateStatus: async (id: number, status: 'pending' | 'approved' | 'rejected'): Promise<Review> => {
        const response = await apiClient.put<{ success: boolean; data: Review }>(`/admin/reviews/${id}/status`, { status })
        return response.data
    },

    // Add admin response to review
    addResponse: async (id: number, responseText: string): Promise<Review> => {
        const response = await apiClient.post<{ success: boolean; data: Review }>(`/admin/reviews/${id}/respond`, {
            response: responseText,
        })
        return response.data
    },

    // Bulk update review status
    bulkUpdateStatus: async (reviewIds: number[], status: 'approved' | 'rejected'): Promise<void> => {
        await apiClient.post('/admin/reviews/bulk-status', {
            review_ids: reviewIds,
            status,
        })
    },

    // Delete a review
    deleteReview: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/reviews/${id}`)
    },
}
