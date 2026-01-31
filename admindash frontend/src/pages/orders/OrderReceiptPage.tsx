import { useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function OrderReceiptPage() {
    const { id } = useParams()

    const orderId = useMemo(() => {
        const parsed = Number(id)
        return Number.isFinite(parsed) ? parsed : null
    }, [id])

    const { data: order, isLoading } = useQuery({
        queryKey: ['order-receipt', orderId],
        queryFn: () => orderService.getOrder(orderId as number),
        enabled: orderId !== null,
    })

    const hasPrintedRef = useRef(false)

    useEffect(() => {
        const previousDir = document.documentElement.dir
        const previousLang = document.documentElement.lang
        const hadRTL = document.body.classList.contains('rtl')
        const hadLTR = document.body.classList.contains('ltr')

        document.documentElement.dir = 'ltr'
        document.documentElement.lang = 'en'
        document.body.classList.remove('rtl', 'ltr')
        document.body.classList.add('ltr')

        return () => {
            document.documentElement.dir = previousDir
            document.documentElement.lang = previousLang
            document.body.classList.remove('rtl', 'ltr')
            if (hadRTL) document.body.classList.add('rtl')
            if (hadLTR) document.body.classList.add('ltr')
        }
    }, [])

    useEffect(() => {
        if (!order || hasPrintedRef.current) return

        hasPrintedRef.current = true
        const timer = window.setTimeout(() => {
            window.onafterprint = () => {
                window.onafterprint = null
                window.close()
            }
            window.print()
        }, 400)

        return () => window.clearTimeout(timer)
    }, [order])

    if (orderId === null) {
        return (
            <div className="p-6">
                <div className="receipt-shell">Invalid Order ID</div>
            </div>
        )
    }

    return (
        <div className="receipt-page">
            <div className="no-print receipt-toolbar">
                <div className="text-sm text-muted-foreground">Receipt preview</div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.close()}>
                        Close
                    </Button>
                </div>
            </div>

            <div className="receipt-shell">
                {isLoading ? (
                    <div className="receipt-muted">Loading…</div>
                ) : !order ? (
                    <div className="receipt-muted">Order not found</div>
                ) : (
                    <div className="receipt">
                        <div className="receipt-header">
                            <div className="receipt-brand">ELBARAKA</div>
                            <div className="receipt-title">DELIVERY RECEIPT</div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-row">
                                <span className="receipt-label">Order #</span>
                                <span className="receipt-value receipt-mono">{order.order_number}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Date</span>
                                <span className="receipt-value">{formatDate(order.created_at)}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Status</span>
                                <span className="receipt-value">{String(order.status).replaceAll('_', ' ')}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Payment</span>
                                <span className="receipt-value">{String(order.payment_method).replaceAll('_', ' ')}</span>
                            </div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-section-title">Customer</div>
                            <div className="receipt-row">
                                <span className="receipt-label">Name</span>
                                <span className="receipt-value">{order.user?.first_name} {order.user?.last_name}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">Phone</span>
                                <span className="receipt-value receipt-mono">{order.user?.phone || 'N/A'}</span>
                            </div>
                            <div className="receipt-row receipt-row-multiline">
                                <span className="receipt-label">Address</span>
                                <span className="receipt-value">{order.delivery_address || 'N/A'}</span>
                            </div>
                            {order.delivery_notes ? (
                                <div className="receipt-row receipt-row-multiline">
                                    <span className="receipt-label">Notes</span>
                                    <span className="receipt-value">{order.delivery_notes}</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-section-title">Items</div>

                            <div className="receipt-items-header receipt-mono">
                                <div className="receipt-col-name">Item</div>
                                <div className="receipt-col-qty">Qty</div>
                                <div className="receipt-col-price">Price</div>
                                <div className="receipt-col-total">Total</div>
                            </div>

                            {(order.items || []).map((item) => (
                                <div key={item.id} className="receipt-item">
                                    <div className="receipt-item-name">{item.product_name}</div>
                                    <div className="receipt-item-qty receipt-mono">{item.quantity}</div>
                                    <div className="receipt-item-price receipt-mono">{formatCurrency(item.product_price)}</div>
                                    <div className="receipt-item-total receipt-mono">{formatCurrency(item.subtotal)}</div>
                                </div>
                            ))}

                            {(!order.items || order.items.length === 0) ? (
                                <div className="receipt-muted">No items</div>
                            ) : null}
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-row">
                                <span className="receipt-label">Subtotal</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.total_amount)}</span>
                            </div>
                            {order.discount_amount > 0 ? (
                                <div className="receipt-row">
                                    <span className="receipt-label">Discount</span>
                                    <span className="receipt-value receipt-mono">-{formatCurrency(order.discount_amount)}</span>
                                </div>
                            ) : null}
                            <div className="receipt-row">
                                <span className="receipt-label">Delivery fee</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.delivery_fee)}</span>
                            </div>
                            <div className="receipt-divider" />
                            <div className="receipt-row receipt-total">
                                <span className="receipt-label">TOTAL</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.final_amount)}</span>
                            </div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-footer">
                            <div className="receipt-muted">Thank you</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
