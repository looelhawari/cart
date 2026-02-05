import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewService, type Review, type ReviewFilters } from '@/services/review.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
// Removed unused formatCurrency import
import {
    Star, Search, Calendar, User, Package, ShoppingCart,
    CheckCircle, XCircle, Clock, MessageSquare, TrendingUp, BarChart3,
    Trash2, Send, ChevronLeft, ChevronRight
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const RATING_COLORS = {
    5: '#22c55e',
    4: '#84cc16',
    3: '#eab308',
    2: '#f97316',
    1: '#ef4444',
}

const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            ))}
            <span className="ml-1 text-sm font-medium">{rating}.0</span>
        </div>
    )
}

export default function ReviewsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // Filters
    const [filters, setFilters] = useState<ReviewFilters>({
        page: 1,
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
    })
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Dialogs
    const [selectedReview, setSelectedReview] = useState<Review | null>(null)
    const [responseText, setResponseText] = useState('')
    const [showResponseDialog, setShowResponseDialog] = useState(false)

    // Fetch reviews
    const { data: reviewsData, isLoading: loadingReviews } = useQuery({
        queryKey: ['admin-reviews', filters],
        queryFn: () => reviewService.getReviews(filters),
    })

    // Fetch analytics
    const { data: analytics } = useQuery({
        queryKey: ['reviews-analytics', dateFrom, dateTo],
        queryFn: () => reviewService.getAnalytics(dateFrom || undefined, dateTo || undefined),
    })

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: 'pending' | 'approved' | 'rejected' }) =>
            reviewService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['reviews-analytics'] })
            toast({ title: t('common.success'), description: t('reviews.statusUpdated') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('reviews.updateError'),
                variant: 'destructive',
            })
        },
    })

    const addResponseMutation = useMutation({
        mutationFn: ({ id, response }: { id: number; response: string }) =>
            reviewService.addResponse(id, response),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
            setShowResponseDialog(false)
            setResponseText('')
            setSelectedReview(null)
            toast({ title: t('common.success'), description: t('reviews.responseAdded') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('reviews.responseError'),
                variant: 'destructive',
            })
        },
    })

    const deleteReviewMutation = useMutation({
        mutationFn: reviewService.deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
            queryClient.invalidateQueries({ queryKey: ['reviews-analytics'] })
            toast({ title: t('common.success'), description: t('reviews.deleted') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('reviews.deleteError'),
                variant: 'destructive',
            })
        },
    })

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const handleApplyDateFilter = () => {
        setFilters({
            ...filters,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            page: 1,
        })
    }

    const ratingDistributionData = analytics?.overview?.rating_distribution
        ? Object.entries(analytics.overview.rating_distribution).map(([rating, count]) => ({
            rating: `${rating} Star`,
            count,
            fill: RATING_COLORS[parseInt(rating) as keyof typeof RATING_COLORS],
        })).reverse()
        : []

    const typeDistributionData = analytics?.by_type
        ? [
            { name: 'Product', value: analytics.by_type.product?.count || 0, color: '#3b82f6' },
            { name: 'Order', value: analytics.by_type.order?.count || 0, color: '#22c55e' },
            { name: 'Store', value: analytics.by_type.store?.count || 0, color: '#a855f7' },
        ]
        : []

    const reviews = reviewsData?.data?.data || []
    const pagination = reviewsData?.data

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary flex items-center gap-2">
                        <Star className="h-8 w-8" />
                        {t('reviews.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('reviews.subtitle')}</p>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('reviews.averageRating')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                            <span className="text-3xl font-bold">
                                {analytics?.overview?.average_rating?.toFixed(1) || '0.0'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analytics?.overview?.total_reviews || 0} {t('reviews.totalReviews')}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('reviews.pendingReviews')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Clock className="h-8 w-8 text-blue-500" />
                            <span className="text-3xl font-bold text-blue-600">
                                {analytics?.overview?.pending_reviews || 0}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t('reviews.awaitingApproval')}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('reviews.orderRatingRate')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-8 w-8 text-green-500" />
                            <span className="text-3xl font-bold text-green-600">
                                {analytics?.order_rating_rate || 0}%
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t('reviews.ordersWithRatings')}</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t('reviews.storeRating')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Star className="h-8 w-8 text-purple-500" />
                            <span className="text-3xl font-bold text-purple-600">
                                {analytics?.by_type?.store?.average?.toFixed(1) || '0.0'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {analytics?.by_type?.store?.count || 0} {t('reviews.storeReviews')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Rating Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            {t('reviews.ratingDistribution')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={ratingDistributionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="rating" width={60} />
                                <Tooltip />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {ratingDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Review Type Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            {t('reviews.byType')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={typeDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {typeDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Trend Chart */}
            {analytics?.trend && analytics.trend.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            {t('reviews.ratingTrend')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics.trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                                <Tooltip />
                                <Legend />
                                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Reviews" />
                                <Line yAxisId="right" type="monotone" dataKey="average_rating" stroke="#22c55e" name="Avg Rating" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Filters & Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-6">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('reviews.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <Select
                            value={filters.rating_type || 'all'}
                            onValueChange={(value) => setFilters({
                                ...filters,
                                rating_type: value === 'all' ? undefined : value as any,
                                page: 1,
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('reviews.allTypes')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('reviews.allTypes')}</SelectItem>
                                <SelectItem value="product">{t('reviews.product')}</SelectItem>
                                <SelectItem value="order">{t('reviews.order')}</SelectItem>
                                <SelectItem value="store">{t('reviews.store')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(value) => setFilters({
                                ...filters,
                                status: value === 'all' ? undefined : value as any,
                                page: 1,
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('reviews.allStatuses')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('reviews.allStatuses')}</SelectItem>
                                <SelectItem value="pending">{t('reviews.pending')}</SelectItem>
                                <SelectItem value="approved">{t('reviews.approved')}</SelectItem>
                                <SelectItem value="rejected">{t('reviews.rejected')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder={t('reviews.from')}
                        />

                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder={t('reviews.to')}
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleSearch} variant="outline">
                            <Search className="h-4 w-4 mr-2" />
                            {t('common.search')}
                        </Button>
                        <Button onClick={handleApplyDateFilter} variant="outline">
                            <Calendar className="h-4 w-4 mr-2" />
                            {t('reviews.applyDateFilter')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('reviews.allReviews')}</CardTitle>
                    <CardDescription>
                        {t('reviews.showingReviews', { count: reviews.length, total: pagination?.total || 0 })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingReviews ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elbaraka-primary"></div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('reviews.noReviews')}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-1">
                                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <StarRating rating={review.rating} />
                                                <Badge variant="outline" className={STATUS_COLORS[review.status]}>
                                                    {t(`reviews.${review.status}`)}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    {review.rating_type === 'product' && <Package className="h-3 w-3 mr-1" />}
                                                    {review.rating_type === 'order' && <ShoppingCart className="h-3 w-3 mr-1" />}
                                                    {review.rating_type === 'store' && <Star className="h-3 w-3 mr-1" />}
                                                    {t(`reviews.${review.rating_type}`)}
                                                </Badge>
                                            </div>

                                            <p className="mt-2 text-gray-700">{review.comment}</p>

                                            <div className={`flex items-center gap-4 mt-3 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {review.user?.first_name} {review.user?.last_name}
                                                </span>
                                                {review.order && (
                                                    <span className="flex items-center gap-1">
                                                        <ShoppingCart className="h-3 w-3" />
                                                        {review.order.order_number}
                                                    </span>
                                                )}
                                                {review.product && (
                                                    <span className="flex items-center gap-1">
                                                        <Package className="h-3 w-3" />
                                                        {review.product.name_en}
                                                    </span>
                                                )}
                                                <span>
                                                    {new Date(review.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {review.response && (
                                                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                                    <p className="text-sm text-blue-800">
                                                        <strong>{t('reviews.adminResponse')}:</strong> {review.response}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            {review.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                                        onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'approved' })}
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-300 hover:bg-red-50"
                                                        onClick={() => updateStatusMutation.mutate({ id: review.id, status: 'rejected' })}
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedReview(review)
                                                    setResponseText(review.response || '')
                                                    setShowResponseDialog(true)
                                                }}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600"
                                                onClick={() => {
                                                    if (confirm(t('reviews.confirmDelete'))) {
                                                        deleteReviewMutation.mutate(review.id)
                                                    }
                                                }}
                                                disabled={deleteReviewMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {pagination && (pagination.last_page ?? 0) > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        {t('common.page')} {pagination.current_page} {t('common.of')} {pagination.last_page}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page === 1}
                                            onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.current_page === pagination.last_page}
                                            onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Response Dialog */}
            <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            {t('reviews.respondToReview')}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedReview && (
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <StarRating rating={selectedReview.rating} />
                                <p className="mt-2 text-gray-700">{selectedReview.comment}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    - {selectedReview.user?.first_name} {selectedReview.user?.last_name}
                                </p>
                            </div>

                            <div>
                                <Label>{t('reviews.yourResponse')}</Label>
                                <Textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    placeholder={t('reviews.responsePlaceholder')}
                                    className="mt-1"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={() => {
                                if (selectedReview && responseText.trim()) {
                                    addResponseMutation.mutate({ id: selectedReview.id, response: responseText })
                                }
                            }}
                            disabled={!responseText.trim() || addResponseMutation.isPending}
                            className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {addResponseMutation.isPending ? t('common.sending') : t('reviews.sendResponse')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
