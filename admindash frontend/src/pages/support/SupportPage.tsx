import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supportService, type TicketFilters } from '@/services/support.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/ui/badge'
import { Search, Eye, MessageSquare } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default function SupportPage() {
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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-elbaraka-primary">Support Tickets</h1>
                <p className="text-muted-foreground mt-1">Manage customer support requests and complaints</p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-5 mb-6">
                        <div className="md:col-span-2">
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Search by ticket number or subject..."
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
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.priority as string || ''}
                            onValueChange={(value) =>
                                setFilters({ ...filters, priority: value ? value as any : undefined, page: 1 })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
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
                                <SelectValue placeholder="Assignment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tickets</SelectItem>
                                <SelectItem value="me">My Tickets</SelectItem>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">Loading...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-3">Ticket #</th>
                                            <th className="text-left p-3">Subject</th>
                                            <th className="text-left p-3">Customer</th>
                                            <th className="text-left p-3">Priority</th>
                                            <th className="text-left p-3">Status</th>
                                            <th className="text-left p-3">Assigned To</th>
                                            <th className="text-left p-3">Created</th>
                                            <th className="text-right p-3">Actions</th>
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
                                                        <span className="text-sm text-muted-foreground">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-sm">{formatRelativeTime(ticket.created_at)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end">
                                                        <Link to={`/support/${ticket.id}`}>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                View
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
                                    Showing {((filters.page || 1) - 1) * (filters.per_page || 20) + 1} to{' '}
                                    {Math.min((filters.page || 1) * (filters.per_page || 20), ticketsData?.total || 0)} of{' '}
                                    {ticketsData?.total || 0} tickets
                                </p>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === 1}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={filters.page === ticketsData?.last_page}
                                        onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                                    >
                                        Next
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
