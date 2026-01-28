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
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Category } from '@/types'

export default function CategoriesPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

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
        setValue('name_en', category.name_en)
        setValue('name_ar', category.name_ar)
        setValue('slug', category.slug)
        setValue('description_en', category.description_en || '')
        setValue('description_ar', category.description_ar || '')
        setValue('icon', category.icon || '')
        setValue('parent_id', category.parent_id)
        setValue('sort_order', category.sort_order)
        setValue('is_active', category.is_active)
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

    const renderCategoryTree = (categories: Category[], level = 0) => {
        return categories.map((category) => (
            <div key={category.id}>
                <div
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ marginLeft: isRTL ? '0' : `${level * 24}px`, marginRight: isRTL ? `${level * 24}px` : '0' }}
                >
                    <div className={`flex items-center flex-1 ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                        {category.image && (
                            <img
                                src={category.image}
                                alt={isRTL ? category.name_ar : category.name_en}
                                className="h-10 w-10 rounded object-cover"
                            />
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
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                        <span
                            className={`px-2 py-1 text-xs rounded ${category.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            {category.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
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

    return (
        <div className="space-y-6">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">{t('categories.title')}</h1>
                    <p className="text-muted-foreground mt-1">{t('categories.subtitle')}</p>
                </div>
                <Button
                    onClick={handleOpenDialog}
                    className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                >
                    <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('categories.addCategory')}
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12">{t('common.loading')}</div>
                    ) : (
                        <div className="space-y-0">{categoryTree && renderCategoryTree(categoryTree)}</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? t('categories.editCategory') : t('categories.addCategory')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name_en">{t('categories.nameEn')} *</Label>
                                <Input id="name_en" {...register('name_en', { required: true })} placeholder={t('categories.nameEnPlaceholder')} />
                            </div>
                            <div>
                                <Label htmlFor="name_ar">{t('categories.nameAr')} *</Label>
                                <Input id="name_ar" {...register('name_ar', { required: true })} placeholder={t('categories.nameArPlaceholder')} dir="rtl" />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="slug">{t('categories.slug')} *</Label>
                            <Input id="slug" {...register('slug', { required: true })} placeholder={t('categories.slugPlaceholder')} />
                            <p className="text-xs text-muted-foreground mt-1">{t('categories.slugHint')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="icon">{t('categories.icon')}</Label>
                                <Input id="icon" {...register('icon')} placeholder={t('categories.iconPlaceholder')} />
                            </div>
                            <div>
                                <Label htmlFor="sort_order">{t('categories.sortOrder')}</Label>
                                <Input id="sort_order" type="number" {...register('sort_order')} placeholder="0" />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="parent_id">{t('categories.parent')}</Label>
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
                            <Label htmlFor="description_en">{t('categories.descriptionEn')}</Label>
                            <Textarea id="description_en" {...register('description_en')} rows={2} placeholder={t('categories.descriptionEnPlaceholder')} />
                        </div>

                        <div>
                            <Label htmlFor="description_ar">{t('categories.descriptionAr')}</Label>
                            <Textarea id="description_ar" {...register('description_ar')} rows={2} placeholder={t('categories.descriptionArPlaceholder')} dir="rtl" />
                        </div>

                        <div>
                            <Label htmlFor="image">{t('categories.image')}</Label>
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
                                        alt="Preview"
                                        className="h-32 w-32 object-cover rounded border"
                                    />
                                </div>
                            )}
                        </div>

                        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 rounded border-gray-300" />
                            <Label htmlFor="is_active">{t('common.active')}</Label>
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
