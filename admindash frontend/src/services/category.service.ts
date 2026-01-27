import { apiClient } from '@/lib/api-client'
import type { Category, PaginatedResponse } from '@/types'

export interface CategoryFilters {
    page?: number
    per_page?: number
    search?: string
    parent_id?: number | 'root'
    is_active?: boolean
}

export interface CreateCategoryData {
    parent_id?: number | null
    name_en: string
    name_ar: string
    slug?: string
    description_en?: string
    description_ar?: string
    icon?: string
    sort_order?: number
    is_active?: boolean
}

export const categoryService = {
    getCategories: async (filters?: CategoryFilters): Promise<PaginatedResponse<Category>> => {
        return apiClient.get('/admin/categories', filters)
    },

    getCategoryTree: async (): Promise<Category[]> => {
        return apiClient.get('/admin/categories')
    },

    getCategory: async (id: number): Promise<Category> => {
        return apiClient.get(`/admin/categories/${id}`)
    },

    createCategory: async (data: CreateCategoryData): Promise<Category> => {
        return apiClient.post('/admin/categories', data)
    },

    updateCategory: async (id: number, data: Partial<CreateCategoryData>): Promise<Category> => {
        return apiClient.put(`/admin/categories/${id}`, data)
    },

    deleteCategory: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/categories/${id}`)
    },

    uploadImage: async (id: number, file: File): Promise<Category> => {
        return apiClient.uploadFile(`/admin/categories/${id}/upload-image`, file, 'image')
    },

    reorderCategories: async (categories: Array<{ id: number; display_order: number }>): Promise<void> => {
        return apiClient.post('/admin/categories/reorder', { categories })
    },
}
