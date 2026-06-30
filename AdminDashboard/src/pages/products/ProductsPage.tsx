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
import { Plus, Search, Edit, Trash2, Image as ImageIcon, Info, X, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Product, Category } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { formatFieldErrors, getSafeErrorMessage } from '@/lib/error-utils'

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
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

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
                description: getSafeErrorMessage(error, t('common.error')),
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
            if (import.meta.env.DEV) console.error('Product creation error:', error)
            const errorMessage =
                formatFieldErrors(error?.response?.data?.errors) ||
                getSafeErrorMessage(error, t('products.createError'))
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
            setSelectedParentCategory('')
            setSelectedSubCategory('')
            reset()
            toast({
                title: t('common.success'),
                description: t('products.updateSuccess'),
                variant: 'default'
            })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: getSafeErrorMessage(error, t('products.updateError')),
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
                description: getSafeErrorMessage(error, t('products.deleteError')),
                variant: 'destructive'
            })
        }
    })

    const { register, handleSubmit, reset, setValue, watch, control } = useForm()

    const onSubmit = (data: any) => {
        // Map frontend field names to backend field names
        const payload: any = {
            barcode: data.barcode,
            name_en: data.name_en,
            name_ar: data.name_ar,
            description_en: data.description_en,
            description_ar: data.description_ar,
            price: data.price,
            stock_quantity: data.stock_quantity,
            category_id: data.category_id,
        }

        // Optional fields
        if (data.weight !== undefined && data.weight !== null && data.weight !== '') {
            payload.weight = data.weight
        }
        if (data.unit) {
            payload.unit = data.unit
        }
        if (data.nutrition_facts) {
            payload.nutrition_facts = data.nutrition_facts
        }
        if (data.is_featured !== undefined) {
            payload.is_featured = !!data.is_featured
        }
        if (data.is_active !== undefined) {
            payload.is_active = !!data.is_active
        }
        if (data.is_in_stock !== undefined) {
            payload.is_in_stock = !!data.is_in_stock
        }

        if (import.meta.env.DEV) console.debug('Form data being submitted:', payload)

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
        setImagePreview(product.image_url || product.image || null)

        // Map product fields to form fields
        setValue('barcode', product.barcode)
        setValue('name_en', product.name_en || product.name)
        setValue('name_ar', product.name_ar)
        setValue('price', product.price)
        setValue('stock_quantity', product.stock_quantity)
        setValue('is_in_stock', product.is_in_stock ?? true)
        setValue('weight', product.weight)
        setValue('unit', product.unit)
        setValue('description_en', product.description_en || product.description)
        setValue('description_ar', product.description_ar)
        setValue('nutrition_facts', product.nutrition_facts)
        setValue('is_featured', product.is_featured ?? false)
        setValue('is_active', product.is_active ?? true)

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
                        setImagePreview(null)
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
                            value={filters.category_id?.toString() || 'all'}
                            onValueChange={(value) => {
                                // BUGFIX: the "All categories" item has value="all" — passing
                                // that through parseInt() returned NaN, which the backend
                                // happily treated as a filter and matched nothing. Treat
                                // "all" (and any non-numeric value) as "no filter".
                                const isAll = !value || value === 'all'
                                const parsed = isAll ? undefined : parseInt(value, 10)
                                setFilters({
                                    ...filters,
                                    category_id: Number.isFinite(parsed as number) ? (parsed as number) : undefined,
                                    page: 1,
                                })
                            }}
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
                            value={filters.availability_status || 'all'}
                            onValueChange={(value) => {
                                // Same fix as category — "all" must clear the filter, not be
                                // forwarded as the literal string "all" which the backend then
                                // tried to match in WHERE availability='all'.
                                setFilters({
                                    ...filters,
                                    availability_status: !value || value === 'all' ? undefined : value,
                                    page: 1,
                                })
                            }}
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
                                            <tr
                                                key={product.barcode}
                                                className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                                onClick={() => setViewingProduct(product)}
                                            >
                                                <td className="p-3">
                                                    {(product.image_url || product.image) ? (
                                                        <img
                                                            src={product.image_url || product.image || undefined}
                                                            alt={product.name || product.name_en || product.name_ar}
                                                            className="h-12 w-12 object-cover rounded border border-gray-200"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                target.parentElement!.innerHTML = '<div class="h-12 w-12 bg-gray-100 rounded flex items-center justify-center"><svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                                            }}
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
                                                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEdit(product)
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
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

            {/* Product Detail View Dialog */}
            <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
                    {viewingProduct && (
                        <div className="grid md:grid-cols-2 h-full">
                            {/* Left Side - Product Image */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 flex items-center justify-center relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 z-10"
                                    onClick={() => setViewingProduct(null)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                {(viewingProduct.image_url || viewingProduct.image) ? (
                                    <img
                                        src={viewingProduct.image_url || viewingProduct.image || undefined}
                                        alt={viewingProduct.name_en || viewingProduct.name_ar}
                                        className="max-w-full max-h-[600px] object-contain rounded-lg shadow-xl"
                                    />
                                ) : (
                                    <div className="w-full h-96 bg-white rounded-lg flex items-center justify-center shadow-xl">
                                        <Package className="h-32 w-32 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Right Side - Product Information */}
                            <div className="p-8 overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {viewingProduct.is_featured && (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                                    {t('products.featured')}
                                                </span>
                                            )}
                                            <ProductAvailabilityBadge
                                                status={
                                                    !viewingProduct.is_active ? 'discontinued' :
                                                        (!viewingProduct.is_in_stock || viewingProduct.stock_quantity === 0) ? 'out_of_stock' :
                                                            'in_stock'
                                                }
                                            />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-1">
                                            {isRTL ? (viewingProduct.name_ar || viewingProduct.name_en) : (viewingProduct.name_en || viewingProduct.name_ar)}
                                        </h2>
                                        <p className="text-sm text-gray-500 font-mono">{t('products.barcode')}: {viewingProduct.barcode}</p>
                                    </div>

                                    {/* Price */}
                                    <div className="bg-elbaraka-primary/5 border-l-4 border-elbaraka-primary p-4 rounded">
                                        <p className="text-sm text-gray-600 mb-1">{t('products.price')}</p>
                                        <p className="text-3xl font-bold text-elbaraka-primary">{formatCurrency(viewingProduct.price)}</p>
                                    </div>

                                    {/* Grid Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">{t('products.category')}</p>
                                            <p className="font-semibold text-gray-900">
                                                {viewingProduct.categories?.[0] ?
                                                    (isRTL ? viewingProduct.categories[0].name_ar : viewingProduct.categories[0].name_en) :
                                                    'N/A'
                                                }
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600 mb-1">{t('products.stock')}</p>
                                            <p className="font-semibold text-gray-900">{viewingProduct.stock_quantity}</p>
                                        </div>
                                        {viewingProduct.weight && (
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-1">{t('products.weight')}</p>
                                                <p className="font-semibold text-gray-900">{viewingProduct.weight}g</p>
                                            </div>
                                        )}
                                        {viewingProduct.unit && (
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-sm text-gray-600 mb-1">{t('products.unit')}</p>
                                                <p className="font-semibold text-gray-900">{viewingProduct.unit}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Descriptions */}
                                    {(viewingProduct.description_en || viewingProduct.description_ar) && (
                                        <div className="space-y-3">
                                            {viewingProduct.description_en && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('products.descriptionEn')}</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{viewingProduct.description_en}</p>
                                                </div>
                                            )}
                                            {viewingProduct.description_ar && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('products.descriptionAr')}</h3>
                                                    <p className="text-gray-600 text-sm leading-relaxed text-right" dir="rtl">{viewingProduct.description_ar}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Nutrition Facts */}
                                    {viewingProduct.nutrition_facts && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('products.nutritionFacts')}</h3>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewingProduct.nutrition_facts}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            onClick={() => {
                                                setViewingProduct(null)
                                                handleEdit(viewingProduct)
                                            }}
                                            className="flex-1 bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setViewingProduct(null)}
                                            className="flex-1"
                                        >
                                            {t('common.close')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateDialogOpen || !!editingProduct} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateDialogOpen(false)
                    setEditingProduct(null)
                    setSelectedFile(null)
                    setImagePreview(null)
                    setSelectedParentCategory('')
                    setSelectedSubCategory('')
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? t('products.editProduct') : t('products.addProduct')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Barcode */}
                        <div>
                            <FormLabelWithTooltip
                                htmlFor="barcode"
                                label={t('products.barcode')}
                                tooltip={t('products.tooltips.barcode')}
                                required
                            />
                            <Input
                                id="barcode"
                                {...register('barcode', { required: true })}
                                disabled={!!editingProduct}
                                placeholder={isRTL ? 'أدخل الباركود' : 'Enter barcode'}
                            />
                        </div>

                        {/* Category Selection */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip
                                    label={isRTL ? 'الفئة الرئيسية' : 'Main Category'}
                                    tooltip={t('products.tooltips.mainCategory')}
                                    required
                                />
                                <Select
                                    value={selectedParentCategory}
                                    onValueChange={(value) => {
                                        setSelectedParentCategory(value)
                                        setSelectedSubCategory('')
                                        setValue('category_id', parseInt(value)) // Set generic category first
                                    }}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder={isRTL ? 'اختر الفئة الرئيسية' : 'Select Main Category'} />
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
                                    <FormLabelWithTooltip
                                        label={isRTL ? 'الفئة الفرعية' : 'Sub Category'}
                                        tooltip={t('products.tooltips.subCategory')}
                                    />
                                    <Select
                                        value={selectedSubCategory}
                                        onValueChange={(value) => {
                                            setSelectedSubCategory(value)
                                            setValue('category_id', parseInt(value))
                                        }}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={isRTL ? 'اختر الفئة الفرعية' : 'Select Sub Category'} />
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

                            <input type="hidden" {...register('category_id', { required: true })} />
                        </div>

                        {/* Names */}
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

                        {/* Price and Stock */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="price" label={t('products.priceEgp')} tooltip={t('products.tooltips.price')} required />
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', { required: true, valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="stock_quantity" label={t('products.stockQuantity')} tooltip={t('products.tooltips.stockQuantity')} required />
                                <Input
                                    id="stock_quantity"
                                    type="number"
                                    {...register('stock_quantity', { required: true, valueAsNumber: true })}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Weight and Unit */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="weight" label={`${t('products.weight')} (g)`} tooltip={t('products.tooltips.weight')} />
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.01"
                                    {...register('weight', { valueAsNumber: true })}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="unit" label={t('products.unit')} tooltip={t('products.tooltips.unit')} />
                                <Input
                                    id="unit"
                                    {...register('unit')}
                                    placeholder={t('products.unitPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Descriptions */}
                        <div>
                            <FormLabelWithTooltip htmlFor="description_en" label={t('products.descriptionEn')} tooltip={t('products.tooltips.descriptionEn')} />
                            <Textarea id="description_en" {...register('description_en')} rows={3} placeholder={isRTL ? 'وصف المنتج بالإنجليزي' : 'Product description in English'} />
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="description_ar" label={t('products.descriptionAr')} tooltip={t('products.tooltips.descriptionAr')} />
                            <Textarea id="description_ar" {...register('description_ar')} rows={3} placeholder={isRTL ? 'وصف المنتج بالعربي' : 'Product description in Arabic'} className={isRTL ? '' : 'text-right'} dir="rtl" />
                        </div>

                        {/* Nutrition Facts */}
                        <div>
                            <FormLabelWithTooltip htmlFor="nutrition_facts" label={t('products.nutritionFacts')} tooltip={t('products.tooltips.nutritionFacts')} />
                            <Textarea id="nutrition_facts" {...register('nutrition_facts')} rows={4} placeholder={isRTL ? 'القيم الغذائية (اختياري)' : 'Nutrition facts (optional)'} />
                        </div>

                        {/* Toggles: In Stock, Is Active, Is Featured */}
                        <div className={`flex flex-wrap gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <input type="checkbox" id="is_in_stock" {...register('is_in_stock')} className="h-4 w-4" defaultChecked />
                                <Label htmlFor="is_in_stock">{t('products.inStock')}</Label>
                            </div>
                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4" defaultChecked />
                                <Label htmlFor="is_active">{isRTL ? 'نشط' : 'Active'}</Label>
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
                            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <input type="checkbox" id="is_featured" {...register('is_featured')} className="h-4 w-4" />
                                <Label htmlFor="is_featured">{t('products.featured')}</Label>
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

                        {/* Product Image */}
                        <div>
                            <FormLabelWithTooltip htmlFor="image" label={t('products.productImage')} tooltip={t('products.tooltips.image')} />

                            {/* Image Preview */}
                            {imagePreview && (
                                <div className="mb-3 relative inline-block">
                                    <img
                                        src={imagePreview}
                                        alt="Product preview"
                                        className="h-32 w-32 object-cover rounded-lg border-2 border-gray-200"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-1 right-1"
                                        onClick={() => {
                                            setImagePreview(null)
                                            setSelectedFile(null)
                                        }}
                                    >
                                        {isRTL ? 'حذف' : 'Remove'}
                                    </Button>
                                </div>
                            )}

                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        setSelectedFile(file)
                                        const reader = new FileReader()
                                        reader.onloadend = () => {
                                            setImagePreview(reader.result as string)
                                        }
                                        reader.readAsDataURL(file)
                                    }
                                }}
                            />
                        </div>

                        <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateDialogOpen(false)
                                    setEditingProduct(null)
                                    setSelectedFile(null)
                                    setImagePreview(null)
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
        </div >
    )
}
