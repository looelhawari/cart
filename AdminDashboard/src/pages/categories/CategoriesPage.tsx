import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoryService } from '@/services/category.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, FolderTree, Info, X, Package, Image as ImageIcon, Search, Layers, Tag, TrendingUp } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

export default function CategoriesPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: categoryTree, isLoading } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: () => categoryService.getCategoryTree(),
    })

    const createMutation = useMutation({
        mutationFn: categoryService.createCategory,
        onSuccess: async (newCategory) => {
            // Upload image if selected
            if (imageFile) {
                try {
                    await categoryService.uploadImage(newCategory.id, imageFile)
                } catch (error) {
                    console.error('Failed to upload image:', error)
                }
            }

            queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
            setIsDialogOpen(false)
            setImageFile(null)
            setImagePreview(null)
            reset()
            toast({ title: t('categories.createSuccess') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('categories.createError'),
                variant: 'destructive'
            })
        }
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            categoryService.updateCategory(id, data),
        onSuccess: async (updatedCategory) => {
            // Upload image if selected
            if (imageFile) {
                try {
                    await categoryService.uploadImage(updatedCategory.id, imageFile)
                } catch (error) {
                    console.error('Failed to upload image:', error)
                }
            }

            queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
            setEditingCategory(null)
            setIsDialogOpen(false)
            setImageFile(null)
            setImagePreview(null)
            reset()
            toast({ title: t('categories.updateSuccess') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('categories.updateError'),
                variant: 'destructive'
            })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: categoryService.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
            toast({ title: t('categories.deleteSuccess') })
        },
        onError: (error: any) => {
            toast({
                title: t('common.error'),
                description: error?.response?.data?.message || t('categories.deleteError'),
                variant: 'destructive'
            })
        }
    })

    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            name_en: '',
            name_ar: '',
            slug: '',
            description_en: '',
            description_ar: '',
            icon: '',
            parent_id: null as number | null,
            sort_order: 0,
            is_active: true
        }
    })

    const onSubmit = (data: any) => {
        const payload = {
            ...data,
            parent_id: data.parent_id === '' || data.parent_id === 'null' || data.parent_id === null || data.parent_id === undefined
                ? null
                : Number(data.parent_id),
            sort_order: Number(data.sort_order) || 0,
            is_active: Boolean(data.is_active)
        }

        // Remove parent_id if it's null so it's not sent to the backend
        if (payload.parent_id === null) {
            delete payload.parent_id
        }

        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: payload })
        } else {
            createMutation.mutate(payload)
        }
    }

    const handleEdit = (category: Category) => {
        setEditingCategory(category)
        setIsDialogOpen(true)
        // Use reset to properly set all form values
        reset({
            name_en: category.name_en || '',
            name_ar: category.name_ar || '',
            slug: category.slug || '',
            description_en: category.description_en || '',
            description_ar: category.description_ar || '',
            icon: category.icon || '',
            parent_id: category.parent_id || null,
            sort_order: category.sort_order || 0,
            is_active: category.is_active ?? true
        })
        setImagePreview(category.image || null)
        setImageFile(null)
    }

    const handleOpenDialog = () => {
        setEditingCategory(null)
        setIsDialogOpen(true)
        setImageFile(null)
        setImagePreview(null)
        reset({
            name_en: '',
            name_ar: '',
            slug: '',
            description_en: '',
            description_ar: '',
            icon: '',
            parent_id: null,
            sort_order: 0,
            is_active: true
        })
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const getAllCategories = (categories: Category[]): Category[] => {
        let result: Category[] = []
        categories.forEach(cat => {
            result.push(cat)
            if (cat.children && cat.children.length > 0) {
                result = result.concat(getAllCategories(cat.children))
            }
        })
        return result
    }

    const filterCategories = (categories: Category[], query: string): Category[] => {
        if (!query.trim()) return categories

        const lowerQuery = query.toLowerCase()
        return categories.filter(cat => {
            const nameMatch = cat.name_en?.toLowerCase().includes(lowerQuery) ||
                cat.name_ar?.toLowerCase().includes(lowerQuery)
            const slugMatch = cat.slug?.toLowerCase().includes(lowerQuery)
            const descMatch = cat.description_en?.toLowerCase().includes(lowerQuery) ||
                cat.description_ar?.toLowerCase().includes(lowerQuery)

            const childrenMatch = cat.children && cat.children.length > 0
                ? filterCategories(cat.children, query).length > 0
                : false

            return nameMatch || slugMatch || descMatch || childrenMatch
        }).map(cat => ({
            ...cat,
            children: cat.children ? filterCategories(cat.children, query) : []
        }))
    }

    const allCategories = categoryTree ? getAllCategories(categoryTree) : []
    const totalCategories = allCategories.length
    const activeCategories = allCategories.filter(cat => cat.is_active).length
    const totalProducts = allCategories.reduce((sum, cat) => sum + (cat.products_count || 0), 0)

    const renderCategoryTree = (categories: Category[], level = 0) => {
        return categories.map((category) => (
            <div key={category.id}>
                <div
                    className={`flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-elbaraka-primary hover:bg-gradient-to-r hover:from-elbaraka-primary/5 hover:to-transparent hover:shadow-md transition-all duration-300 mb-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ marginLeft: isRTL ? '0' : `${level * 24}px`, marginRight: isRTL ? `${level * 24}px` : '0' }}
                    onClick={() => setViewingCategory(category)}
                >
                    <div className={`flex items-center flex-1 ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                        {category.image ? (
                            <img
                                src={category.image}
                                alt={isRTL ? category.name_ar : category.name_en}
                                className="h-12 w-12 rounded-lg object-cover border-2 border-gray-200 group-hover:border-elbaraka-primary transition-colors shadow-sm"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = '<div class="h-10 w-10 bg-gray-100 rounded flex items-center justify-center border border-gray-200"><svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                }}
                            />
                        ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center border border-gray-200">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                        )}
                        <FolderTree className="h-5 w-5 text-elbaraka-primary" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-medium">{isRTL ? category.name_ar : category.name_en}</p>
                                {category.icon && <span className="text-sm">({category.icon})</span>}
                            </div>
                            <p className="text-sm text-muted-foreground">{isRTL ? category.name_en : category.name_ar}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('categories.slug')}: {category.slug} | {t('categories.sortOrder')}: {category.sort_order}
                                {category.products_count !== undefined && ` | ${category.products_count} ${t('products.productsCount')}`}
                            </p>
                        </div>
                    </div>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`} onClick={(e) => e.stopPropagation()}>
                        <span
                            className={`px-2 py-1 text-xs rounded ${category.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            {category.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(category); }}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(t('confirmations.deleteCategory'))) {
                                    deleteMutation.mutate(category.id)
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {category.children && category.children.length > 0 && (
                    <div className="space-y-0">
                        {renderCategoryTree(category.children, level + 1)}
                    </div>
                )}
            </div>
        ))
    }

    const filteredCategories = categoryTree ? filterCategories(categoryTree, searchQuery) : []

    return (
        <div className="space-y-6 p-6">
            {/* Header Section */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary bg-clip-text text-transparent">
                        {t('categories.title')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">{t('categories.subtitle')}</p>
                </div>
                <Button
                    onClick={handleOpenDialog}
                    size="lg"
                    className="bg-gradient-to-r from-elbaraka-primary to-elbaraka-secondary hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    <Plus className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('categories.addCategory')}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-elbaraka-primary bg-gradient-to-br from-white to-elbaraka-primary/5 hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('categories.total')}</p>
                                <p className="text-3xl font-bold text-elbaraka-primary mt-1">{totalCategories}</p>
                            </div>
                            <div className="bg-elbaraka-primary/10 p-3 rounded-full">
                                <Layers className="h-6 w-6 text-elbaraka-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50 hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('categories.active')}</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{activeCategories}</p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                                <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('categories.totalProducts')}</p>
                                <p className="text-3xl font-bold text-blue-600 mt-1">{totalProducts}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{t('categories.inactive')}</p>
                                <p className="text-3xl font-bold text-purple-600 mt-1">{totalCategories - activeCategories}</p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <Tag className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Bar */}
            <Card className="shadow-md">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <Input
                            type="text"
                            placeholder={t('categories.searchPlaceholder') || 'Search categories by name, slug, or description...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} h-12 text-base border-2 focus:border-elbaraka-primary transition-colors`}
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-2' : 'right-2'}`}
                                onClick={() => setSearchQuery('')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {searchQuery && (
                        <p className="text-sm text-gray-600 mt-2">
                            {t('categories.searchResults') || 'Found'} {filterCategories(categoryTree || [], searchQuery).length} {t('categories.categories') || 'categories'}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Categories List */}
            <Card className="shadow-lg">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-elbaraka-primary mb-4"></div>
                            <p className="text-gray-600">{t('common.loading')}</p>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                            <Search className="h-16 w-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">{searchQuery ? t('categories.noResults') || 'No categories found' : t('categories.noCategories') || 'No categories yet'}</p>
                            <p className="text-sm mt-2">{searchQuery ? t('categories.tryDifferentSearch') || 'Try a different search term' : t('categories.addFirstCategory') || 'Add your first category to get started'}</p>
                        </div>
                    ) : (
                        <div className="space-y-0">{renderCategoryTree(filteredCategories)}</div>
                    )}
                </CardContent>
            </Card>

            {/* Category Detail View Dialog */}
            <Dialog open={!!viewingCategory} onOpenChange={(open) => !open && setViewingCategory(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
                    {viewingCategory && (
                        <div className="grid md:grid-cols-2 h-full">
                            {/* Left Side - Category Image */}
                            <div className="bg-gradient-to-br from-elbaraka-primary/10 to-elbaraka-secondary/10 p-8 flex items-center justify-center relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-4 right-4 z-10"
                                    onClick={() => setViewingCategory(null)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                {viewingCategory.image ? (
                                    <img
                                        src={viewingCategory.image}
                                        alt={viewingCategory.name_en || viewingCategory.name_ar}
                                        className="max-w-full max-h-[600px] object-contain rounded-lg shadow-xl"
                                    />
                                ) : (
                                    <div className="w-full h-96 bg-white rounded-lg flex items-center justify-center shadow-xl">
                                        <FolderTree className="h-32 w-32 text-gray-300" />
                                    </div>
                                )}
                            </div>

                            {/* Right Side - Category Information */}
                            <div className="p-8 overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Header */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            {viewingCategory.is_active ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                    ✓ {t('common.active')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                                                    {t('common.inactive')}
                                                </span>
                                            )}
                                            {viewingCategory.parent_id && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                    📁 {t('categories.subcategoryLabel')}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-1">
                                            {isRTL ? (viewingCategory.name_ar || viewingCategory.name_en) : (viewingCategory.name_en || viewingCategory.name_ar)}
                                        </h2>
                                        <p className="text-sm text-gray-500">{t('categories.idLabel')}: {viewingCategory.id}</p>
                                        {viewingCategory.slug && (
                                            <p className="text-xs text-gray-400 mt-1">{t('categories.slug')}: {viewingCategory.slug}</p>
                                        )}
                                    </div>

                                    {/* Category Details Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {viewingCategory.icon && (
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-600 mb-1">{t('categories.icon')}</p>
                                                <p className="font-semibold text-gray-900 text-2xl">{viewingCategory.icon}</p>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600 mb-1">{t('categories.sortOrder')}</p>
                                            <p className="font-semibold text-gray-900 text-sm">{viewingCategory.sort_order}</p>
                                        </div>
                                        {viewingCategory.products_count !== undefined && (
                                            <div className="bg-elbaraka-primary/5 p-3 rounded-lg border-l-4 border-elbaraka-primary">
                                                <p className="text-xs text-gray-600 mb-1">{t('categories.productsCount')}</p>
                                                <p className="font-bold text-elbaraka-primary text-lg">{viewingCategory.products_count}</p>
                                            </div>
                                        )}
                                        {viewingCategory.children && viewingCategory.children.length > 0 && (
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-600 mb-1">{t('categories.subcategories')}</p>
                                                <p className="font-semibold text-blue-700 text-sm">{viewingCategory.children.length}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Parent Category Info */}
                                    {viewingCategory.parent_id && categoryTree && (
                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-lg">
                                            <p className="text-xs mb-1">📁 {t('categories.parentCategory')}</p>
                                            <p className="font-bold">
                                                {(() => {
                                                    const findParent = (cats: Category[]): Category | null => {
                                                        for (const cat of cats) {
                                                            if (cat.id === viewingCategory.parent_id) return cat;
                                                            if (cat.children) {
                                                                const found = findParent(cat.children);
                                                                if (found) return found;
                                                            }
                                                        }
                                                        return null;
                                                    };
                                                    const parent = findParent(categoryTree);
                                                    return parent ? (isRTL ? parent.name_ar : parent.name_en) : 'N/A';
                                                })()}
                                            </p>
                                        </div>
                                    )}

                                    {/* Subcategories List */}
                                    {viewingCategory.children && viewingCategory.children.length > 0 && (
                                        <div className="pt-3 border-t">
                                            <h3 className="text-lg font-bold text-gray-800 mb-3">{t('categories.subcategories')}</h3>
                                            <div className="space-y-2">
                                                {viewingCategory.children.map((child) => (
                                                    <div key={child.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FolderTree className="h-4 w-4 text-elbaraka-primary" />
                                                            <span className="font-medium text-sm">
                                                                {isRTL ? child.name_ar : child.name_en}
                                                            </span>
                                                        </div>
                                                        {child.products_count !== undefined && (
                                                            <span className="text-xs text-gray-600">
                                                                {child.products_count} {t('products.productsCount')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Descriptions */}
                                    {(viewingCategory.description_en || viewingCategory.description_ar) && (
                                        <div className="space-y-3 pt-3 border-t">
                                            <h3 className="text-lg font-bold text-gray-800">{t('categories.descriptions')}</h3>
                                            {viewingCategory.description_en && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('categories.descriptionEn')}</h4>
                                                    <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded">{viewingCategory.description_en}</p>
                                                </div>
                                            )}
                                            {viewingCategory.description_ar && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('categories.descriptionAr')}</h4>
                                                    <p className="text-gray-600 text-sm leading-relaxed text-right bg-gray-50 p-3 rounded" dir="rtl">{viewingCategory.description_ar}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
                                        <p>{t('categories.createdAt')}: {new Date(viewingCategory.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                        <p>{t('categories.updatedAt')}: {new Date(viewingCategory.updated_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-4 border-t">
                                        <Button
                                            onClick={() => {
                                                setViewingCategory(null)
                                                handleEdit(viewingCategory)
                                            }}
                                            className="flex-1 bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            {t('common.edit')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setViewingCategory(null)}
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? t('categories.editCategory') : t('categories.addCategory')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="name_en" label={t('categories.nameEn')} tooltip={t('categories.tooltips.nameEn')} required />
                                <Input id="name_en" {...register('name_en', { required: true })} placeholder={t('categories.nameEnPlaceholder')} />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="name_ar" label={t('categories.nameAr')} tooltip={t('categories.tooltips.nameAr')} required />
                                <Input id="name_ar" {...register('name_ar', { required: true })} placeholder={t('categories.nameArPlaceholder')} dir="rtl" />
                            </div>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="slug" label={t('categories.slug')} tooltip={t('categories.tooltips.slug')} required />
                            <Input
                                id="slug"
                                {...register('slug', { required: true })}
                                placeholder={t('categories.slugPlaceholder')}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabelWithTooltip htmlFor="icon" label={t('categories.icon')} tooltip={t('categories.tooltips.icon')} />
                                <Input
                                    id="icon"
                                    {...register('icon')}
                                    placeholder={t('categories.iconPlaceholder')}
                                />
                            </div>
                            <div>
                                <FormLabelWithTooltip htmlFor="sort_order" label={t('categories.sortOrder')} tooltip={t('categories.tooltips.sortOrder')} />
                                <Input
                                    id="sort_order"
                                    type="number"
                                    {...register('sort_order')}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="parent_id" label={t('categories.parent')} tooltip={t('categories.tooltips.parent')} />
                            <Select
                                value={watch('parent_id') === null || watch('parent_id') === undefined ? 'null' : watch('parent_id')?.toString()}
                                onValueChange={(value) => setValue('parent_id', value === 'null' ? null : Number(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('categories.noParent')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">{t('categories.noParent')}</SelectItem>
                                    {categoryTree && getAllCategories(categoryTree)
                                        .filter(cat => cat.id !== editingCategory?.id)
                                        .map(cat => (
                                            <SelectItem key={cat.id} value={cat.id.toString()}>
                                                {cat.name_en} ({cat.name_ar})
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="description_en" label={t('categories.descriptionEn')} tooltip={t('categories.tooltips.descriptionEn')} />
                            <Textarea id="description_en" {...register('description_en')} rows={2} placeholder={t('categories.descriptionEnPlaceholder')} />
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="description_ar" label={t('categories.descriptionAr')} tooltip={t('categories.tooltips.descriptionAr')} />
                            <Textarea id="description_ar" {...register('description_ar')} rows={2} placeholder={t('categories.descriptionArPlaceholder')} dir="rtl" />
                        </div>

                        <div>
                            <FormLabelWithTooltip htmlFor="image" label={t('categories.image')} tooltip={t('categories.tooltips.image')} />
                            <Input
                                id="image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="cursor-pointer"
                            />
                            {imagePreview && (
                                <div className="mt-2">
                                    <img
                                        src={imagePreview}
                                        alt={t('categories.preview')}
                                        className="h-32 w-32 object-cover rounded border"
                                    />
                                </div>
                            )}
                        </div>

                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                            <input
                                type="checkbox"
                                id="is_active"
                                {...register('is_active')}
                                checked={watch('is_active')}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="is_active">{t('common.active')}</Label>
                            <TooltipProvider>
                                <Tooltip delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 text-white border-slate-800">
                                        <p className="max-w-xs text-xs">{t('categories.tooltips.isActive')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingCategory ? t('common.update') : t('common.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
