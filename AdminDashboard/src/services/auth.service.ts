import { apiClient } from '@/lib/api-client'
import type { AuthResponse, RefreshTokenResponse, User } from '@/types'

export interface LoginCredentials {
    email: string
    password: string
    remember_me?: boolean
}

export const authService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        return apiClient.post('/auth/login', credentials)
    },

    logout: async (): Promise<void> => {
        await apiClient.post('/auth/logout')
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
    },

    getCurrentUser: async (): Promise<User> => {
        return apiClient.get('/profile')
    },

    refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
        return apiClient.post('/auth/refresh', { refresh_token: refreshToken })
    },
}
