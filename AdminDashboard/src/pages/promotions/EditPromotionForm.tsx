import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { promotionService } from '@/services/promotion.service'
import { categoryService } from '@/services/category.service'
import { productService } from '@/services/product.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormLabelWithTooltip } from '@/components/FormLabelWithTooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
    X, Package, Calendar, Percent, Tag, TrendingUp, DollarSign,
    ShoppingCart, Image as ImageIcon, FileText, Sparkles, Star, Search, Edit
} from 'lucide-react'
import { PromotionFormData, promotionToFormData, ProductForSelection, CategoryForSelection } from './types'
import type { Promotion } from '@/types'

interface EditPromotionFormProps {
    promotion: Promotion | null
    onClose: () => void
}

export default function EditPromotionForm({ promotion, onClose }: EditPromotionFormProps) {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const queryClient = useQueryClient()
    const { toast } = useToast()

    // File states
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
    const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null)

    // Product selection states
    const [productSearchTerm, setProductSearchTerm] = useState('')
    const [selectedProducts, setSelectedProducts] = useState<ProductForSelection[]>([])
    const [productPage, setProductPage] = useState(1)
    const productsPerPage = 10

    // Form setup
    const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<PromotionFormData>()

    const appliesTo = watch('applies_to')

    // Reset form when promotion changes
    useEffect(() => {
        if (promotion) {
            const formData = promotionToFormData(promotion)
            reset(formData)

            // Set selected products if editing a products promotion
            if (promotion.applies_to === 'products' && promotion.products) {
                setSelectedProducts(promotion.products.map(p => ({
                    barcode: p.barcode,
                    name_en: p.name_en || '',
                    name_ar: p.name_ar || '',
                    price: p.price,
                })))
            } else {
                setSelectedProducts([])
            }
        }
    }, [promotion, reset])

    // Fetch categories
    const { data: categories } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: () => categoryService.getCategoryTree(),
    })

    // Fetch products when applies_to is 'products'
    const { data: products, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['products-all'],
        queryFn: async () => {
            const result = await productService.getProducts({ per_page: 1000 })
            return result
        },
        enabled: appliesTo === 'products',
        staleTime: 5 * 60 * 1000,
    })

    // Filter and paginate products
    const filteredProducts = useMemo(() => {
        if (!products?.data) return []
        const search = productSearchTerm.toLowerCase()
        if (!search) return products.data
        return products.data.filter((product: any) =>
            product.name_en?.toLowerCase().includes(search) ||
            product.name_ar?.toLowerCase().includes(search) ||
            product.barcode?.toLowerCase().includes(search)
        )
    }, [products, productSearchTerm])

    const paginatedProducts = useMemo(() => {
        const startIndex = (productPage - 1) * productsPerPage
        return filteredProducts.slice(startIndex, startIndex + productsPerPage)
    }, [filteredProducts, productPage])

    const totalProductPages = Math.ceil(filteredProducts.length / productsPerPage)

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data: PromotionFormData) => {
            if (!promotion) throw new Error('No promotion to update')
            const submitData = {
                ...data,
                product_barcodes: appliesTo === 'products' ? selectedProducts.map(p => p.barcode) : undefined,
            }
            return promotionService.updatePromotion(promotion.id, submitData, selectedImageFile || undefined, selectedBannerFile || undefined)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] })
            handleClose()
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

    const handleClose = () => {
        setSelectedImageFile(null)
        setSelectedBannerFile(null)
        setSelectedProducts([])
        setProductSearchTerm('')
        setProductPage(1)
        onClose()
    }

    const onSubmit = (data: PromotionFormData) => {
        updateMutation.mutate(data)
    }

    const handleAddProduct = (product: ProductForSelection) => {
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

    if (!promotion) return null

    return (
        <Dialog open={!!promotion} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                            <Edit className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                                {t('promotions.editPromotion')}
                            </DialogTitle>
                            <p className="text-sm text-gray-500 mt-1">
                                {t('promotions.updatePromotionDescription')}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-6">
                    {/* Basic Information Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.basicInformation')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_title"
                                    label={t('promotions.form.titleEnglish')}
                                    tooltip={t('promotions.tooltips.titleEnglish')}
                                    required
                                />
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="edit_title"
                                        {...register('title', { required: true })}
                                        placeholder="Weekend Sale"
                                        className="pl-10"
                                    />
                                </div>
                                {errors.title && <p className="text-red-500 text-xs">{t('common.required')}</p>}
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_title_ar"
                                    label={t('promotions.form.titleArabic')}
                                    tooltip={t('promotions.tooltips.titleArabic')}
                                    required
                                />
                                <div className="relative">
                                    <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="edit_title_ar"
                                        {...register('title_ar', { required: true })}
                                        placeholder="تخفيضات نهاية الأسبوع"
                                        dir="rtl"
                                        className="pr-10"
                                    />
                                </div>
                                {errors.title_ar && <p className="text-red-500 text-xs">{t('common.required')}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_description"
                                    label={t('promotions.form.descriptionEnglish')}
                                    tooltip={t('promotions.tooltips.descriptionEnglish')}
                                />
                                <Textarea
                                    id="edit_description"
                                    {...register('description')}
                                    placeholder={t('promotions.form.descriptionEnglishPlaceholder')}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_description_ar"
                                    label={t('promotions.form.descriptionArabic')}
                                    tooltip={t('promotions.tooltips.descriptionArabic')}
                                />
                                <Textarea
                                    id="edit_description_ar"
                                    {...register('description_ar')}
                                    placeholder="احصل على خصم يصل إلى 50٪"
                                    dir="rtl"
                                    className="min-h-[100px] resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Discount Configuration Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Percent className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.discountConfiguration')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_discount_type"
                                    label={t('promotions.form.discountType')}
                                    tooltip={t('promotions.tooltips.discountType')}
                                    required
                                />
                                <Controller
                                    name="discount_type"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="bg-gray-50 dark:bg-gray-900">
                                                <SelectValue placeholder={t('promotions.form.selectType')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">
                                                    <div className="flex items-center gap-2">
                                                        <Percent className="h-4 w-4 text-green-600" />
                                                        <span>{t('promotions.types.percentage')}</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="fixed">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4 text-blue-600" />
                                                        <span>{t('promotions.types.fixed')}</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="buy_x_get_y">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingCart className="h-4 w-4 text-purple-600" />
                                                        <span>{t('promotions.types.buyXGetY')}</span>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_discount_value"
                                    label={t('promotions.form.discountValue')}
                                    tooltip={t('promotions.tooltips.discountValue')}
                                    required
                                />
                                <div className="relative">
                                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                                    <Input
                                        id="edit_discount_value"
                                        type="number"
                                        step="0.01"
                                        {...register('discount_value', { required: true, valueAsNumber: true })}
                                        placeholder="20"
                                        className="pl-10 bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_max_discount"
                                    label={t('promotions.form.maxDiscountAmount')}
                                    tooltip={t('promotions.tooltips.maxDiscountAmount')}
                                />
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                                    <Input
                                        id="edit_max_discount"
                                        type="number"
                                        step="0.01"
                                        {...register('max_discount', { valueAsNumber: true })}
                                        placeholder="100"
                                        className="pl-10 bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date Range Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.validityPeriod')}
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_start_date"
                                    label={t('promotions.startDate')}
                                    tooltip={t('promotions.tooltips.startDate')}
                                    required
                                />
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" />
                                    <Input
                                        id="edit_start_date"
                                        type="datetime-local"
                                        {...register('start_date', { required: true })}
                                        className="pl-10 bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_end_date"
                                    label={t('promotions.endDate')}
                                    tooltip={t('promotions.tooltips.endDate')}
                                    required
                                />
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none" />
                                    <Input
                                        id="edit_end_date"
                                        type="datetime-local"
                                        {...register('end_date', { required: true })}
                                        className="pl-10 bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Application Scope Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Package className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.applicationScope')}
                            </h3>
                        </div>

                        <div className="space-y-2">
                            <FormLabelWithTooltip
                                htmlFor="edit_applies_to"
                                label={t('promotions.appliesTo')}
                                tooltip={t('promotions.tooltips.appliesTo')}
                                required
                            />
                            <Controller
                                name="applies_to"
                                control={control}
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="bg-gray-50 dark:bg-gray-900">
                                            <SelectValue placeholder={t('promotions.form.selectScope')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-yellow-600" />
                                                    <span>{t('promotions.allProducts')}</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="category">
                                                <div className="flex items-center gap-2">
                                                    <Tag className="h-4 w-4 text-blue-600" />
                                                    <span>{t('promotions.form.specificCategories')}</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="products">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-green-600" />
                                                    <span>{t('promotions.form.specificProducts')}</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* Category Selection */}
                        {appliesTo === 'category' && (
                            <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="h-5 w-5 text-blue-600" />
                                    <Label className="text-base font-semibold">
                                        {t('promotions.form.selectCategories')}
                                    </Label>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    {t('promotions.form.selectCategoriesHint')}
                                </p>
                                <select
                                    multiple
                                    {...register('category_ids')}
                                    className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                                    style={{ minHeight: '200px' }}
                                >
                                    {((categories as any)?.data || categories)?.map((cat: CategoryForSelection) => (
                                        <optgroup key={cat.id} label={`${cat.name_en} (${cat.name_ar})`}>
                                            <option value={cat.id} className="font-semibold">
                                                ✓ {t('promotions.form.mainCategory')}: {cat.name_en}
                                            </option>
                                            {cat.subcategories?.map((sub) => (
                                                <option key={sub.id} value={sub.id} className="pl-4">
                                                    └─ {sub.name_en} ({sub.name_ar})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Product Selection */}
                        {appliesTo === 'products' && (
                            <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 space-y-4">
                                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-green-600" />
                                        <Label className="text-base font-semibold">
                                            {t('promotions.form.selectSpecificProducts')}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                                        <ShoppingCart className="h-4 w-4" />
                                        <span>{selectedProducts.length} {t('promotions.form.productsSelected')}</span>
                                    </div>
                                </div>

                                {/* Selected Products */}
                                {selectedProducts.length > 0 && (
                                    <div className="rounded-lg bg-white dark:bg-gray-900 p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                        <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t('promotions.selectedProducts')}:
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearProducts}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                {t('promotions.form.clearAll')}
                                            </Button>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                            {selectedProducts.map((product) => (
                                                <div
                                                    key={product.barcode}
                                                    className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate text-gray-900 dark:text-white">
                                                            {product.name_en}
                                                        </div>
                                                        <div className="text-xs text-gray-600 dark:text-gray-400">
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
                                        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
                                        <Input
                                            placeholder={t('promotions.form.searchProductsPlaceholder')}
                                            className={`${isRTL ? 'pr-11' : 'pl-11'} h-12 bg-white dark:bg-gray-900 border-2`}
                                            value={productSearchTerm}
                                            onChange={(e) => {
                                                setProductSearchTerm(e.target.value)
                                                setProductPage(1)
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Products List */}
                                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
                                    {isLoadingProducts ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-2"></div>
                                            <p className="text-sm font-medium">{t('promotions.loadingProducts')}</p>
                                        </div>
                                    ) : paginatedProducts.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <Package className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">{t('promotions.noProductsFound')}</p>
                                        </div>
                                    ) : (
                                        paginatedProducts.map((product: any) => {
                                            const isSelected = selectedProducts.some(p => p.barcode === product.barcode)
                                            return (
                                                <div
                                                    key={product.barcode}
                                                    className={`p-3 cursor-pointer transition-all duration-200 ${isSelected
                                                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-l-4 border-green-600'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                        }`}
                                                    onClick={() => isSelected ? handleRemoveProduct(product.barcode) : handleAddProduct(product)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-5 w-5 border-2 rounded flex items-center justify-center ${isSelected
                                                            ? 'bg-green-600 border-green-600'
                                                            : 'border-gray-300'
                                                            }`}>
                                                            {isSelected && (
                                                                <svg className="h-3 w-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path d="M5 13l4 4L19 7"></path>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{product.name_en}</div>
                                                            <div className="text-xs text-gray-500">EGP {product.price} • {product.barcode}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalProductPages > 1 && (
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-sm text-gray-600">
                                            {t('promotions.form.page')} {productPage} {t('common.of')} {totalProductPages}
                                        </div>
                                        <div className="flex gap-2">
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
                    </div>

                    {/* Additional Requirements Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingCart className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.additionalRequirements')}
                            </h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_min_purchase"
                                    label={t('promotions.form.minPurchaseAmount')}
                                    tooltip={t('promotions.tooltips.minPurchase')}
                                />
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-600" />
                                    <Input
                                        id="edit_min_purchase"
                                        type="number"
                                        step="0.01"
                                        {...register('min_purchase', { valueAsNumber: true })}
                                        placeholder="0"
                                        className="pl-10 bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormLabelWithTooltip
                                        htmlFor="edit_terms_conditions"
                                        label={t('promotions.form.termsEnglish')}
                                        tooltip={t('promotions.tooltips.termsEnglish')}
                                    />
                                    <Textarea
                                        id="edit_terms_conditions"
                                        {...register('terms_conditions')}
                                        placeholder="Valid while supplies last..."
                                        className="min-h-[100px] resize-none bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <FormLabelWithTooltip
                                        htmlFor="edit_terms_conditions_ar"
                                        label={t('promotions.form.termsArabic')}
                                        tooltip={t('promotions.tooltips.termsArabic')}
                                    />
                                    <Textarea
                                        id="edit_terms_conditions_ar"
                                        {...register('terms_conditions_ar')}
                                        placeholder="صالح طالما توفرت الإمدادات"
                                        dir="rtl"
                                        className="min-h-[100px] resize-none bg-gray-50 dark:bg-gray-900"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.mediaAssets')}
                            </h3>
                        </div>

                        {/* Current Images Preview */}
                        {(promotion.image_url || promotion.banner_image_url) && (
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    {t('promotions.currentImages')}:
                                </p>
                                <div className="flex gap-4">
                                    {promotion.image_url && (
                                        <div className="text-center">
                                            <img src={promotion.image_url} alt="Current" className="w-24 h-24 object-cover rounded-lg border" />
                                            <p className="text-xs text-gray-500 mt-1">{t('promotions.form.promotionImage')}</p>
                                        </div>
                                    )}
                                    {promotion.banner_image_url && (
                                        <div className="text-center">
                                            <img src={promotion.banner_image_url} alt="Current Banner" className="w-32 h-24 object-cover rounded-lg border" />
                                            <p className="text-xs text-gray-500 mt-1">{t('promotions.form.bannerImage')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_image"
                                    label={t('promotions.form.newPromotionImage')}
                                    tooltip={t('promotions.tooltips.image')}
                                />
                                <Input
                                    id="edit_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-amber-500 file:to-orange-600 file:text-white"
                                />
                                {selectedImageFile && (
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" />
                                        {selectedImageFile.name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <FormLabelWithTooltip
                                    htmlFor="edit_banner_image"
                                    label={t('promotions.form.newBannerImage')}
                                    tooltip={t('promotions.tooltips.bannerImage')}
                                />
                                <Input
                                    id="edit_banner_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setSelectedBannerFile(e.target.files?.[0] || null)}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white"
                                />
                                {selectedBannerFile && (
                                    <p className="text-xs text-purple-600 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" />
                                        {selectedBannerFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Section */}
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-xl p-6 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('promotions.statusSettings')}
                            </h3>
                        </div>

                        <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-4 flex-1 shadow-sm border border-gray-200 dark:border-gray-700">
                                <Controller
                                    name="is_active"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="edit_is_active"
                                            checked={field.value ?? false}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-green-600"
                                        />
                                    )}
                                />
                                <FormLabelWithTooltip
                                    htmlFor="edit_is_active"
                                    label={t('common.active')}
                                    tooltip={t('promotions.tooltips.isActive')}
                                    className="mb-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-4 flex-1 shadow-sm border border-gray-200 dark:border-gray-700">
                                <Controller
                                    name="is_featured"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            id="edit_is_featured"
                                            checked={field.value ?? false}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-yellow-600"
                                        />
                                    )}
                                />
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-600" />
                                    <FormLabelWithTooltip
                                        htmlFor="edit_is_featured"
                                        label={t('promotions.form.featuredHomepage')}
                                        tooltip={t('promotions.tooltips.isFeatured')}
                                        className="mb-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className={`flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            className="px-6"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg"
                        >
                            {updateMutation.isPending ? t('promotions.saving') : t('promotions.updatePromotion')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
