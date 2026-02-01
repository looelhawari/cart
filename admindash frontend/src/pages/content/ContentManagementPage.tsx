import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staticPageService, type StaticPage, type UpdatePageRequest } from '@/services/static-page.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    FileText,
    Shield,
    Info,
    Edit,
    Bell,
    Clock,
    CheckCircle,
    XCircle,
    Send,
    History,
    Eye,
    Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'

interface PageFormData {
    title_en: string
    title_ar: string
    content_en: string
    content_ar: string
    is_active: boolean
    send_notification: boolean
    notification_title_en: string
    notification_title_ar: string
    notification_message_en: string
    notification_message_ar: string
}

const pageIcons: Record<string, React.ElementType> = {
    terms: FileText,
    privacy: Shield,
    about: Info,
}

const pageColors: Record<string, string> = {
    terms: 'bg-blue-500',
    privacy: 'bg-green-500',
    about: 'bg-purple-500',
}

export default function ContentManagementPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const [selectedPage, setSelectedPage] = useState<StaticPage | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
    const [previewLang, setPreviewLang] = useState<'en' | 'ar'>('en')
    const [activeTab, setActiveTab] = useState<'content' | 'notification'>('content')

    const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<PageFormData>({
        defaultValues: {
            send_notification: false,
            is_active: true,
        }
    })

    const sendNotification = watch('send_notification')

    // Fetch all pages
    const { data: pages, isLoading, isError, error } = useQuery({
        queryKey: ['static-pages'],
        queryFn: () => staticPageService.getPages(),
    })

    // Log error for debugging
    if (isError) {
        console.error('Failed to fetch static pages:', error)
    }

    // Fetch page history
    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['static-page-history', selectedPage?.slug],
        queryFn: () => staticPageService.getHistory(selectedPage!.slug),
        enabled: !!selectedPage && isHistoryDialogOpen,
    })

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ slug, data }: { slug: string; data: UpdatePageRequest }) =>
            staticPageService.updatePage(slug, data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['static-pages'] })
            setIsEditDialogOpen(false)
            reset()
            toast({
                title: t('common.success'),
                description: response.notification_sent
                    ? t('contentManagement.updateSuccessWithNotification')
                    : t('contentManagement.updateSuccess'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('contentManagement.updateError'),
                variant: 'destructive',
            })
        },
    })

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: (slug: string) => staticPageService.toggleStatus(slug),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['static-pages'] })
            toast({
                title: t('common.success'),
                description: t('contentManagement.statusUpdated'),
            })
        },
        onError: () => {
            toast({
                title: t('common.error'),
                description: t('contentManagement.statusUpdateError'),
                variant: 'destructive',
            })
        },
    })

    const handleEdit = (page: StaticPage) => {
        setSelectedPage(page)
        reset({
            title_en: page.title_en,
            title_ar: page.title_ar,
            content_en: page.content_en,
            content_ar: page.content_ar,
            is_active: page.is_active,
            send_notification: false,
            notification_title_en: getDefaultNotificationTitle(page.slug, 'en'),
            notification_title_ar: getDefaultNotificationTitle(page.slug, 'ar'),
            notification_message_en: getDefaultNotificationMessage(page.slug, 'en'),
            notification_message_ar: getDefaultNotificationMessage(page.slug, 'ar'),
        })
        setActiveTab('content')
        setIsEditDialogOpen(true)
    }

    const handlePreview = (page: StaticPage) => {
        setSelectedPage(page)
        setPreviewLang(isRTL ? 'ar' : 'en')
        setIsPreviewDialogOpen(true)
    }

    const handleHistory = (page: StaticPage) => {
        setSelectedPage(page)
        setIsHistoryDialogOpen(true)
    }

    const onSubmit = (data: PageFormData) => {
        if (!selectedPage) return

        const updateData: UpdatePageRequest = {
            title_en: data.title_en,
            title_ar: data.title_ar,
            content_en: data.content_en,
            content_ar: data.content_ar,
            is_active: data.is_active,
            send_notification: data.send_notification,
        }

        if (data.send_notification) {
            updateData.notification_title_en = data.notification_title_en
            updateData.notification_title_ar = data.notification_title_ar
            updateData.notification_message_en = data.notification_message_en
            updateData.notification_message_ar = data.notification_message_ar
        }

        updateMutation.mutate({ slug: selectedPage.slug, data: updateData })
    }

    const getPageTitle = (slug: string) => {
        const titles: Record<string, { en: string; ar: string }> = {
            terms: { en: 'Terms and Conditions', ar: 'الشروط والأحكام' },
            privacy: { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
            about: { en: 'About Us', ar: 'من نحن' },
        }
        return isRTL ? titles[slug]?.ar : titles[slug]?.en
    }

    const getDefaultNotificationTitle = (slug: string, lang: 'en' | 'ar') => {
        const titles: Record<string, { en: string; ar: string }> = {
            terms: { en: 'Terms and Conditions Updated', ar: 'تم تحديث الشروط والأحكام' },
            privacy: { en: 'Privacy Policy Updated', ar: 'تم تحديث سياسة الخصوصية' },
            about: { en: 'About Us Updated', ar: 'تم تحديث صفحة من نحن' },
        }
        return titles[slug]?.[lang] || ''
    }

    const getDefaultNotificationMessage = (slug: string, lang: 'en' | 'ar') => {
        const messages: Record<string, { en: string; ar: string }> = {
            terms: {
                en: 'Our terms and conditions have been updated. Please review the changes.',
                ar: 'تم تحديث الشروط والأحكام الخاصة بنا. يرجى مراجعة التغييرات.'
            },
            privacy: {
                en: 'Our privacy policy has been updated. Please review the changes.',
                ar: 'تم تحديث سياسة الخصوصية الخاصة بنا. يرجى مراجعة التغييرات.'
            },
            about: {
                en: 'Our about page has been updated with new information.',
                ar: 'تم تحديث صفحة من نحن بمعلومات جديدة.'
            },
        }
        return messages[slug]?.[lang] || ''
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <XCircle className="w-12 h-12 text-red-500" />
                <p className="text-lg font-medium text-red-600">{t('common.error')}</p>
                <p className="text-sm text-muted-foreground">
                    {(error as any)?.message || t('contentManagement.fetchError') || 'Failed to load pages'}
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                    {t('common.retry') || 'Retry'}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">{t('contentManagement.title')}</h1>
                <p className="text-muted-foreground">{t('contentManagement.subtitle')}</p>
            </div>

            {/* Page Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pages?.map((page) => {
                    const Icon = pageIcons[page.slug] || FileText
                    const colorClass = pageColors[page.slug] || 'bg-gray-500'

                    return (
                        <Card key={page.id} className="relative overflow-hidden">
                            <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 h-full ${colorClass}`} />
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                                            <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{getPageTitle(page.slug)}</CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                {page.slug.toUpperCase()}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={page.is_active}
                                            onCheckedChange={() => toggleStatusMutation.mutate(page.slug)}
                                            disabled={toggleStatusMutation.isPending}
                                        />
                                        {page.is_active ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                <CheckCircle className="w-3 h-3" />
                                                {t('common.active')}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                                <XCircle className="w-3 h-3" />
                                                {t('common.inactive')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{t('contentManagement.lastUpdated')}:</span>
                                    </div>
                                    <p className="font-medium text-foreground">
                                        {page.last_updated_at
                                            ? format(new Date(page.last_updated_at), 'PPp')
                                            : t('contentManagement.neverUpdated')}
                                    </p>
                                    {page.updated_by && (
                                        <p className="text-xs mt-1">
                                            {t('contentManagement.by')} {page.updated_by.name}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePreview(page)}
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 me-1" />
                                        {t('contentManagement.preview')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleHistory(page)}
                                        className="flex-1"
                                    >
                                        <History className="w-4 h-4 me-1" />
                                        {t('contentManagement.history')}
                                    </Button>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => handleEdit(page)}
                                >
                                    <Edit className="w-4 h-4 me-2" />
                                    {t('contentManagement.editPage')}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5" />
                            {t('contentManagement.editPage')}: {selectedPage && getPageTitle(selectedPage.slug)}
                        </DialogTitle>
                        <DialogDescription>
                            {t('contentManagement.editDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'content' | 'notification')}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="content" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {t('contentManagement.contentTab')}
                                </TabsTrigger>
                                <TabsTrigger value="notification" className="flex items-center gap-2">
                                    <Bell className="w-4 h-4" />
                                    {t('contentManagement.notificationTab')}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="content" className="space-y-4 mt-4">
                                {/* Status Toggle */}
                                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                    <div>
                                        <Label className="font-medium">{t('contentManagement.pageStatus')}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('contentManagement.pageStatusDescription')}
                                        </p>
                                    </div>
                                    <Controller
                                        name="is_active"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>

                                {/* English Content */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        🇬🇧 {t('contentManagement.englishContent')}
                                    </h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="title_en">{t('contentManagement.title')} (EN)</Label>
                                        <Input
                                            id="title_en"
                                            {...register('title_en', { required: true })}
                                            placeholder="Enter title in English"
                                            dir="ltr"
                                        />
                                        {errors.title_en && (
                                            <p className="text-sm text-destructive">{t('common.required')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="content_en">{t('contentManagement.content')} (EN)</Label>
                                        <Textarea
                                            id="content_en"
                                            {...register('content_en', { required: true })}
                                            placeholder="Enter content in English (HTML supported)"
                                            rows={8}
                                            dir="ltr"
                                            className="font-mono text-sm"
                                        />
                                        {errors.content_en && (
                                            <p className="text-sm text-destructive">{t('common.required')}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {t('contentManagement.htmlSupported')}
                                        </p>
                                    </div>
                                </div>

                                {/* Arabic Content */}
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        🇸🇦 {t('contentManagement.arabicContent')}
                                    </h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="title_ar">{t('contentManagement.title')} (AR)</Label>
                                        <Input
                                            id="title_ar"
                                            {...register('title_ar', { required: true })}
                                            placeholder="أدخل العنوان بالعربية"
                                            dir="rtl"
                                        />
                                        {errors.title_ar && (
                                            <p className="text-sm text-destructive">{t('common.required')}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="content_ar">{t('contentManagement.content')} (AR)</Label>
                                        <Textarea
                                            id="content_ar"
                                            {...register('content_ar', { required: true })}
                                            placeholder="أدخل المحتوى بالعربية (يدعم HTML)"
                                            rows={8}
                                            dir="rtl"
                                            className="font-mono text-sm"
                                        />
                                        {errors.content_ar && (
                                            <p className="text-sm text-destructive">{t('common.required')}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            {t('contentManagement.htmlSupported')}
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="notification" className="space-y-4 mt-4">
                                {/* Notification Toggle */}
                                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div>
                                        <Label className="font-medium flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-amber-600" />
                                            {t('contentManagement.sendNotification')}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t('contentManagement.sendNotificationDescription')}
                                        </p>
                                    </div>
                                    <Controller
                                        name="send_notification"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>

                                {sendNotification && (
                                    <>
                                        {/* English Notification */}
                                        <div className="space-y-4 p-4 border rounded-lg">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                🇬🇧 {t('contentManagement.notificationEnglish')}
                                            </h3>
                                            <div className="space-y-2">
                                                <Label htmlFor="notification_title_en">
                                                    {t('contentManagement.notificationTitle')} (EN)
                                                </Label>
                                                <Input
                                                    id="notification_title_en"
                                                    {...register('notification_title_en', {
                                                        required: sendNotification
                                                    })}
                                                    placeholder="Notification title in English"
                                                    dir="ltr"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="notification_message_en">
                                                    {t('contentManagement.notificationMessage')} (EN)
                                                </Label>
                                                <Textarea
                                                    id="notification_message_en"
                                                    {...register('notification_message_en', {
                                                        required: sendNotification
                                                    })}
                                                    placeholder="Notification message in English"
                                                    rows={3}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>

                                        {/* Arabic Notification */}
                                        <div className="space-y-4 p-4 border rounded-lg">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                🇸🇦 {t('contentManagement.notificationArabic')}
                                            </h3>
                                            <div className="space-y-2">
                                                <Label htmlFor="notification_title_ar">
                                                    {t('contentManagement.notificationTitle')} (AR)
                                                </Label>
                                                <Input
                                                    id="notification_title_ar"
                                                    {...register('notification_title_ar', {
                                                        required: sendNotification
                                                    })}
                                                    placeholder="عنوان الإشعار بالعربية"
                                                    dir="rtl"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="notification_message_ar">
                                                    {t('contentManagement.notificationMessage')} (AR)
                                                </Label>
                                                <Textarea
                                                    id="notification_message_ar"
                                                    {...register('notification_message_ar', {
                                                        required: sendNotification
                                                    })}
                                                    placeholder="رسالة الإشعار بالعربية"
                                                    rows={3}
                                                    dir="rtl"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-700 flex items-center gap-2">
                                                <Send className="w-4 h-4" />
                                                {t('contentManagement.notificationInfo')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending && (
                                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                                )}
                                {sendNotification ? (
                                    <>
                                        <Send className="w-4 h-4 me-2" />
                                        {t('contentManagement.saveAndNotify')}
                                    </>
                                ) : (
                                    t('common.save')
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                {t('contentManagement.preview')}: {selectedPage && getPageTitle(selectedPage.slug)}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant={previewLang === 'en' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewLang('en')}
                                >
                                    🇬🇧 EN
                                </Button>
                                <Button
                                    variant={previewLang === 'ar' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setPreviewLang('ar')}
                                >
                                    🇸🇦 AR
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedPage && (
                        <div
                            className="prose prose-sm max-w-none p-4 bg-muted rounded-lg"
                            dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
                        >
                            <h1>{previewLang === 'ar' ? selectedPage.title_ar : selectedPage.title_en}</h1>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: previewLang === 'ar' ? selectedPage.content_ar : selectedPage.content_en
                                }}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            {t('contentManagement.notificationHistory')}: {selectedPage && getPageTitle(selectedPage.slug)}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : historyData?.notifications.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>{t('contentManagement.noNotifications')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {historyData?.notifications.map((notification) => (
                                    <Card key={notification.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <Bell className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">
                                                    {isRTL ? notification.title_ar : notification.title_en}
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {isRTL ? notification.message_ar : notification.message_en}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(notification.sent_at), 'PPp')}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
