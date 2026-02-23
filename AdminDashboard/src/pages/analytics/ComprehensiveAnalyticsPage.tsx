import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { comprehensiveAnalyticsService } from '@/services/comprehensive-analytics.service'
import type {
    SalesAnalyticsResponse,
    ProductAnalyticsResponse,
    OrderAnalyticsResponse,
    MarketingAnalyticsResponse,
    FinancialAnalyticsResponse,
    InventoryAnalyticsResponse,
    OperationalAnalyticsResponse,
} from '@/services/comprehensive-analytics.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    TrendingUp, DollarSign, ShoppingCart, Users, Package,
    BarChart3, PieChart as PieChartIcon, Activity, AlertTriangle, CheckCircle,
    XCircle, Clock, Truck, Tag, Gift, Percent, Download, RefreshCw,
    ArrowUpRight, ArrowDownRight, FileText, Box, Target,
    Star, ShoppingBag, CreditCard, AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
    Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    ComposedChart,
} from 'recharts'
import { format, subDays } from 'date-fns'

// Color palette
const COLORS = {
    primary: '#16a34a',
    secondary: '#2563eb',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#22c55e',
    purple: '#8b5cf6',
    pink: '#ec4899',
    cyan: '#06b6d4',
    orange: '#f97316',
    gray: '#6b7280',
}

const CHART_COLORS = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.warning,
    COLORS.purple,
    COLORS.pink,
    COLORS.cyan,
    COLORS.orange,
    COLORS.danger,
]

