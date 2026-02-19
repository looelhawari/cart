import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'
import { apiClient } from '@/lib/api-client'

interface RbacResponse {
    success: boolean
    data: {
        role: string
        role_name: string
        permissions: string[]
        is_owner: boolean
    }
}

interface AuthState {
    user: User | null
    token: string | null
    refreshToken: string | null
    permissions: string[]
    permissionsLoaded: boolean
    isAuthenticated: boolean
    isHydrated: boolean
    setAuth: (user: User, token: string, refreshToken: string) => void
    setHydrated: (isHydrated: boolean) => void
    fetchPermissions: () => Promise<void>
    logout: () => void
    updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, _get) => ({
            user: null,
            token: null,
            refreshToken: null,
            permissions: [],
            permissionsLoaded: false,
            isAuthenticated: false,
            isHydrated: false,
            setAuth: async (user, token, refreshToken) => {
                // Only update localStorage for api-client to access
                localStorage.setItem('auth_token', token)
                localStorage.setItem('refresh_token', refreshToken)
                // Zustand persist middleware will handle storing user/token in 'auth-storage'
                set({ user, token, refreshToken, isAuthenticated: true, permissionsLoaded: false })
                // Fetch RBAC permissions from backend
                try {
                    const res = await apiClient.get<RbacResponse>('/admin/rbac/my-permissions')
                    const perms = res?.data?.permissions ?? (res as any)?.permissions ?? []
                    set({ permissions: perms, permissionsLoaded: true })
                } catch (err) {
                    console.warn('Failed to fetch RBAC permissions:', err)
                    set({ permissions: [], permissionsLoaded: true })
                }
            },
            fetchPermissions: async () => {
                try {
                    const res = await apiClient.get<RbacResponse>('/admin/rbac/my-permissions')
                    const perms = res?.data?.permissions ?? (res as any)?.permissions ?? []
                    set({ permissions: perms, permissionsLoaded: true })
                } catch (err) {
                    console.warn('Failed to fetch RBAC permissions:', err)
                    set({ permissionsLoaded: true })
                }
            },
            setHydrated: (isHydrated) => set({ isHydrated }),
            logout: async () => {
                try {
                    await authService.logout()
                } catch (error) {
                    console.error('Logout error:', error)
                } finally {
                    // authService.logout already clears localStorage tokens
                    set({ user: null, token: null, refreshToken: null, permissions: [], permissionsLoaded: false, isAuthenticated: false })
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
                permissions: state.permissions,
                permissionsLoaded: state.permissionsLoaded,
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

// Legacy helper — kept for backward compat; prefer usePermissions() hook
export function hasPermission(userRole: string | undefined, allowedRoles: string[]): boolean {
    if (!userRole) return false
    return allowedRoles.includes(userRole)
}

// Re-export new RBAC helpers for convenience
export { usePermissions } from '@/hooks/usePermissions'
