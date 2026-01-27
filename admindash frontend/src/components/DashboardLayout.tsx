import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
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
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
    children: ReactNode
}

interface NavItem {
    title: string
    href: string
    icon: React.ElementType
    roles?: string[]
}

const navItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Products',
        href: '/products',
        icon: Package,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        title: 'Categories',
        href: '/categories',
        icon: FolderTree,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        title: 'Promotions',
        href: '/promotions',
        icon: Tag,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        title: 'Promo Codes',
        href: '/promo-codes',
        icon: Ticket,
        roles: ['super_admin', 'admin', 'sales_manager'],
    },
    {
        title: 'Orders',
        href: '/orders',
        icon: ShoppingCart,
    },
    {
        title: 'Support Tickets',
        href: '/support',
        icon: MessageSquare,
        roles: ['super_admin', 'admin', 'customer_support'],
    },
    {
        title: 'Financial',
        href: '/financial',
        icon: DollarSign,
        roles: ['super_admin', 'admin', 'accountant'],
    },
    {
        title: 'Users',
        href: '/users',
        icon: Users,
        roles: ['super_admin', 'admin'],
    },
    {
        title: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
        roles: ['super_admin', 'admin', 'sales_manager', 'accountant'],
    },
    {
        title: 'Admin Logs',
        href: '/admin-logs',
        icon: Shield,
        roles: ['super_admin', 'admin'],
    },
    {
        title: 'App Logs',
        href: '/activity-logs',
        icon: Activity,
        roles: ['super_admin', 'admin'],
    },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const location = useLocation()
    const { user, logout } = useAuthStore()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles) return true
        return user && item.roles.includes(user.role)
    })

    const handleLogout = async () => {
        await logout()
        window.location.href = '/login'
    }

    return (
        <div className="min-h-screen bg-elbaraka-bg">
            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border transform transition-transform duration-200 ease-in-out',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-elbaraka-primary flex items-center justify-center text-white text-lg font-bold">
                                EB
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-elbaraka-primary">ElBaraka</h1>
                                <p className="text-xs text-muted-foreground">Admin Dashboard</p>
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
                                        'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-elbaraka-primary text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.title}</span>
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
                            className="w-full justify-start"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className={cn('transition-all duration-200', sidebarOpen ? 'lg:ml-64' : 'ml-0')}>
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
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
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
