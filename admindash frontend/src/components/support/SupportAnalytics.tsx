import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supportService, type SupportAnalytics } from '@/services/support.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    MessageSquare,
    Clock,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Users,
    Inbox,
    XCircle,
    Zap,
} from 'lucide-react'

const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subValue,
    trend,
}: {
    title: string
    value: number | string
    icon: React.ElementType
    color: string
    subValue?: string
    trend?: 'up' | 'down' | 'neutral'
}) => (
    <Card className="relative overflow-hidden">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    {subValue && (
                        <p className={`text-xs mt-1 ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {subValue}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
        </CardContent>
    </Card>
)

const CategoryBar = ({ category, count, max }: { category: string; count: number; max: number }) => {
    const percentage = max > 0 ? (count / max) * 100 : 0
    const categoryLabels: Record<string, string> = {
        order_issue: 'Order Issues',
        product_quality: 'Product Quality',
        delivery_problem: 'Delivery Problems',
        payment_issue: 'Payment Issues',
        technical_issue: 'Technical Issues',
        general_inquiry: 'General Inquiries',
        suggestion: 'Suggestions',
        other: 'Other',
    }

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{categoryLabels[category] || category}</span>
                <span className="font-medium">{count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}

export default function SupportAnalyticsDashboard() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const [period, setPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d')

    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['support-analytics', period],
        queryFn: () => supportService.getAnalytics(period),
        refetchInterval: 60000, // Refresh every minute
    })

    const analytics = analyticsData?.data

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (!analytics) return null

    const maxCategory = Math.max(...Object.values(analytics.tickets_by_category))

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{t('support.analyticsTitle', 'Support Analytics')}</h2>
                    <p className="text-muted-foreground">{t('support.analyticsSubtitle', 'Monitor your support team performance')}</p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="24h">{t('support.last24h', 'Last 24 Hours')}</SelectItem>
                        <SelectItem value="7d">{t('support.last7d', 'Last 7 Days')}</SelectItem>
                        <SelectItem value="30d">{t('support.last30d', 'Last 30 Days')}</SelectItem>
                        <SelectItem value="90d">{t('support.last90d', 'Last 90 Days')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title={t('support.openTickets', 'Open Tickets')}
                    value={analytics.overview.total_open}
                    icon={Inbox}
                    color="bg-blue-500"
                />
                <StatCard
                    title={t('support.inProgress', 'In Progress')}
                    value={analytics.overview.total_in_progress}
                    icon={Clock}
                    color="bg-yellow-500"
                />
                <StatCard
                    title={t('support.resolvedPeriod', 'Resolved')}
                    value={analytics.overview.resolved_tickets}
                    icon={CheckCircle}
                    color="bg-green-500"
                    subValue={`${analytics.performance.resolution_rate}% resolution rate`}
                    trend="up"
                />
                <StatCard
                    title={t('support.urgentOpen', 'Urgent Open')}
                    value={analytics.overview.urgent_open}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            {t('support.avgResponseTime', 'Avg Response Time')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {analytics.performance.avg_response_time_minutes < 60
                                ? `${analytics.performance.avg_response_time_minutes}m`
                                : `${Math.round(analytics.performance.avg_response_time_minutes / 60)}h`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('support.firstReplyTime', 'Time to first reply')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {t('support.avgResolutionTime', 'Avg Resolution Time')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {analytics.performance.avg_resolution_time_hours < 24
                                ? `${analytics.performance.avg_resolution_time_hours}h`
                                : `${Math.round(analytics.performance.avg_resolution_time_hours / 24)}d`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('support.timeToResolve', 'Time to resolve tickets')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            {t('support.unreadMessages', 'Unread Messages')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{analytics.overview.unread_messages}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('support.awaitingResponse', 'Awaiting response')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets by Category */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('support.ticketsByCategory', 'Tickets by Category')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(analytics.tickets_by_category).map(([category, count]) => (
                            <CategoryBar key={category} category={category} count={count} max={maxCategory} />
                        ))}
                        {Object.keys(analytics.tickets_by_category).length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                                {t('support.noData', 'No data available')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Top Performers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t('support.topPerformers', 'Top Performers')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics.top_performers.map((performer, index) => (
                                <div key={performer.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">{performer.first_name} {performer.last_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">{performer.resolved_count}</p>
                                        <p className="text-xs text-muted-foreground">{t('support.resolved', 'resolved')}</p>
                                    </div>
                                </div>
                            ))}
                            {analytics.top_performers.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">
                                    {t('support.noPerformers', 'No data for this period')}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Priority Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('support.priorityDistribution', 'Priority Distribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6 flex-wrap">
                        {Object.entries(analytics.tickets_by_priority).map(([priority, count]) => {
                            const colors: Record<string, string> = {
                                low: 'bg-gray-100 text-gray-700',
                                medium: 'bg-blue-100 text-blue-700',
                                high: 'bg-orange-100 text-orange-700',
                                urgent: 'bg-red-100 text-red-700',
                            }
                            return (
                                <div key={priority} className={`px-4 py-2 rounded-lg ${colors[priority] || 'bg-gray-100'}`}>
                                    <span className="font-medium capitalize">{priority}</span>
                                    <span className="ml-2 font-bold">{count}</span>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
