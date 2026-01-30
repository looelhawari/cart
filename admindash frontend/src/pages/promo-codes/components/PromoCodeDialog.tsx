import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promoCodeService, type CreatePromoCodeData } from '@/services/promo-code.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
    Plus, Search, Gift, Percent, Truck, ShoppingBag, Layers,
    Target, Sparkles, Star, UserPlus, Settings, MessageSquare,
    ShoppingCart, Package, DollarSign, Users, TrendingUp, Clock, AlertCircle, RefreshCw
} from 'lucide-react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { PromoCode } from '@/types'

interface PromoCodeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: PromoCode | null
    targetUserId?: number | null
    onSuccess?: () => void
}

interface PromoCodeFormData extends Omit<CreatePromoCodeData, 'specific_user_ids'> {
    specific_user_ids: string | number[]
}

export default function PromoCodeDialog({ open, onOpenChange, initialData, targetUserId, onSuccess }: PromoCodeDialogProps) {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('basic')
    const [productSearch, setProductSearch] = useState('')
    const [debouncedProductSearch, setDebouncedProductSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedProductSearch(productSearch)
        }, 500)
        return () => clearTimeout(timer)
    }, [productSearch])

    const { register, handleSubmit, reset, control, watch, formState: { errors }, setValue } = useForm<PromoCodeFormData>({
        defaultValues: {
            type: 'percentage',
            applies_to: 'order',
            is_active: true,
            first_order_only: false,
            bogo_rules: [],
            product_ids: [],
            category_ids: [],
            target_audience: targetUserId ? 'custom' : 'all_users',
            promotional_message: '',
            promotional_message_ar: '',
            minimum_spend_30days: undefined,
            minimum_orders_30days: undefined,
            last_order_date_from: undefined,
            last_order_date_to: undefined,
            registration_date_from: undefined,
            registration_date_to: undefined,
            location: '',
            specific_user_ids: targetUserId ? String(targetUserId) : '',
        }
    })

    const { fields: bogoFields, append: appendBogo, remove: removeBogo } = useFieldArray({
        control,
        name: 'bogo_rules' as any,
    })

    const watchType = watch('type')
    const watchAppliesTo = watch('applies_to')
    const watchTargetAudience = watch('target_audience' as any)

    // Reset form when opening/closing or changing initialData
    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    code: initialData.code,
                    type: initialData.type as any,
                    applies_to: (initialData as any).applies_to || 'order',
                    value: initialData.value,
                    minimum_order: initialData.minimum_order || undefined,
                    maximum_discount: initialData.maximum_discount || undefined,
                    usage_limit: initialData.usage_limit || undefined,
                    usage_per_user: (initialData as any).usage_per_user || undefined,
                    first_order_only: (initialData as any).first_order_only || false,
                    valid_from: initialData.valid_from?.split('T')[0] || '',
                    valid_until: initialData.valid_until?.split('T')[0] || '',
                    is_active: initialData.is_active,
                    product_ids: (initialData as any).products?.map((p: any) => p.id) || [],
                    category_ids: (initialData as any).categories?.map((c: any) => ({
                        id: c.id,
                        include_subcategories: c.pivot?.include_subcategories
                    })) || [],
                    bogo_rules: (initialData as any).bogo_rules || [],
                    target_audience: (initialData as any).target_audience || 'all_users',
                    promotional_message: (initialData as any).promotional_message || '',
                    promotional_message_ar: (initialData as any).promotional_message_ar || '',
                    minimum_spend_30days: (initialData as any).minimum_spend_30days || undefined,
                    minimum_orders_30days: (initialData as any).minimum_orders_30days || undefined,
                    last_order_date_from: (initialData as any).last_order_date_from || undefined,
                    last_order_date_to: (initialData as any).last_order_date_to || undefined,
                    registration_date_from: (initialData as any).registration_date_from || undefined,
                    registration_date_to: (initialData as any).registration_date_to || undefined,
                    location: (initialData as any).location || '',
                    specific_user_ids: (initialData as any).specific_user_ids?.join(',') || '',
                })
            } else {
                reset({
                    type: 'percentage',
                    applies_to: 'order',
                    is_active: true,
                    first_order_only: false,
                    bogo_rules: [],
                    product_ids: [],
                    category_ids: [],
                    target_audience: targetUserId ? 'custom' : 'all_users',
                    specific_user_ids: targetUserId ? String(targetUserId) : '',
                })
            }
            setActiveTab('basic')
        }
    }, [open, initialData, targetUserId, reset])

    const { data: productsData, isLoading: productsLoading } = useQuery({
        queryKey: ['promo-products', debouncedProductSearch],
        queryFn: () => promoCodeService.getProducts(debouncedProductSearch),
        enabled: open,
    })

    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ['promo-categories'],
        queryFn: () => promoCodeService.getCategories(),
        enabled: open,
    })

    const createMutation = useMutation({
        mutationFn: (data: CreatePromoCodeData) => promoCodeService.createPromoCode(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            queryClient.invalidateQueries({ queryKey: ['promo-analytics'] })
            onOpenChange(false)
            reset()
            onSuccess?.()
            toast({ title: t('common.success'), description: t('promoCodes.promoCreated') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('promoCodes.createError'),
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<CreatePromoCodeData> }) =>
            promoCodeService.updatePromoCode(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            onOpenChange(false)
            reset()
            onSuccess?.()
            toast({ title: t('common.success'), description: t('promoCodes.promoUpdated') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('promoCodes.updateError'),
                variant: 'destructive',
            })
        },
    })

    const onSubmit = (data: PromoCodeFormData) => {
        const cleanData: CreatePromoCodeData = {
            ...data,
            value: Number(data.value),
            minimum_order: data.minimum_order ? Number(data.minimum_order) : undefined,
            maximum_discount: data.maximum_discount ? Number(data.maximum_discount) : undefined,
            usage_limit: data.usage_limit ? Number(data.usage_limit) : undefined,
            usage_per_user: data.usage_per_user ? Number(data.usage_per_user) : undefined,
            minimum_spend_30days: (data as any).minimum_spend_30days ? Number((data as any).minimum_spend_30days) : undefined,
            minimum_orders_30days: (data as any).minimum_orders_30days ? Number((data as any).minimum_orders_30days) : undefined,
            specific_user_ids: (typeof data.specific_user_ids === 'string')
                ? (data.specific_user_ids as string).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
                : data.specific_user_ids as number[],
        }

        if (initialData) {
            updateMutation.mutate({ id: initialData.id, data: cleanData })
        } else {
            createMutation.mutate(cleanData)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Sparkles className="w-5 h-5 text-elbaraka-primary" />
                        {initialData ? t('promoCodes.editPromoCode') : t('promoCodes.createExtraordinary')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('promoCodes.dialogDescription')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-4 mb-4">
                            <TabsTrigger value="basic">
                                {t('promoCodes.basicInfo')}
                            </TabsTrigger>
                            <TabsTrigger value="targeting">
                                {t('promoCodes.targeting.title')}
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
                                        disabled={!!initialData}
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

                            <div className="mt-4">
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

                        <TabsContent value="targeting" className="space-y-6">
                            {/* Section 1: User Targeting */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <h4 className="font-semibold text-indigo-800">{t('promoCodes.targeting.userSegment')}</h4>
                                </div>
                                <p className="text-sm text-indigo-600 mb-4">{t('promoCodes.targeting.userSegmentDesc')}</p>

                                <Controller
                                    name={'target_audience' as any}
                                    control={control}
                                    render={({ field }) => (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {/* All Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'all_users' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="all_users"
                                                    checked={field.value === 'all_users'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-gray-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.allUsers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.allUsersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* New Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'new_users' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="new_users"
                                                    checked={field.value === 'new_users'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <UserPlus className="w-4 h-4 text-green-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.newUsers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.newUsersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* High Spenders */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'high_spenders' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="high_spenders"
                                                    checked={field.value === 'high_spenders'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="w-4 h-4 text-amber-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.highSpenders')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.highSpendersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* Active Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'active_users' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="active_users"
                                                    checked={field.value === 'active_users'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="w-4 h-4 text-blue-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.activeUsers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.activeUsersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* Delivery Lovers */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'delivery_lovers' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="delivery_lovers"
                                                    checked={field.value === 'delivery_lovers'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="w-4 h-4 text-cyan-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.deliveryLovers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.deliveryLoversDesc')}</p>
                                                </div>
                                            </label>

                                            {/* High Rated Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'high_rated' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="high_rated"
                                                    checked={field.value === 'high_rated'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Star className="w-4 h-4 text-yellow-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.highRated')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.highRatedDesc')}</p>
                                                </div>
                                            </label>

                                            {/* Inactive Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'inactive_users' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-400 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="inactive_users"
                                                    checked={field.value === 'inactive_users'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.inactiveUsers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.inactiveUsersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* Offline Users */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'offline_users' ? 'border-slate-500 bg-slate-50' : 'border-gray-200 hover:border-slate-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="offline_users"
                                                    checked={field.value === 'offline_users'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-slate-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.offlineUsers')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.offlineUsersDesc')}</p>
                                                </div>
                                            </label>

                                            {/* Custom Criteria */}
                                            <label className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'custom' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-rose-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="custom"
                                                    checked={field.value === 'custom'}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Settings className="w-4 h-4 text-rose-600" />
                                                        <span className="font-medium">{t('promoCodes.targeting.custom')}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.customDesc')}</p>
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                />

                                {/* Custom Criteria Fields */}
                                {watchTargetAudience === 'custom' && (
                                    <div className="mt-4 p-4 bg-white rounded-lg border border-rose-200 space-y-4">
                                        <h5 className="font-medium text-gray-700">{t('promoCodes.targeting.customCriteria')}</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>{t('promoCodes.targeting.minSpend30Days')}</Label>
                                                <Input
                                                    type="number"
                                                    {...register('minimum_spend_30days' as any)}
                                                    placeholder="10000"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.minSpendHint')}</p>
                                            </div>
                                            <div>
                                                <Label>{t('promoCodes.targeting.minOrders30Days')}</Label>
                                                <Input
                                                    type="number"
                                                    {...register('minimum_orders_30days' as any)}
                                                    placeholder="5"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.minOrdersHint')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>{t('promoCodes.targeting.lastOrderDate')}</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="date" {...register('last_order_date_from' as any)} placeholder={t('promoCodes.targeting.from')} />
                                                    <Input type="date" {...register('last_order_date_to' as any)} placeholder={t('promoCodes.targeting.to')} />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>{t('promoCodes.targeting.registrationDate')}</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="date" {...register('registration_date_from' as any)} placeholder={t('promoCodes.targeting.from')} />
                                                    <Input type="date" {...register('registration_date_to' as any)} placeholder={t('promoCodes.targeting.to')} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>{t('promoCodes.targeting.locationCity')}</Label>
                                                <Input {...register('location' as any)} placeholder="Cairo, Alex..." />
                                            </div>
                                            <div>
                                                <Label>{t('promoCodes.targeting.specificUserIds')}</Label>
                                                <Input {...register('specific_user_ids' as any)} placeholder={t('promoCodes.targeting.specificUserIdsHint')} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* High Spenders - Extra Fields */}
                                {watchTargetAudience === 'high_spenders' && (
                                    <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                                        <div>
                                            <Label>{t('promoCodes.targeting.minSpendAmount')}</Label>
                                            <Input
                                                type="number"
                                                {...register('minimum_spend_30days' as any)}
                                                placeholder="10000"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">{t('promoCodes.targeting.minSpendAmountHint')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Product/Category Targeting */}
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                                    <h4 className="font-semibold text-emerald-800">{t('promoCodes.targeting.productScope')}</h4>
                                </div>
                                <p className="text-sm text-emerald-600 mb-4">{t('promoCodes.targeting.productScopeDesc')}</p>

                                <Controller
                                    name="applies_to"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'order' ? 'border-emerald-500 bg-emerald-100' : 'border-gray-200 hover:border-emerald-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="order"
                                                    checked={field.value === 'order'}
                                                    className="hidden"
                                                />
                                                <ShoppingCart className={`w-8 h-8 mb-2 ${field.value === 'order' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${field.value === 'order' ? 'text-emerald-700' : 'text-gray-600'}`}>{t('promoCodes.allProducts')}</span>
                                                <p className="text-xs text-gray-500 mt-1 text-center">{t('promoCodes.targeting.allProductsHint')}</p>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'product' ? 'border-emerald-500 bg-emerald-100' : 'border-gray-200 hover:border-emerald-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="product"
                                                    checked={field.value === 'product'}
                                                    className="hidden"
                                                />
                                                <Package className={`w-8 h-8 mb-2 ${field.value === 'product' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${field.value === 'product' ? 'text-emerald-700' : 'text-gray-600'}`}>{t('promoCodes.specificProducts')}</span>
                                                <p className="text-xs text-gray-500 mt-1 text-center">{t('promoCodes.targeting.specificProductsHint')}</p>
                                            </label>

                                            <label className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'category' ? 'border-emerald-500 bg-emerald-100' : 'border-gray-200 hover:border-emerald-300 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    {...field}
                                                    value="category"
                                                    checked={field.value === 'category'}
                                                    className="hidden"
                                                />
                                                <Layers className={`w-8 h-8 mb-2 ${field.value === 'category' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                                <span className={`font-medium ${field.value === 'category' ? 'text-emerald-700' : 'text-gray-600'}`}>{t('promoCodes.specificCategories')}</span>
                                                <p className="text-xs text-gray-500 mt-1 text-center">{t('promoCodes.targeting.specificCategoriesHint')}</p>
                                            </label>
                                        </div>
                                    )}
                                />

                                {/* Product Selection */}
                                {watchAppliesTo === 'product' && (
                                    <div className="mt-4 bg-white rounded-lg border border-emerald-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-base font-semibold">{t('promoCodes.selectProductsToApply')}</Label>
                                            <Badge variant="outline">{t('promoCodes.targeting.selectedCount', { count: watch('product_ids')?.length || 0 })}</Badge>
                                        </div>
                                        <div className="relative mb-3">
                                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                                            <Input
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                placeholder={t('promoCodes.targeting.searchProductsPlaceholder')}
                                                className={`h-9 ${isRTL ? 'pr-9' : 'pl-9'}`}
                                            />
                                        </div>
                                        {productsLoading ? (
                                            <div className={`flex items-center justify-center py-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                                <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-500`}>{t('promoCodes.loadingProducts')}</span>
                                            </div>
                                        ) : (
                                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                                {(productsData as any)?.data?.length > 0 ? (
                                                    (productsData as any).data.map((product: any) => (
                                                        <label key={product.id || product.barcode} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                value={product.id || product.barcode}
                                                                {...register('product_ids')}
                                                                className="rounded w-4 h-4 text-emerald-600"
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

                                {/* Category Selection */}
                                {watchAppliesTo === 'category' && (
                                    <div className="mt-4 bg-white rounded-lg border border-emerald-200 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-base font-semibold">{t('promoCodes.selectCategoriesToApply')}</Label>
                                            <Badge variant="outline">{t('promoCodes.targeting.selectedCount', { count: 0 })}</Badge>
                                        </div>
                                        {categoriesLoading ? (
                                            <div className={`flex items-center justify-center py-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                                <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-500`}>{t('promoCodes.loadingCategories')}</span>
                                            </div>
                                        ) : (
                                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                                {(categoriesData as any)?.data?.length > 0 ? (
                                                    (categoriesData as any).data.map((category: any) => (
                                                        <div key={category.id} className="border-b last:border-b-0">
                                                            <label className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    value={category.id}
                                                                    className="rounded w-4 h-4 text-emerald-600"
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

                                {/* All Products Info */}
                                {watchAppliesTo === 'order' && (
                                    <div className="mt-4 text-center py-6 bg-white rounded-lg border border-emerald-200">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                                        <h3 className="font-semibold text-gray-700">{t('promoCodes.appliesToEntireOrder')}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{t('promoCodes.entireOrderDesc')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Section 3: Promotional Message */}
                            <div className="bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <MessageSquare className="w-5 h-5 text-pink-600" />
                                    <h4 className="font-semibold text-pink-800">{t('promoCodes.targeting.promoMessage')}</h4>
                                </div>
                                <p className="text-sm text-pink-600 mb-4">{t('promoCodes.targeting.promoMessageDesc')}</p>

                                <div className="space-y-4">
                                    <div className="bg-white rounded-lg border border-pink-200 p-4">
                                        <Label className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🇬🇧</span>
                                            {t('promoCodes.targeting.messageEnglish')}
                                        </Label>
                                        <textarea
                                            {...register('promotional_message' as any)}
                                            className="w-full border rounded-lg p-3 text-sm resize-none"
                                            rows={3}
                                            placeholder={t('promoCodes.targeting.messageEnglishPlaceholder')}
                                        />
                                    </div>

                                    <div className="bg-white rounded-lg border border-pink-200 p-4">
                                        <Label className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🇸🇦</span>
                                            {t('promoCodes.targeting.messageArabic')}
                                        </Label>
                                        <textarea
                                            {...register('promotional_message_ar' as any)}
                                            className="w-full border rounded-lg p-3 text-sm resize-none text-right"
                                            dir="rtl"
                                            rows={3}
                                            placeholder={t('promoCodes.targeting.messageArabicPlaceholder')}
                                        />
                                    </div>

                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                                            <p className="text-xs text-orange-700">{t('promoCodes.targeting.messageNote')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                                <div key={field.id} className="p-4 border-2 border-purple-100 rounded-lg">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <span className="text-sm font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">Rule #{index + 1}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeBogo(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            {t('common.delete')}
                                                        </Button>
                                                    </div>
                                                    {/* Simplified BOGO fields for brevity, assuming standard structure */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>{t('promoCodes.bogo.buyQty')}</Label>
                                                            <Input type="number" {...register(`bogo_rules.${index}.buy_qty` as any)} />
                                                        </div>
                                                        <div>
                                                            <Label>{t('promoCodes.bogo.getQty')}</Label>
                                                            <Input type="number" {...register(`bogo_rules.${index}.get_qty` as any)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className={`mt-6 flex justify-end gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {initialData ? t('common.saveChanges') : t('common.create')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
