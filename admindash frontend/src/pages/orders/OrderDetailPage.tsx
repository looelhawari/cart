import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/order.service'
import { driverService } from '@/services/driver.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, MapPin, User, Package, DollarSign, CheckCircle, Truck, Clock, XCircle, RefreshCw, Printer, UserCheck, Navigation } from 'lucide-react'
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
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [selectedDriverId, setSelectedDriverId] = useState<string>('')

    const { data: order, isLoading } = useQuery({
        queryKey: ['order', id],
        queryFn: () => orderService.getOrder(Number(id)),
        refetchInterval: 5000, // Auto-refresh every 5 seconds for real-time updates
    })

    const { data: availableDrivers } = useQuery({
        queryKey: ['available-drivers'],
        queryFn: () => driverService.getAvailableDrivers(),
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
            orderService.updateOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            toast({ title: t('orders.orderStatusUpdated'), description: t('orders.orderStatusUpdatedDesc') })
        },
        onError: () => {
            toast({ title: t('common.error'), description: t('orders.failedToUpdateStatus'), variant: 'destructive' })
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
            toast({ title: t('orders.orderCancelled'), description: t('orders.orderCancelledDesc') })
        },
        onError: () => {
            toast({ title: t('common.error'), description: t('orders.failedToCancelOrder'), variant: 'destructive' })
        }
    })

    const assignDriverMutation = useMutation({
        mutationFn: ({ orderId, driverId }: { orderId: number; driverId: number }) =>
            driverService.assignDriverToOrder(orderId, driverId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] })
            setSelectedDriverId('')
            toast({ title: 'Driver assigned', description: 'Driver has been assigned to this order.' })
        },
        onError: (err: any) => {
            toast({
                title: 'Failed to assign driver',
                description: err.response?.data?.message || 'Unknown error',
                variant: 'destructive',
            })
        },
    })

    const handleAssignDriver = () => {
        if (selectedDriverId && order) {
            assignDriverMutation.mutate({ orderId: order.id, driverId: Number(selectedDriverId) })
        }
    }

    const handleStatusUpdate = (newStatus: OrderStatus) => {
        updateStatusMutation.mutate({ id: Number(id), status: newStatus })
    }

    const handleCancelOrder = () => {
        if (!cancelReason.trim()) {
            toast({ title: t('common.error'), description: t('orders.provideCancellationReason'), variant: 'destructive' })
            return
        }
        cancelOrderMutation.mutate({ id: Number(id), reason: cancelReason })
    }

    if (isLoading) return <div className="text-center py-12">{t('common.loading')}</div>
    if (!order) return <div className="text-center py-12">{t('orders.orderNotFound')}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-elbaraka-primary">{t('orders.orderNumber')} {order.order_number}</h1>
                        <p className="text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/orders/${order.id}/receipt`, '_blank')}>
                        <Printer className="h-4 w-4 mr-2" />
                        {t('orders.printReceipt')}
                    </Button>
                    <OrderStatusBadge status={order.status} />
                    <PaymentStatusBadge status={order.payment_status} />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            {t('orders.customerInformation')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('orders.name')}</p>
                            <p className="font-medium">
                                {order.user?.first_name} {order.user?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('orders.email')}</p>
                            <p className="font-medium">{order.user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('orders.phone')}</p>
                            <p className="font-medium">{order.user?.phone}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <MapPin className="h-5 w-5 mr-2" />
                            {t('orders.deliveryInformation')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {order.delivery_address_details ? (
                            <div className="space-y-2">
                                {order.delivery_address_details.recipient_name && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.recipient')}</p>
                                        <p className="font-medium">{order.delivery_address_details.recipient_name}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('orders.street')}</p>
                                    <p className="font-medium">{order.delivery_address_details.street}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.building')}</p>
                                        <p className="font-medium">{order.delivery_address_details.building}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.floor')}</p>
                                        <p className="font-medium">{order.delivery_address_details.floor}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.apartment')}</p>
                                        <p className="font-medium">{order.delivery_address_details.apartment}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.area')}</p>
                                        <p className="font-medium">{order.delivery_address_details.area}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.city')}</p>
                                        <p className="font-medium">{order.delivery_address_details.city}</p>
                                    </div>
                                </div>
                                {order.delivery_address_details.landmark && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('orders.landmark')}</p>
                                        <p className="font-medium">{order.delivery_address_details.landmark}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.address')}</p>
                                <p className="font-medium">{order.delivery_address}</p>
                            </div>
                        )}
                        {order.delivery_notes && (
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.deliveryNotes')}</p>
                                <p className="font-medium">{order.delivery_notes}</p>
                            </div>
                        )}
                        {order.estimated_delivery_time && (
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.estimatedDelivery')}</p>
                                <p className="font-medium">{new Date(order.estimated_delivery_time).toLocaleDateString()}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Driver Assignment Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Truck className="h-5 w-5 mr-2" />
                        Driver Assignment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {(order as any).driver ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <UserCheck className="h-5 w-5 text-green-600" />
                                <div className="flex-1">
                                    <p className="font-medium text-green-800">
                                        {(order as any).driver.first_name} {(order as any).driver.last_name}
                                    </p>
                                    <p className="text-sm text-green-600">
                                        {(order as any).driver.phone}
                                        {(order as any).driver.vehicle_type && ` · ${(order as any).driver.vehicle_type}`}
                                        {(order as any).driver.vehicle_plate && ` (${(order as any).driver.vehicle_plate})`}
                                    </p>
                                </div>
                                {(order as any).driver.current_lat && (order as any).driver.current_lng && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const url = `https://www.google.com/maps?q=${(order as any).driver.current_lat},${(order as any).driver.current_lng}`
                                            window.open(url, '_blank')
                                        }}
                                    >
                                        <Navigation className="h-3 w-3 mr-1" />
                                        Track
                                    </Button>
                                )}
                            </div>
                            {/* Reassign option */}
                            <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground mb-2">Reassign to another driver:</p>
                                <div className="flex items-center gap-2">
                                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select driver..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(availableDrivers || []).map((d: any) => (
                                                <SelectItem key={d.id} value={String(d.id)}>
                                                    {d.first_name} {d.last_name}
                                                    {d.vehicle_type ? ` (${d.vehicle_type})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        onClick={handleAssignDriver}
                                        disabled={!selectedDriverId || assignDriverMutation.isPending}
                                    >
                                        {assignDriverMutation.isPending ? 'Assigning...' : 'Reassign'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                No driver assigned yet. {order.status === 'confirmed' ? 'A driver will be auto-assigned, or you can assign one manually:' : 'Assign a driver manually:'}
                            </p>
                            <div className="flex items-center gap-2">
                                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select available driver..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(availableDrivers || []).map((d: any) => (
                                            <SelectItem key={d.id} value={String(d.id)}>
                                                {d.first_name} {d.last_name}
                                                {d.vehicle_type ? ` (${d.vehicle_type})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleAssignDriver}
                                    disabled={!selectedDriverId || assignDriverMutation.isPending}
                                >
                                    {assignDriverMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        {t('orders.items')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.product')}</th>
                                <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('orders.price')}</th>
                                <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('orders.quantity')}</th>
                                <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('orders.subtotal')}</th>
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
                        {t('orders.paymentSummary')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span>{t('orders.subtotal')}</span>
                        <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>{t('orders.discount')}</span>
                            <span>-{formatCurrency(order.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>{t('orders.deliveryFee')}</span>
                        <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg">
                        <span>{t('orders.total')}</span>
                        <span>{formatCurrency(order.final_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('orders.paymentMethod')}</span>
                        <span>{order.payment_method?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Order Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 mr-2" />
                        Order Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        {[
                            { status: 'pending', label: 'Order Placed', time: order.created_at },
                            { status: 'confirmed', label: 'Confirmed', time: (order as any).confirmed_at },
                            { status: 'preparing', label: 'Preparing', time: (order as any).preparing_at },
                            { status: 'out_for_delivery', label: 'Out for Delivery', time: (order as any).driver_picked_up_at },
                            { status: 'delivered', label: 'Delivered', time: (order as any).actual_delivered_at },
                        ].map((step, i, arr) => {
                            const statusOrder = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']
                            const currentIdx = statusOrder.indexOf(order.status)
                            const stepIdx = statusOrder.indexOf(step.status)
                            const isCompleted = stepIdx <= currentIdx && order.status !== 'cancelled'
                            const isCurrent = stepIdx === currentIdx
                            const isCancelled = order.status === 'cancelled'

                            return (
                                <div key={step.status} className="flex items-start gap-3 mb-4 last:mb-0">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isCancelled && stepIdx > 0 ? 'bg-gray-300' :
                                                isCompleted ? 'bg-green-500' :
                                                    isCurrent ? 'bg-blue-500 ring-4 ring-blue-100' :
                                                        'bg-gray-300'
                                            }`}>
                                            {isCompleted && !isCurrent ? <CheckCircle className="h-4 w-4" /> : i + 1}
                                        </div>
                                        {i < arr.length - 1 && (
                                            <div className={`w-0.5 h-6 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                                        )}
                                    </div>
                                    <div className="pt-1">
                                        <p className={`font-medium text-sm ${isCompleted ? 'text-green-700' : 'text-gray-500'}`}>
                                            {step.label}
                                        </p>
                                        {step.time && (
                                            <p className="text-xs text-muted-foreground">{formatDate(step.time)}</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {order.status === 'cancelled' && (
                            <div className="flex items-start gap-3 mt-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white">
                                    <XCircle className="h-4 w-4" />
                                </div>
                                <div className="pt-1">
                                    <p className="font-medium text-sm text-red-700">Cancelled</p>
                                    {(order as any).cancelled_at && (
                                        <p className="text-xs text-muted-foreground">{formatDate((order as any).cancelled_at)}</p>
                                    )}
                                    {(order as any).cancellation_reason && (
                                        <p className="text-xs text-red-500 mt-1">Reason: {(order as any).cancellation_reason}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('orders.orderActions')}</CardTitle>
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
                                    {t('orders.confirmOrder')}
                                </Button>
                            )}

                            {(order.status === 'confirmed' || order.status === 'pending') && (
                                <Button
                                    onClick={() => handleStatusUpdate('preparing')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    <Package className="h-4 w-4 mr-2" />
                                    {t('orders.startPreparing')}
                                </Button>
                            )}

                            {order.status === 'preparing' && (
                                <Button
                                    onClick={() => handleStatusUpdate('out_for_delivery')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Truck className="h-4 w-4 mr-2" />
                                    {t('orders.outForDelivery')}
                                </Button>
                            )}

                            {order.status === 'out_for_delivery' && (
                                <Button
                                    onClick={() => handleStatusUpdate('delivered')}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    {t('orders.markAsDelivered')}
                                </Button>
                            )}

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowCancelDialog(true)}
                                    disabled={cancelOrderMutation.isPending}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    {t('orders.cancelOrder')}
                                </Button>
                            )}
                        </div>

                        {/* Advanced Status Update Dropdown */}
                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground mb-2">{t('orders.manuallyUpdateStatus')}</p>
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
                                            {t('orders.status.pending')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="confirmed">
                                        <div className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                            {t('orders.status.confirmed')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="preparing">
                                        <div className="flex items-center">
                                            <Package className="h-4 w-4 mr-2 text-orange-600" />
                                            {t('orders.status.preparing')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="out_for_delivery">
                                        <div className="flex items-center">
                                            <Truck className="h-4 w-4 mr-2 text-purple-500" />
                                            {t('orders.status.outForDelivery')}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="delivered">
                                        <div className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                            {t('orders.status.delivered')}
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Update Indicator */}
                        {updateStatusMutation.isPending && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                {t('orders.updatingOrderStatus')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Cancel Order Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('orders.cancelOrderTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('orders.cancelOrderDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder={t('orders.enterCancellationReason')}
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
                            {t('orders.keepOrder')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={!cancelReason.trim() || cancelOrderMutation.isPending}
                        >
                            {cancelOrderMutation.isPending ? t('orders.cancelling') : t('orders.cancelOrder')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
