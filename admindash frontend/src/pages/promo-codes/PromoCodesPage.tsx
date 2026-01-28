import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { promoCodeService, type PromoCodeFilters, type CreatePromoCodeData } from '@/services/promo-code.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
    Plus, Search, Edit, Trash2, Copy, Ticket, BarChart3,
    Download, RefreshCw, TrendingUp, Users, DollarSign,
    Gift, Percent, Truck, ShoppingBag, Tag,
    CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp,
    Layers, Target, Sparkles
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { PromoCode } from '@/types'

// Type icons mapping
const TYPE_ICONS = {
    percentage: Percent,
    fixed_amount: DollarSign,
    free_delivery: Truck,
    bogo: Gift,
}

// Status colors and icons
const STATUS_CONFIG = {
    active: { color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle, label: 'Active' },
    expired: { color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle, label: 'Expired' },
    scheduled: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Clock, label: 'Scheduled' },
    inactive: { color: 'bg-gray-100 text-gray-700 border-gray-300', icon: XCircle, label: 'Inactive' },
    limit_reached: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertCircle, label: 'Limit Reached' },
}

export default function PromoCodesPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const navigate = useNavigate()
    const [filters, setFilters] = useState<PromoCodeFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [expandedRow, setExpandedRow] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState('basic')

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<CreatePromoCodeData>({
        defaultValues: {
            type: 'percentage',
            applies_to: 'order',
            is_active: true,
            first_order_only: false,
            bogo_rules: [],
            product_ids: [],
            category_ids: [],
        }
    })

    const { fields: bogoFields, append: appendBogo, remove: removeBogo } = useFieldArray({
        control,
        name: 'bogo_rules' as any,
    })

    const watchType = watch('type')
    const watchAppliesTo = watch('applies_to')

    // Queries
    const { data: promoCodesData, isLoading, refetch } = useQuery({
        queryKey: ['promo-codes', filters],
        queryFn: () => promoCodeService.getPromoCodes(filters),
    })

    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ['promo-products'],
        queryFn: () => promoCodeService.getProducts(),
        enabled: isCreateDialogOpen,
    })

    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ['promo-categories'],
        queryFn: () => promoCodeService.getCategories(),
        enabled: isCreateDialogOpen,
    })

    const { data: analyticsData } = useQuery({
        queryKey: ['promo-analytics'],
        queryFn: () => promoCodeService.getAnalytics(),
    })

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: CreatePromoCodeData) => promoCodeService.createPromoCode(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            queryClient.invalidateQueries({ queryKey: ['promo-analytics'] })
            setIsCreateDialogOpen(false)
            reset()
            toast({ title: 'Success', description: 'Promo code created successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to create promo code',
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CreatePromoCodeData> }) =>
            promoCodeService.updatePromoCode(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            setEditingPromoCode(null)
            setIsCreateDialogOpen(false)
            reset()
            toast({ title: 'Success', description: 'Promo code updated successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update promo code',
                variant: 'destructive',
            })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => promoCodeService.deletePromoCode(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            queryClient.invalidateQueries({ queryKey: ['promo-analytics'] })
            toast({ title: 'Success', description: 'Promo code deleted successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to delete promo code',
                variant: 'destructive',
            })
        },
    })

    const duplicateMutation = useMutation({
        mutationFn: (id: number) => promoCodeService.duplicatePromoCode(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            toast({ title: 'Success', description: 'Promo code duplicated successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to duplicate promo code',
                variant: 'destructive',
            })
        },
    })

    const bulkStatusMutation = useMutation({
        mutationFn: ({ ids, isActive }: { ids: number[]; isActive: boolean }) =>
            promoCodeService.bulkUpdateStatus(ids, isActive),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            setSelectedIds([])
            toast({ title: 'Success', description: `${data.updated} promo codes updated` })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update promo codes',
                variant: 'destructive',
            })
        },
    })

    // Handlers
    const onSubmit = (data: CreatePromoCodeData) => {
        // Clean up the data
        const cleanData = {
            ...data,
            value: Number(data.value),
            minimum_order: data.minimum_order ? Number(data.minimum_order) : undefined,
            maximum_discount: data.maximum_discount ? Number(data.maximum_discount) : undefined,
            usage_limit: data.usage_limit ? Number(data.usage_limit) : undefined,
            usage_per_user: data.usage_per_user ? Number(data.usage_per_user) : undefined,
        }

        if (editingPromoCode) {
            updateMutation.mutate({ id: editingPromoCode.id, data: cleanData })
        } else {
            createMutation.mutate(cleanData)
        }
    }

    const handleEdit = (promoCode: PromoCode) => {
        setEditingPromoCode(promoCode)
        reset({
            code: promoCode.code,
            type: promoCode.type as any,
            applies_to: (promoCode as any).applies_to || 'order',
            value: promoCode.value,
            minimum_order: promoCode.minimum_order || undefined,
            maximum_discount: promoCode.maximum_discount || undefined,
            usage_limit: promoCode.usage_limit || undefined,
            usage_per_user: (promoCode as any).usage_per_user || undefined,
            first_order_only: (promoCode as any).first_order_only || false,
            valid_from: promoCode.valid_from?.split('T')[0] || '',
            valid_until: promoCode.valid_until?.split('T')[0] || '',
            is_active: promoCode.is_active,
            product_ids: (promoCode as any).products?.map((p: any) => p.id) || [],
            category_ids: (promoCode as any).categories?.map((c: any) => ({
                id: c.id,
                include_subcategories: c.pivot?.include_subcategories
            })) || [],
            bogo_rules: (promoCode as any).bogo_rules || [],
        })
        setActiveTab('basic')
        setIsCreateDialogOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this promo code? This action cannot be undone.')) {
            deleteMutation.mutate(id)
        }
    }

    const handleDuplicate = (id: number) => {
        duplicateMutation.mutate(id)
    }

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code)
        toast({ title: 'Copied!', description: `Code "${code}" copied to clipboard` })
    }

    const handleExport = async () => {
        try {
            const blob = await promoCodeService.exportPromoCodes('csv')
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `promo-codes-${format(new Date(), 'yyyy-MM-dd')}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
            toast({ title: 'Success', description: 'Export downloaded successfully' })
        } catch {
            toast({ title: 'Error', description: 'Failed to export promo codes', variant: 'destructive' })
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === promoCodes.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(promoCodes.map((p: PromoCode) => p.id))
        }
    }

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const getPromoStatus = (promoCode: PromoCode): keyof typeof STATUS_CONFIG => {
        if (!promoCode.is_active) return 'inactive'
        const now = new Date()
        const validFrom = new Date(promoCode.valid_from)
        const validUntil = new Date(promoCode.valid_until)
        if (now < validFrom) return 'scheduled'
        if (now > validUntil) return 'expired'
        if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) return 'limit_reached'
        return 'active'
    }

    const getTypeIcon = (type: string) => {
        const IconComponent = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Tag
        return <IconComponent className="w-4 h-4" />
    }

    const formatValue = (promoCode: PromoCode) => {
        const type = promoCode.type as string
        switch (type) {
            case 'percentage':
                return `${promoCode.value}%`
            case 'fixed_amount':
                return `EGP ${promoCode.value}`
            case 'free_delivery':
                return 'Free Delivery'
            case 'bogo':
                return 'BOGO'
            default:
                return String(promoCode.value)
        }
    }

    // Handle various API response structures
    const promoCodes: PromoCode[] = (() => {
        if (!promoCodesData) return []
        if (Array.isArray(promoCodesData.data)) return promoCodesData.data
        if (promoCodesData.data && Array.isArray((promoCodesData.data as any).data)) {
            return (promoCodesData.data as any).data
        }
        return []
    })()

    const analytics = (analyticsData as any)?.data || analyticsData || {}

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className={`text-3xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Sparkles className="w-8 h-8 text-elbaraka-primary" />
                        {t('promoCodes.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">{t('promoCodes.subtitle')}</p>
                </div>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('common.refresh')}
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('common.export')}
                    </Button>
                    <Button onClick={() => { reset(); setEditingPromoCode(null); setActiveTab('basic'); setIsCreateDialogOpen(true) }}>
                        <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('promoCodes.addPromoCode')}
                    </Button>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm text-gray-500">{t('promoCodes.totalCodes')}</p>
                                <p className="text-2xl font-bold">{analytics.total_codes || 0}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Ticket className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm text-gray-500">{t('promoCodes.activeCodes')}</p>
                                <p className="text-2xl font-bold">{analytics.active_codes || 0}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm text-gray-500">{t('promoCodes.totalUses')}</p>
                                <p className="text-2xl font-bold">{analytics.total_uses || 0}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <p className="text-sm text-gray-500">{t('promoCodes.totalDiscounts')}</p>
                                <p className="text-2xl font-bold">{t('common.egp')} {(analytics.total_discount_amount || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`} />
                            <Input
                                placeholder={t('promoCodes.searchByCode')}
                                className={isRTL ? 'pr-10' : 'pl-10'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Select
                            value={filters.type || 'all'}
                            onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? undefined : value as any, page: 1 })}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder={t('promoCodes.type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('promoCodes.allTypes')}</SelectItem>
                                <SelectItem value="percentage">{t('promoCodes.types.percentage')}</SelectItem>
                                <SelectItem value="fixed_amount">{t('promoCodes.types.fixedAmount')}</SelectItem>
                                <SelectItem value="free_delivery">{t('promoCodes.types.freeDelivery')}</SelectItem>
                                <SelectItem value="bogo">{t('promoCodes.types.bogo')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
                            onValueChange={(value) => setFilters({ ...filters, is_active: value === 'all' ? undefined : value === 'active', page: 1 })}
                        >
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder={t('common.status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('promoCodes.allStatus')}</SelectItem>
                                <SelectItem value="active">{t('common.active')}</SelectItem>
                                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSearch}>{t('common.search')}</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-blue-700 font-medium">
                                {t('promoCodes.selectedCount', { count: selectedIds.length })}
                            </span>
                            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, isActive: true })}
                                >
                                    <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                    {t('promoCodes.activate')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => bulkStatusMutation.mutate({ ids: selectedIds, isActive: false })}
                                >
                                    <XCircle className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                    {t('promoCodes.deactivate')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedIds([])}
                                >
                                    {t('common.clear')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Promo Codes Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                            <p>{t('promoCodes.loading')}</p>
                        </div>
                    ) : promoCodes.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium mb-2">{t('promoCodes.noPromoCodes')}</h3>
                            <p className="mb-4">{t('promoCodes.createFirst')}</p>
                            <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('promoCodes.addPromoCode')}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === promoCodes.length}
                                                onChange={toggleSelectAll}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.code')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.type')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.value')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.appliesTo')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.usage')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promoCodes.validPeriod')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.status')}</th>
                                        <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {promoCodes.map((promoCode: PromoCode) => {
                                        const status = getPromoStatus(promoCode)
                                        const statusConfig = STATUS_CONFIG[status]
                                        const StatusIcon = statusConfig.icon

                                        return (
                                            <>
                                                <tr key={promoCode.id} className="hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(promoCode.id)}
                                                            onChange={() => toggleSelect(promoCode.id)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-elbaraka-primary text-lg">
                                                                {promoCode.code}
                                                            </span>
                                                            <button
                                                                onClick={() => copyToClipboard(promoCode.code)}
                                                                className="p-1 hover:bg-gray-200 rounded"
                                                                title="Copy code"
                                                            >
                                                                <Copy className="w-4 h-4 text-gray-500" />
                                                            </button>
                                                            {(promoCode as any).first_order_only && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {t('promoCodes.firstOrder')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            {getTypeIcon(promoCode.type)}
                                                            <span className="capitalize">{promoCode.type.replace('_', ' ')}</span>
                                                            {(promoCode as any).bogo_rules && (promoCode as any).bogo_rules.length > 0 && (
                                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                                                    <Gift className="w-3 h-3 mr-1" />
                                                                    BOGO
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div>
                                                            <span className="font-semibold">{formatValue(promoCode)}</span>
                                                            {promoCode.maximum_discount && promoCode.type === 'percentage' && (
                                                                <div className="text-xs text-gray-500">
                                                                    {t('promoCodes.max')}: {t('common.egp')} {promoCode.maximum_discount}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-1">
                                                            <Target className="w-4 h-4 text-gray-400" />
                                                            <span className="capitalize">{(promoCode as any).applies_to || 'order'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium">
                                                                    {promoCode.used_count} / {promoCode.usage_limit || '∞'}
                                                                </div>
                                                                {promoCode.usage_limit && (
                                                                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-elbaraka-primary rounded-full"
                                                                            style={{
                                                                                width: `${Math.min(100, (promoCode.used_count / promoCode.usage_limit) * 100)}%`
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        <div>{format(new Date(promoCode.valid_from), 'MMM dd, yyyy')}</div>
                                                        <div className="text-gray-500">
                                                            to {format(new Date(promoCode.valid_until), 'MMM dd, yyyy')}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge className={`${statusConfig.color} border`}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {statusConfig.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setExpandedRow(expandedRow === promoCode.id ? null : promoCode.id)}
                                                                title="Expand"
                                                            >
                                                                {expandedRow === promoCode.id ?
                                                                    <ChevronUp className="w-4 h-4" /> :
                                                                    <ChevronDown className="w-4 h-4" />
                                                                }
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => navigate(`/promo-codes/${promoCode.id}/analytics`)}
                                                                title="Analytics"
                                                            >
                                                                <BarChart3 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDuplicate(promoCode.id)}
                                                                title="Duplicate"
                                                            >
                                                                <Layers className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEdit(promoCode)}
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(promoCode.id)}
                                                                className="text-red-600 hover:text-red-700"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedRow === promoCode.id && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={9} className="p-4">
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-4 gap-4">
                                                                    <div>
                                                                        <p className="text-xs text-gray-500 uppercase">{t('promoCodes.minOrder')}</p>
                                                                        <p className="font-medium">
                                                                            {promoCode.minimum_order ? `${t('common.egp')} ${promoCode.minimum_order}` : t('common.none')}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500 uppercase">{t('promoCodes.perUserLimit')}</p>
                                                                        <p className="font-medium">
                                                                            {(promoCode as any).usage_per_user || t('promoCodes.unlimited')}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500 uppercase">{t('common.created')}</p>
                                                                        <p className="font-medium">
                                                                            {formatDistanceToNow(new Date(promoCode.created_at), { addSuffix: true })}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-500 uppercase">{t('promoCodes.productsCategories')}</p>
                                                                        <p className="font-medium">
                                                                            {(promoCode as any).products?.length || 0} {t('common.products')}, {(promoCode as any).categories?.length || 0} {t('common.categories')}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* BOGO Rules */}
                                                                {(promoCode as any).bogo_rules && (promoCode as any).bogo_rules.length > 0 && (
                                                                    <div className="border-t pt-4">
                                                                        <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                            <Gift className="w-4 h-4 text-purple-600" />
                                                                            <h4 className="font-semibold text-purple-900">{t('promoCodes.bogo.title')} ({(promoCode as any).bogo_rules.length})</h4>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            {(promoCode as any).bogo_rules.map((rule: any, idx: number) => (
                                                                                <div key={idx} className="bg-white p-3 rounded border border-purple-200">
                                                                                    <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                                        <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                                                                                            {t('promoCodes.bogo.buy')} {rule.buy_quantity}
                                                                                        </span>
                                                                                        <span className="text-gray-400">→</span>
                                                                                        <span className="bg-green-50 px-2 py-1 rounded font-medium text-green-700">
                                                                                            {t('promoCodes.bogo.getLabel')} {rule.get_quantity} @ {rule.discount_percentage}% {t('common.off')}
                                                                                        </span>
                                                                                        {rule.buy_product_barcode && (
                                                                                            <span className="text-gray-500">
                                                                                                {t('common.product')}: {rule.buy_product_barcode}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {promoCodesData?.meta && (
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <p className="text-sm text-gray-500">
                        {t('common.showingResults', { from: promoCodesData.meta.from || 0, to: promoCodesData.meta.to || 0, total: promoCodesData.meta.total || 0 })}
                    </p>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!promoCodesData.meta.prev_page_url}
                            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                        >
                            {t('common.previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!promoCodesData.meta.next_page_url}
                            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                        >
                            {t('common.next')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Sparkles className="w-5 h-5 text-elbaraka-primary" />
                            {editingPromoCode ? t('promoCodes.editPromoCode') : t('promoCodes.createExtraordinary')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('promoCodes.dialogDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid grid-cols-4 mb-4">
                                    <TabsTrigger value="basic">
                                        {t('promoCodes.basicInfo')}
                                    </TabsTrigger>
                                    <TabsTrigger value="targeting">
                                        {t('promoCodes.targeting')}
                                    </TabsTrigger>
                                    <TabsTrigger value="limits">
                                        {t('promoCodes.limits')}
                                    </TabsTrigger>
                                    <TabsTrigger value="bogo">
                                        <Gift className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                        {t('promoCodes.bogoRules')}
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="basic" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="code">{t('promoCodes.code')} *</Label>
                                            <Input
                                                id="code"
                                                {...register('code', { required: t('promoCodes.codeRequired') })}
                                                placeholder="SUMMER25"
                                                className="uppercase"
                                                disabled={!!editingPromoCode}
                                            />
                                            {errors.code && <span className="text-xs text-red-500">{errors.code.message}</span>}
                                        </div>

                                        <div>
                                            <Label htmlFor="type">{t('promoCodes.discountType')} *</Label>
                                            <Controller
                                                name="type"
                                                control={control}
                                                rules={{ required: true }}
                                                render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="percentage">
                                                                <div className="flex items-center gap-2">
                                                                    <Percent className="w-4 h-4" />
                                                                    {t('promoCodes.percentageOff')}
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="fixed_amount">
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign className="w-4 h-4" />
                                                                    {t('promoCodes.fixedAmountOff')}
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="free_delivery">
                                                                <div className="flex items-center gap-2">
                                                                    <Truck className="w-4 h-4" />
                                                                    {t('promoCodes.types.freeDelivery')}
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="bogo">
                                                                <div className="flex items-center gap-2">
                                                                    <Gift className="w-4 h-4" />
                                                                    {t('promoCodes.types.bogo')}
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="applies_to">{t('promoCodes.appliesTo')} *</Label>
                                            <Controller
                                                name="applies_to"
                                                control={control}
                                                render={({ field }) => (
                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="order">{t('promoCodes.entireOrder')}</SelectItem>
                                                            <SelectItem value="product">{t('promoCodes.specificProducts')}</SelectItem>
                                                            <SelectItem value="category">{t('promoCodes.specificCategories')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>

                                        {watchType !== 'free_delivery' && watchType !== 'bogo' && (
                                            <div>
                                                <Label htmlFor="value">
                                                    {watchType === 'percentage' ? t('promoCodes.percentageValue') : t('promoCodes.discountAmount')}
                                                </Label>
                                                <Input
                                                    id="value"
                                                    type="number"
                                                    step="0.01"
                                                    {...register('value', {
                                                        required: 'Value is required',
                                                        min: { value: 0, message: 'Value must be positive' },
                                                        max: watchType === 'percentage' ? { value: 100, message: 'Max 100%' } : undefined
                                                    })}
                                                    placeholder={watchType === 'percentage' ? '25' : '100'}
                                                />
                                                {errors.value && <span className="text-xs text-red-500">{errors.value.message}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {watchType === 'percentage' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="maximum_discount">{t('promoCodes.maximumDiscount')}</Label>
                                                <Input
                                                    id="maximum_discount"
                                                    type="number"
                                                    step="0.01"
                                                    {...register('maximum_discount')}
                                                    placeholder="100"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{t('promoCodes.capMaxDiscount')}</p>
                                            </div>
                                            <div>
                                                <Label htmlFor="minimum_order">{t('promoCodes.minimumOrder')}</Label>
                                                <Input
                                                    id="minimum_order"
                                                    type="number"
                                                    step="0.01"
                                                    {...register('minimum_order')}
                                                    placeholder="50"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="valid_from">{t('promoCodes.validFrom')} *</Label>
                                            <Input
                                                id="valid_from"
                                                type="date"
                                                {...register('valid_from', { required: t('promoCodes.startDateRequired') })}
                                            />
                                            {errors.valid_from && <span className="text-xs text-red-500">{errors.valid_from.message}</span>}
                                        </div>
                                        <div>
                                            <Label htmlFor="valid_until">{t('promoCodes.validUntil')} *</Label>
                                            <Input
                                                id="valid_until"
                                                type="date"
                                                {...register('valid_until', { required: t('promoCodes.endDateRequired') })}
                                            />
                                            {errors.valid_until && <span className="text-xs text-red-500">{errors.valid_until.message}</span>}
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Controller
                                                name="is_active"
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id="is_active"
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                            <Label htmlFor="is_active">{t('common.active')}</Label>
                                        </div>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Controller
                                                name="first_order_only"
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id="first_order_only"
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                            <Label htmlFor="first_order_only">{t('promoCodes.firstOrderOnly')}</Label>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="targeting" className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <h4 className="font-medium text-blue-800 mb-2">📌 {t('promoCodes.howTargetingWorks')}</h4>
                                        <p className="text-sm text-blue-700">
                                            {watchAppliesTo === 'order' && t('promoCodes.targetingOrderDesc')}
                                            {watchAppliesTo === 'product' && t('promoCodes.targetingProductDesc')}
                                            {watchAppliesTo === 'category' && t('promoCodes.targetingCategoryDesc')}
                                        </p>
                                    </div>

                                    {watchAppliesTo === 'product' && (
                                        <div>
                                            <Label className="text-base font-semibold">{t('promoCodes.selectProductsToApply')}</Label>
                                            <p className="text-sm text-gray-500 mb-2">{t('promoCodes.selectProductsHint')}</p>
                                            {productsLoading ? (
                                                <div className={`flex items-center justify-center py-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                                    <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-500`}>{t('promoCodes.loadingProducts')}</span>
                                                </div>
                                            ) : (
                                                <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto">
                                                    {(productsData as any)?.data?.length > 0 ? (
                                                        (productsData as any).data.map((product: any) => (
                                                            <label key={product.id || product.barcode} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    value={product.id || product.barcode}
                                                                    {...register('product_ids')}
                                                                    className="rounded w-4 h-4"
                                                                />
                                                                <div className="flex-1">
                                                                    <span className="font-medium">{product.name || product.name_en}</span>
                                                                    <span className="text-xs text-gray-500 ml-2">#{product.barcode || product.id}</span>
                                                                </div>
                                                                <span className="text-sm font-semibold text-green-600">EGP {product.price}</span>
                                                            </label>
                                                        ))
                                                    ) : (
                                                        <div className="p-8 text-center text-gray-500">
                                                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                            <p>{t('promoCodes.noProductsAvailable')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {watchAppliesTo === 'category' && (
                                        <div>
                                            <Label className="text-base font-semibold">{t('promoCodes.selectCategoriesToApply')}</Label>
                                            <p className="text-sm text-gray-500 mb-2">{t('promoCodes.selectCategoriesHint')}</p>
                                            {categoriesLoading ? (
                                                <div className={`flex items-center justify-center py-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                                    <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-500`}>{t('promoCodes.loadingCategories')}</span>
                                                </div>
                                            ) : (
                                                <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto">
                                                    {(categoriesData as any)?.data?.length > 0 ? (
                                                        (categoriesData as any).data.map((category: any) => (
                                                            <div key={category.id} className="border-b last:border-b-0">
                                                                <label className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        value={category.id}
                                                                        className="rounded w-4 h-4"
                                                                    />
                                                                    <span className="font-medium flex-1">{category.name || category.name_en}</span>
                                                                    <label className={`flex items-center gap-2 text-xs text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                        <input type="checkbox" className="rounded" />
                                                                        {t('promoCodes.includeSubcategories')}
                                                                    </label>
                                                                </label>
                                                                {category.children?.length > 0 && (
                                                                    <div className="pl-8 pb-2">
                                                                        {category.children.map((child: any) => (
                                                                            <label key={child.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer text-sm">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    value={child.id}
                                                                                    className="rounded w-3 h-3"
                                                                                />
                                                                                <span className="text-gray-600">↳ {child.name || child.name_en}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-8 text-center text-gray-500">
                                                            <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                            <p>{t('promoCodes.noCategoriesAvailable')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {watchAppliesTo === 'order' && (
                                        <div className="text-center py-12">
                                            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-green-500" />
                                            <h3 className="text-lg font-semibold text-gray-700">{t('promoCodes.appliesToEntireOrder')}</h3>
                                            <p className="text-gray-500 mt-2">{t('promoCodes.entireOrderDesc')}</p>
                                            <p className="text-sm text-gray-400 mt-1">{t('promoCodes.noSelectionNeeded')}</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="limits" className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="usage_limit">{t('promoCodes.usageLimit')}</Label>
                                            <Input
                                                id="usage_limit"
                                                type="number"
                                                {...register('usage_limit')}
                                                placeholder="100"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{t('promoCodes.usageLimitHint')}</p>
                                        </div>
                                        <div>
                                            <Label htmlFor="usage_per_user">{t('promoCodes.usagePerUser')}</Label>
                                            <Input
                                                id="usage_per_user"
                                                type="number"
                                                {...register('usage_per_user')}
                                                placeholder="1"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{t('promoCodes.usagePerUserHint')}</p>
                                        </div>
                                    </div>

                                    {!watchType.includes('free') && (
                                        <div>
                                            <Label htmlFor="minimum_order">{t('promoCodes.minimumOrderAmount')}</Label>
                                            <Input
                                                id="minimum_order"
                                                type="number"
                                                step="0.01"
                                                {...register('minimum_order')}
                                                placeholder="50"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{t('promoCodes.minimumOrderHint')}</p>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="bogo" className="space-y-4">
                                    {watchType !== 'bogo' ? (
                                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                            <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                            <h3 className="text-lg font-medium text-gray-700">{t('promoCodes.bogo.notAvailable')}</h3>
                                            <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                                                {t('promoCodes.bogo.notAvailableDesc')}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="mt-4"
                                                onClick={() => setActiveTab('basic')}
                                            >
                                                <Gift className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                                {t('promoCodes.bogo.goToBasicInfo')}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                <h4 className="font-medium text-purple-800 mb-2">🎁 {t('promoCodes.bogo.howItWorks')}</h4>
                                                <ul className={`text-sm text-purple-600 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    <li>• <strong>{t('promoCodes.bogo.buyFrom')}:</strong> {t('promoCodes.bogo.buyFromDesc')}</li>
                                                    <li>• <strong>{t('promoCodes.bogo.get')}:</strong> {t('promoCodes.bogo.getDesc')}</li>
                                                    <li>• {t('promoCodes.bogo.example')}</li>
                                                </ul>
                                            </div>

                                            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div>
                                                    <h4 className="font-medium">{t('promoCodes.bogo.title')}</h4>
                                                    <p className="text-sm text-gray-500">{t('promoCodes.bogo.defineRules')}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => appendBogo({
                                                        buy_scope: 'any',
                                                        buy_product_id: null,
                                                        buy_category_id: null,
                                                        buy_qty: 2,
                                                        get_scope: 'same',
                                                        get_product_id: null,
                                                        get_category_id: null,
                                                        get_qty: 1,
                                                        get_discount_type: 'free',
                                                        get_discount_value: 100,
                                                        max_applications_per_order: 1,
                                                        is_active: true,
                                                    })}
                                                >
                                                    <Plus className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                    {t('promoCodes.bogo.addRule')}
                                                </Button>
                                            </div>

                                            {bogoFields.length === 0 ? (
                                                <div className="text-center py-8 border-2 border-dashed border-purple-200 rounded-lg bg-purple-50/50">
                                                    <Gift className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                                                    <h3 className="font-medium text-purple-700">{t('promoCodes.bogo.noRules')}</h3>
                                                    <p className="text-sm text-purple-600 mt-1">{t('promoCodes.bogo.clickToAdd')}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {bogoFields.map((field, index) => (
                                                        <Card key={field.id} className="p-4 border-2 border-purple-100">
                                                            <div className="flex items-start justify-between mb-4">
                                                                <span className="text-sm font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">Rule #{index + 1}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeBogo(index)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>

                                                            {/* BUY Section */}
                                                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                                <p className="text-xs font-bold text-gray-600 mb-2">🛒 {t('promoCodes.bogo.whenCustomerBuys')}:</p>
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div>
                                                                        <Label className="text-xs">{t('promoCodes.bogo.buyQty')}</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            {...register(`bogo_rules.${index}.buy_qty` as any)}
                                                                            className="h-9"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <Label className="text-xs">{t('promoCodes.bogo.buyFrom')}</Label>
                                                                        <Controller
                                                                            name={`bogo_rules.${index}.buy_scope` as any}
                                                                            control={control}
                                                                            render={({ field }) => (
                                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="any">{t('promoCodes.bogo.anyProduct')}</SelectItem>
                                                                                        <SelectItem value="product">{t('promoCodes.bogo.specificProduct')}</SelectItem>
                                                                                        <SelectItem value="category">{t('promoCodes.bogo.specificCategory')}</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    {watch(`bogo_rules.${index}.buy_scope`) === 'product' && (
                                                                        <div className="col-span-3">
                                                                            <Label className="text-xs">{t('promoCodes.bogo.selectProductBarcode')}</Label>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Product barcode"
                                                                                {...register(`bogo_rules.${index}.buy_product_id` as any)}
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {watch(`bogo_rules.${index}.buy_scope`) === 'category' && (
                                                                        <div className="col-span-3">
                                                                            <Label className="text-xs">{t('promoCodes.bogo.selectCategory')}</Label>
                                                                            <Controller
                                                                                name={`bogo_rules.${index}.buy_category_id` as any}
                                                                                control={control}
                                                                                render={({ field }) => (
                                                                                    <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                                                                                        <SelectTrigger className="h-9">
                                                                                            <SelectValue placeholder="Select category..." />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {(categoriesData as any)?.data?.map((cat: any) => (
                                                                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                                                                    {cat.name || cat.name_en}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* GET Section */}
                                                            <div className="bg-green-50 rounded-lg p-3 mb-3">
                                                                <p className="text-xs font-bold text-green-700 mb-2">🎁 {t('promoCodes.bogo.theyGet')}:</p>
                                                                <div className="grid grid-cols-4 gap-3">
                                                                    <div>
                                                                        <Label className="text-xs">{t('promoCodes.bogo.getQty')}</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            {...register(`bogo_rules.${index}.get_qty` as any)}
                                                                            className="h-9"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">{t('promoCodes.bogo.getFrom')}</Label>
                                                                        <Controller
                                                                            name={`bogo_rules.${index}.get_scope` as any}
                                                                            control={control}
                                                                            render={({ field }) => (
                                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="same">{t('promoCodes.bogo.sameProduct')}</SelectItem>
                                                                                        <SelectItem value="product">{t('promoCodes.bogo.specificProduct')}</SelectItem>
                                                                                        <SelectItem value="category">{t('promoCodes.bogo.fromCategory')}</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs">{t('promoCodes.bogo.discount')}</Label>
                                                                        <Controller
                                                                            name={`bogo_rules.${index}.get_discount_type` as any}
                                                                            control={control}
                                                                            render={({ field }) => (
                                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                                    <SelectTrigger className="h-9">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="free">{t('promoCodes.bogo.free')}</SelectItem>
                                                                                        <SelectItem value="percentage">{t('promoCodes.bogo.percentageOff')}</SelectItem>
                                                                                        <SelectItem value="fixed_amount">{t('promoCodes.bogo.fixedOff')}</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            )}
                                                                        />
                                                                    </div>
                                                                    {watch(`bogo_rules.${index}.get_discount_type`) !== 'free' && (
                                                                        <div>
                                                                            <Label className="text-xs">{t('promoCodes.bogo.discountValue')}</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                {...register(`bogo_rules.${index}.get_discount_value` as any)}
                                                                                placeholder={watch(`bogo_rules.${index}.get_discount_type`) === 'percentage' ? '50' : '10'}
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <Label className="text-xs">{t('promoCodes.bogo.maxPerOrder')}</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            {...register(`bogo_rules.${index}.max_applications_per_order` as any)}
                                                                            className="h-9"
                                                                        />
                                                                    </div>
                                                                    {watch(`bogo_rules.${index}.get_scope`) === 'product' && (
                                                                        <div className="col-span-4">
                                                                            <Label className="text-xs">{t('promoCodes.bogo.freeProductBarcode')}</Label>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="Product barcode"
                                                                                {...register(`bogo_rules.${index}.get_product_id` as any)}
                                                                                className="h-9"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {watch(`bogo_rules.${index}.get_scope`) === 'category' && (
                                                                        <div className="col-span-4">
                                                                            <Label className="text-xs">{t('promoCodes.bogo.freeFromCategory')}</Label>
                                                                            <Controller
                                                                                name={`bogo_rules.${index}.get_category_id` as any}
                                                                                control={control}
                                                                                render={({ field }) => (
                                                                                    <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                                                                                        <SelectTrigger className="h-9">
                                                                                            <SelectValue placeholder="Select category..." />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {(categoriesData as any)?.data?.map((cat: any) => (
                                                                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                                                                    {cat.name || cat.name_en}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Preview */}
                                                            <div className="text-sm font-medium text-blue-700 bg-blue-50 rounded p-2 border border-blue-200">
                                                                📋 <strong>Rule:</strong> Buy {watch(`bogo_rules.${index}.buy_qty`) || 2} {' '}
                                                                {watch(`bogo_rules.${index}.buy_scope`) === 'any' ? 'of any product' :
                                                                    watch(`bogo_rules.${index}.buy_scope`) === 'product' ? `of product #${watch(`bogo_rules.${index}.buy_product_id`) || '?'}` :
                                                                        'from selected category'} → Get {watch(`bogo_rules.${index}.get_qty`) || 1} {' '}
                                                                {watch(`bogo_rules.${index}.get_scope`) === 'same' ? 'of same product' :
                                                                    watch(`bogo_rules.${index}.get_scope`) === 'product' ? `of product #${watch(`bogo_rules.${index}.get_product_id`) || '?'}` :
                                                                        'from selected category'} {' '}
                                                                {watch(`bogo_rules.${index}.get_discount_type`) === 'free' ? 'FREE!' :
                                                                    watch(`bogo_rules.${index}.get_discount_type`) === 'percentage' ? `at ${watch(`bogo_rules.${index}.get_discount_value`) || 0}% off` :
                                                                        `with EGP ${watch(`bogo_rules.${index}.get_discount_value`) || 0} off`}
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <DialogFooter className="mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} animate-spin`} />
                                    ) : (
                                        <Sparkles className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    )}
                                    {editingPromoCode ? t('common.update') : t('common.create')} {t('promoCodes.promoCode')}
                                </Button>
                            </DialogFooter>
                        </>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
