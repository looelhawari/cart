import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { promotionService } from '@/services/promotion.service'
import { productService } from '@/services/product.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Package, ShoppingCart, DollarSign, TrendingUp, Clock,
    CheckCircle, Truck, Users, BarChart3, Activity, AlertCircle,
    ArrowUpRight, Tag, Gift, Percent, FileText, AlertTriangle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, AreaChart, Area
} from 'recharts'
import { exportDashboardPDF } from '@/lib/pdf-export'
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    // Fetch comprehensive data for analytics
    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['admin-orders-analytics'],
        queryFn: async () => {
            const response = await apiClient.get('/admin/orders', { per_page: 100 }) as any
            return response
        },
    })

    const { data: productsData } = useQuery({
        queryKey: ['admin-products-analytics'],
        queryFn: async () => {
            const response = await apiClient.get('/admin/products', { per_page: 100 }) as any
            return response
        },
    })

    const { data: promotionsData } = useQuery({
        queryKey: ['promotions-summary-analytics'],
        queryFn: async () => {
            const response = await promotionService.getSummaryAnalytics()
            return response
        },
    })

    const { data: stockAlertsData } = useQuery({
        queryKey: ['stock-alerts'],
        queryFn: () => productService.getStockAlerts(10),
    })

    const summary = ordersData?.summary || {}
    const orders = ordersData?.data || []
    const products = productsData?.data || []

    // ============ CALCULATIONS ============
    const totalOrders = summary.total_orders || 0
    const totalRevenue = summary.total_revenue || 0
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Unique customers
    const uniqueCustomers = new Set(orders.map((o: any) => o.user_id)).size

    // Chart Data Preparations
    // 1. Order Status Distribution (Pie Chart)
    const statusData = [
        { name: t('orders.status.pending'), value: summary.pending_count || 0, color: '#FFA500' },
        { name: t('orders.status.confirmed'), value: summary.confirmed_count || 0, color: '#2196F3' },
        { name: t('orders.status.preparing'), value: summary.preparing_count || 0, color: '#FF9800' },
        { name: t('orders.status.outForDelivery'), value: summary.out_for_delivery_count || 0, color: '#9C27B0' },
        { name: t('orders.status.delivered'), value: summary.delivered_count || 0, color: '#4CAF50' },
        { name: t('orders.status.cancelled'), value: summary.cancelled_count || 0, color: '#F44336' },
    ].filter(item => item.value > 0)

    // 2. Last 7 Days Trend (Area Chart)
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        const dayOrders = orders.filter((o: any) => o.created_at?.startsWith(dateStr))
        return {
            date: date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
            orders: dayOrders.length,
            revenue: dayOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0),
            customers: new Set(dayOrders.map((o: any) => o.user_id)).size,
        }
    })

    // 3. Payment Methods (Pie Chart)
    const paymentMethods = [
        { name: t('orders.paymentMethods.cashOnDelivery'), value: orders.filter((o: any) => o.payment_method === 'cash_on_delivery').length, color: '#4CAF50' },
        { name: t('orders.paymentMethods.card'), value: orders.filter((o: any) => o.payment_method === 'card').length, color: '#2196F3' },
        { name: t('orders.paymentMethods.wallet'), value: orders.filter((o: any) => o.payment_method === 'wallet').length, color: '#9C27B0' },
    ].filter(item => item.value > 0)

    // 4. Revenue by Payment Status (Bar Chart)
    const revenueByStatus = [
        {
            status: t('orders.paymentStatus.completed'),
            revenue: orders.filter((o: any) => o.payment_status === 'completed')
                .reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0),
            color: '#4CAF50'
        },
        {
            status: t('orders.paymentStatus.pending'),
            revenue: orders.filter((o: any) => o.payment_status === 'pending')
                .reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0),
            color: '#FFA500'
        },
        {
            status: t('orders.paymentStatus.failed'),
            revenue: orders.filter((o: any) => o.payment_status === 'failed')
                .reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0),
            color: '#F44336'
        },
    ]

    // 5. Top Selling Products (from order items)
    const productSales = new Map<string, { name: string; revenue: number; quantity: number }>()
    orders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
            const key = item.product_name || 'Unknown'
            const existing = productSales.get(key) || { name: key, revenue: 0, quantity: 0 }
            productSales.set(key, {
                name: key,
                revenue: existing.revenue + parseFloat(item.subtotal || 0),
                quantity: existing.quantity + parseInt(item.quantity || 0)
            })
        })
    })
    const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8)
        .map(p => ({ ...p, name: p.name.substring(0, 20) }))

    // 6. Product Stock Health (Bar Chart)
    const stockHealth = products.slice(0, 10).map((p: any) => ({
        name: (p.name_en?.substring(0, 12) || 'Product'),
        current: p.stock_quantity || 0,
        threshold: p.low_stock_threshold || 10,
    }))

    // 7. Hourly Orders Distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const hourOrders = orders.filter((o: any) => {
            const orderHour = new Date(o.created_at).getHours()
            return orderHour === hour
        })
        return {
            hour: `${hour}:00`,
            orders: hourOrders.length
        }
    }).filter(h => h.orders > 0)

    // 8. Performance Metrics
    const completionRate = totalOrders > 0 ? ((summary.delivered || 0) / totalOrders) * 100 : 0
    const cancellationRate = totalOrders > 0 ? ((summary.cancelled || 0) / totalOrders) * 100 : 0
    const avgItemsPerOrder = orders.length > 0
        ? orders.reduce((sum: number, o: any) => sum + (o.items?.length || 0), 0) / orders.length
        : 0

    // Export to PDF handler
    const handleExportPDF = () => {
        try {
            exportDashboardPDF({
                totalRevenue,
                totalOrders,
                avgOrderValue,
                uniqueCustomers,
                completionRate,
                cancellationRate,
                avgItemsPerOrder,
                summary,
                statusData,
                last7Days,
                paymentMethods,
                revenueByStatus,
                topProducts,
                stockHealth,
                promotionsData: promotionsData || undefined
            })
        } catch (error) {
            console.error('PDF export failed:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-elbaraka-primary"></div>
                    <p className="mt-4 text-lg text-muted-foreground">{t('common.loading')}...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className={`text-4xl font-bold text-elbaraka-primary flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <BarChart3 className="h-10 w-10" />
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {t('dashboard.subtitle')}
                    </p>
                </div>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                        onClick={handleExportPDF}
                        className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                    >
                        <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('common.exportPDF')}
                    </Button>
                    <div className={`text-sm text-muted-foreground ${isRTL ? 'text-left' : 'text-right'}`}>
                        <p>{t('common.lastUpdated')}: {new Date().toLocaleString(locale)}</p>
                        <p>{t('dashboard.dataRange')}</p>
                    </div>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className={`${isRTL ? 'border-r-4 border-r-green-500 border-l-0' : 'border-l-4 border-l-green-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('dashboard.totalRevenue')}
                        </CardTitle>
                        <DollarSign className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                            {formatCurrency(totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.delivered || 0} {t('dashboard.completedOrders')}
                        </p>
                        <div className={`flex items-center mt-2 text-xs text-green-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <TrendingUp className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            <span>{t('common.from')} {totalOrders} {t('dashboard.totalOrders').toLowerCase()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isRTL ? 'border-r-4 border-r-blue-500 border-l-0' : 'border-l-4 border-l-blue-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('dashboard.totalOrders')}
                        </CardTitle>
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{totalOrders}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {uniqueCustomers} {t('dashboard.uniqueCustomers')}
                        </p>
                        <div className={`flex items-center mt-2 text-xs text-blue-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Activity className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            <span>{completionRate.toFixed(1)}% {t('dashboard.completionRate')}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isRTL ? 'border-r-4 border-r-purple-500 border-l-0' : 'border-l-4 border-l-purple-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('dashboard.avgOrderValue')}
                        </CardTitle>
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            {formatCurrency(avgOrderValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {avgItemsPerOrder.toFixed(1)} {t('dashboard.itemsPerOrder')}
                        </p>
                        <div className={`flex items-center mt-2 text-xs text-purple-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Package className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            <span>{t('dashboard.averageTransaction')}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`${isRTL ? 'border-r-4 border-r-orange-500 border-l-0' : 'border-l-4 border-l-orange-500'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('dashboard.activeOrders')}
                        </CardTitle>
                        <Clock className="h-5 w-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                            {(summary.preparing_count || 0) + (summary.out_for_delivery_count || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.pending_count || 0} {t('dashboard.pendingConfirmation')}
                        </p>
                        <div className={`flex items-center mt-2 text-xs text-orange-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Truck className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            <span>{t('dashboard.inProgress')}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Promotions Overview */}
            {promotionsData && (
                <div className="grid gap-6 md:grid-cols-4">
                    <Card className={`${isRTL ? 'border-r-4 border-r-pink-500 border-l-0' : 'border-l-4 border-l-pink-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.activePromotions')}
                            </CardTitle>
                            <Tag className="h-5 w-5 text-pink-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-pink-600">
                                {promotionsData.active_promotions || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {promotionsData.total_promotions || 0} {t('dashboard.totalPromotions')}
                            </p>
                            <div className={`flex items-center mt-2 text-xs text-pink-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Activity className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                <span>{promotionsData.scheduled_promotions || 0} {t('dashboard.scheduled')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${isRTL ? 'border-r-4 border-r-yellow-500 border-l-0' : 'border-l-4 border-l-yellow-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.productsOnSale')}
                            </CardTitle>
                            <Gift className="h-5 w-5 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-600">
                                {promotionsData.products_on_sale || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('dashboard.currentlyDiscounted')}
                            </p>
                            <div className={`flex items-center mt-2 text-xs text-yellow-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Percent className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                <span>{t('dashboard.specialOffersActive')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${isRTL ? 'border-r-4 border-r-indigo-500 border-l-0' : 'border-l-4 border-l-indigo-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.totalDiscounts')}
                            </CardTitle>
                            <DollarSign className="h-5 w-5 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-600">
                                {formatCurrency(promotionsData.total_discount_given || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('dashboard.potentialSavings')}
                            </p>
                            <div className={`flex items-center mt-2 text-xs text-indigo-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <TrendingUp className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                <span>{t('dashboard.customerSavings')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${isRTL ? 'border-r-4 border-r-teal-500 border-l-0' : 'border-l-4 border-l-teal-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.featuredPromotion')}
                            </CardTitle>
                            <Tag className="h-5 w-5 text-teal-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold text-teal-600">
                                {promotionsData.featured_promotion?.title || t('common.none')}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {promotionsData.featured_promotion
                                    ? `${promotionsData.featured_promotion.discount_value}${promotionsData.featured_promotion.discount_type === 'percentage' ? '%' : ` ${t('common.egp')}`} ${t('common.off')}`
                                    : t('dashboard.noFeaturedPromotion')
                                }
                            </p>
                            <div className={`flex items-center mt-2 text-xs text-teal-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <ArrowUpRight className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                <span>{t('dashboard.homepageBanner')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Stock Alerts Section */}
            {stockAlertsData && (stockAlertsData.out_of_stock?.count > 0 || stockAlertsData.low_stock?.count > 0) && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className={`${isRTL ? 'border-r-4 border-r-red-500 border-l-0' : 'border-l-4 border-l-red-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.outOfStock')}
                            </CardTitle>
                            <AlertCircle className="h-5 w-5 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-600">
                                {stockAlertsData.out_of_stock?.count || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('dashboard.productsOutOfStock')}
                            </p>
                            {stockAlertsData.out_of_stock?.products?.slice(0, 3).map((p: any) => (
                                <div key={p.barcode} className="text-xs text-red-600 mt-1 truncate">
                                    • {isRTL ? p.name_ar : p.name_en}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className={`${isRTL ? 'border-r-4 border-r-yellow-500 border-l-0' : 'border-l-4 border-l-yellow-500'}`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('dashboard.lowStock')}
                            </CardTitle>
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-600">
                                {stockAlertsData.low_stock?.count || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('dashboard.productsLowStock')}
                            </p>
                            {stockAlertsData.low_stock?.products?.slice(0, 3).map((p: any) => (
                                <div key={p.barcode} className="text-xs text-yellow-600 mt-1 truncate">
                                    • {isRTL ? p.name_ar : p.name_en} ({p.stock_quantity} {t('products.left')})
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Order Status Overview */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="pt-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm font-medium text-orange-700">{t('orders.status.preparing')}</p>
                                <p className="text-3xl font-bold text-orange-600 mt-2">
                                    {summary.preparing_count || 0}
                                </p>
                            </div>
                            <Package className="h-10 w-10 text-orange-500 opacity-60" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="pt-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm font-medium text-purple-700">{t('orders.status.outForDelivery')}</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">
                                    {summary.out_for_delivery_count || 0}
                                </p>
                            </div>
                            <Truck className="h-10 w-10 text-purple-500 opacity-60" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="pt-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm font-medium text-green-700">{t('orders.status.delivered')}</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">
                                    {summary.delivered_count || 0}
                                </p>
                            </div>
                            <CheckCircle className="h-10 w-10 text-green-500 opacity-60" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <CardContent className="pt-6">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm font-medium text-red-700">{t('orders.status.cancelled')}</p>
                                <p className="text-3xl font-bold text-red-600 mt-2">
                                    {summary.cancelled_count || 0}
                                </p>
                            </div>
                            <AlertCircle className="h-10 w-10 text-red-500 opacity-60" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1: Trends & Distribution */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* 7-Day Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <TrendingUp className="h-5 w-5" />
                            {t('dashboard.charts.revenueOrdersTrend')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={last7Days}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#4CAF50" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (EGP)" />
                                <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#2196F3" fillOpacity={1} fill="url(#colorOrders)" name="Orders" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {t('dashboard.charts.orderStatusDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2: Payment & Revenue Analysis */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Payment Methods */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <DollarSign className="h-5 w-5" />
                            {t('dashboard.charts.paymentMethodDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {paymentMethods.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Revenue by Payment Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <BarChart3 className="h-5 w-5" />
                            {t('dashboard.charts.revenueByPaymentStatus')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueByStatus}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Legend />
                                <Bar dataKey="revenue" name="Revenue (EGP)" radius={[8, 8, 0, 0]}>
                                    {revenueByStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 3: Products & Stock */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Package className="h-5 w-5" />
                            {t('dashboard.charts.topSellingProducts')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={120} />
                                <Tooltip
                                    formatter={(value, name) => {
                                        if (name === 'Revenue (EGP)') return formatCurrency(Number(value))
                                        return value
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="#4CAF50" name="Revenue (EGP)" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="quantity" fill="#2196F3" name="Quantity Sold" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Stock Health */}
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Activity className="h-5 w-5" />
                            {t('dashboard.charts.productStockLevels')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stockHealth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="current" fill="#4CAF50" name="Current Stock" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="threshold" fill="#FFA500" name="Low Stock Threshold" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('dashboard.completionRate')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <div className="text-4xl font-bold text-green-600">
                                    {completionRate.toFixed(1)}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {summary.delivered || 0} {t('common.of')} {totalOrders} {t('orders.title').toLowerCase()}
                                </p>
                            </div>
                            <CheckCircle className="h-16 w-16 text-green-500 opacity-20" />
                        </div>
                        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('dashboard.cancellationRate')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <div className="text-4xl font-bold text-red-600">
                                    {cancellationRate.toFixed(1)}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {summary.cancelled || 0} {t('common.of')} {totalOrders} {t('orders.title').toLowerCase()}
                                </p>
                            </div>
                            <AlertCircle className="h-16 w-16 text-red-500 opacity-20" />
                        </div>
                        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-500"
                                style={{ width: `${cancellationRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{t('dashboard.customerRetention')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <div className="text-4xl font-bold text-blue-600">
                                    {uniqueCustomers}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('dashboard.uniqueCustomers')}
                                </p>
                            </div>
                            <Users className="h-16 w-16 text-blue-500 opacity-20" />
                        </div>
                        <div className={`mt-4 flex items-center text-sm text-blue-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <ArrowUpRight className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                            <span>{(totalOrders / Math.max(uniqueCustomers, 1)).toFixed(1)} {t('dashboard.ordersPerCustomer')}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hourly Distribution */}
            {hourlyDistribution.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Clock className="h-5 w-5" />
                            {t('dashboard.charts.hourlyOrderDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={hourlyDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="orders" stroke="#2196F3" strokeWidth={2} name="Orders" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
