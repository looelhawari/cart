import { apiClient } from '@/lib/api-client'

export interface StaticPage {
    id: number
    slug: string
    title_en: string
    title_ar: string
    content_en: string
    content_ar: string
    is_active: boolean
    last_updated_at: string | null
    updated_by: {
        id: number
        name: string
    } | null
    created_at: string
    updated_at: string
}

export interface UpdatePageRequest {
    title_en: string
    title_ar: string
    content_en: string
    content_ar: string
    is_active?: boolean
    send_notification?: boolean
    notification_title_en?: string
    notification_title_ar?: string
    notification_message_en?: string
    notification_message_ar?: string
}

export interface PageHistory {
    page: {
        slug: string
        last_updated_at: string | null
    }
    notifications: {
        id: number
        title_en: string
        title_ar: string
        message_en: string
        message_ar: string
        sent_at: string
    }[]
}

interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
}

export const staticPageService = {
    /**
     * Get all static pages
     */
    getPages: async (): Promise<StaticPage[]> => {
        const response = await apiClient.get<ApiResponse<StaticPage[]>>('/admin/pages')
        return response.data
    },

    /**
     * Get a single page by slug
     */
    getPage: async (slug: string): Promise<StaticPage> => {
        const response = await apiClient.get<ApiResponse<StaticPage>>(`/admin/pages/${slug}`)
        return response.data
    },

    /**
     * Update a page
     */
    updatePage: async (slug: string, data: UpdatePageRequest): Promise<{
        id: number
        slug: string
        title_en: string
        title_ar: string
        last_updated_at: string
        notification_sent: boolean
    }> => {
        const response = await apiClient.put<ApiResponse<{
            id: number
            slug: string
            title_en: string
            title_ar: string
            last_updated_at: string
            notification_sent: boolean
        }>>(`/admin/pages/${slug}`, data)
        return response.data
    },

    /**
     * Toggle page active status
     */
    toggleStatus: async (slug: string): Promise<{ slug: string; is_active: boolean }> => {
        const response = await apiClient.post<ApiResponse<{ slug: string; is_active: boolean }>>(
            `/admin/pages/${slug}/toggle-status`
        )
        return response.data
    },

    /**
     * Get page update history
     */
    getHistory: async (slug: string): Promise<PageHistory> => {
        const response = await apiClient.get<ApiResponse<PageHistory>>(`/admin/pages/${slug}/history`)
        return response.data
    },
}
