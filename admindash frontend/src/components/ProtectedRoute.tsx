import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useEffect } from 'react'

interface ProtectedRouteProps {
    allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuthStore()

    useEffect(() => {
        console.log('ProtectedRoute - isAuthenticated:', isAuthenticated)
        console.log('ProtectedRoute - user:', user)
        console.log('localStorage auth_token:', localStorage.getItem('auth_token'))
    }, [isAuthenticated, user])

    if (!isAuthenticated) {
        console.log('Not authenticated, redirecting to login')
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        console.log('User role not allowed, redirecting to dashboard')
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}
