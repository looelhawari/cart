import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'

interface AuthState {
    user: User | null
    token: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isHydrated: boolean
    setAuth: (user: User, token: string, refreshToken: string) => void
    setHydrated: (isHydrated: boolean) => void
    logout: () => void
    updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, _get) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isHydrated: false,
            setAuth: (user, token, refreshToken) => {
                localStorage.setItem('auth_token', token)
                localStorage.setItem('refresh_token', refreshToken)
                localStorage.setItem('user', JSON.stringify(user))
                set({ user, token, refreshToken, isAuthenticated: true })
            },
            setHydrated: (isHydrated) => set({ isHydrated }),
            logout: async () => {
                try {
                    await authService.logout()
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    localStorage.removeItem('auth_token')
                    localStorage.removeItem('refresh_token')
                    localStorage.removeItem('user')
                    set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
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
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                // Set isAuthenticated based on whether user and token exist after rehydration
                state?.setHydrated(true)

                if (state?.user && state?.token) {
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
