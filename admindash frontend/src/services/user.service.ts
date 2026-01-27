import { apiClient } from '@/lib/api-client'
import type { User, AdminRole, PaginatedResponse } from '@/types'

export interface UserFilters {
    page?: number
    per_page?: number
    search?: string
    role?: AdminRole | AdminRole[]
    status?: 'active' | 'inactive'
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface CreateUserData {
    first_name: string
    last_name: string
    email: string
    phone: string
    password: string
    password_confirmation: string
    role: AdminRole
    is_active?: boolean
}

export interface UpdateUserData {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    role?: AdminRole
    is_active?: boolean
}

export interface ActivityLog {
    id: number
    description: string
    subject_type: string | null
    subject_id: number | null
    causer_type: string | null
    causer_id: number | null
    properties: any
    created_at: string
}

export const userService = {
    getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<User>> => {
        return apiClient.get('/admin/users', filters)
    },

    getUser: async (id: number): Promise<User> => {
        return apiClient.get(`/admin/users/${id}`)
    },

    createUser: async (data: CreateUserData): Promise<User> => {
        return apiClient.post('/admin/users', data)
    },

    updateUser: async (id: number, data: UpdateUserData): Promise<User> => {
        return apiClient.put(`/admin/users/${id}`, data)
    },

    deleteUser: async (id: number): Promise<void> => {
        return apiClient.delete(`/admin/users/${id}`)
    },

    resetPassword: async (id: number, newPassword: string): Promise<void> => {
        return apiClient.post(`/admin/users/${id}/reset-password`, { password: newPassword })
    },

    enable2FA: async (id: number): Promise<{ secret: string; qr_code: string }> => {
        return apiClient.post(`/admin/users/${id}/enable-2fa`)
    },

    disable2FA: async (id: number): Promise<void> => {
        return apiClient.post(`/admin/users/${id}/disable-2fa`)
    },

    getActivityLog: async (userId?: number, page = 1, perPage = 50): Promise<PaginatedResponse<ActivityLog>> => {
        return apiClient.get('/admin/activity-log', { user_id: userId, page, per_page: perPage })
    },
}
