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
import { useTranslation } from 'react-i18next'

export default function OrdersPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

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
                <h1 className="text-3xl font-bold text-elbaraka-primary">{t('orders.title')}</h1>
                <p className="text-muted-foreground mt-1">{t('orders.subtitle')}</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-4 mb-6">
                        <div className="md:col-span-2">
                            <div className={`flex ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                                <Input
                                    placeholder={t('orders.searchPlaceholder')}
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
                            value={filters.status as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, status: value && value !== 'all' ? value as any : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('orders.allStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('orders.allStatus')}</SelectItem>
                                <SelectItem value="pending">{t('orders.status.pending')}</SelectItem>
                                <SelectItem value="confirmed">{t('orders.status.confirmed')}</SelectItem>
                                <SelectItem value="preparing">{t('orders.status.preparing')}</SelectItem>
                                <SelectItem value="ready_for_delivery">{t('orders.status.readyForDelivery')}</SelectItem>
                                <SelectItem value="out_for_delivery">{t('orders.status.outForDelivery')}</SelectItem>
                                <SelectItem value="delivered">{t('orders.status.delivered')}</SelectItem>
                                <SelectItem value="cancelled">{t('orders.status.cancelled')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.payment_status as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, payment_status: value && value !== 'all' ? value : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('orders.paymentStatus.title')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('orders.allPayments')}</SelectItem>
                                <SelectItem value="pending">{t('orders.paymentStatus.pending')}</SelectItem>
                                <SelectItem value="paid">{t('orders.paymentStatus.paid')}</SelectItem>
                                <SelectItem value="failed">{t('orders.paymentStatus.failed')}</SelectItem>
                                <SelectItem value="refunded">{t('orders.paymentStatus.refunded')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">{t('common.loading')}...</div>
                    ) : !ordersData?.data?.length ? (
                        <div className="text-center py-12 text-muted-foreground">{t('orders.noOrders')}</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.orderNumber')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.customer')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.total')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.paymentMethod')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.status')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.payment')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.date')}</th>
                                            <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
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
                                                <td className="p-3 font-semibold">{formatCurrency(order.total)}</td>
                                                <td className="p-3 text-sm">{order.payment_method.replace('_', ' ')}</td>
                                                <td className="p-3">
                                                    <OrderStatusBadge status={order.status} />
                                                </td>
                                                <td className="p-3">
                                                    <PaymentStatusBadge status={order.payment_status} />
                                                </td>
                                                <td className="p-3 text-sm">{formatDate(order.created_at)}</td>
                                                <td className="p-3">
                                                    <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                                        <Link to={`/orders/${order.id}`}>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                                {t('common.view')}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <p className="text-sm text-muted-foreground">
                                    {t('common.showing')} {((filters.page || 1) - 1) * (filters.per_page || 20) + 1} {t('common.to')}{' '}
                                    {Math.min((filters.page || 1) * (filters.per_page || 20), ordersData?.meta?.total || 0)} {t('common.of')}{' '}
                                    {ordersData?.meta?.total || 0} {t('orders.ordersCount')}
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
                                        disabled={filters.page === ordersData?.meta?.last_page}
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
        </div>
    )
}
