import { OrderStatus, PaymentStatus, TicketStatus, TicketPriority, ProductAvailability } from '@/types'
import { cn } from '@/lib/utils'

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
    const config: Record<OrderStatus, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
        confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
        preparing: { label: 'Preparing', className: 'bg-purple-100 text-purple-800' },
        ready_for_delivery: { label: 'Ready', className: 'bg-indigo-100 text-indigo-800' },
        out_for_delivery: { label: 'Out for Delivery', className: 'bg-orange-100 text-orange-800' },
        delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
        cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'pending'
    return <Badge className={config[safeStatus].className}>{config[safeStatus].label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | undefined }) {
    const config: Record<PaymentStatus, { label: string; className: string }> = {
        pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
        paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
        failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
        refunded: { label: 'Refunded', className: 'bg-gray-100 text-gray-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'pending'
    return <Badge className={config[safeStatus].className}>{config[safeStatus].label}</Badge>
}

export function TicketStatusBadge({ status }: { status: TicketStatus | undefined }) {
    const config: Record<TicketStatus, { label: string; className: string }> = {
        open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
        in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
        awaiting_response: { label: 'Awaiting Response', className: 'bg-yellow-100 text-yellow-800' },
        resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
        closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'open'
    return <Badge className={config[safeStatus].className}>{config[safeStatus].label}</Badge>
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority | undefined }) {
    const config: Record<TicketPriority, { label: string; className: string }> = {
        low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
        medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
        high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
        urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
    }

    // Handle undefined or unknown priorities
    const safePriority = (priority && config[priority]) ? priority : 'medium'
    return <Badge className={config[safePriority].className}>{config[safePriority].label}</Badge>
}

export function ProductAvailabilityBadge({ status }: { status: ProductAvailability | undefined }) {
    const config: Record<ProductAvailability, { label: string; className: string }> = {
        in_stock: { label: 'In Stock', className: 'bg-green-100 text-green-800' },
        out_of_stock: { label: 'Out of Stock', className: 'bg-red-100 text-red-800' },
        discontinued: { label: 'Discontinued', className: 'bg-gray-100 text-gray-800' },
    }

    // Handle undefined or unknown statuses
    const safeStatus = (status && config[status]) ? status : 'in_stock'
    return <Badge className={config[safeStatus].className}>{config[safeStatus].label}</Badge>
}
