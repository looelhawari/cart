import { useTranslation } from 'react-i18next'
import { ShieldAlert, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'

/**
 * Landing page for an authenticated admin whose role has no permissions.
 * Without it, getDefaultRoute() had nowhere to send such a user and the
 * router looped between /login and the protected area.
 */
export default function NoAccessPage() {
    const { t } = useTranslation()
    const { user, logout } = useAuthStore()

    const handleLogout = async () => {
        await logout()
        window.location.href = '/login'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-elbaraka-bg p-6">
            <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-border p-8 text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="h-7 w-7 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                    {t('noAccess.title', 'No access granted')}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t(
                        'noAccess.message',
                        'Your account ({{email}}) has no dashboard permissions yet. Ask the store owner to assign permissions to your role.',
                        { email: user?.email ?? '' },
                    )}
                </p>
                <Button onClick={handleLogout} variant="outline" className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('auth.logout', 'Logout')}
                </Button>
            </div>
        </div>
    )
}
