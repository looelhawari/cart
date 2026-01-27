import { useState } from 'react'
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
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import type { Product } from '@/types'

export default function ProductsPage() {
    const [filters, setFilters] = useState<ProductFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', filters],
        queryFn: () => productService.getProducts(filters),
    })

    const { data: categories } = useQuery({
        queryKey: ['categories-tree'],
        queryFn: () => categoryService.getCategoryTree(),
    })

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
            toast({
                title: 'Success',
                description: 'Product created successfully',
                variant: 'default'
            })
        },
        onError: (error: any) => {
            console.error('Product creation error:', error)
            console.error('Error response:', error?.response?.data)
            const errorMessage = error?.response?.data?.message ||
                JSON.stringify(error?.response?.data?.errors) ||
                'Failed to create product'
            toast({
                title: 'Error',
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
                title: 'Success',
                description: 'Product updated successfully',
                variant: 'default'
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update product',
                variant: 'destructive'
            })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: productService.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast({
                title: 'Success',
                description: 'Product deleted successfully',
                variant: 'default'
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to delete product',
                variant: 'destructive'
            })
        }
    })

    const { register, handleSubmit, reset, setValue, watch } = useForm()

    const onSubmit = (data: any) => {
        console.log('Form data being submitted:', data)
        if (editingProduct) {
            updateMutation.mutate({ barcode: editingProduct.barcode, data })
        } else {
            createMutation.mutate(data)
        }
    }

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const handleEdit = (product: Product) => {
        setEditingProduct(product)
        Object.keys(product).forEach((key) => {
            setValue(key, product[key as keyof Product])
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-elbaraka-primary">Products</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your product catalog
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setIsCreateDialogOpen(true)
                        reset()
                        setSelectedFile(null)
                    }}
                    className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Search by name or barcode..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                        {cat.name_en || cat.name_ar || 'Unnamed'}
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
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="in_stock">In Stock</SelectItem>
                                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                <SelectItem value="discontinued">Discontinued</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Products Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Image</th>
                                            <th className="text-left p-3">Barcode</th>
                                            <th className="text-left p-3">Name</th>
                                            <th className="text-left p-3">Category</th>
                                            <th className="text-left p-3">Price</th>
                                            <th className="text-left p-3">Stock</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-right p-3">Actions</th>
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
                                                    <ProductAvailabilityBadge
                                                        status={
                                                            !product.is_active ? 'discontinued' :
                                                                product.stock_quantity === 0 ? 'out_of_stock' :
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
                                                                if (confirm('Are you sure you want to delete this product?')) {
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
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {((filters.page || 1) - 1) * (filters.per_page || 20) + 1} to{' '}
                                    {Math.min((filters.page || 1) * (filters.per_page || 20), productsData?.total || 0)} of{' '}
                                    {productsData?.total || 0} products
                                </p>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === 1}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === productsData?.last_page}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                    >
                                        Next
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
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="barcode">Barcode *</Label>
                                <Input
                                    id="barcode"
                                    {...register('barcode', { required: true })}
                                    disabled={!!editingProduct}
                                    placeholder="1234567890123"
                                />
                            </div>
                            <div>
                                <Label htmlFor="category_id">Category *</Label>
                                <Select
                                    value={watch('category_id')?.toString() || ''}
                                    onValueChange={(value) => setValue('category_id', parseInt(value))}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {categories?.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id.toString()} className="cursor-pointer">
                                                {cat.name_en || cat.name_ar || cat.name || 'Unnamed'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name_en">Name (English) *</Label>
                                <Input id="name_en" {...register('name_en', { required: true })} />
                            </div>
                            <div>
                                <Label htmlFor="name_ar">Name (Arabic) *</Label>
                                <Input id="name_ar" {...register('name_ar', { required: true })} />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="price">Price (EGP) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', { required: true, valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="cost_price">Cost Price (EGP) *</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    step="0.01"
                                    {...register('cost_price', { required: true, valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                                <Input
                                    id="stock_quantity"
                                    type="number"
                                    {...register('stock_quantity', { required: true, valueAsNumber: true })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="min_stock_level">Min Stock Level *</Label>
                                <Input
                                    id="min_stock_level"
                                    type="number"
                                    {...register('min_stock_level', { required: true, valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="weight">Weight</Label>
                                <Input id="weight" type="number" step="0.01" {...register('weight', { valueAsNumber: true })} />
                            </div>
                            <div>
                                <Label htmlFor="unit">Unit</Label>
                                <Input id="unit" {...register('unit')} placeholder="kg, piece, etc." />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Description (English)</Label>
                            <Textarea id="description" {...register('description')} rows={3} />
                        </div>

                        <div>
                            <Label htmlFor="description_ar">Description (Arabic)</Label>
                            <Textarea id="description_ar" {...register('description_ar')} rows={3} />
                        </div>

                        <div>
                            <Label htmlFor="image">Product Image</Label>
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
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {editingProduct ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
