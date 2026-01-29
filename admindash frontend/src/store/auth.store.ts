import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    setAuth: (user: User, token: string) => void
    logout: () => void
    updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, _get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => {
                localStorage.setItem('auth_token', token)
                localStorage.setItem('user', JSON.stringify(user))
                set({ user, token, isAuthenticated: true })
            },
            logout: async () => {
                try {
                    await authService.logout()
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('user')
                    set({ user: null, token: null, isAuthenticated: false })
                }
            },
            updateUser: (user) => {
                localStorage.setItem('user', JSON.stringify(user))
                set({ user })
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                // Set isAuthenticated based on whether user and token exist after rehydration
                if (state && state.user && state.token) {
                    state.isAuthenticated = true
                }
            },
        }
    )
)

// Helper to check permissions
export function hasPermission(userRole: string | undefined, allowedRoles: string[]): boolean {
    if (!userRole) return false
    return allowedRoles.includes(userRole)
}
