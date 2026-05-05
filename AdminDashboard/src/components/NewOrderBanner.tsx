import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNewOrderStore } from '@/store/new-order.store'
import { formatCurrency } from '@/lib/utils'

/**
 * Full-width banner that reveals on every page when a new order arrives.
 * The notification audio loops while this banner is mounted; clicking
 * "Confirm" clears the store, which unmounts the banner and stops the loop.
 */
export default function NewOrderBanner() {
    const pending = useNewOrderStore((s) => s.pending)
    const dismiss = useNewOrderStore((s) => s.dismiss)
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'

    if (!pending) return null

    const handleView = () => {
        const id = pending.id
        dismiss()
        navigate(`/orders/${id}`)
    }

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed top-0 inset-x-0 z-[60] bg-elbaraka-primary text-white shadow-lg border-b border-white/20 animate-pulse"
        >
            <div className={`max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <div className="relative shrink-0">
                    <Bell className="h-7 w-7" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-elbaraka-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm sm:text-base">
                        {t('orders.newOrderReceived', 'New order received')}
                    </div>
                    <div className="text-xs sm:text-sm opacity-90 truncate">
                        {pending.order_number ? (
                            <span className="font-mono">{pending.order_number}</span>
                        ) : (
                            <span className="font-mono">#{pending.id}</span>
                        )}
                        {pending.customerName ? <span> · {pending.customerName}</span> : null}
                        {typeof pending.total === 'number' ? <span> · {formatCurrency(pending.total)}</span> : null}
                    </div>
                </div>

                <div className={`flex items-center gap-2 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleView}
                        className="bg-white text-elbaraka-primary hover:bg-white/90"
                    >
                        <ShoppingCart className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {t('orders.viewOrder', 'View order')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={dismiss}
                        className="bg-white/20 hover:bg-white/30 text-white border border-white/40"
                    >
                        {t('common.confirm', 'Confirm')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
