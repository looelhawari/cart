import { useCallback } from 'react'
import { useAuthStore } from '@/store/auth.store'
import {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    NAV_PERMISSIONS,
} from '@/lib/rbac'

/**
 * Hook for permission checks throughout the admin dashboard.
 *
 * Usage:
 *   const { can, canAny, canAll, canRoute, canNav } = usePermissions()
 *   if (can('orders.view')) { ... }
 */
export function usePermissions() {
    const user = useAuthStore((s) => s.user)
    const permissions = useAuthStore((s) => s.permissions)
    const permissionsLoaded = useAuthStore((s) => s.permissionsLoaded)

    const can = useCallback(
        (permission: string) => hasPermission(permissions, permission, user?.role),
        [permissions, user?.role],
    )

    const canAny = useCallback(
        (perms: string[]) => hasAnyPermission(permissions, perms, user?.role),
        [permissions, user?.role],
    )

    const canAll = useCallback(
        (perms: string[]) => hasAllPermissions(permissions, perms, user?.role),
        [permissions, user?.role],
    )

    const canRoute = useCallback(
        (path: string) => canAccessRoute(path, permissions, user?.role),
        [permissions, user?.role],
    )

    /** Check if a nav item (by href) should be visible */
    const canNav = useCallback(
        (href: string) => {
            if (user?.role === 'owner') return true
            const required = NAV_PERMISSIONS[href]
            if (!required) return true
            return hasAnyPermission(permissions, required, user?.role)
        },
        [permissions, user?.role],
    )

    return { can, canAny, canAll, canRoute, canNav, permissions, permissionsLoaded, role: user?.role }
}
