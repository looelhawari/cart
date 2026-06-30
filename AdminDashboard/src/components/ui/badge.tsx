import { OrderStatus, PaymentStatus, TicketStatus, TicketPriority, ProductAvailability } from '@/types'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface BadgeProps {
    children: React.ReactNode
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
    className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
    const variantClasses = {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-input bg-background',
        destructive: 'bg-destructive text-destructive-foreground',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                variantClasses[variant],
                className
            )}
        >
            {children}
        </span>
    )
}

export function OrderStatusBadge({ status }: { status: OrderStatus | undefined }) {
    const { t } = useTranslation()

    const config: Record<OrderStatus, { labelKey: string; className: string }> = {
        pending: { labelKey: 'orders.status.pending', className: 'bg-yellow-100 text-yellow-800' },
        confirmed: { labelKey: 'orders.status.confirmed', className: 'bg-blue-100 text-blue-800' },
        preparing: { labelKey: 'orders.status.preparing', className: 'bg-purple-100 text-purple-800' },
        ready_for_delivery: { labelKey: 'orders.status.readyForDelivery', className: 'bg-indigo-100 text-indigo-800' },
        out_for_delivery: { labelKey: 'orders.status.outForDelivery', className: 'bg-orange-100 text-orange-800' },
        delivered: { labelKey: 'orders.status.delivered', className: 'bg-green-100 text-green-800' },
        cancelled: { labelKey: 'orders.status.cancelled', className: 'bg-red-100 text-red-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'pending'
    return <Badge className={config[safeStatus].className}>{t(config[safeStatus].labelKey)}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | undefined }) {
    const { t } = useTranslation()

    const config: Record<PaymentStatus, { labelKey: string; className: string }> = {
        pending: { labelKey: 'orders.paymentStatus.pending', className: 'bg-yellow-100 text-yellow-800' },
        completed: { labelKey: 'orders.paymentStatus.completed', className: 'bg-green-100 text-green-800' },
        paid: { labelKey: 'orders.paymentStatus.paid', className: 'bg-green-100 text-green-800' },
        failed: { labelKey: 'orders.paymentStatus.failed', className: 'bg-red-100 text-red-800' },
        refunded: { labelKey: 'orders.paymentStatus.refunded', className: 'bg-gray-100 text-gray-800' },
        partially_refunded: { labelKey: 'orders.paymentStatus.partiallyRefunded', className: 'bg-blue-100 text-blue-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'pending'
    return <Badge className={config[safeStatus].className}>{t(config[safeStatus].labelKey)}</Badge>
}

export function TicketStatusBadge({ status }: { status: TicketStatus | undefined }) {
    const { t } = useTranslation()

    const config: Record<TicketStatus, { labelKey: string; className: string }> = {
        open: { labelKey: 'support.statuses.open', className: 'bg-blue-100 text-blue-800' },
        in_progress: { labelKey: 'support.statuses.inProgress', className: 'bg-purple-100 text-purple-800' },
        awaiting_response: { labelKey: 'support.statuses.awaitingResponse', className: 'bg-yellow-100 text-yellow-800' },
        resolved: { labelKey: 'support.statuses.resolved', className: 'bg-green-100 text-green-800' },
        closed: { labelKey: 'support.statuses.closed', className: 'bg-gray-100 text-gray-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'open'
    return <Badge className={config[safeStatus].className}>{t(config[safeStatus].labelKey)}</Badge>
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority | undefined }) {
    const { t } = useTranslation()

    const config: Record<TicketPriority, { labelKey: string; className: string }> = {
        low: { labelKey: 'support.priorities.low', className: 'bg-gray-100 text-gray-800' },
        medium: { labelKey: 'support.priorities.medium', className: 'bg-blue-100 text-blue-800' },
        high: { labelKey: 'support.priorities.high', className: 'bg-orange-100 text-orange-800' },
        urgent: { labelKey: 'support.priorities.urgent', className: 'bg-red-100 text-red-800' },
    }

    // Handle undefined or unknown priorities
    const safePriority = (priority && config[priority]) ? priority : 'medium'
    return <Badge className={config[safePriority].className}>{t(config[safePriority].labelKey)}</Badge>
}

export function ProductAvailabilityBadge({ status }: { status: ProductAvailability | undefined }) {
    const { t } = useTranslation()

    const config: Record<ProductAvailability, { labelKey: string; className: string }> = {
        in_stock: { labelKey: 'products.inStock', className: 'bg-green-100 text-green-800' },
        out_of_stock: { labelKey: 'products.outOfStock', className: 'bg-red-100 text-red-800' },
        discontinued: { labelKey: 'products.discontinued', className: 'bg-gray-100 text-gray-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'in_stock'
    return <Badge className={config[safeStatus].className}>{t(config[safeStatus].labelKey)}</Badge>
}
