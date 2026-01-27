import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderService, type OrderFilters } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/badge'
import { Search, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function OrdersPage() {
    const [filters, setFilters] = useState<OrderFilters>({ page: 1, per_page: 20, sort_by: 'created_at', sort_order: 'desc' })
    const [searchTerm, setSearchTerm] = useState('')

    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['orders', filters],
        queryFn: () => orderService.getOrders(filters),
    })

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-elbaraka-primary">Orders</h1>
                <p className="text-muted-foreground mt-1">Manage customer orders and deliveries</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-4 mb-6">
                        <div className="md:col-span-2">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Search by order number or customer..."
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
                            value={filters.status as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, status: value && value !== 'all' ? value as any : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="preparing">Preparing</SelectItem>
                                <SelectItem value="ready_for_delivery">Ready for Delivery</SelectItem>
                                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.payment_status as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, payment_status: value && value !== 'all' ? value : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Payment Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : !ordersData?.data?.length ? (
                        <div className="text-center py-12 text-muted-foreground">No orders found</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Order Number</th>
                                            <th className="text-left p-3">Customer</th>
                                            <th className="text-left p-3">Total</th>
                                            <th className="text-left p-3">Payment Method</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-left p-3">Payment</th>
                                            <th className="text-left p-3">Date</th>
                                            <th className="text-right p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ordersData?.data?.map((order) => (
                                            <tr key={order.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-mono text-sm font-medium">{order.order_number}</td>
                                                <td className="p-3">
                                                    <div>
                                                        <p className="font-medium">
                                                            {order.user?.first_name} {order.user?.last_name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">{order.user?.phone}</p>
                                                    </div>
                                                </td>
                                                <td className="p-3 font-semibold">{formatCurrency(order.final_amount)}</td>
                                                <td className="p-3 text-sm">{order.payment_method.replace('_', ' ')}</td>
                                                <td className="p-3">
                                                    <OrderStatusBadge status={order.status} />
                                                </td>
                                                <td className="p-3">
                                                    <PaymentStatusBadge status={order.payment_status} />
                                                </td>
                                                <td className="p-3 text-sm">{formatDate(order.created_at)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end">
                                                        <Link to={`/orders/${order.id}`}>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {((filters.page || 1) - 1) * (filters.per_page || 20) + 1} to{' '}
                                    {Math.min((filters.page || 1) * (filters.per_page || 20), ordersData?.meta?.total || 0)} of{' '}
                                    {ordersData?.meta?.total || 0} orders
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
                                        disabled={filters.page === ordersData?.meta?.last_page}
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
        </div>
    )
}
