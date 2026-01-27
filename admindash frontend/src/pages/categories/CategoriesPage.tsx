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
import type { Category } from '@/types'

export default function CategoriesPage() {
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
            toast({ title: 'Category created successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to create category',
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
            toast({ title: 'Category updated successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update category',
                variant: 'destructive'
            })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: categoryService.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories-tree'] })
            toast({ title: 'Category deleted successfully' })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to delete category',
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
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors mb-2"
                    style={{ marginLeft: `${level * 24}px` }}
                >
                    <div className="flex items-center space-x-3 flex-1">
                        {category.image && (
                            <img
                                src={category.image}
                                alt={category.name_en}
                                className="h-10 w-10 rounded object-cover"
                            />
                        )}
                        <FolderTree className="h-5 w-5 text-elbaraka-primary" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-medium">{category.name_en}</p>
                                {category.icon && <span className="text-sm">({category.icon})</span>}
                            </div>
                            <p className="text-sm text-muted-foreground">{category.name_ar}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Slug: {category.slug} | Order: {category.sort_order}
                                {category.products_count !== undefined && ` | ${category.products_count} products`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span
                            className={`px-2 py-1 text-xs rounded ${category.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                                if (confirm('Are you sure? This will delete all subcategories and products.')) {
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">Categories</h1>
                    <p className="text-muted-foreground mt-1">Manage product categories and hierarchy</p>
                </div>
                <Button
                    onClick={handleOpenDialog}
                    className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : (
                        <div className="space-y-0">{categoryTree && renderCategoryTree(categoryTree)}</div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name_en">Name (English) *</Label>
                                <Input id="name_en" {...register('name_en', { required: true })} placeholder="e.g., Fresh Fruits" />
                            </div>
                            <div>
                                <Label htmlFor="name_ar">Name (Arabic) *</Label>
                                <Input id="name_ar" {...register('name_ar', { required: true })} placeholder="e.g., فواكه طازجة" dir="rtl" />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="slug">Slug *</Label>
                            <Input id="slug" {...register('slug', { required: true })} placeholder="e.g., fresh-fruits" />
                            <p className="text-xs text-muted-foreground mt-1">URL-friendly identifier (lowercase, no spaces)</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="icon">Icon</Label>
                                <Input id="icon" {...register('icon')} placeholder="e.g., apple, cookie" />
                            </div>
                            <div>
                                <Label htmlFor="sort_order">Sort Order</Label>
                                <Input id="sort_order" type="number" {...register('sort_order')} placeholder="0" />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="parent_id">Parent Category</Label>
                            <Select
                                value={watch('parent_id') === null || watch('parent_id') === undefined ? 'null' : watch('parent_id')?.toString()}
                                onValueChange={(value) => setValue('parent_id', value === 'null' ? null : Number(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="None (Root Category)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">None (Root Category)</SelectItem>
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
                            <Label htmlFor="description_en">Description (English)</Label>
                            <Textarea id="description_en" {...register('description_en')} rows={2} placeholder="English description..." />
                        </div>

                        <div>
                            <Label htmlFor="description_ar">Description (Arabic)</Label>
                            <Textarea id="description_ar" {...register('description_ar')} rows={2} placeholder="الوصف بالعربية..." dir="rtl" />
                        </div>

                        <div>
                            <Label htmlFor="image">Category Image</Label>
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

                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 rounded border-gray-300" />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingCategory ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
