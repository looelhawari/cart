import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { promoCodeService } from '@/services/promo-code.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Users, TrendingUp, DollarSign, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'

export default function PromoCodeAnalyticsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days')
    const [userSearchTerm, setUserSearchTerm] = useState('')
    const [historyPage, setHistoryPage] = useState(1)

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['promo-code-analytics', id, dateRange],
        queryFn: () => promoCodeService.getPromoCodeAnalytics(Number(id), dateRange),
        enabled: !!id,
    })

    const { data: usageHistory, isLoading: historyLoading } = useQuery({
        queryKey: ['promo-code-usage-history', id, historyPage],
        queryFn: () => promoCodeService.getUsageHistory(Number(id), { page: historyPage, per_page: 20 }),
        enabled: !!id,
    })

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['promo-code-users', id],
        queryFn: () => promoCodeService.getPromoCodeUsers(Number(id)),
        enabled: !!id,
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
        }).format(amount)
    }

    // Handle different response structures
    const usersData = Array.isArray(users?.data) ? users.data : (users?.data?.data || [])
    const filteredUsers = usersData.filter((user: any) =>
        user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
    )

    const historyData = Array.isArray(usageHistory?.data) ? usageHistory.data : usageHistory?.data?.data || []
    const paginationMeta = usageHistory?.data?.meta || usageHistory?.meta

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/promo-codes')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Promo Codes
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold">Promo Code Analytics</h1>
                    {analytics?.data && (
                        <p className="text-gray-500 mt-1">
                            Code: <span className="font-mono font-bold text-elbaraka-primary">{analytics.data.promo_code?.code}</span>
                        </p>
                    )}
                </div>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {analyticsLoading ? (
                <div className="text-center py-12 text-gray-500">Loading analytics...</div>
            ) : !analytics?.data ? (
                <div className="text-center py-12 text-gray-500">No analytics data available</div>
            ) : (
                <>
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Uses</p>
                                        <p className="text-3xl font-bold mt-2">{analytics.data.statistics?.total_uses || 0}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Unique Users</p>
                                        <p className="text-3xl font-bold mt-2">{analytics.data.statistics?.unique_users || 0}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Users className="w-6 h-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Discount</p>
                                        <p className="text-3xl font-bold mt-2">
                                            {formatCurrency(analytics.data.statistics?.total_discount || 0)}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                        <DollarSign className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Avg. Discount</p>
                                        <p className="text-3xl font-bold mt-2">
                                            {formatCurrency(analytics.data.statistics?.average_discount || 0)}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-orange-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Usage Timeline */}
                    {analytics.data.usage_timeline && analytics.data.usage_timeline.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Usage Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analytics.data.usage_timeline.map((item: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{item.date}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Uses</p>
                                                    <p className="font-semibold">{item.count}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Discount</p>
                                                    <p className="font-semibold">{formatCurrency(item.total_discount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Users */}
                    {analytics.data.top_users && analytics.data.top_users.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analytics.data.top_users.map((user: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-elbaraka-primary text-white rounded-full flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.user_name || 'Unknown'}</p>
                                                    <p className="text-sm text-gray-500">{user.user_email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Uses</p>
                                                    <p className="font-semibold">{user.usage_count}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Total Saved</p>
                                                    <p className="font-semibold">{formatCurrency(user.total_discount)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Usage History */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {historyLoading ? (
                                <div className="text-center py-8 text-gray-500">Loading usage history...</div>
                            ) : historyData.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No usage history found</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="text-left p-3">User</th>
                                                    <th className="text-left p-3">Order</th>
                                                    <th className="text-left p-3">Order Total</th>
                                                    <th className="text-left p-3">Discount</th>
                                                    <th className="text-left p-3">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {historyData.map((usage: any) => (
                                                    <tr key={usage.id} className="hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div>
                                                                <p className="font-medium">{usage.user?.name || 'Unknown'}</p>
                                                                <p className="text-sm text-gray-500">{usage.user?.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="font-mono text-sm">
                                                                {usage.order_number || `#${usage.order_id}`}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-semibold">
                                                            {formatCurrency(usage.order_total || 0)}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="text-green-600 font-semibold">
                                                                -{formatCurrency(usage.discount_amount)}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-sm text-gray-500">
                                                            {usage.used_at && format(new Date(usage.used_at), 'MMM dd, yyyy HH:mm')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {paginationMeta && paginationMeta.last_page > 1 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <p className="text-sm text-gray-500">
                                                Showing {paginationMeta.from} to {paginationMeta.to} of {paginationMeta.total} results
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={historyPage === 1}
                                                    onClick={() => setHistoryPage(p => p - 1)}
                                                >
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={historyPage === paginationMeta.last_page}
                                                    onClick={() => setHistoryPage(p => p + 1)}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* All Users */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>All Users ({usersData.length})</CardTitle>
                                <Input
                                    placeholder="Search users..."
                                    className="max-w-xs"
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {usersLoading ? (
                                <div className="text-center py-8 text-gray-500">Loading users...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    {userSearchTerm ? 'No users found matching your search' : 'No users have used this promo code'}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredUsers.map((user: any) => (
                                        <div key={user.user_id} className="p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-elbaraka-primary text-white rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{user.name || 'Unknown'}</p>
                                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div>
                                                            <p className="text-xs text-gray-500">Uses</p>
                                                            <p className="font-semibold">{user.usage_count}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500">Total Saved</p>
                                                            <p className="font-semibold text-green-600">
                                                                {formatCurrency(user.total_discount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
