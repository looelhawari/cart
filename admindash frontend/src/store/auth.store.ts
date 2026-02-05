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
                // Only update localStorage for api-client to access
                localStorage.setItem('auth_token', token)
                localStorage.setItem('refresh_token', refreshToken)
                // Zustand persist middleware will handle storing user/token in 'auth-storage'
                set({ user, token, refreshToken, isAuthenticated: true })
            },
            setHydrated: (isHydrated) => set({ isHydrated }),
            logout: async () => {
                try {
                    await authService.logout()
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    // authService.logout already clears localStorage tokens
                    set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
                }
            },
            updateUser: (user) => {
                // Just update store - Zustand persist will handle storage
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
                // After rehydration, sync with localStorage (in case of manual changes)
                const lsToken = localStorage.getItem('auth_token')
                const lsRefreshToken = localStorage.getItem('refresh_token')

                // If localStorage has tokens but store doesn't, clear localStorage (logout)
                // If store has tokens but localStorage doesn't, update localStorage
                if (state) {
                    if (state.token && state.refreshToken) {
                        // Ensure localStorage is in sync
                        if (lsToken !== state.token) {
                            localStorage.setItem('auth_token', state.token)
                        }
                        if (lsRefreshToken !== state.refreshToken) {
                            localStorage.setItem('refresh_token', state.refreshToken)
                        }
                        state.isAuthenticated = true
                    } else if (lsToken || lsRefreshToken) {
                        // Store cleared but localStorage not - clean up
                        localStorage.removeItem('auth_token')
                        localStorage.removeItem('refresh_token')
                        state.isAuthenticated = false
                    }

                    state.setHydrated(true)
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
