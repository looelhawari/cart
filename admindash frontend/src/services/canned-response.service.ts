import { apiClient } from '@/lib/api-client'

export interface CannedResponse {
    id: number
    title: string
    content: string
    category: string | null
    shortcut: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateCannedResponseData {
    title: string
    content: string
    category?: string
    shortcut?: string
}

export const cannedResponseService = {
    getAll: async (category?: string, search?: string): Promise<CannedResponse[]> => {
        const params: any = {}
        if (category) params.category = category
        if (search) params.search = search
        return apiClient.get('/admin/canned-responses', params)
    },

    getCategories: async (): Promise<string[]> => {
        return apiClient.get('/admin/canned-responses/categories')
    },

    create: async (data: CreateCannedResponseData): Promise<CannedResponse> => {
        return apiClient.post('/admin/canned-responses', data)
    },

    update: async (id: number, data: Partial<CreateCannedResponseData>): Promise<CannedResponse> => {
        return apiClient.put(`/admin/canned-responses/${id}`, data)
    },

    delete: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/canned-responses/${id}`)
    },
}
