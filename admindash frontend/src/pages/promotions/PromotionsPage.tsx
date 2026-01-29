import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotionService, type PromotionFilters } from '@/services/promotion.service'
import { categoryService } from '@/services/category.service'
import { productService } from '@/services/product.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Edit, Trash2, Star, StarOff, X, Package } from 'lucide-react'
import { format } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import type { Promotion } from '@/types'

export default function PromotionsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [filters, setFilters] = useState<PromotionFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null)

    // Product search and selection states
    const [productSearchTerm, setProductSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState<any[]>([])
    const [productPage, setProductPage] = useState(1)
    const productsPerPage = 10

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { register, handleSubmit, reset, watch, control } = useForm()

    const appliesTo = watch('applies_to', 'all')

    const { data: promotionsData, isLoading } = useQuery({
        queryKey: ['promotions', filters],
        queryFn: () => promotionService.getPromotions(filters),
    })

    const { data: categories } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: () => categoryService.getCategoryTree(),
    })

    const { data: products, isLoading: isLoadingProducts, error: _productsError } = useQuery({
        queryKey: ['products-all'],
        queryFn: async () => {
            try {
                const result = await productService.getProducts({ per_page: 1000 })
                console.log('Products loaded:', result)
                return result
            } catch (error: any) {
                console.error('Failed to load products:', error)
                console.error('Error response:', error.response?.data)
                toast({
                    title: t('promotions.errorLoadingProducts'),
                    description: error.response?.data?.message || t('promotions.createError'),
                    variant: 'destructive',
                })
                throw error
            }
        },
        enabled: appliesTo === 'products',
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        retry: false,
    })

    // Filter and paginate products for the selector
    const filteredProducts = useMemo(() => {
        if (!products?.data) return []

        const search = productSearchTerm.toLowerCase()
        if (!search) return products.data

        return products.data.filter((product: any) =>
            product.name_en?.toLowerCase().includes(search) ||
            product.name_ar?.toLowerCase().includes(search) ||
            product.barcode?.toLowerCase().includes(search) ||
            product.price?.toString().includes(search)
        )
    }, [products, productSearchTerm])

    const paginatedProducts = useMemo(() => {
        const startIndex = (productPage - 1) * productsPerPage
        const endIndex = startIndex + productsPerPage
        return filteredProducts.slice(startIndex, endIndex)
    }, [filteredProducts, productPage])

    const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage)

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return promotionService.createPromotion(data, selectedImageFile || undefined, selectedBannerFile || undefined)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            setIsCreateDialogOpen(false)
            reset()
            setSelectedImageFile(null)
            setSelectedBannerFile(null)
            toast({
                title: t('common.success'),
                description: t('promotions.createSuccess'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('promotions.createError'),
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            return promotionService.updatePromotion(id, data, selectedImageFile || undefined, selectedBannerFile || undefined)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            setEditingPromotion(null)
            setSelectedImageFile(null)
            setSelectedBannerFile(null)
            toast({
                title: t('common.success'),
                description: t('promotions.updateSuccess'),
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('promotions.updateError'),
                variant: 'destructive',
            })
        },
    })

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

    const handleEdit = (promotion: Promotion) => {
        setEditingPromotion(promotion)

        // Set selected products if editing a products promotion
        if (promotion.applies_to === 'products' && promotion.products) {
            setSelectedProducts(promotion.products)
        } else {
            setSelectedProducts([])
        }

        reset({
            title: promotion.title,
            title_ar: promotion.title_ar,
            description: promotion.description,
            description_ar: promotion.description_ar,
            discount_type: promotion.discount_type,
            discount_value: promotion.discount_value,
            start_date: format(new Date(promotion.start_date), "yyyy-MM-dd'T'HH:mm"),
            end_date: format(new Date(promotion.end_date), "yyyy-MM-dd'T'HH:mm"),
            is_active: promotion.is_active,
            is_featured: promotion.is_featured,
            applies_to: promotion.applies_to,
            min_purchase: promotion.min_purchase,
            max_discount: promotion.max_discount,
            terms_conditions: promotion.terms_conditions,
            terms_conditions_ar: promotion.terms_conditions_ar,
            category_ids: promotion.categories?.map(c => c.id),
            product_barcodes: promotion.products?.map(p => p.barcode),
        })
    }

    const onSubmit = (data: any) => {
        // Add selected products barcodes to form data
        if (appliesTo === 'products') {
            data.product_barcodes = selectedProducts.map(p => p.barcode)
        }

        if (editingPromotion) {
            updateMutation.mutate({ id: editingPromotion.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    const handleAddProduct = (product: any) => {
        if (!selectedProducts.find(p => p.barcode === product.barcode)) {
            setSelectedProducts([...selectedProducts, product])
        }
    }

    const handleRemoveProduct = (barcode: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.barcode !== barcode))
    }

    const handleClearProducts = () => {
        setSelectedProducts([])
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
            return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">{t('common.inactive')}</span>
        }
        if (promotion.is_currently_active) {
            return <span className="px-2 py-1 text-xs rounded bg-green-200 text-green-700">{t('common.active')}</span>
        }
        const now = new Date()
        const start = new Date(promotion.start_date)
        if (now < start) {
            return <span className="px-2 py-1 text-xs rounded bg-blue-200 text-blue-700">{t('promotions.scheduled')}</span>
        }
        return <span className="px-2 py-1 text-xs rounded bg-red-200 text-red-700">{t('promotions.expired')}</span>
    }

    return (
        <div className={`p-6 space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h1 className="text-3xl font-bold">{t('promotions.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('promotions.subtitle')}</p>
                </div>
                <Button onClick={() => { reset(); setIsCreateDialogOpen(true) }}>
                    <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('promotions.createPromotion')}
                </Button>
            </div>

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
                        <Button onClick={handleSearch}>
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

                    {isLoading ? (
                        <div className="text-center py-8">{t('common.loading')}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promotions.promotion')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promotions.discount')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promotions.appliesTo')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promotions.duration')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.status')}</th>
                                        <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('promotions.featured')}</th>
                                        <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {((promotionsData?.data as Promotion[] | undefined) || ((promotionsData as any)?.data?.data as Promotion[] | undefined))?.map((promotion: Promotion) => (
                                        <tr key={promotion.id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    {promotion.image_url && (
                                                        <img
                                                            src={promotion.image_url}
                                                            alt={promotion.title}
                                                            className="w-12 h-12 object-cover rounded"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{promotion.title}</div>
                                                        <div className="text-sm text-gray-500">{promotion.title_ar}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-semibold text-green-600">
                                                    {promotion.discount_type === 'percentage'
                                                        ? `${promotion.discount_value}%`
                                                        : formatCurrency(promotion.discount_value)
                                                    }
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="capitalize">{promotion.applies_to}</span>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div>{format(new Date(promotion.start_date), 'MMM dd, yyyy')}</div>
                                                <div className="text-gray-500">
                                                    to {format(new Date(promotion.end_date), 'MMM dd, yyyy')}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {getStatusBadge(promotion)}
                                            </td>
                                            <td className="p-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleFeatured(promotion.id)}
                                                >
                                                    {promotion.is_featured ? (
                                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    ) : (
                                                        <StarOff className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </Button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(promotion)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(promotion.id)}
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

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateDialogOpen || !!editingPromotion} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateDialogOpen(false)
                    setEditingPromotion(null)
                    reset()
                    setSelectedImageFile(null)
                    setSelectedBannerFile(null)
                    setSelectedProducts([])
                    setProductSearchTerm('')
                    setProductPage(1)
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                    <DialogHeader>
                        <DialogTitle>
                            {editingPromotion ? t('promotions.editPromotion') : t('promotions.createNewPromotion')}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="title">{t('promotions.form.titleEnglish')} *</Label>
                                <Input
                                    id="title"
                                    {...register('title', { required: true })}
                                    placeholder="Weekend Sale"
                                />
                            </div>
                            <div>
                                <Label htmlFor="title_ar">{t('promotions.form.titleArabic')} *</Label>
                                <Input
                                    id="title_ar"
                                    {...register('title_ar', { required: true })}
                                    placeholder="تخفيضات نهاية الأسبوع"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="description">{t('promotions.form.descriptionEnglish')}</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder="Get up to 50% off on selected items"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description_ar">{t('promotions.form.descriptionArabic')}</Label>
                                <Textarea
                                    id="description_ar"
                                    {...register('description_ar')}
                                    placeholder="احصل على خصم يصل إلى 50٪"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="discount_type">{t('promotions.form.discountType')} *</Label>
                                <Controller
                                    name="discount_type"
                                    control={control}
                                    defaultValue="percentage"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('promotions.form.selectType')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">{t('promotions.types.percentage')}</SelectItem>
                                                <SelectItem value="fixed">{t('promotions.types.fixed')}</SelectItem>
                                                <SelectItem value="buy_x_get_y">{t('promotions.types.buyXGetY')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label htmlFor="discount_value">{t('promotions.form.discountValue')} *</Label>
                                <Input
                                    id="discount_value"
                                    type="number"
                                    step="0.01"
                                    {...register('discount_value', { required: true, valueAsNumber: true })}
                                    placeholder="25"
                                />
                            </div>
                            <div>
                                <Label htmlFor="max_discount">{t('promotions.form.maxDiscountCap')}</Label>
                                <Input
                                    id="max_discount"
                                    type="number"
                                    step="0.01"
                                    {...register('max_discount', { valueAsNumber: true })}
                                    placeholder="100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_date">{t('promotions.startDate')} *</Label>
                                <Input
                                    id="start_date"
                                    type="datetime-local"
                                    {...register('start_date', { required: true })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date">{t('promotions.endDate')} *</Label>
                                <Input
                                    id="end_date"
                                    type="datetime-local"
                                    {...register('end_date', { required: true })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="applies_to">{t('promotions.appliesTo')} *</Label>
                            <Controller
                                name="applies_to"
                                control={control}
                                defaultValue="all"
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('promotions.form.selectScope')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('promotions.allProducts')}</SelectItem>
                                            <SelectItem value="category">{t('promotions.form.specificCategories')}</SelectItem>
                                            <SelectItem value="products">{t('promotions.form.specificProducts')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {appliesTo === 'category' && (
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <Label className="text-base font-semibold mb-3 block">
                                    {t('promotions.form.selectCategories')}
                                </Label>
                                <p className="text-sm text-gray-500 mb-3">
                                    {t('promotions.form.selectCategoriesHint')}
                                </p>
                                <select
                                    multiple
                                    {...register('category_ids')}
                                    className="w-full border rounded-md p-3 bg-white focus:ring-2 focus:ring-elbaraka-primary focus:border-transparent"
                                    style={{ minHeight: '200px' }}
                                >
                                    {((categories as any)?.data || categories)?.map((cat: any) => (
                                        <optgroup key={cat.id} label={`${cat.name_en} (${cat.name_ar})`}>
                                            <option value={cat.id} className="font-semibold">
                                                ✓ {t('promotions.form.mainCategory')}: {cat.name_en}
                                            </option>
                                            {cat.subcategories?.map((sub: any) => (
                                                <option key={sub.id} value={sub.id} className="pl-4">
                                                    └─ {sub.name_en} ({sub.name_ar})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-2">
                                    {((categories as any)?.data?.length || (categories as any)?.length || 0)} {t('promotions.form.categoriesAvailable')}
                                </p>
                            </div>
                        )}

                        {appliesTo === 'products' && (
                            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Label className="text-base font-semibold">
                                        {t('promotions.form.selectSpecificProducts')}
                                    </Label>
                                    <div className="text-sm text-gray-600">
                                        {selectedProducts.length} {t('promotions.form.productsSelected')}
                                    </div>
                                </div>

                                {/* Selected Products */}
                                {selectedProducts.length > 0 && (
                                    <div className="border rounded-md bg-white p-3">
                                        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-sm font-medium">{t('promotions.selectedProducts')}:</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearProducts}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {t('promotions.form.clearAll')}
                                            </Button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {selectedProducts.map((product) => (
                                                <div
                                                    key={product.barcode}
                                                    className="flex items-center justify-between bg-elbaraka-primary/5 p-2 rounded border border-elbaraka-primary/20"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate">
                                                            {product.name_en}
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            EGP {product.price} • {product.barcode}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveProduct(product.barcode)}
                                                        className="ml-2 h-7 w-7 p-0 hover:bg-red-100"
                                                    >
                                                        <X className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Product Search */}
                                <div>
                                    <div className="relative">
                                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400`} />
                                        <Input
                                            placeholder={t('promotions.form.searchProductsPlaceholder')}
                                            className={isRTL ? 'pr-10' : 'pl-10'}
                                            value={productSearchTerm}
                                            onChange={(e) => {
                                                setProductSearchTerm(e.target.value)
                                                setProductPage(1)
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {t('promotions.form.showingProducts', { filtered: filteredProducts.length, total: products?.data?.length || 0 })}
                                    </p>
                                </div>

                                {/* Products List */}
                                <div className="border rounded-md bg-white divide-y max-h-96 overflow-y-auto">
                                    {isLoadingProducts ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elbaraka-primary mx-auto mb-2"></div>
                                            <p>{t('promotions.loadingProducts')}</p>
                                        </div>
                                    ) : paginatedProducts.length === 0 && !isLoadingProducts ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                            <p>{t('promotions.noProductsFound')}</p>
                                            {productSearchTerm && (
                                                <p className="text-sm mt-1">{t('promotions.tryDifferentSearch')}</p>
                                            )}
                                            {!productSearchTerm && filteredProducts.length === 0 && (
                                                <p className="text-sm mt-1">{t('promotions.noProductsAvailable')}</p>
                                            )}
                                        </div>
                                    ) : (
                                        paginatedProducts.map((product: any) => {
                                            const isSelected = selectedProducts.find(p => p.barcode === product.barcode)
                                            return (
                                                <div
                                                    key={product.barcode}
                                                    className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-elbaraka-primary/5 border-l-4 border-elbaraka-primary' : ''
                                                        }`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleRemoveProduct(product.barcode)
                                                        } else {
                                                            handleAddProduct(product)
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`h-5 w-5 border-2 rounded flex items-center justify-center flex-shrink-0 ${isSelected
                                                                    ? 'bg-elbaraka-primary border-elbaraka-primary'
                                                                    : 'border-gray-300'
                                                                    }`}>
                                                                    {isSelected && (
                                                                        <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path d="M5 13l4 4L19 7"></path>
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <h4 className="font-medium text-sm truncate">
                                                                    {product.name_en}
                                                                </h4>
                                                            </div>
                                                            {product.name_ar && (
                                                                <p className="text-xs text-gray-600 mt-1 mr-7" dir="rtl">
                                                                    {product.name_ar}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 mr-7">
                                                                <span className="font-medium text-elbaraka-primary">
                                                                    EGP {product.price}
                                                                </span>
                                                                <span>•</span>
                                                                <span>Barcode: {product.barcode}</span>
                                                                {product.stock !== undefined && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>Stock: {product.stock}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalProductPages > 1 && (
                                    <div className={`flex items-center justify-between pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="text-sm text-gray-600">
                                            {t('promotions.form.page')} {productPage} {t('common.of')} {totalProductPages}
                                        </div>
                                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setProductPage(Math.max(1, productPage - 1))}
                                                disabled={productPage === 1}
                                            >
                                                {t('common.previous')}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setProductPage(Math.min(totalProductPages, productPage + 1))}
                                                disabled={productPage === totalProductPages}
                                            >
                                                {t('common.next')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <Label htmlFor="min_purchase">{t('promotions.form.minPurchaseAmount')}</Label>
                            <Input
                                id="min_purchase"
                                type="number"
                                step="0.01"
                                {...register('min_purchase', { valueAsNumber: true })}
                                placeholder="0"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="terms_conditions">{t('promotions.form.termsEnglish')}</Label>
                                <Textarea
                                    id="terms_conditions"
                                    {...register('terms_conditions')}
                                    placeholder="Valid while supplies last..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="terms_conditions_ar">{t('promotions.form.termsArabic')}</Label>
                                <Textarea
                                    id="terms_conditions_ar"
                                    {...register('terms_conditions_ar')}
                                    placeholder="صالح طالما توفرت الإمدادات"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="image">{t('promotions.form.promotionImage')}</Label>
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="banner_image">{t('promotions.form.bannerImage')}</Label>
                                <Input
                                    id="banner_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setSelectedBannerFile(e.target.files?.[0] || null)}
                                />
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
                                    name="is_featured"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="is_featured"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label htmlFor="is_featured">{t('promotions.form.featuredHomepage')}</Label>
                            </div>
                        </div>

                        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateDialogOpen(false)
                                    setEditingPromotion(null)
                                    reset()
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending
                                    ? t('promotions.saving')
                                    : editingPromotion
                                        ? t('promotions.updatePromotion')
                                        : t('promotions.createPromotion')
                                }
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
