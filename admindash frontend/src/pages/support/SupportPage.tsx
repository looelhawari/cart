import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supportService, type TicketFilters } from '@/services/support.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/ui/badge'
import { Search, Eye, MessageSquare } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default function SupportPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const [filters, setFilters] = useState<TicketFilters>({ page: 1, per_page: 20, sort_by: 'created_at', sort_order: 'desc' })
    const [searchTerm, setSearchTerm] = useState('')

    const { data: ticketsData, isLoading } = useQuery({
        queryKey: ['support-tickets', filters],
        queryFn: () => supportService.getTickets(filters),
    })

    const handleSearch = () => {
        setFilters({ ...filters, search: searchTerm, page: 1 })
    }

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <div>
                <h1 className="text-3xl font-bold text-elbaraka-primary">{t('support.title')}</h1>
                <p className="text-muted-foreground mt-1">{t('support.subtitle')}</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-5 mb-6">
                        <div className="md:col-span-2">
                            <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                                <Input
                                    placeholder={t('support.searchPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Select
                            value={filters.status as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, status: value ? value as any : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('support.allStatus')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('support.allStatus')}</SelectItem>
                                <SelectItem value="open">{t('support.statuses.open')}</SelectItem>
                                <SelectItem value="in_progress">{t('support.statuses.inProgress')}</SelectItem>
                                <SelectItem value="awaiting_response">{t('support.statuses.awaitingResponse')}</SelectItem>
                                <SelectItem value="resolved">{t('support.statuses.resolved')}</SelectItem>
                                <SelectItem value="closed">{t('support.statuses.closed')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.priority as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, priority: value ? value as any : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('support.allPriorities')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('support.allPriorities')}</SelectItem>
                                <SelectItem value="low">{t('support.priorities.low')}</SelectItem>
                                <SelectItem value="medium">{t('support.priorities.medium')}</SelectItem>
                                <SelectItem value="high">{t('support.priorities.high')}</SelectItem>
                                <SelectItem value="urgent">{t('support.priorities.urgent')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(filters.assigned_to || '')}
                            onValueChange={(value) => {
                                const assignedValue = !value ? undefined :
                                    value === 'me' || value === 'unassigned' ? value :
                                        Number(value)
                                setFilters({ ...filters, assigned_to: assignedValue, page: 1 })
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('support.assignment')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('support.allTickets')}</SelectItem>
                                <SelectItem value="me">{t('support.myTickets')}</SelectItem>
                                <SelectItem value="unassigned">{t('support.unassigned')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">{t('common.loading')}</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('support.ticketNumber')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('support.subject')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('support.customer')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('support.priority')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.status')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('support.assignedTo')}</th>
                                            <th className={`${isRTL ? 'text-right' : 'text-left'} p-3`}>{t('common.created')}</th>
                                            <th className={`${isRTL ? 'text-left' : 'text-right'} p-3`}>{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ticketsData?.data.map((ticket) => (
                                            <tr key={ticket.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3 font-mono text-sm">{ticket.ticket_number}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium">{ticket.subject}</p>
                                                        {ticket.unread_messages_count && ticket.unread_messages_count > 0 && (
                                                            <span className="flex items-center px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">
                                                                <MessageSquare className="h-3 w-3 mr-1" />
                                                                {ticket.unread_messages_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{ticket.category.replace('_', ' ')}</p>
                                                </td>
                                                <td className="p-3">
                                                    <p className="font-medium">
                                                        {ticket.customer?.first_name} {ticket.customer?.last_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{ticket.customer?.phone}</p>
                                                </td>
                                                <td className="p-3">
                                                    <TicketPriorityBadge priority={ticket.priority} />
                                                </td>
                                                <td className="p-3">
                                                    <TicketStatusBadge status={ticket.status} />
                                                </td>
                                                <td className="p-3">
                                                    {ticket.assigned_to_user ? (
                                                        <p className="text-sm">
                                                            {ticket.assigned_to_user.first_name} {ticket.assigned_to_user.last_name}
                                                        </p>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">{t('support.unassigned')}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-sm">{formatRelativeTime(ticket.created_at)}</td>
                                                <td className="p-3">
                                                    <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                                        <Link to={`/support/${ticket.id}`}>
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

                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    {t('common.showingResults', {
                                        from: ((filters.page || 1) - 1) * (filters.per_page || 20) + 1,
                                        to: Math.min((filters.page || 1) * (filters.per_page || 20), ticketsData?.total || 0),
                                        total: ticketsData?.total || 0
                                    })}
                                </p>
                                <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === 1}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === ticketsData?.last_page}
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
