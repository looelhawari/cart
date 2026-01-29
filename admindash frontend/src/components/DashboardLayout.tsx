import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useTranslation } from 'react-i18next'
import {
    LayoutDashboard,
    Package,
    FolderTree,
    ShoppingCart,
    MessageSquare,
    DollarSign,
    Users,
    BarChart3,
    LogOut,
    Menu,
    X,
    Tag,
    Ticket,
    Activity,
    Shield,
    FileText,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface DashboardLayoutProps {
    children: ReactNode
}

interface NavItem {
    titleKey: string
    href: string
    icon: React.ElementType
    roles?: string[]
}

const navItems: NavItem[] = [
    {
        titleKey: 'navigation.dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        titleKey: 'navigation.products',
        href: '/products',
        icon: Package,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        titleKey: 'navigation.categories',
        href: '/categories',
        icon: FolderTree,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        titleKey: 'navigation.promotions',
        href: '/promotions',
        icon: Tag,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        titleKey: 'navigation.promoCodes',
        href: '/promo-codes',
        icon: Ticket,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        titleKey: 'navigation.orders',
        href: '/orders',
        icon: ShoppingCart,
    },
    {
        titleKey: 'navigation.support',
        href: '/support',
        icon: MessageSquare,
        roles: ['super_admin', 'admin', 'customer_support'],
    },
    {
        titleKey: 'navigation.financial',
        href: '/financial',
        icon: DollarSign,
        roles: ['super_admin', 'admin', 'accountant'],
    },
    {
        titleKey: 'navigation.users',
        href: '/users',
        icon: Users,
        roles: ['super_admin', 'admin'],
    },
    {
        titleKey: 'navigation.analytics',
        href: '/analytics',
        icon: BarChart3,
        roles: ['super_admin', 'admin', 'sales_manager', 'accountant'],
    },
    {
        titleKey: 'navigation.adminLogs',
        href: '/admin-logs',
        icon: Shield,
        roles: ['super_admin', 'admin'],
    },
    {
        titleKey: 'navigation.appLogs',
        href: '/activity-logs',
        icon: Activity,
        roles: ['super_admin', 'admin'],
    },
    {
        titleKey: 'navigation.contentManagement',
        href: '/content',
        icon: FileText,
        roles: ['super_admin', 'admin'],
    },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const location = useLocation()
    const { user, logout } = useAuthStore()
    const { t, i18n } = useTranslation()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const isRTL = i18n.language === 'ar'

    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles) return true
        return user && item.roles.includes(user.role)
    })

    const handleLogout = async () => {
        await logout()
        window.location.href = '/login'
    }

    // Format date based on language
    const formatDate = () => {
        const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
        return new Date().toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    return (
        <div className="min-h-screen bg-elbaraka-bg">
            {/* Sidebar */}
            <aside
                className={cn(
                    'sidebar fixed inset-y-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out',
                    isRTL ? 'right-0' : 'left-0',
                    sidebarOpen
                        ? 'translate-x-0'
                        : isRTL
                            ? 'translate-x-full'
                            : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div className={cn("flex items-center", isRTL ? "space-x-reverse space-x-3" : "space-x-3")}>
                            <div className="h-10 w-10 rounded-lg bg-elbaraka-primary flex items-center justify-center text-white text-lg font-bold">
                                EB
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-elbaraka-primary">ElBaraka</h1>
                                <p className="text-xs text-muted-foreground">{t('common.adminDashboard')}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                        isRTL ? "space-x-reverse space-x-3" : "space-x-3",
                                        isActive
                                            ? 'bg-elbaraka-primary text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{t(item.titleKey)}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t border-border">
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">
                                {user?.first_name} {user?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-elbaraka-accent text-white rounded">
                                {user?.role.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className={cn("w-full justify-start", isRTL && "flex-row-reverse")}
                        >
                            <LogOut className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                            {t('auth.logout')}
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={cn(
                'transition-all duration-200',
                sidebarOpen
                    ? isRTL ? 'lg:mr-64' : 'lg:ml-64'
                    : 'ml-0 mr-0'
            )}>
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white border-b border-border">
                    <div className="flex items-center justify-between px-6 py-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className={cn("flex items-center", isRTL ? "space-x-reverse space-x-4" : "space-x-4")}>
                            <span className="text-sm text-muted-foreground">
                                {formatDate()}
                            </span>
                            <LanguageSwitcher />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">{children}</main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    )
}
