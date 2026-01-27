import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promoCodeService, type PromoCodeFilters } from '@/services/promo-code.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Edit, Trash2, Copy, Ticket } from 'lucide-react'
import { format } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import type { PromoCode } from '@/types'

export default function PromoCodesPage() {
    const [filters, setFilters] = useState<PromoCodeFilters>({ page: 1, per_page: 20 })
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null)

    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { register, handleSubmit, reset, control, formState: { errors } } = useForm()

    const { data: promoCodesData, isLoading } = useQuery({
        queryKey: ['promo-codes', filters],
        queryFn: () => promoCodeService.getPromoCodes(filters),
    })

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return promoCodeService.createPromoCode(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            setIsCreateDialogOpen(false)
            reset()
            toast({
                title: 'Success',
                description: 'Promo code created successfully',
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to create promo code',
                variant: 'destructive',
            })
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            return promoCodeService.updatePromoCode(id, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            setEditingPromoCode(null)
            reset()
            toast({
                title: 'Success',
                description: 'Promo code updated successfully',
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to update promo code',
                variant: 'destructive',
            })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return promoCodeService.deletePromoCode(id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promo-codes'] })
            toast({
                title: 'Success',
                description: 'Promo code deleted successfully',
            })
        },
        onError: (error: any) => {
            toast({
                title: 'Error',
                description: error?.response?.data?.message || 'Failed to delete promo code',
                variant: 'destructive',
            })
        },
    })

    const onSubmit = (data: any) => {
        if (editingPromoCode) {
            updateMutation.mutate({ id: editingPromoCode.id, data })
        } else {
            createMutation.mutate(data)
        }
    }

    const handleEdit = (promoCode: PromoCode) => {
        setEditingPromoCode(promoCode)
        reset({
            code: promoCode.code,
            type: promoCode.type,
            value: promoCode.value,
            min_order_amount: promoCode.minimum_order || '',
            max_discount: promoCode.maximum_discount || '',
            usage_limit: promoCode.usage_limit || '',
            valid_from: promoCode.valid_from.split('T')[0],
            valid_until: promoCode.valid_until.split('T')[0],
            is_active: promoCode.is_active,
        })
        setIsCreateDialogOpen(true)
    }

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this promo code?')) {
            deleteMutation.mutate(id)
        }
    }

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code)
        toast({
            title: 'Copied!',
            description: `Code "${code}" copied to clipboard`,
        })
    }

    const getStatusBadge = (promoCode: PromoCode) => {
        if (!promoCode.is_active) {
            return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Inactive</span>
        }
        const now = new Date()
        const validFrom = new Date(promoCode.valid_from)
        const validUntil = new Date(promoCode.valid_until)

        if (now < validFrom) {
            return <span className="px-2 py-1 text-xs rounded bg-blue-200 text-blue-700">Scheduled</span>
        }
        if (now > validUntil) {
            return <span className="px-2 py-1 text-xs rounded bg-red-200 text-red-700">Expired</span>
        }
        if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
            return <span className="px-2 py-1 text-xs rounded bg-orange-200 text-orange-700">Limit Reached</span>
        }
        return <span className="px-2 py-1 text-xs rounded bg-green-200 text-green-700">Active</span>
    }

    const promoCodes = Array.isArray(promoCodesData?.data) ? promoCodesData?.data : promoCodesData?.data?.data || []

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Promo Codes</h1>
                    <p className="text-gray-500 mt-1">Create and manage discount codes for customers</p>
                </div>
                <Button onClick={() => { reset(); setEditingPromoCode(null); setIsCreateDialogOpen(true) }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Promo Code
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search by code..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <Select
                            value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
                            onValueChange={(value) => {
                                setFilters({
                                    ...filters,
                                    is_active: value === 'all' ? undefined : value === 'active',
                                    page: 1,
                                })
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSearch}>Search</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Promo Codes Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading promo codes...</div>
                    ) : promoCodes.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No promo codes found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left p-3">Code</th>
                                        <th className="text-left p-3">Type</th>
                                        <th className="text-left p-3">Value</th>
                                        <th className="text-left p-3">Usage</th>
                                        <th className="text-left p-3">Valid Period</th>
                                        <th className="text-left p-3">Status</th>
                                        <th className="text-right p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {promoCodes.map((promoCode: PromoCode) => (
                                        <tr key={promoCode.id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-elbaraka-primary">
                                                        {promoCode.code}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(promoCode.code)}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                        title="Copy code"
                                                    >
                                                        <Copy className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="capitalize">{promoCode.type}</span>
                                            </td>
                                            <td className="p-3">
                                                {promoCode.type === 'percentage' ? `${promoCode.value}%` : `EGP ${promoCode.value}`}
                                                {promoCode.maximum_discount && (
                                                    <span className="text-xs text-gray-500 ml-1">
                                                        (max: EGP {promoCode.maximum_discount})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {promoCode.used_count} / {promoCode.usage_limit || '∞'}
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div>{format(new Date(promoCode.valid_from), 'MMM dd, yyyy')}</div>
                                                <div className="text-gray-500">to {format(new Date(promoCode.valid_until), 'MMM dd, yyyy')}</div>
                                            </td>
                                            <td className="p-3">
                                                {getStatusBadge(promoCode)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(promoCode)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(promoCode.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPromoCode ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="code">Code *</Label>
                                <Input
                                    id="code"
                                    {...register('code', { required: true })}
                                    placeholder="SUMMER25"
                                    className="uppercase"
                                    disabled={!!editingPromoCode}
                                />
                                {errors.code && <span className="text-xs text-red-500">Code is required</span>}
                            </div>

                            <div>
                                <Label htmlFor="type">Discount Type *</Label>
                                <Controller
                                    name="type"
                                    control={control}
                                    defaultValue="percentage"
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                <SelectItem value="fixed_amount">Fixed Amount (EGP)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="value">Discount Value *</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    {...register('value', { required: true, min: 0 })}
                                    placeholder="25"
                                />
                                {errors.value && <span className="text-xs text-red-500">Value is required</span>}
                            </div>

                            <div>
                                <Label htmlFor="max_discount">Max Discount (EGP)</Label>
                                <Input
                                    id="max_discount"
                                    type="number"
                                    step="0.01"
                                    {...register('max_discount')}
                                    placeholder="100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="min_order_amount">Min Order Amount (EGP)</Label>
                                <Input
                                    id="min_order_amount"
                                    type="number"
                                    step="0.01"
                                    {...register('min_order_amount')}
                                    placeholder="50"
                                />
                            </div>

                            <div>
                                <Label htmlFor="usage_limit">Usage Limit</Label>
                                <Input
                                    id="usage_limit"
                                    type="number"
                                    {...register('usage_limit')}
                                    placeholder="100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="valid_from">Valid From *</Label>
                                <Input
                                    id="valid_from"
                                    type="date"
                                    {...register('valid_from', { required: true })}
                                />
                                {errors.valid_from && <span className="text-xs text-red-500">Start date is required</span>}
                            </div>

                            <div>
                                <Label htmlFor="valid_until">Valid Until *</Label>
                                <Input
                                    id="valid_until"
                                    type="date"
                                    {...register('valid_until', { required: true })}
                                />
                                {errors.valid_until && <span className="text-xs text-red-500">End date is required</span>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Controller
                                name="is_active"
                                control={control}
                                defaultValue={true}
                                render={({ field }) => (
                                    <Switch
                                        id="is_active"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingPromoCode ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
