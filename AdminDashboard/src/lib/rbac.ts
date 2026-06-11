/**
 * RBAC (Role-Based Access Control) – Frontend helpers
 *
 * Permission format: "module.action"
 * Owner role bypasses all checks (wildcard).
 */

// ─── Admin Roles ───
export const ADMIN_ROLES = ['owner', 'admin', 'support', 'manager', 'sales', 'cashier'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

// ─── Permission Modules ───
export const MODULES = [
    'dashboard', 'orders', 'products', 'categories', 'promotions', 'promo_codes',
    'delivery_zones', 'refunds', 'support', 'customers', 'users',
    'analytics', 'admin_logs', 'app_logs', 'content', 'reviews',
    'settings', 'notifications',
] as const

export type PermissionModule = (typeof MODULES)[number]

// ─── Helper Functions ───

/** Check if a user with the given permissions array can access the required permission */
export function hasPermission(
    userPermissions: string[],
    required: string,
    userRole?: string,
): boolean {
    if (userRole === 'owner') return true
    return userPermissions.includes(required)
}

/** Check if a user has ANY of the required permissions */
export function hasAnyPermission(
    userPermissions: string[],
    required: string[],
    userRole?: string,
): boolean {
    if (userRole === 'owner') return true
    return required.some((p) => userPermissions.includes(p))
}

/** Check if a user has ALL of the required permissions */
export function hasAllPermissions(
    userPermissions: string[],
    required: string[],
    userRole?: string,
): boolean {
    if (userRole === 'owner') return true
    return required.every((p) => userPermissions.includes(p))
}

// ─── Route → Permission Mapping ───
// Maps each frontend route to the permission(s) needed (ANY match = access granted)
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
    '/dashboard': ['dashboard.view'],
    '/products': ['products.view'],
    '/categories': ['categories.view'],
    '/promotions': ['promotions.view'],
    '/promo-codes': ['promo_codes.view'],
    '/orders': ['orders.view'],
    '/refunds': ['refunds.view'],
    '/delivery-zones': ['delivery_zones.view'],
    '/support': ['support.view'],
    // Unified user management: holds both the Customers and Team tabs,
    // so either permission grants access (tabs are gated individually)
    '/users': ['users.view', 'customers.view'],
    '/customers': ['customers.view'],
    '/analytics': ['analytics.view'],
    // Unified logs page: Admin actions + App activity tabs
    '/logs': ['admin_logs.view', 'app_logs.view'],
    '/content': ['content.view'],
    '/reviews': ['reviews.view'],
    '/settings': ['settings.view'],
}

/** Check if a user can access a given route path */
export function canAccessRoute(
    path: string,
    userPermissions: string[],
    userRole?: string,
): boolean {
    if (userRole === 'owner') return true

    // Find matching route permission entry
    const matchedKey = Object.keys(ROUTE_PERMISSIONS).find(
        (key) => path === key || path.startsWith(key + '/'),
    )
    if (!matchedKey) return true // No restriction defined → allow
    return hasAnyPermission(userPermissions, ROUTE_PERMISSIONS[matchedKey], userRole)
}

// ─── Sidebar Navigation Permission Map ───
// Maps sidebar href to required permissions (nav items are hidden if user lacks ANY)
export const NAV_PERMISSIONS: Record<string, string[]> = {
    '/dashboard': ['dashboard.view'],
    '/products': ['products.view', 'products.manage'],
    '/categories': ['categories.view', 'categories.manage'],
    '/promotions': ['promotions.view', 'promotions.manage'],
    '/promo-codes': ['promo_codes.view', 'promo_codes.manage'],
    '/orders': ['orders.view', 'orders.manage'],
    '/refunds': ['refunds.view', 'refunds.manage'],
    '/delivery-zones': ['delivery_zones.view', 'delivery_zones.manage'],
    '/support': ['support.view', 'support.manage'],
    '/users': ['users.view', 'users.manage', 'customers.view', 'customers.manage'],
    '/analytics': ['analytics.view', 'analytics.manage'],
    '/logs': ['admin_logs.view', 'app_logs.view'],
    '/content': ['content.view', 'content.manage'],
    '/reviews': ['reviews.view', 'reviews.manage'],
    '/settings': ['settings.view', 'settings.manage'],
}

/**
 * Returns the best landing page for a user after login / when redirected.
 * Priority order mirrors the sidebar nav order.
 */
export function getDefaultRoute(
    userPermissions: string[],
    userRole?: string,
): string {
    if (userRole === 'owner') return '/dashboard'

    // Priority-ordered list: first accessible page wins
    const candidates = [
        '/dashboard',
        '/orders',
        '/products',
        '/support',
        '/users',
        '/refunds',
        '/analytics',
        '/settings',
        '/reviews',
        '/content',
        '/delivery-zones',
        '/categories',
        '/promotions',
        '/promo-codes',
        '/logs',
    ]

    for (const route of candidates) {
        const required = ROUTE_PERMISSIONS[route]
        if (!required) continue
        if (hasAnyPermission(userPermissions, required, userRole)) return route
    }

    // No accessible page (role has zero permissions). Send to the explicit
    // no-access screen — redirecting an authenticated user to /login used
    // to bounce them straight back here, looping forever.
    return '/no-access'
}
