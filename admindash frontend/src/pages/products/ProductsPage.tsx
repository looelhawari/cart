import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService, type ProductFilters } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ProductAvailabilityBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Product, Category } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'

const FormLabelWithTooltip = ({ htmlFor, label, tooltip, required }: { htmlFor?: string, label: string, tooltip: string, required?: boolean }) => (
    <div className="flex items-center gap-2 mb-1.5">
        <Label htmlFor={htmlFor} className="cursor-pointer">{label} {required && <span className="text-red-500">*</span>}</Label>
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">
                    <p className="max-w-xs text-xs">{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
)

export default function ProductsPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [filters, setFilters] = useState<ProductFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Category Selection State
    const [selectedParentCategory, setSelectedParentCategory] = useState<string>('')
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('')

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', filters],
        queryFn: () => productService.getProducts(filters),
    })

    const toggleStockMutation = useMutation({
        mutationFn: ({ barcode, is_in_stock }: { barcode: string; is_in_stock: boolean }) =>
            productService.toggleStockStatus(barcode, is_in_stock),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('common.error'),
                variant: 'destructive'
            })
        }
    })

    const { data: categories } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: () => categoryService.getCategoryTree(),
    })

    // Computed subcategories based on selected parent
    const subCategories = categories?.find(c => c.id.toString() === selectedParentCategory)?.children || []

    const createMutation = useMutation({
        mutationFn: productService.createProduct,
        onSuccess: async (newProduct) => {
            if (selectedFile) {
                await productService.uploadImage(newProduct.barcode, selectedFile)
            }
            queryClient.invalidateQueries({ queryKey: ['products'] })
            setIsCreateDialogOpen(false)
            reset()
            setSelectedFile(null)
            setSelectedParentCategory('')
            setSelectedSubCategory('')
            toast({
                title: t('common.success'),
                description: t('products.createSuccess'),
                variant: 'default'
            })
        },
        onError: (error: any) => {
            console.error('Product creation error:', error)
            const errorMessage = error?.response?.data?.message ||
                JSON.stringify(error?.response?.data?.errors) ||
                t('products.createError')
            toast({
                title: t('common.error'),
                description: errorMessage,
                variant: 'destructive'
            })
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ barcode, data }: { barcode: string; data: any }) =>
            productService.updateProduct(barcode, data),
        onSuccess: async (_, variables) => {
            if (selectedFile) {
                await productService.uploadImage(variables.barcode, selectedFile)
            }
            queryClient.invalidateQueries({ queryKey: ['products'] })
            setEditingProduct(null)
            setSelectedFile(null)
            toast({
                title: t('common.success'),
                description: t('products.updateSuccess'),
                variant: 'default'
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('products.updateError'),
                variant: 'destructive'
            })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: productService.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast({
                title: t('common.success'),
                description: t('products.deleteSuccess'),
                variant: 'default'
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('products.deleteError'),
                variant: 'destructive'
            })
        }
    })

    const { register, handleSubmit, reset, setValue, watch, control } = useForm()

    const onSubmit = (data: any) => {
        // Ensure category_id is set to subcategory if available, otherwise parent
        // However, usually products belong to subcategories. Logic enforces one.
        // We'll trust whatever is in the form's category_id, which we update via Selects.
        console.log('Form data being submitted:', data)
        const payload = { ...data }

        // If user didn't select subcategory but selected parent, usage depends on business rule.
        // Assuming we enforce selection if subcategories exist, or just take the value.
        // The Select onChange handles setValue('category_id', ...).

        if (editingProduct) {
            updateMutation.mutate({ barcode: editingProduct.barcode, data: payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const findCategoryPath = (targetId: number, nodes: Category[]): { parentId?: number, myselfId: number } | null => {
        for (const cat of nodes) {
            if (cat.id === targetId) return { myselfId: cat.id }
            if (cat.children && cat.children.length > 0) {
                const childResult = findCategoryPath(targetId, cat.children)
                if (childResult) {
                    return {
                        parentId: childResult.parentId || cat.id,
                        myselfId: childResult.myselfId
                    }
                }
            }
        }
        return null
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)

        // Map product fields to form fields
        setValue('barcode', product.barcode)
        setValue('name_en', product.name_en || product.name)
        setValue('name_ar', product.name_ar)
        setValue('slug', product.slug) // Added Slug
        setValue('price', product.price)
        setValue('original_price', product.original_price) // Added
        setValue('sale_price', product.sale_price) // Added
        setValue('cost_price', product.cost_price)
        setValue('stock_quantity', product.stock_quantity)
        setValue('is_in_stock', product.is_in_stock)
        setValue('min_stock_level', product.min_stock_level)
        setValue('weight', product.weight)
        setValue('unit', product.unit)
        setValue('packaging', product.packaging) // Added
        setValue('description', product.description_en || product.description) // Mapping to 'description' as per user preference
        setValue('description_ar', product.description_ar)
        setValue('nutrition_facts', typeof product.nutrition_facts === 'object' ? JSON.stringify(product.nutrition_facts) : product.nutrition_facts) // Handle JSON/String
        setValue('active_promotion_id', product.active_promotion_id) // Added
        setValue('is_featured', product.is_featured) // Added
        setValue('is_active', product.is_active) // Added
        setValue('sales_count', product.sales_count) // Added

        // Handle Category Pre-filling
        const productCategory = product.categories?.[0]
        if (productCategory && categories) {
            const path = findCategoryPath(productCategory.id, categories)
            if (path) {
                if (path.parentId) {
                    setSelectedParentCategory(path.parentId.toString())
                    const parent = categories.find(c => c.id === path.parentId)
                    if (parent && parent.children) {
                        setSelectedSubCategory(path.myselfId.toString())
                        setValue('category_id', path.myselfId)
                    }
                } else {
                    setSelectedParentCategory(path.myselfId.toString())
                    setSelectedSubCategory('')
                    setValue('category_id', path.myselfId)
                }
            }
        } else {
            setSelectedParentCategory('')
            setSelectedSubCategory('')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">{t('products.title')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t('products.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setIsCreateDialogOpen(true)
                        reset()
                        setSelectedFile(null)
                        setSelectedParentCategory('')
                        setSelectedSubCategory('')
                    }}
                    className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                >
                    <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('products.addProduct')}
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <Input
                                    placeholder={t('products.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className={isRTL ? 'text-right' : 'text-left'}
                                />
                                <Button onClick={handleSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Select
                            value={filters.category_id?.toString() || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, category_id: value ? parseInt(value) : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={t('products.allCategories')} />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="all">{t('products.allCategories')}</SelectItem>
                                {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                        {isRTL ? (cat.name_ar || cat.name_en || 'Unnamed') : (cat.name_en || cat.name_ar || 'Unnamed')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.availability_status || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, availability_status: value || undefined, page: 1 })
                            }
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={t('products.allStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('products.allStatus')}</SelectItem>
                                <SelectItem value="in_stock">{t('products.inStock')}</SelectItem>
                                <SelectItem value="out_of_stock">{t('products.outOfStock')}</SelectItem>
                                <SelectItem value="discontinued">{t('products.discontinued')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12">{t('common.loading')}</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.image')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.barcode')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.name')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.category')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.price')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.stock')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('products.inStock')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.status')}</th>
                                            <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productsData?.data.map((product) => (
                                            <tr key={product.barcode} className="border-b hover:bg-gray-50">
                                                <td className="p-3">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="h-12 w-12 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
                                                            <ImageIcon className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono text-sm">{product.barcode}</td>
                                                <td className="p-3 font-medium">{product.name_en || product.name_ar || 'N/A'}</td>
                                                <td className="p-3 text-sm text-gray-600">
                                                    {product.categories?.[0]?.name_en || product.categories?.[0]?.name_ar || 'N/A'}
                                                </td>
                                                <td className="p-3">{formatCurrency(product.price)}</td>
                                                <td className="p-3">
                                                    <span
                                                        className={
                                                            product.stock_quantity <= product.min_stock_level
                                                                ? 'text-red-600 font-medium'
                                                                : ''
                                                        }
                                                    >
                                                        {product.stock_quantity}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <Switch
                                                        checked={!!product.is_in_stock}
                                                        onCheckedChange={(checked) => {
                                                            toggleStockMutation.mutate({
                                                                barcode: product.barcode,
                                                                is_in_stock: checked,
                                                            })
                                                        }}
                                                        disabled={toggleStockMutation.isPending}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <ProductAvailabilityBadge
                                                        status={
                                                            !product.is_active ? 'discontinued' :
                                                                (!product.is_in_stock || product.stock_quantity === 0) ? 'out_of_stock' :
                                                                    'in_stock'
                                                        }
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEdit(product)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => {
                                                                if (confirm(t('confirmations.deleteProduct'))) {
                                                                    deleteMutation.mutate(product.barcode)
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <p className="text-sm text-muted-foreground">
                                    {t('common.showing')} {((filters.page || 1) - 1) * (filters.per_page || 20) + 1} {t('common.to')}{' '}
                                    {Math.min((filters.page || 1) * (filters.per_page || 20), productsData?.total || 0)} {t('common.of')}{' '}
                                    {productsData?.total || 0} {t('products.productsCount')}
                                </p>
                                <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === 1}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === productsData?.last_page}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateDialogOpen || !!editingProduct} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateDialogOpen(false)
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setSelectedParentCategory('')
                    setSelectedSubCategory('')
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? t('products.editProduct') : t('products.addProduct')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip
                                    htmlFor="barcode"
                                    label={`${t('products.barcode')}`}
                                    tooltip={t('products.tooltips.barcode')}
                                    required
                                />
                                <Input
                                    id="barcode"
                                    {...register('barcode', { required: true })}
                                    disabled={!!editingProduct}
                                    placeholder="1234567890123"
                                />
                            </div>

                            {/* Improved Hierarchical Category Selection */}
                            <div className="space-y-3">
                                <div>
                                    <FormLabelWithTooltip label="Main Category" tooltip={t('products.tooltips.mainCategory')} />
                                    <Select
                                        value={selectedParentCategory}
                                        onValueChange={(value) => {
                                            setSelectedParentCategory(value)
                                            setSelectedSubCategory('')
                                            setValue('category_id', parseInt(value)) // Set generic category first
                                        }}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select Main Category" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {categories?.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {isRTL ? (cat.name_ar || cat.name_en) : (cat.name_en || cat.name_ar)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedParentCategory && subCategories.length > 0 && (
                                    <div>
                                        <FormLabelWithTooltip label="Sub Category" tooltip={t('products.tooltips.subCategory')} />
                                        <Select
                                            value={selectedSubCategory}
                                            onValueChange={(value) => {
                                                setSelectedSubCategory(value)
                                                setValue('category_id', parseInt(value)) // Update to specific subcategory
                                            }}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select Sub Category" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {subCategories.map((sub) => (
                                                    <SelectItem key={sub.id} value={sub.id.toString()}>
                                                        {isRTL ? (sub.name_ar || sub.name_en) : (sub.name_en || sub.name_ar)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Hidden input to force validation if needed, or simply rely on setValue above */}
                                <input type="hidden" {...register('category_id', { required: true })} />
                            </div>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="slug" label={t('products.slug')} tooltip={t('products.tooltips.slug')} />
                            <Input id="slug" {...register('slug')} placeholder="slug-name" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="name_en" label={t('products.nameEn')} tooltip={t('products.tooltips.nameEn')} required />
                                <Input id="name_en" {...register('name_en', { required: true })} />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="name_ar" label={t('products.nameAr')} tooltip={t('products.tooltips.nameAr')} required />
                                <Input id="name_ar" {...register('name_ar', { required: true })} />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="packaging" label="Packaging" tooltip={t('products.tooltips.packaging')} />
                                <Input id="packaging" {...register('packaging')} placeholder="e.g. Box, Bottle" />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="sales_count" label="Sales Count" tooltip={t('products.tooltips.salesCount')} />
                                <Input id="sales_count" type="number" {...register('sales_count', { valueAsNumber: true })} />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="price" label={`${t('products.priceEgp')} (Current)`} tooltip={t('products.tooltips.price')} required />
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', { required: true, valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="original_price" label="Original Price" tooltip={t('products.tooltips.originalPrice')} />
                                <Input
                                    id="original_price"
                                    type="number"
                                    step="0.01"
                                    {...register('original_price', { valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="sale_price" label="Sale Price" tooltip={t('products.tooltips.salePrice')} />
                                <Input
                                    id="sale_price"
                                    type="number"
                                    step="0.01"
                                    {...register('sale_price', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="active_promotion_id" label="Active Promotion ID" tooltip={t('products.tooltips.activePromotionId')} />
                                <Input
                                    id="active_promotion_id"
                                    type="number"
                                    {...register('active_promotion_id', { valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="cost_price" label={t('products.costPriceEgp')} tooltip={t('products.tooltips.costPrice')} required />
                                <Input
                                    id="cost_price"
                                    type="number"
                                    step="0.01"
                                    {...register('cost_price', { required: true, valueAsNumber: true })}
                                    disabled={!!editingProduct}
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="stock_quantity" label={t('products.stockQuantity')} tooltip={t('products.tooltips.stockQuantity')} required />
                                <Input
                                    id="stock_quantity"
                                    type="number"
                                    {...register('stock_quantity', { required: true, valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="min_stock_level" label={t('products.minStockLevel')} tooltip={t('products.tooltips.minStockLevel')} required />
                                <Input
                                    id="min_stock_level"
                                    type="number"
                                    {...register('min_stock_level', { required: true, valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="is_in_stock" {...register('is_in_stock')} className="h-4 w-4" />
                            <Label htmlFor="is_in_stock">{t('products.inStock')}</Label>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="weight" label={`${t('products.weight')} (g)`} tooltip={t('products.tooltips.weight')} />
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.01"
                                    {...register('weight', { valueAsNumber: true })}
                                    disabled={!!editingProduct}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="unit" label={t('products.unit')} tooltip={t('products.tooltips.unit')} />
                                <Input
                                    id="unit"
                                    {...register('unit')}
                                    placeholder="e.g. piece, kg, liter"
                                    disabled={!!editingProduct}
                                />
                            </div>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="description" label={t('products.descriptionEn')} tooltip={t('products.tooltips.descriptionEn')} />
                            <Textarea id="description" {...register('description')} rows={3} />
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="description_ar" label={t('products.descriptionAr')} tooltip={t('products.tooltips.descriptionAr')} />
                            <Textarea id="description_ar" {...register('description_ar')} rows={3} />
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="nutrition_facts" label={t('products.nutritionFacts')} tooltip={t('products.tooltips.nutritionFacts')} />
                            <Textarea id="nutrition_facts" {...register('nutrition_facts')} rows={3} placeholder="Nutritional information..." />
                        </div>

                        <div className="flex space-x-6">
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4" />
                                <Label htmlFor="is_active">Is Active</Label>
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-slate-800">
                                            <p className="max-w-xs text-xs">{t('products.tooltips.isActive')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="is_featured" {...register('is_featured')} className="h-4 w-4" />
                                <Label htmlFor="is_featured">Is Featured</Label>
                                <TooltipProvider>
                                    <Tooltip delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 text-white border-slate-800">
                                            <p className="max-w-xs text-xs">{t('products.tooltips.isFeatured')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="image" label={t('products.productImage')} tooltip={t('products.tooltips.image')} />
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateDialogOpen(false)
                                    setEditingProduct(null)
                                    setSelectedFile(null)
                                    setSelectedParentCategory('')
                                    setSelectedSubCategory('')
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingProduct ? t('common.update') : t('common.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
