import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { usePermissions } from '@/hooks/usePermissions'
import { getDefaultRoute } from '@/lib/rbac'
import { useEffect } from 'react'

interface ProtectedRouteProps {
    allowedRoles?: string[]
    requiredPermissions?: string[]
}

export default function ProtectedRoute({ allowedRoles, requiredPermissions }: ProtectedRouteProps) {
    const { isAuthenticated, user, isHydrated, permissionsLoaded, fetchPermissions, permissions } = useAuthStore()
    const { canAny, canRoute } = usePermissions()
    const location = useLocation()

    useEffect(() => {
        if (isAuthenticated && !permissionsLoaded) {
            fetchPermissions()
        }
    }, [isAuthenticated, permissionsLoaded, fetchPermissions])

    if (!isHydrated) return null

    if (!isAuthenticated) return <Navigate to="/login" replace />

    if (!permissionsLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
        )
    }

    const fallback = getDefaultRoute(permissions, user?.role)

    // Legacy role-based check
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to={fallback} replace />
    }

    // New permission-based check
    if (requiredPermissions && requiredPermissions.length > 0 && !canAny(requiredPermissions)) {
        return <Navigate to={fallback} replace />
    }

    // Route-level permission check
    if (!canRoute(location.pathname)) {
        return <Navigate to={fallback} replace />
    }

    return <Outlet />
}
