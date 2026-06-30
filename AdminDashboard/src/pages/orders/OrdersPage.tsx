import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderService, type OrderFilters } from '@/services/order.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/badge'
import { Search, Eye, Printer } from 'lucide-react'
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
                    {/* Wave 5 — Task 4: filter row widened from md:grid-cols-4
                        to md:grid-cols-5 to fit the new Scheduled-vs-instant
                        select alongside Status + Payment-status. */}
                    <div className="grid gap-4 md:grid-cols-5 mb-6">
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
                                <SelectItem value="completed">{t('orders.paymentStatus.completed')}</SelectItem>
                                <SelectItem value="failed">{t('orders.paymentStatus.failed')}</SelectItem>
                                <SelectItem value="refunded">{t('orders.paymentStatus.refunded')}</SelectItem>
                                <SelectItem value="partially_refunded">{t('orders.paymentStatus.partiallyRefunded')}</SelectItem>
                            </SelectContent>
                        </Select>
                        {/* Wave 5 — Task 4: scheduled-vs-instant filter.
                            Backend maps ?scheduled=1 -> whereNotNull(delivery_date),
                            ?scheduled=0 -> whereNull(delivery_date), absent -> both. */}
                        <Select
                            value={(filters as any).scheduled !== undefined ? String((filters as any).scheduled) : 'all'}
                            onValueChange={(value) => {
                                const next: any = { ...filters, page: 1 }
                                if (value === '1') next.scheduled = 1
                                else if (value === '0') next.scheduled = 0
                                else delete next.scheduled
                                setFilters(next)
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('orders.timing') || 'Timing'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('orders.allTiming') || 'All orders'}</SelectItem>
                                <SelectItem value="0">{t('orders.instantOnly') || 'Instant only'}</SelectItem>
                                <SelectItem value="1">{t('orders.scheduledOnly') || 'Scheduled only'}</SelectItem>
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
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('orders.paymentStatus.title')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.date')}</th>
                                            <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(ordersData?.data as any[] | undefined)?.map((order) => {
                                            const isScheduled = Boolean(order.is_scheduled ?? order.delivery_date)
                                            return (
                                            <tr
                                                key={order.id}
                                                className={`border-b hover:bg-gray-50 ${isScheduled ? 'bg-blue-50/60' : ''}`}
                                            >
                                                <td className="p-3 font-mono text-sm font-medium">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{order.order_number}</span>
                                                        {isScheduled && (
                                                            // Wave 5 — Task 4: scheduled-order badge.
                                                            // Shows date + slot so dashboard staff
                                                            // can see at a glance when this order
                                                            // is for, instead of treating it like
                                                            // an instant order.
                                                            <span className="inline-flex items-center gap-1 self-start rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 011 1v1h6V3a1 1 0 112 0v1h1a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1V3a1 1 0 011-1zm10 5H4v9h12V7z" clipRule="evenodd" /></svg>
                                                                {t('orders.scheduled') /* falls back to key if not present */}
                                                                {' '}
                                                                {[order.delivery_date, order.delivery_time_slot].filter(Boolean).join(' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
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
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => window.open(`/orders/${order.id}/receipt`, '_blank', 'noopener,noreferrer')}
                                                            className={isRTL ? 'ml-2' : 'mr-2'}
                                                        >
                                                            <Printer className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                            {t('orders.printReceipt')}
                                                        </Button>
                                                        <Link to={`/orders/${order.id}`}>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                                {t('common.view')}
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                            )
                                        })}
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