// Metric Card Component
function MetricCard({
    title,
    value,
    change,
    changeLabel = 'vs previous period',
    icon: Icon,
    trend,
    color = 'green',
    subtitle,
}: {
    title: string
    value: string | number
    change?: number
    changeLabel?: string
    icon: any
    trend?: 'up' | 'down' | 'neutral'
    color?: string
    subtitle?: string
}) {
    const colorClasses = {
        green: 'bg-green-100 text-green-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
        cyan: 'bg-cyan-100 text-cyan-600',
    }

    const actualTrend = trend || (change !== undefined ? (change >= 0 ? 'up' : 'down') : 'neutral')

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                        {change !== undefined && (
                            <div className="flex items-center gap-1">
                                {actualTrend === 'up' ? (
                                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                                ) : actualTrend === 'down' ? (
                                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                                ) : null}
                                <span
                                    className={`text-sm font-medium ${actualTrend === 'up' ? 'text-green-500' : actualTrend === 'down' ? 'text-red-500' : 'text-gray-500'
                                        }`}
                                >
                                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">{changeLabel}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.green}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { color: string; icon: any }> = {
        pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
        confirmed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
        preparing: { color: 'bg-orange-100 text-orange-700', icon: Package },
        out_for_delivery: { color: 'bg-purple-100 text-purple-700', icon: Truck },
        delivered: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
        cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', icon: Clock }
    const IconComponent = config.icon

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            <IconComponent className="h-3 w-3" />
            {status.replace(/_/g, ' ')}
        </span>
    )
}

export default function ComprehensiveAnalyticsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [activeTab, setActiveTab] = useState('overview')
    const [dateRange, setDateRange] = useState({
        from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd'),
    })
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily')

    const filters = useMemo(() => ({
        from_date: dateRange.from,
        to_date: dateRange.to,
        granularity,
        compare: true,
    }), [dateRange, granularity])

    // Queries with error handling
    const { data: overviewData, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
        queryKey: ['analytics-overview', filters],
        queryFn: () => comprehensiveAnalyticsService.getOverview(filters),
        staleTime: 60000,
        retry: 1,
    })

    const { data: salesData, isLoading: loadingSales, error: errorSales } = useQuery({
        queryKey: ['analytics-sales', filters],
        queryFn: () => comprehensiveAnalyticsService.getSalesAnalytics(filters),
        enabled: activeTab === 'sales' || activeTab === 'overview',
        staleTime: 60000,
        retry: 1,
    })

    const { data: productData, isLoading: loadingProducts, error: errorProducts } = useQuery({
        queryKey: ['analytics-products', filters],
        queryFn: () => comprehensiveAnalyticsService.getProductAnalytics(filters),
        enabled: activeTab === 'products' || activeTab === 'inventory' || activeTab === 'overview',
        staleTime: 60000,
        retry: 1,
    })

    const { data: orderData, isLoading: loadingOrders, error: errorOrders } = useQuery({
        queryKey: ['analytics-orders', filters],
        queryFn: () => comprehensiveAnalyticsService.getOrderAnalytics(filters),
        enabled: activeTab === 'orders' || activeTab === 'overview',
        staleTime: 60000,
        retry: 1,
    })

    const { data: marketingData, isLoading: loadingMarketing, error: errorMarketing } = useQuery({
        queryKey: ['analytics-marketing', filters],
        queryFn: () => comprehensiveAnalyticsService.getMarketingAnalytics(filters),
        enabled: activeTab === 'marketing',
        staleTime: 60000,
        retry: 1,
    })

    const { data: financialData, isLoading: loadingFinancial, error: errorFinancial } = useQuery({
        queryKey: ['analytics-financial', filters],
        queryFn: () => comprehensiveAnalyticsService.getFinancialAnalytics(filters),
        enabled: activeTab === 'financial',
        staleTime: 60000,
        retry: 1,
    })

    const { data: inventoryData, isLoading: loadingInventory, error: errorInventory } = useQuery({
        queryKey: ['analytics-inventory', filters],
        queryFn: () => comprehensiveAnalyticsService.getInventoryAnalytics(filters),
        enabled: activeTab === 'inventory',
        staleTime: 60000,
        retry: 1,
    })

    const { data: operationalData, isLoading: loadingOperational, error: errorOperational } = useQuery({
        queryKey: ['analytics-operational', filters],
        queryFn: () => comprehensiveAnalyticsService.getOperationalAnalytics(filters),
        enabled: activeTab === 'operational',
        staleTime: 60000,
        retry: 1,
    })

    const handleRefresh = () => {
        refetchOverview()
    }

    const handleExport = async (type: string) => {
        try {
            const blob = await comprehensiveAnalyticsService.exportAnalytics(type, 'csv', filters)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `analytics-${type}-${dateRange.from}-to-${dateRange.to}.csv`
            a.click()
        } catch (error) {
            console.error('Export failed:', error)
        }
    }

    const setQuickDateRange = (days: number) => {
        setDateRange({
            from: format(subDays(new Date(), days), 'yyyy-MM-dd'),
            to: format(new Date(), 'yyyy-MM-dd'),
        })
    }

    return (
        <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('analytics.analyticsDashboard')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t('analytics.analyticsSubtitle')}
                    </p>
                </div>
                <div className={`flex flex-wrap items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Quick Date Filters */}
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                            {t('analytics.days7')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                            {t('analytics.days30')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                            {t('analytics.days90')}
                        </Button>
                    </div>

                    {/* Date Range Inputs */}
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="w-36"
                        />
                        <span className="text-muted-foreground">{t('common.to')}</span>
                        <Input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="w-36"
                        />
                    </div>

                    {/* Granularity */}
                    <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">{t('analytics.daily')}</SelectItem>
                            <SelectItem value="weekly">{t('analytics.weekly')}</SelectItem>
                            <SelectItem value="monthly">{t('analytics.monthly')}</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Actions */}
                    <Button variant="outline" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => handleExport(activeTab)}>
                        <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('analytics.export')}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg h-auto">
                    <TabsTrigger value="overview" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <BarChart3 className="h-4 w-4" /> {t('analytics.overview')}
                    </TabsTrigger>
                    <TabsTrigger value="sales" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <DollarSign className="h-4 w-4" /> {t('analytics.sales')}
                    </TabsTrigger>
                    <TabsTrigger value="products" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Package className="h-4 w-4" /> {t('analytics.products')}
                    </TabsTrigger>
                    <TabsTrigger value="orders" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <ShoppingCart className="h-4 w-4" /> {t('analytics.ordersTab')}
                    </TabsTrigger>
                    <TabsTrigger value="marketing" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Tag className="h-4 w-4" /> {t('analytics.marketing')}
                    </TabsTrigger>
                    <TabsTrigger value="financial" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CreditCard className="h-4 w-4" /> {t('analytics.financial')}
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Box className="h-4 w-4" /> {t('analytics.inventory')}
                    </TabsTrigger>
                    <TabsTrigger value="operational" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Activity className="h-4 w-4" /> {t('analytics.operations')}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {loadingOverview ? (
                        <div className="flex items-center justify-center h-64">
                            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : overviewData ? (
                        <>
                            {/* Key Metrics */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                                <MetricCard
                                    title={t('analytics.totalRevenue')}
                                    value={formatCurrency(overviewData.current_period.metrics.total_revenue)}
                                    change={overviewData.growth_rates?.revenue_growth}
                                    icon={DollarSign}
                                    color="green"
                                />
                                <MetricCard
                                    title={t('analytics.netRevenue')}
                                    value={formatCurrency(overviewData.current_period.metrics.net_revenue)}
                                    icon={TrendingUp}
                                    color="blue"
                                    subtitle={t('analytics.afterDiscounts')}
                                />
                                <MetricCard
                                    title={t('analytics.grossProfit')}
                                    value={formatCurrency(overviewData.current_period.metrics.gross_profit)}
                                    change={overviewData.growth_rates?.profit_growth}
                                    icon={Target}
                                    color="purple"
                                />
                                <MetricCard
                                    title={t('analytics.totalOrders')}
                                    value={overviewData.current_period.metrics.total_orders.toLocaleString()}
                                    change={overviewData.growth_rates?.orders_growth}
                                    icon={ShoppingCart}
                                    color="orange"
                                />
                                <MetricCard
                                    title={t('analytics.avgOrderValue')}
                                    value={formatCurrency(overviewData.current_period.metrics.avg_order_value)}
                                    change={overviewData.growth_rates?.aov_growth}
                                    icon={ShoppingBag}
                                    color="cyan"
                                />
                                <MetricCard
                                    title={t('analytics.activeCustomers')}
                                    value={overviewData.current_period.metrics.active_customers.toLocaleString()}
                                    change={overviewData.growth_rates?.customers_growth}
                                    icon={Users}
                                    color="green"
                                />
                            </div>

                            {/* Secondary Metrics */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <MetricCard
                                    title={t('analytics.grossMargin')}
                                    value={`${overviewData.current_period.metrics.gross_margin.toFixed(1)}%`}
                                    icon={Percent}
                                    color="green"
                                />
                                <MetricCard
                                    title={t('analytics.itemsSold')}
                                    value={overviewData.current_period.metrics.items_sold.toLocaleString()}
                                    icon={Package}
                                    color="blue"
                                />
                                <MetricCard
                                    title={t('analytics.newCustomers')}
                                    value={overviewData.current_period.metrics.new_customers.toLocaleString()}
                                    icon={Users}
                                    color="purple"
                                />
                                <MetricCard
                                    title={t('analytics.totalDiscounts')}
                                    value={formatCurrency(overviewData.current_period.metrics.total_discounts)}
                                    icon={Tag}
                                    color="orange"
                                />
                            </div>

                            {/* Charts Row */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Revenue Trend */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <TrendingUp className="h-5 w-5 text-green-600" />
                                            {t('analytics.revenueTrend')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={salesData?.revenue_trend || []}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip
                                                    formatter={(value: number) => formatCurrency(value)}
                                                    labelFormatter={(label) => `${t('analytics.date')}: ${label}`}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke={COLORS.primary}
                                                    strokeWidth={2}
                                                    fill="url(#colorRevenue)"
                                                    name={t('analytics.revenue')}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="orders"
                                                    stroke={COLORS.secondary}
                                                    strokeWidth={2}
                                                    dot={false}
                                                    yAxisId="right"
                                                    name={t('analytics.ordersTab')}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Order Status Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <PieChartIcon className="h-5 w-5 text-blue-600" />
                                            {t('analytics.orderStatusDistribution')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={Object.entries(overviewData.current_period.metrics.status_breakdown || {}).map(([status, count]) => ({
                                                        name: status.replace(/_/g, ' '),
                                                        value: count as number,
                                                    }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                >
                                                    {Object.keys(overviewData.current_period.metrics.status_breakdown || {}).map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Payment & Category Charts */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Payment Method Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <CreditCard className="h-5 w-5 text-purple-600" />
                                            {t('analytics.revenueByPaymentMethod')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={overviewData.current_period.metrics.payment_breakdown} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                                                <YAxis dataKey="payment_method" type="category" width={120} />
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                                <Bar dataKey="revenue" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                                                    {overviewData.current_period.metrics.payment_breakdown.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Category Revenue */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Package className="h-5 w-5 text-orange-600" />
                                            {t('analytics.revenueByCategory')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={salesData?.revenue_by_category?.slice(0, 8) || []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                                <Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                                                    {salesData?.revenue_by_category?.slice(0, 8).map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Products & Stock Alerts */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                {/* Top Products */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Star className="h-5 w-5 text-yellow-500" />
                                            {t('analytics.topProducts')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {salesData?.top_products?.slice(0, 6).map((product, index) => (
                                                <div key={product.barcode} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                    {product.image && (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            className="w-10 h-10 rounded object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {product.quantity_sold} {t('analytics.sold')}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold text-green-600">
                                                        {formatCurrency(product.revenue)}
                                                    </p>
                                                </div>
                                            )) || <p className="text-muted-foreground text-sm">{t('analytics.noSalesDataYet')}</p>}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Stock Alerts */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                                            {t('analytics.stockAlerts')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {productData?.stock_alerts?.low_stock?.slice(0, 5).map((product) => (
                                                <div key={product.barcode} className={`flex items-center justify-between p-2 bg-yellow-50 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-sm font-medium truncate flex-1">{product.name}</span>
                                                    <Badge variant="outline" className="text-yellow-700">{product.stock_quantity} {t('analytics.left')}</Badge>
                                                </div>
                                            ))}
                                            {productData?.stock_alerts?.out_of_stock?.slice(0, 3).map((product) => (
                                                <div key={product.barcode} className={`flex items-center justify-between p-2 bg-red-50 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-sm font-medium truncate flex-1">{product.name}</span>
                                                    <Badge variant="destructive">{t('analytics.outOfStock')}</Badge>
                                                </div>
                                            ))}
                                            {(!productData?.stock_alerts?.low_stock?.length && !productData?.stock_alerts?.out_of_stock?.length) && (
                                                <p className="text-muted-foreground text-sm">{t('analytics.allProductsWellStocked')}</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : null}
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="space-y-6">
                    <SalesTabContent data={salesData} loading={loadingSales} error={errorSales} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Products Tab */}
                <TabsContent value="products" className="space-y-6">
                    <ProductsTabContent data={productData} loading={loadingProducts} error={errorProducts} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="space-y-6">
                    <OrdersTabContent data={orderData} loading={loadingOrders} error={errorOrders} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Marketing Tab */}
                <TabsContent value="marketing" className="space-y-6">
                    <MarketingTabContent data={marketingData} loading={loadingMarketing} error={errorMarketing} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Financial Tab */}
                <TabsContent value="financial" className="space-y-6">
                    <FinancialTabContent data={financialData} loading={loadingFinancial} error={errorFinancial} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-6">
                    <InventoryTabContent data={inventoryData} loading={loadingInventory} error={errorInventory} t={t} isRTL={isRTL} />
                </TabsContent>

                {/* Operational Tab */}
                <TabsContent value="operational" className="space-y-6">
                    <OperationalTabContent data={operationalData} loading={loadingOperational} error={errorOperational} t={t} isRTL={isRTL} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Sales Tab Component
function SalesTabContent({ data, loading, error, t, isRTL }: { data?: SalesAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Revenue Trend Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.revenueTrend')}</CardTitle>
                    <CardDescription>{t('analytics.revenueTrendDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={data.revenue_trend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(v)} />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip formatter={(value: number, name) =>
                                name === t('analytics.ordersTab') ? value : formatCurrency(value)
                            } />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" fill={COLORS.primary} fillOpacity={0.2} stroke={COLORS.primary} strokeWidth={2} name={t('analytics.revenue')} />
                            <Line yAxisId="left" type="monotone" dataKey="net_revenue" stroke={COLORS.secondary} strokeWidth={2} name={t('analytics.netRevenue')} dot={false} />
                            <Bar yAxisId="right" dataKey="orders" fill={COLORS.warning} name={t('analytics.ordersTab')} opacity={0.6} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Hourly Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.peakHours')}</CardTitle>
                        <CardDescription>{t('analytics.peakHoursDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.hourly_distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                                <YAxis />
                                <Tooltip formatter={(value: number) => value.toLocaleString()} labelFormatter={(h) => `${h}:00`} />
                                <Bar dataKey="orders" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Day of Week Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.weeklyPattern')}</CardTitle>
                        <CardDescription>{t('analytics.weeklyPatternDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.day_of_week_distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day_name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="orders" fill={COLORS.secondary} name={t('analytics.ordersTab')} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="revenue" fill={COLORS.primary} name={t('analytics.revenue')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.topRevenueProducts')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>#</th>
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.product')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.qtySold')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.revenue')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.top_products.map((product, index) => (
                                    <tr key={product.barcode} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{index + 1}</td>
                                        <td className="p-3">
                                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                {product.image && (
                                                    <img src={product.image} alt="" className="w-10 h-10 rounded object-cover" />
                                                )}
                                                <span className="font-medium">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>{product.quantity_sold}</td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'} font-semibold text-green-600`}>{formatCurrency(product.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

// Products Tab Component
function ProductsTabContent({ data, loading, error, t, isRTL }: { data?: ProductAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Inventory Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={t('analytics.totalProducts')} value={data.inventory.total_products.toLocaleString()} icon={Package} color="blue" />
                <MetricCard title={t('analytics.totalUnits')} value={data.inventory.total_units.toLocaleString()} icon={Box} color="green" />
                <MetricCard title={t('analytics.retailValue')} value={formatCurrency(data.inventory.retail_value)} icon={DollarSign} color="purple" />
                <MetricCard title={t('analytics.costValue')} value={formatCurrency(data.inventory.cost_value)} icon={Tag} color="orange" />
            </div>

            {/* Stock Alerts */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 text-yellow-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <AlertTriangle className="h-5 w-5" />
                            {t('analytics.lowStock')} ({data.stock_alerts.low_stock_count})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {data.stock_alerts.low_stock.slice(0, 5).map((product) => (
                                <div key={product.barcode} className={`flex items-center justify-between bg-white p-2 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-sm font-medium truncate flex-1">{product.name}</span>
                                    <Badge variant="outline" className="text-yellow-700">{product.stock_quantity} {t('analytics.left')}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                        <CardTitle className={`flex items-center gap-2 text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <XCircle className="h-5 w-5" />
                            {t('analytics.outOfStock')} ({data.stock_alerts.out_of_stock_count})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {data.stock_alerts.out_of_stock.slice(0, 5).map((product) => (
                                <div key={product.barcode} className={`flex items-center justify-between bg-white p-2 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-sm font-medium truncate flex-1">{product.name}</span>
                                    <Badge variant="destructive">{t('analytics.outOfStock')}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Best Sellers & Category Performance */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.bestSellers')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {data.best_sellers.slice(0, 10).map((product, index) => (
                                <div key={product.barcode} className={`flex items-center gap-3 p-2 bg-gray-50 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">{index + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.units_sold} {t('analytics.unitsSold')}</p>
                                    </div>
                                    <div className={isRTL ? 'text-left' : 'text-right'}>
                                        <p className="font-semibold text-green-600">{formatCurrency(product.revenue)}</p>
                                        <p className="text-xs text-muted-foreground">{t('analytics.profit')}: {formatCurrency(product.profit)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.categoryPerformance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.category_performance.slice(0, 8)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Bar dataKey="revenue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

// Orders Tab Component
function OrdersTabContent({ data, loading, error, t, isRTL }: { data?: OrderAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Order Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={t('analytics.totalOrders')} value={data.summary.total_orders.toLocaleString()} icon={ShoppingCart} color="blue" />
                <MetricCard title={t('analytics.delivered')} value={data.summary.delivered_orders.toLocaleString()} icon={CheckCircle} color="green" />
                <MetricCard title={t('analytics.cancelled')} value={data.summary.cancelled_orders.toLocaleString()} icon={XCircle} color="red" />
                <MetricCard title={t('analytics.deliverySuccessRate')} value={`${data.summary.delivery_success_rate}%`} icon={Truck} color="purple" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard title={t('analytics.cancellationRate')} value={`${data.summary.cancellation_rate}%`} icon={AlertTriangle} color="orange" />
                <MetricCard title={t('analytics.avgCompletionTime')} value={`${data.summary.avg_completion_hours} ${t('analytics.hrs')}`} icon={Clock} color="cyan" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.orderStatusBreakdown')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={data.status_breakdown}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="count"
                                    nameKey="status"
                                    label={({ status, count }) => `${status}: ${count}`}
                                >
                                    {data.status_breakdown.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Order Value Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.orderValueDistribution')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.order_value_distribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="value_bucket" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill={COLORS.secondary} name={t('analytics.ordersTab')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.recentOrders')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.orderNumber')}</th>
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.customer')}</th>
                                    <th className="text-center p-3">{t('analytics.status')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.items')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.total')}</th>
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_orders.slice(0, 10).map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono text-sm">{order.order_number}</td>
                                        <td className="p-3">
                                            <p className="font-medium">{order.user?.first_name} {order.user?.last_name}</p>
                                            <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                                        </td>
                                        <td className="p-3 text-center"><StatusBadge status={order.status} /></td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>{order.items?.length || 0}</td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'} font-semibold`}>{formatCurrency(order.total)}</td>
                                        <td className="p-3 text-sm">{formatDate(order.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

// Marketing Tab Component
function MarketingTabContent({ data, loading, error, t, isRTL }: { data?: MarketingAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Discount Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={t('analytics.totalDiscountsGiven')} value={formatCurrency(data.discounts_summary.total_discounts_given)} icon={Tag} color="orange" />
                <MetricCard title={t('analytics.ordersWithDiscount')} value={data.discounts_summary.orders_with_discount.toLocaleString()} icon={Percent} color="green" />
                <MetricCard title={t('analytics.ordersWithoutDiscount')} value={data.discounts_summary.orders_without_discount.toLocaleString()} icon={ShoppingCart} color="blue" />
                <MetricCard title={t('analytics.discountUsageRate')} value={`${data.discounts_summary.discount_usage_rate}%`} icon={Activity} color="purple" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard title={t('analytics.productsOnSale')} value={data.products_on_sale.toLocaleString()} icon={Gift} color="cyan" />
                <MetricCard title={t('analytics.discountedProductRevenue')} value={formatCurrency(data.discounted_product_revenue)} icon={DollarSign} color="green" />
            </div>

            {/* Promo Codes Performance */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.promoCodePerformance')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.code')}</th>
                                    <th className="text-center p-3">{t('analytics.type')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.value')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.used')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.limit')}</th>
                                    <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('analytics.redemptionRate')}</th>
                                    <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('analytics.validUntil')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.promo_codes.map((promo) => (
                                    <tr key={promo.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono font-medium">{promo.code}</td>
                                        <td className="p-3 text-center">
                                            <Badge variant="outline">{promo.type}</Badge>
                                        </td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                                            {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                                        </td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>{promo.used_count}</td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>{promo.usage_limit || '∞'}</td>
                                        <td className={`p-3 ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <Progress value={promo.redemption_rate} className="w-16 h-2" />
                                                <span className="text-sm">{promo.redemption_rate}%</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm">{formatDate(promo.valid_until)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Active Promotions */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.activePromotions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {data.active_promotions.map((promo) => (
                            <Card key={promo.id} className="border-2 border-green-200">
                                <CardContent className="p-4">
                                    <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div>
                                            <h4 className="font-semibold">{promo.title}</h4>
                                            <p className="text-2xl font-bold text-green-600 mt-1">
                                                {promo.discount_type === 'percentage' ? `${promo.discount_value}% ${t('analytics.off')}` : `${formatCurrency(promo.discount_value)} ${t('analytics.off')}`}
                                            </p>
                                        </div>
                                        {promo.is_featured && <Badge className="bg-yellow-500">{t('analytics.featured')}</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {t('analytics.validUntil')}: {formatDate(promo.end_date)}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

// Financial Tab Component
function FinancialTabContent({ data, loading, error, t, isRTL: _isRTL }: { data?: FinancialAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Revenue Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard title={t('analytics.grossRevenue')} value={formatCurrency(data.revenue.gross_revenue)} icon={DollarSign} color="green" />
                <MetricCard title={t('analytics.netRevenue')} value={formatCurrency(data.revenue.net_revenue)} icon={TrendingUp} color="blue" />
                <MetricCard title={t('analytics.totalDiscounts')} value={formatCurrency(data.revenue.total_discounts)} icon={Tag} color="orange" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <MetricCard title={t('analytics.costOfGoodsSold')} value={formatCurrency(data.profitability.cost_of_goods_sold)} icon={Package} color="red" />
                <MetricCard title={t('analytics.grossProfit')} value={formatCurrency(data.profitability.gross_profit)} icon={Target} color="green" />
                <MetricCard title={t('analytics.grossMargin')} value={`${data.profitability.gross_margin_percent.toFixed(1)}%`} icon={Percent} color="purple" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard title={t('analytics.deliveryFees')} value={formatCurrency(data.revenue.delivery_fees)} icon={Truck} color="blue" />
                <MetricCard title={t('analytics.refunds')} value={`${formatCurrency(data.refunds.total)} (${data.refunds.count})`} icon={AlertTriangle} color="red" />
            </div>

            {/* Revenue Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.dailyRevenueTrend')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={data.daily_revenue}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip formatter={(value: number, name) => name === t('analytics.ordersTab') ? value : formatCurrency(value)} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="revenue" fill={COLORS.primary} name={t('analytics.revenue')} opacity={0.8} />
                            <Line yAxisId="left" type="monotone" dataKey="net_revenue" stroke={COLORS.secondary} strokeWidth={2} name={t('analytics.netRevenue')} />
                            <Line yAxisId="right" type="monotone" dataKey="orders" stroke={COLORS.warning} strokeWidth={2} name={t('analytics.ordersTab')} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Revenue by Payment */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.revenueByPayment')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data.revenue_by_payment}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                dataKey="revenue"
                                nameKey="payment_method"
                                label={({ payment_method, percent }) => `${payment_method}: ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.revenue_by_payment.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </>
    )
}

// Inventory Tab Component
function InventoryTabContent({ data, loading, error, t, isRTL }: { data?: InventoryAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Stock Status */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={t('analytics.inStockProducts')} value={data.status.in_stock.toLocaleString()} icon={CheckCircle} color="green" />
                <MetricCard title={t('analytics.lowStock')} value={data.status.low_stock.toLocaleString()} icon={AlertTriangle} color="orange" />
                <MetricCard title={t('analytics.outOfStock')} value={data.status.out_of_stock.toLocaleString()} icon={XCircle} color="red" />
                <MetricCard title={t('analytics.totalProducts')} value={data.total_inventory.total_products.toLocaleString()} icon={Package} color="blue" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <MetricCard title={t('analytics.totalUnits')} value={data.total_inventory.total_units.toLocaleString()} icon={Box} color="purple" />
                <MetricCard title={t('analytics.retailValue')} value={formatCurrency(data.total_inventory.retail_value)} icon={DollarSign} color="green" />
                <MetricCard title={t('analytics.costValue')} value={formatCurrency(data.total_inventory.cost_value)} icon={Tag} color="cyan" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ABC Analysis */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.abcAnalysis')}</CardTitle>
                        <CardDescription>{t('analytics.abcDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className={`flex items-center justify-between p-3 bg-green-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div>
                                    <p className="font-semibold text-green-700">{t('analytics.aItems')}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.aItemsDescription')}</p>
                                </div>
                                <div className={isRTL ? 'text-left' : 'text-right'}>
                                    <p className="text-2xl font-bold text-green-700">{data.abc_analysis.A}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.productsLabel')}</p>
                                </div>
                            </div>
                            <div className={`flex items-center justify-between p-3 bg-yellow-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div>
                                    <p className="font-semibold text-yellow-700">{t('analytics.bItems')}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.bItemsDescription')}</p>
                                </div>
                                <div className={isRTL ? 'text-left' : 'text-right'}>
                                    <p className="text-2xl font-bold text-yellow-700">{data.abc_analysis.B}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.productsLabel')}</p>
                                </div>
                            </div>
                            <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div>
                                    <p className="font-semibold text-gray-700">{t('analytics.cItems')}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.cItemsDescription')}</p>
                                </div>
                                <div className={isRTL ? 'text-left' : 'text-right'}>
                                    <p className="text-2xl font-bold text-gray-700">{data.abc_analysis.C}</p>
                                    <p className="text-sm text-muted-foreground">{t('analytics.productsLabel')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Movement */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.stockMovement')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={data.stock_movement}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="units_sold" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Inventory by Category */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('analytics.inventoryByCategory')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.by_category}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: number, name: string) => String(name).includes('Value') ? formatCurrency(value) : value.toLocaleString()} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="total_units" fill={COLORS.secondary} name={t('analytics.totalUnits')} />
                            <Bar yAxisId="right" dataKey="retail_value" fill={COLORS.primary} name={t('analytics.retailValue')} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </>
    )
}

// Operational Tab Component
function OperationalTabContent({ data, loading, error, t, isRTL }: { data?: OperationalAnalyticsResponse; loading: boolean; error?: Error | null; t: any; isRTL: boolean }) {
    if (loading) return <LoadingState />
    if (error) return <ErrorState message={`${t('analytics.failedToLoadData')}: ${error.message}`} />
    if (!data) return <EmptyState message={t('analytics.noDataAvailable')} />

    return (
        <>
            {/* Key Operational Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard title={t('analytics.fulfillmentRate')} value={`${data.fulfillment_rate}%`} icon={CheckCircle} color="green" />
                <MetricCard title={t('analytics.avgItemsPerOrder')} value={data.avg_items_per_order.toFixed(1)} icon={Package} color="blue" />
                <MetricCard title={t('analytics.totalOrders')} value={data.total_orders.toLocaleString()} icon={ShoppingCart} color="purple" />
                <MetricCard title={t('analytics.deliveredOrders')} value={data.delivered_orders.toLocaleString()} icon={Truck} color="green" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Peak Hours */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.peakHours')}</CardTitle>
                        <CardDescription>{t('analytics.peakHoursDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.peak_hours.slice(0, 12)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                                <YAxis />
                                <Tooltip labelFormatter={(h) => `${h}:00`} />
                                <Bar dataKey="orders" fill={COLORS.primary} name={t('analytics.ordersTab')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Peak Days */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.busiestDays')}</CardTitle>
                        <CardDescription>{t('analytics.busiestDaysDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.peak_days}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrency(v)} />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="orders" fill={COLORS.secondary} name={t('analytics.ordersTab')} />
                                <Bar yAxisId="right" dataKey="revenue" fill={COLORS.primary} name={t('analytics.revenue')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Processing Metrics & Delivery Slots */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.orderProcessing')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.processing_metrics.map((metric) => (
                                <div key={metric.status} className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <StatusBadge status={metric.status} />
                                    </div>
                                    <div className={isRTL ? 'text-left' : 'text-right'}>
                                        <p className="font-semibold">{metric.count} {t('analytics.orders')}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Avg: {Math.round(metric.avg_time_minutes)} min
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('analytics.deliverySlotUsage')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={data.delivery_slot_usage}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="count"
                                    nameKey="delivery_time_slot"
                                    label={({ delivery_time_slot, count }) => `${delivery_time_slot}: ${count}`}
                                >
                                    {data.delivery_slot_usage.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

// Helper Components
function LoadingState() {
    return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p className="text-center">{message}</p>
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
            <XCircle className="h-12 w-12 mb-4" />
            <p className="text-center">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Please check if the backend server is running and try again.</p>
        </div>
    )
}
