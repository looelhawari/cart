import { apiClient } from '@/lib/api-client'
import type {
    User,
    PaginatedResponse
} from '@/types'

export const userService = {
    getUsers: async (params?: any): Promise<PaginatedResponse<User>> => {
        return apiClient.get('/admin/users', params)
    },

    getUser: async (id: number): Promise<User> => {
        return apiClient.get(`/admin/users/${id}`)
    },

    createUser: async (data: any): Promise<User> => {
        return apiClient.post('/admin/users', data)
    },

    updateUser: async (id: number, data: any): Promise<User> => {
        return apiClient.put(`/admin/users/${id}`, data)
    },

    deleteUser: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/users/${id}`)
    },

    // Customer specific methods
    getCustomers: async (filters?: any): Promise<PaginatedResponse<User>> => {
        return apiClient.get('/admin/customers', filters)
    },

    getCustomer: async (id: number): Promise<User> => {
        return apiClient.get(`/admin/customers/${id}`)
    },

    updateCustomer: async (id: number, data: any): Promise<User> => {
        return apiClient.put(`/admin/customers/${id}`, data)
    },

    getCustomerStats: async (): Promise<any> => {
        return apiClient.get('/admin/customers/stats')
    },

    getActivityLog: async (id: number): Promise<PaginatedResponse<any>> => {
        return apiClient.get(`/admin/customers/${id}/activity`)
    },

    addCustomerNote: async (id: number, data: { note: string, is_visible_to_customer: boolean }): Promise<any> => {
        return apiClient.post(`/admin/customers/${id}/notes`, data)
    },

    resetCustomerPassword: async (id: number, data: { password: string, password_confirmation: string }): Promise<any> => {
        return apiClient.post(`/admin/customers/${id}/reset-password`, data)
    }
}
