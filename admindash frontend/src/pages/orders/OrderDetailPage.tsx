import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, MapPin, User, Package, DollarSign, CheckCircle, Truck, Clock, XCircle, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

export default function OrderDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [cancelReason, setCancelReason] = useState('')

    const { data: order, isLoading } = useQuery({
        queryKey: ['order', id],
        queryFn: () => orderService.getOrder(Number(id)),
        refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
            orderService.updateOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            toast({ title: 'Order status updated successfully', description: 'The order status has been updated.' })
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' })
        }
    })

    const cancelOrderMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) =>
            orderService.cancelOrder(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            setShowCancelDialog(false)
            setCancelReason('')
            toast({ title: 'Order cancelled successfully', description: 'The order has been cancelled.' })
        },
        onError: () => {
            toast({ title: 'Error', description: 'Failed to cancel order', variant: 'destructive' })
        }
    })

    const handleStatusUpdate = (newStatus: OrderStatus) => {
        updateStatusMutation.mutate({ id: Number(id), status: newStatus })
    }

    const handleCancelOrder = () => {
        if (!cancelReason.trim()) {
            toast({ title: 'Error', description: 'Please provide a cancellation reason', variant: 'destructive' })
            return
        }
        cancelOrderMutation.mutate({ id: Number(id), reason: cancelReason })
    }

    if (isLoading) return <div className="text-center py-12">Loading...</div>
    if (!order) return <div className="text-center py-12">Order not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-elbaraka-primary">Order {order.order_number}</h1>
                        <p className="text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.payment_status} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            Customer Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-medium">
                                {order.user?.first_name} {order.user?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{order.user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{order.user?.phone}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2" />
                            Delivery Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {order.delivery_address_details ? (
                            <div className="space-y-2">
                                {order.delivery_address_details.recipient_name && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Recipient</p>
                                        <p className="font-medium">{order.delivery_address_details.recipient_name}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-muted-foreground">Street</p>
                                    <p className="font-medium">{order.delivery_address_details.street}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Building</p>
                                        <p className="font-medium">{order.delivery_address_details.building}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Floor</p>
                                        <p className="font-medium">{order.delivery_address_details.floor}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Apartment</p>
                                        <p className="font-medium">{order.delivery_address_details.apartment}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Area</p>
                                        <p className="font-medium">{order.delivery_address_details.area}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">City</p>
                                        <p className="font-medium">{order.delivery_address_details.city}</p>
                                    </div>
                                </div>
                                {order.delivery_address_details.landmark && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Landmark</p>
                                        <p className="font-medium">{order.delivery_address_details.landmark}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">{order.delivery_address}</p>
                            </div>
                        )}
                        {order.delivery_notes && (
                            <div>
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="font-medium">{order.delivery_notes}</p>
                            </div>
                        )}
                        {order.estimated_delivery_time && (
                            <div>
                                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                                <p className="font-medium">{new Date(order.estimated_delivery_time).toLocaleDateString()}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Order Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-3">Product</th>
                                <th className="text-right p-3">Price</th>
                                <th className="text-right p-3">Quantity</th>
                                <th className="text-right p-3">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items?.map((item) => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-3">{item.product_name}</td>
                                    <td className="p-3 text-right">{formatCurrency(item.product_price)}</td>
                                    <td className="p-3 text-right">{item.quantity}</td>
                                    <td className="p-3 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2" />
                        Payment Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-{formatCurrency(order.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(order.final_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Payment Method</span>
                        <span>{order.payment_method?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Order Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Quick Action Buttons */}
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {order.status === 'pending' && (
                                <Button
                                    onClick={() => handleStatusUpdate('confirmed')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Order
                                </Button>
                            )}

                            {(order.status === 'confirmed' || order.status === 'pending') && (
                                <Button
                                    onClick={() => handleStatusUpdate('preparing')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Package className="h-4 w-4 mr-2" />
                                    Start Preparing
                                </Button>
                            )}

                            {order.status === 'preparing' && (
                                <Button
                                    onClick={() => handleStatusUpdate('out_for_delivery')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Truck className="h-4 w-4 mr-2" />
                                    Out for Delivery
                                </Button>
                            )}

                            {order.status === 'out_for_delivery' && (
                                <Button
                                    onClick={() => handleStatusUpdate('delivered')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Delivered
                                </Button>
                            )}

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowCancelDialog(true)}
                                    disabled={cancelOrderMutation.isPending}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Order
                                </Button>
                            )}
                        </div>

                        {/* Advanced Status Update Dropdown */}
                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">Or manually update status:</p>
                            <Select
                                value={order.status}
                                onValueChange={(value: OrderStatus) => handleStatusUpdate(value)}
                                disabled={updateStatusMutation.isPending}
                            >
                                <SelectTrigger className="w-full md:w-64">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">
                                        <div className="flex items-center">
                                            <Clock className="h-4 w-4 mr-2 text-orange-500" />
                                            Pending
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="confirmed">
                                        <div className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                            Confirmed
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="preparing">
                                        <div className="flex items-center">
                                            <Package className="h-4 w-4 mr-2 text-orange-600" />
                                            Preparing
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="out_for_delivery">
                                        <div className="flex items-center">
                                            <Truck className="h-4 w-4 mr-2 text-purple-500" />
                                            Out for Delivery
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="delivered">
                                        <div className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                            Delivered
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Update Indicator */}
                        {updateStatusMutation.isPending && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Updating order status...
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Cancel Order Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please provide a reason for cancelling this order. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter cancellation reason..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowCancelDialog(false)
                            setCancelReason('')
                        }}>
                            Keep Order
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={!cancelReason.trim() || cancelOrderMutation.isPending}
                        >
                            {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
