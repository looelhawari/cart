import { useEffect, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const formatArabicDate = (iso: string | null | undefined) => {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return iso
    }
}

const STATUS_AR: Record<string, string> = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    preparing: 'قيد التحضير',
    ready_for_delivery: 'جاهز للتوصيل',
    out_for_delivery: 'في الطريق',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي',
    refunded: 'مسترد',
}

const PAYMENT_METHOD_AR: Record<string, string> = {
    cash_on_delivery: 'الدفع عند الاستلام',
    online_paymob: 'دفع إلكتروني (Paymob)',
    online_stripe: 'دفع إلكتروني (Stripe)',
}

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

        document.documentElement.dir = 'rtl'
        document.documentElement.lang = 'ar'
        document.body.classList.remove('rtl', 'ltr')
        document.body.classList.add('rtl')

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
                <div className="receipt-shell">رقم الطلب غير صالح</div>
            </div>
        )
    }

    return (
        <div className="receipt-page receipt-ar" dir="rtl" lang="ar">
            <style>{`
                .receipt-ar .receipt { font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; }
                .receipt-ar .receipt-value { text-align: left; }
                .receipt-ar .receipt-item-qty,
                .receipt-ar .receipt-item-price,
                .receipt-ar .receipt-item-total { text-align: left; }
                .receipt-ar .receipt-items-header { text-align: right; }
                .receipt-ar .receipt-items-header .receipt-col-qty,
                .receipt-ar .receipt-items-header .receipt-col-price,
                .receipt-ar .receipt-items-header .receipt-col-total { text-align: left; }
            `}</style>
            <div className="no-print receipt-toolbar">
                <div className="text-sm text-muted-foreground">معاينة الإيصال</div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        طباعة
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.close()}>
                        إغلاق
                    </Button>
                </div>
            </div>

            <div className="receipt-shell">
                {isLoading ? (
                    <div className="receipt-muted">جارٍ التحميل…</div>
                ) : !order ? (
                    <div className="receipt-muted">الطلب غير موجود</div>
                ) : (
                    <div className="receipt">
                        <div className="receipt-header">
                            <div className="receipt-brand">CART</div>
                            <div className="receipt-title">إيصال التوصيل</div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-row">
                                <span className="receipt-label">رقم الطلب</span>
                                <span className="receipt-value receipt-mono">{order.order_number}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">التاريخ</span>
                                <span className="receipt-value">{formatArabicDate(order.created_at)}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">الحالة</span>
                                <span className="receipt-value">{STATUS_AR[String(order.status)] || String(order.status).replaceAll('_', ' ')}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">طريقة الدفع</span>
                                <span className="receipt-value">{PAYMENT_METHOD_AR[String(order.payment_method)] || String(order.payment_method).replaceAll('_', ' ')}</span>
                            </div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-section-title">العميل</div>
                            <div className="receipt-row">
                                <span className="receipt-label">الاسم</span>
                                <span className="receipt-value">{order.user?.first_name} {order.user?.last_name}</span>
                            </div>
                            <div className="receipt-row">
                                <span className="receipt-label">الهاتف</span>
                                <span className="receipt-value receipt-mono">{order.user?.phone || 'غير متوفر'}</span>
                            </div>
                            <div className="receipt-row receipt-row-multiline">
                                <span className="receipt-label">العنوان</span>
                                <span className="receipt-value">{order.delivery_address || 'غير متوفر'}</span>
                            </div>
                            {order.delivery_notes ? (
                                <div className="receipt-row receipt-row-multiline">
                                    <span className="receipt-label">ملاحظات</span>
                                    <span className="receipt-value">{order.delivery_notes}</span>
                                </div>
                            ) : null}
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-section-title">المنتجات</div>

                            <div className="receipt-items-header receipt-mono">
                                <div className="receipt-col-name">المنتج</div>
                                <div className="receipt-col-qty">الكمية</div>
                                <div className="receipt-col-price">السعر</div>
                                <div className="receipt-col-total">الإجمالي</div>
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
                                <div className="receipt-muted">لا توجد منتجات</div>
                            ) : null}
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-section">
                            <div className="receipt-row">
                                <span className="receipt-label">المجموع الفرعي</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.total_amount)}</span>
                            </div>
                            {order.discount_amount > 0 ? (
                                <div className="receipt-row">
                                    <span className="receipt-label">الخصم</span>
                                    <span className="receipt-value receipt-mono">-{formatCurrency(order.discount_amount)}</span>
                                </div>
                            ) : null}
                            <div className="receipt-row">
                                <span className="receipt-label">رسوم التوصيل</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.delivery_fee)}</span>
                            </div>
                            <div className="receipt-divider" />
                            <div className="receipt-row receipt-total">
                                <span className="receipt-label">الإجمالي</span>
                                <span className="receipt-value receipt-mono">{formatCurrency(order.final_amount)}</span>
                            </div>
                        </div>

                        <div className="receipt-divider" />

                        <div className="receipt-footer">
                            <div className="receipt-muted">شكراً لتعاملكم معنا</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
