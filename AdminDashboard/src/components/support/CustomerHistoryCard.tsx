import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { supportService } from '@/services/support.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketStatusBadge } from '@/components/ui/badge'
import { History, ExternalLink } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface CustomerHistoryCardProps {
    customerId: number
    currentTicketId: number
}

export function CustomerHistoryCard({ customerId, currentTicketId }: CustomerHistoryCardProps) {
    const { t } = useTranslation()

    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ['customer-tickets', customerId],
        queryFn: () => supportService.getTickets({
            customer_id: customerId,
            per_page: 10,
            sort_by: 'created_at',
            sort_order: 'desc'
        }),
    })

    // Filter out current ticket
    const pastTickets = ticketsData?.data?.filter(t => t.id !== currentTicketId) || []

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-sm">
                        <History className="h-4 w-4 mr-2" />
                        {t('support.customerHistory')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-400">{t('common.loading')}</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-sm">
                    <History className="h-4 w-4 mr-2" />
                    {t('support.customerHistory')}
                    {pastTickets.length > 0 && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                            {pastTickets.length}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {pastTickets.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('support.noOtherTickets')}</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {pastTickets.slice(0, 5).map((ticket) => (
                            <Link
                                key={ticket.id}
                                to={`/support/${ticket.id}`}
                                className="block p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                                        <p className="text-xs text-gray-400">{formatRelativeTime(ticket.created_at)}</p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <TicketStatusBadge status={ticket.status} />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {pastTickets.length > 5 && (
                            <div className="text-center pt-1">
                                <Link
                                    to={`/support?customer_id=${customerId}`}
                                    className="text-xs text-green-600 hover:text-green-700 inline-flex items-center"
                                >
                                    {t('support.viewAllTickets', { count: pastTickets.length })}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
