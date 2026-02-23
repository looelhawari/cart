import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotionService, type PromotionFilters } from '@/services/promotion.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Edit, Trash2, Star, StarOff, Gift, Percent, Calendar, Tag } from 'lucide-react'
import { format } from 'date-fns'
import type { Promotion } from '@/types'
import CreatePromotionForm from './CreatePromotionForm'
import EditPromotionForm from './EditPromotionForm'

export default function PromotionsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [filters, setFilters] = useState<PromotionFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)

    const queryClient = useQueryClient()
    const { toast } = useToast()

    // Fetch promotions
    const { data: promotionsData, isLoading } = useQuery({
        queryKey: ['promotions', filters],
        queryFn: () => promotionService.getPromotions(filters),
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: promotionService.deletePromotion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            toast({
                title: t('common.success'),
                description: t('promotions.deleteSuccess'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('promotions.deleteError'),
                variant: 'destructive',
            })
        },
    })

    // Feature toggle mutation
    const featureMutation = useMutation({
        mutationFn: promotionService.setFeatured,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            toast({
                title: t('common.success'),
                description: t('promotions.featuredSuccess'),
            })
        },
    })

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const handleDelete = (id: number) => {
        if (confirm(t('promotions.confirmDelete'))) {
            deleteMutation.mutate(id)
        }
    }

    const handleToggleFeatured = (id: number) => {
        featureMutation.mutate(id)
    }

    const formatCurrency = (amount: number) => `EGP ${amount.toFixed(2)}`

    const getStatusBadge = (promotion: Promotion) => {
        if (!promotion.is_active) {
            return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700 font-medium">{t('common.inactive')}</span>
        }
        if (promotion.is_currently_active) {
            return <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-700 font-medium">{t('common.active')}</span>
        }
        const now = new Date()
        const start = new Date(promotion.start_date)
        if (now < start) {
            return <span className="px-2 py-1 text-xs rounded-full bg-blue-200 text-blue-700 font-medium">{t('promotions.scheduled')}</span>
        }
        return <span className="px-2 py-1 text-xs rounded-full bg-red-200 text-red-700 font-medium">{t('promotions.expired')}</span>
    }

    const getAppliesToBadge = (appliesTo: string) => {
        switch (appliesTo) {
            case 'all':
                return <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">{t('promotions.allProducts')}</span>
            case 'category':
                return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">{t('promotions.categoryBased')}</span>
            case 'products':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">{t('promotions.specificProducts')}</span>
            default:
                return <span className="capitalize">{appliesTo}</span>
        }
    }

    // Extract promotions from response
    const promotions: Promotion[] = (() => {
        if (!promotionsData) return []
        if (Array.isArray(promotionsData.data)) return promotionsData.data
        if (promotionsData.data && Array.isArray((promotionsData.data as any).data)) {
            return (promotionsData.data as any).data
        }
        return []
    })()

    // Stats
    const activeCount = promotions.filter(p => p.is_active && p.is_currently_active).length
    const scheduledCount = promotions.filter(p => p.is_active && new Date(p.start_date) > new Date()).length
    const featuredCount = promotions.filter(p => p.is_featured).length

    return (
        <div className={`p-6 space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-elbaraka-primary to-elbaraka-secondary shadow-lg">
                            <Gift className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary bg-clip-text text-transparent">
                                {t('promotions.title')}
                            </h1>
                            <p className="text-gray-500 mt-1">{t('promotions.subtitle')}</p>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary hover:from-elbaraka-primary/90 hover:to-elbaraka-secondary/90 text-white shadow-lg"
                >
                    <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('promotions.createPromotion')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Gift className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-purple-600 font-medium">{t('promotions.totalPromotions')}</p>
                                <p className="text-2xl font-bold text-purple-700">{promotions.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <Percent className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-green-600 font-medium">{t('promotions.activeNow')}</p>
                                <p className="text-2xl font-bold text-green-700">{activeCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-600 font-medium">{t('promotions.scheduled')}</p>
                                <p className="text-2xl font-bold text-blue-700">{scheduledCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                                <Star className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-yellow-600 font-medium">{t('promotions.featured')}</p>
                                <p className="text-2xl font-bold text-yellow-700">{featuredCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className={`flex gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1">
                            <Input
                                placeholder={t('promotions.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className={isRTL ? 'text-right' : 'text-left'}
                            />
                        </div>
                        <Button onClick={handleSearch} className="bg-elbaraka-primary hover:bg-elbaraka-primary/90">
                            <Search className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('common.search')}
                        </Button>
                    </div>

                    <div className={`flex gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Select
                            value={filters.is_active?.toString() ?? 'all'}
                            onValueChange={(value) => setFilters({
                                ...filters,
                                is_active: value === 'all' ? undefined : value === 'true',
                                page: 1
                            })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('promotions.filterByStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('promotions.allStatus')}</SelectItem>
                                <SelectItem value="true">{t('common.active')}</SelectItem>
                                <SelectItem value="false">{t('common.inactive')}</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.is_featured?.toString() ?? 'all'}
                            onValueChange={(value) => setFilters({
                                ...filters,
                                is_featured: value === 'all' ? undefined : value === 'true',
                                page: 1
                            })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('promotions.filterByFeatured')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('promotions.allPromotions')}</SelectItem>
                                <SelectItem value="true">{t('promotions.featuredOnly')}</SelectItem>
                                <SelectItem value="false">{t('promotions.notFeatured')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elbaraka-primary mx-auto mb-4"></div>
                            <p className="text-gray-500">{t('common.loading')}</p>
                        </div>
                    ) : promotions.length === 0 ? (
                        <div className="text-center py-12">
                            <Gift className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">{t('promotions.noPromotions')}</p>
                            <p className="text-gray-400 text-sm mt-1">{t('promotions.createFirstPromotion')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                                    <tr>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('promotions.promotion')}
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('promotions.discount')}
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('promotions.appliesTo')}
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('promotions.duration')}
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('common.status')}
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('promotions.featured')}
                                        </th>
                                        <th className={`${isRTL ? 'text-left' : 'text-right'} p-4 font-semibold text-gray-700 dark:text-gray-300`}>
                                            {t('common.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {promotions.map((promotion: Promotion) => (
                                        <tr key={promotion.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {promotion.image_url ? (
                                                        <img
                                                            src={promotion.image_url}
                                                            alt={promotion.title}
                                                            className="w-12 h-12 object-cover rounded-lg shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gradient-to-br from-elbaraka-primary/20 to-elbaraka-secondary/20 rounded-lg flex items-center justify-center">
                                                            <Tag className="h-6 w-6 text-elbaraka-primary" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{promotion.title}</div>
                                                        <div className="text-sm text-gray-500" dir="rtl">{promotion.title_ar}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                                                    <Percent className="h-3 w-3 text-green-600" />
                                                    <span className="font-semibold text-green-700 dark:text-green-400">
                                                        {promotion.discount_type === 'percentage'
                                                            ? `${promotion.discount_value}%`
                                                            : formatCurrency(promotion.discount_value)
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {getAppliesToBadge(promotion.applies_to)}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(promotion.start_date), 'MMM dd, yyyy')}
                                                    </div>
                                                    <div className="text-gray-500 mt-1">
                                                        {t('common.to')} {format(new Date(promotion.end_date), 'MMM dd, yyyy')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(promotion)}
                                            </td>
                                            <td className="p-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleFeatured(promotion.id)}
                                                    className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                                >
                                                    {promotion.is_featured ? (
                                                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                    ) : (
                                                        <StarOff className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </Button>
                                            </td>
                                            <td className="p-4">
                                                <div className={`flex gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setEditingPromotion(promotion)}
                                                        className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    >
                                                        <Edit className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(promotion.id)}
                                                        className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Form Dialog */}
            <CreatePromotionForm
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
            />

            {/* Edit Form Dialog */}
            <EditPromotionForm
                promotion={editingPromotion}
                onClose={() => setEditingPromotion(null)}
            />
        </div>
    )
}
