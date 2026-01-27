import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { supportService } from '@/services/support.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Send, User, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { TicketStatus, TicketPriority } from '@/types'

export default function TicketDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const [replyMessage, setReplyMessage] = useState('')
    const [isInternalNote, setIsInternalNote] = useState(false)

    const { data: ticket, isLoading } = useQuery({
        queryKey: ['support-ticket', id],
        queryFn: () => supportService.getTicket(Number(id)),
    })

    const replyMutation = useMutation({
        mutationFn: ({ id, message, isInternal }: { id: number; message: string; isInternal: boolean }) =>
            supportService.replyToTicket(id, { message, is_internal_note: isInternal }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
            setReplyMessage('')
            toast({ title: 'Reply sent successfully' })
        },
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
            supportService.updateTicketStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
            toast({ title: 'Ticket status updated' })
        },
    })

    const updatePriorityMutation = useMutation({
        mutationFn: ({ id, priority }: { id: number; priority: TicketPriority }) =>
            supportService.updateTicketPriority(id, priority),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
            toast({ title: 'Priority updated' })
        },
    })

    const handleSendReply = () => {
        if (!replyMessage.trim()) return
        replyMutation.mutate({ id: Number(id), message: replyMessage, isInternal: isInternalNote })
    }

    if (isLoading) return <div className="text-center py-12">Loading...</div>
    if (!ticket) return <div className="text-center py-12">Ticket not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/support')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-elbaraka-primary">Ticket {ticket.ticket_number}</h1>
                        <p className="text-muted-foreground mt-1">{ticket.subject}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <TicketPriorityBadge priority={ticket.priority} />
                    <TicketStatusBadge status={ticket.status} />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Ticket Description */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-elbaraka-primary flex items-center justify-center text-white font-semibold">
                                        {ticket.customer?.first_name?.charAt(0)}
                                        {ticket.customer?.last_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold">
                                            {ticket.customer?.first_name} {ticket.customer?.last_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{formatDate(ticket.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                        </CardContent>
                    </Card>

                    {/* Message Thread */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Conversation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ticket.messages?.map((message) => (
                                <div
                                    key={message.id}
                                    className={`p-4 rounded-lg ${message.is_admin_reply
                                            ? 'bg-blue-50 border-l-4 border-blue-500'
                                            : 'bg-gray-50'
                                        } ${message.is_internal_note ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <p className="font-semibold text-sm">
                                                {message.user?.first_name} {message.user?.last_name}
                                            </p>
                                            {message.is_internal_note && (
                                                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs">
                                                    Internal Note
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{formatDate(message.created_at)}</p>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Reply Form */}
                    {ticket.status !== 'closed' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Send Reply</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Type your message..."
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    rows={4}
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="internal-note"
                                            checked={isInternalNote}
                                            onChange={(e) => setIsInternalNote(e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <label htmlFor="internal-note" className="text-sm">
                                            Internal note (not visible to customer)
                                        </label>
                                    </div>
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={!replyMessage.trim() || replyMutation.isPending}
                                        className="bg-elbaraka-primary hover:bg-elbaraka-secondary"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Reply
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Ticket Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <User className="h-5 w-5 mr-2" />
                                Ticket Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Category</p>
                                <p className="font-medium">{ticket.category.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Select
                                    value={ticket.status}
                                    onValueChange={(value: TicketStatus) =>
                                        updateStatusMutation.mutate({ id: ticket.id, status: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Priority</p>
                                <Select
                                    value={ticket.priority}
                                    onValueChange={(value: TicketPriority) =>
                                        updatePriorityMutation.mutate({ id: ticket.id, priority: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">
                                    {ticket.customer?.first_name} {ticket.customer?.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{ticket.customer?.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Phone</p>
                                <p className="font-medium">{ticket.customer?.phone}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Related Order */}
                    {ticket.order && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Package className="h-5 w-5 mr-2" />
                                    Related Order
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-mono text-sm">{ticket.order.order_number}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => navigate(`/orders/${ticket.order_id}`)}
                                >
                                    View Order
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
