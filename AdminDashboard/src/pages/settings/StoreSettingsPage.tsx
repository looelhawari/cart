import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { storeSettingsService, type WorkingHours } from '@/services/store-settings.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useTranslation } from 'react-i18next'
import {
    Clock, Store, DollarSign, Truck, AlertTriangle, CheckCircle,
    XCircle, RefreshCw, Save, Settings2, MapPin
} from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function StoreSettingsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // Local state for form
    const [openTime, setOpenTime] = useState('11:00')
    const [closeTime, setCloseTime] = useState('00:00')
    const [acceptOutsideHours, setAcceptOutsideHours] = useState(false)
    const [isClosedTemp, setIsClosedTemp] = useState(false)
    const [closureReasonEn, setClosureReasonEn] = useState('')
    const [closureReasonAr, setClosureReasonAr] = useState('')
    const [minOrderAmount, setMinOrderAmount] = useState('50')

    // Confirm dialog
    const [showCloseConfirm, setShowCloseConfirm] = useState(false)

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['store-settings'],
        queryFn: storeSettingsService.getAllSettings,
    })

    // Fetch store status
    const { data: storeStatus } = useQuery({
        queryKey: ['store-status'],
        queryFn: storeSettingsService.getStoreStatus,
        refetchInterval: 30000, // Refresh every 30 seconds
    })

    // Initialize form from settings
    useEffect(() => {
        if (settings?.grouped?.working_hours) {
            const wh = settings.grouped.working_hours
            setOpenTime(wh.store_open_time?.value as string || '11:00')
            setCloseTime(wh.store_close_time?.value as string || '00:00')
            setAcceptOutsideHours(wh.accept_orders_outside_hours?.value as boolean || false)
            setIsClosedTemp(wh.is_store_temporarily_closed?.value as boolean || false)
            setClosureReasonEn(wh.temporary_closure_reason_en?.value as string || '')
            setClosureReasonAr(wh.temporary_closure_reason_ar?.value as string || '')
        }
        if (settings?.grouped?.general) {
            const gen = settings.grouped.general
            setMinOrderAmount(String(gen.minimum_order_amount?.value || '50'))
        }
    }, [settings])

    // Update working hours mutation
    const updateWorkingHoursMutation = useMutation({
        mutationFn: (data: WorkingHours) => storeSettingsService.updateWorkingHours(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-settings'] })
            queryClient.invalidateQueries({ queryKey: ['store-status'] })
            toast({
                title: t('common.success'),
                description: t('settings.workingHoursUpdated'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('settings.updateError'),
                variant: 'destructive',
            })
        },
    })

    // Toggle closure mutation
    const toggleClosureMutation = useMutation({
        mutationFn: ({ isClosed, reasonEn, reasonAr }: { isClosed: boolean; reasonEn?: string; reasonAr?: string }) =>
            storeSettingsService.toggleStoreClosure(isClosed, reasonEn, reasonAr),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['store-settings'] })
            queryClient.invalidateQueries({ queryKey: ['store-status'] })
            toast({
                title: t('common.success'),
                description: data.is_open ? t('settings.storeOpened') : t('settings.storeClosed'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('settings.updateError'),
                variant: 'destructive',
            })
        },
    })

    // Update general settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: (settingsArr: Array<{ key: string; value: any }>) =>
            storeSettingsService.updateSettings(settingsArr),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-settings'] })
            toast({
                title: t('common.success'),
                description: t('settings.settingsUpdated'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('settings.updateError'),
                variant: 'destructive',
            })
        },
    })

    // Clear cache mutation
    const clearCacheMutation = useMutation({
        mutationFn: storeSettingsService.clearCache,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-settings'] })
            queryClient.invalidateQueries({ queryKey: ['store-status'] })
            toast({
                title: t('common.success'),
                description: t('settings.cacheCleared'),
            })
        },
    })

    const handleSaveWorkingHours = () => {
        updateWorkingHoursMutation.mutate({
            open_time: openTime,
            close_time: closeTime,
            accept_orders_outside_hours: acceptOutsideHours,
        })
    }

    const handleToggleClosure = () => {
        if (!isClosedTemp) {
            // Opening the confirm dialog to close store
            setShowCloseConfirm(true)
        } else {
            // Reopening the store
            toggleClosureMutation.mutate({ isClosed: false })
            setIsClosedTemp(false)
        }
    }

    const confirmStoreClosure = () => {
        toggleClosureMutation.mutate({
            isClosed: true,
            reasonEn: closureReasonEn || 'Store is temporarily closed',
            reasonAr: closureReasonAr || 'المتجر مغلق مؤقتاً',
        })
        setIsClosedTemp(true)
        setShowCloseConfirm(false)
    }

    const handleSaveDeliverySettings = () => {
        // Delivery fee is set per delivery zone, not globally.
        updateSettingsMutation.mutate([
            { key: 'minimum_order_amount', value: parseFloat(minOrderAmount) },
        ])
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-elbaraka-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary flex items-center gap-2">
                        <Settings2 className="h-8 w-8" />
                        {t('settings.storeSettings')}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('settings.storeSettingsDescription')}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => clearCacheMutation.mutate()}
                    disabled={clearCacheMutation.isPending}
                >
                    <RefreshCw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} ${clearCacheMutation.isPending ? 'animate-spin' : ''}`} />
                    {t('settings.clearCache')}
                </Button>
            </div>

            {/* Store Status Card */}
            <Card className={storeStatus?.is_open ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Store className="h-6 w-6" />
                            <div>
                                <CardTitle>{t('settings.storeStatus')}</CardTitle>
                                <CardDescription>
                                    {storeStatus?.is_open
                                        ? (isRTL ? storeStatus.message_ar : storeStatus.message)
                                        : (isRTL ? storeStatus?.message_ar : storeStatus?.message)}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={storeStatus?.is_open ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                            {storeStatus?.is_open ? (
                                <><CheckCircle className="h-4 w-4 mr-1" /> {t('settings.open')}</>
                            ) : (
                                <><XCircle className="h-4 w-4 mr-1" /> {t('settings.closed')}</>
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <Label>{t('settings.temporarilyClose')}</Label>
                            </div>
                            <Switch
                                checked={isClosedTemp}
                                onCheckedChange={handleToggleClosure}
                                disabled={toggleClosureMutation.isPending}
                            />
                        </div>
                        {isClosedTemp && (
                            <div className="grid gap-4 md:grid-cols-2 p-4 bg-red-50 rounded-lg border border-red-200">
                                <div>
                                    <Label>{t('settings.closureReasonEn')}</Label>
                                    <Textarea
                                        value={closureReasonEn}
                                        onChange={(e) => setClosureReasonEn(e.target.value)}
                                        placeholder="Store is temporarily closed for maintenance"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>{t('settings.closureReasonAr')}</Label>
                                    <Textarea
                                        value={closureReasonAr}
                                        onChange={(e) => setClosureReasonAr(e.target.value)}
                                        placeholder="المتجر مغلق مؤقتاً للصيانة"
                                        className="mt-1"
                                        dir="rtl"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Working Hours Card */}
            <Card>
                <CardHeader>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Clock className="h-6 w-6 text-blue-600" />
                        <div>
                            <CardTitle>{t('settings.workingHours')}</CardTitle>
                            <CardDescription>{t('settings.workingHoursDescription')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="openTime">{t('settings.openingTime')}</Label>
                                <Input
                                    id="openTime"
                                    type="time"
                                    value={openTime}
                                    onChange={(e) => setOpenTime(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="closeTime">{t('settings.closingTime')}</Label>
                                <Input
                                    id="closeTime"
                                    type="time"
                                    value={closeTime}
                                    onChange={(e) => setCloseTime(e.target.value)}
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t('settings.midnightNote')}
                                </p>
                            </div>
                        </div>

                        <div className={`flex items-center justify-between p-4 bg-blue-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <Label className="font-medium">{t('settings.acceptOrdersOutsideHours')}</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('settings.acceptOrdersOutsideHoursDescription')}
                                </p>
                            </div>
                            <Switch
                                checked={acceptOutsideHours}
                                onCheckedChange={setAcceptOutsideHours}
                            />
                        </div>

                        <Button
                            onClick={handleSaveWorkingHours}
                            disabled={updateWorkingHoursMutation.isPending}
                            className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                        >
                            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {updateWorkingHoursMutation.isPending ? t('common.saving') : t('settings.saveWorkingHours')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Delivery Settings Card */}
            <Card>
                <CardHeader>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Truck className="h-6 w-6 text-green-600" />
                        <div>
                            <CardTitle>{t('settings.deliverySettings')}</CardTitle>
                            <CardDescription>{t('settings.deliverySettingsDescription')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <Label htmlFor="minOrder">{t('settings.minimumOrderAmount')}</Label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="minOrder"
                                        type="number"
                                        value={minOrderAmount}
                                        onChange={(e) => setMinOrderAmount(e.target.value)}
                                        className="pl-9"
                                        min="0"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">EGP</p>
                            </div>
                        </div>

                        {/* Delivery fees are set PER ZONE — not globally. */}
                        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{t('settings.deliveryFeeMovedToZones')}</span>
                        </div>

                        <Button
                            onClick={handleSaveDeliverySettings}
                            disabled={updateSettingsMutation.isPending}
                            className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                        >
                            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {updateSettingsMutation.isPending ? t('common.saving') : t('settings.saveDeliverySettings')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Confirm Store Closure Dialog */}
            <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            {t('settings.confirmCloseStore')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('settings.confirmCloseStoreDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>{t('settings.closureReasonEn')}</Label>
                            <Textarea
                                value={closureReasonEn}
                                onChange={(e) => setClosureReasonEn(e.target.value)}
                                placeholder="Store is temporarily closed"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>{t('settings.closureReasonAr')}</Label>
                            <Textarea
                                value={closureReasonAr}
                                onChange={(e) => setClosureReasonAr(e.target.value)}
                                placeholder="المتجر مغلق مؤقتاً"
                                className="mt-1"
                                dir="rtl"
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmStoreClosure}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {t('settings.closeStore')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
