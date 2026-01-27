import { apiClient } from '@/lib/api-client'
import type { Product, PaginatedResponse } from '@/types'

export interface ProductFilters {
    page?: number
    per_page?: number
    search?: string
    category_id?: number
    availability_status?: string
    is_featured?: boolean
    min_price?: number
    max_price?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface CreateProductData {
    barcode: string
    name: string
    name_ar: string
    description?: string
    description_ar?: string
    price: number
    cost_price: number
    stock_quantity: number
    min_stock_level: number
    category_id: number
    weight?: number
    unit?: string
    is_featured?: boolean
}

export const productService = {
    getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
        return apiClient.get('/admin/products', filters)
    },

    getProduct: async (barcode: string): Promise<Product> => {
        return apiClient.get(`/admin/products/${barcode}`)
    },

    createProduct: async (data: CreateProductData): Promise<Product> => {
        return apiClient.post('/admin/products', data)
    },

    updateProduct: async (barcode: string, data: Partial<CreateProductData>): Promise<Product> => {
        return apiClient.put(`/admin/products/${barcode}`, data)
    },

    deleteProduct: async (barcode: string): Promise<void> => {
        return apiClient.delete(`/admin/products/${barcode}`)
    },

    uploadImage: async (barcode: string, file: File): Promise<Product> => {
        return apiClient.uploadFile(`/admin/products/${barcode}/upload-image`, file, 'image')
    },

    bulkUpdateStock: async (updates: Array<{ barcode: string; stock_quantity: number }>): Promise<void> => {
        return apiClient.post('/admin/products/bulk-update-stock', { products: updates })
    },
}
