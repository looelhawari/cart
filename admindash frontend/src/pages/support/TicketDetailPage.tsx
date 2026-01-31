import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supportService } from '@/services/support.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Send, User, Package, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Ticket, TicketMessage, TicketStatus, TicketPriority } from '@/types'
import echo from '@/lib/echo'
import { CannedResponseDropdown } from '@/components/support/CannedResponseDropdown'
import { CustomerHistoryCard } from '@/components/support/CustomerHistoryCard'

export default function TicketDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { toast } = useToast()
    const { t } = useTranslation()
    const [replyMessage, setReplyMessage] = useState('')
    const [isCustomerTyping, setIsCustomerTyping] = useState(false)
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { data: ticket, isLoading } = useQuery({
        queryKey: ['support-ticket', id],
        queryFn: () => supportService.getTicket(Number(id)),
    })

    useEffect(() => {
        if (!id) return;

        console.log(`Listening to complaints.${id}`);
        const channel = echo.private(`complaints.${id}`)
            .listen('.message.sent', (e: { message: TicketMessage }) => {
                console.log('New message received:', e.message);

                // Update the ticket messages in cache
                queryClient.setQueryData(['support-ticket', id], (oldData: Ticket | undefined) => {
                    if (!oldData) return oldData;

                    // Avoid duplicates if any
                    if (oldData.messages?.some(m => m.id === e.message.id)) return oldData;

                    return {
                        ...oldData,
                        messages: [e.message, ...(oldData.messages || [])],
                    };
                });

                toast({
                    title: t('support.newMessage'),
                    description: `${e.message.user?.first_name}: ${e.message.message.substring(0, 50)}...`
                });
            })
            .listen('.user.typing', (e: { user_name: string; is_typing: boolean; is_admin: boolean }) => {
                if (!e.is_admin) {
                    setIsCustomerTyping(e.is_typing);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    if (e.is_typing) {
                        typingTimeoutRef.current = setTimeout(() => setIsCustomerTyping(false), 3000);
                    }
                }
            });

        return () => {
            console.log(`Leaving complaints.${id}`);
            echo.leave(`complaints.${id}`);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (sendTypingTimeoutRef.current) clearTimeout(sendTypingTimeoutRef.current);
        };
    }, [id, queryClient, t, toast]);

    const replyMutation = useMutation({
        mutationFn: ({ id, message }: { id: number; message: string }) =>
            supportService.replyToTicket(id, { message }),
        onMutate: async ({ message }) => {
            // Optimistic update - add message immediately
            const optimisticMessage: TicketMessage = {
                id: Date.now(),
                complaint_id: Number(id),
                user_id: 0,
                message,
                is_admin_reply: true,
                user: { first_name: 'You', last_name: '' } as any,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            queryClient.setQueryData(['support-ticket', id], (oldData: Ticket | undefined) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    messages: [optimisticMessage, ...(oldData.messages || [])],
                };
            });

            setReplyMessage('');
        },
        onSuccess: () => {
            toast({ title: t('support.replySent') })
        },
        onError: () => {
            // Refetch on error to restore correct state
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
        },
    })

    const handleTyping = () => {
        if (!id) return;

        // Clear existing timeout
        if (sendTypingTimeoutRef.current) {
            clearTimeout(sendTypingTimeoutRef.current);
        } else {
            // Send start typing
            supportService.typing(Number(id), true);
        }

        // Set timeout to stop typing
        sendTypingTimeoutRef.current = setTimeout(() => {
            supportService.typing(Number(id), false);
            sendTypingTimeoutRef.current = null;
        }, 2000);
    }

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
            supportService.updateTicketStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
            toast({ title: t('support.statusUpdated') })
        },
    })

    const updatePriorityMutation = useMutation({
        mutationFn: ({ id, priority }: { id: number; priority: TicketPriority }) =>
            supportService.updateTicketPriority(id, priority),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
            toast({ title: t('support.priorityUpdated') })
        },
    })

    const handleSendReply = () => {
        if (!replyMessage.trim()) return
        replyMutation.mutate({ id: Number(id), message: replyMessage })
    }

    if (isLoading) return <div className="text-center py-12">{t('common.loading')}</div>
    if (!ticket) return <div className="text-center py-12">{t('support.ticketNotFound')}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/support')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-elbaraka-primary">{t('support.ticketNumber')} {ticket.ticket_number}</h1>
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
                                        {(ticket.user?.first_name || ticket.customer?.first_name)?.charAt(0)}
                                        {(ticket.user?.last_name || ticket.customer?.last_name)?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold">
                                            {ticket.user?.first_name || ticket.customer?.first_name} {ticket.user?.last_name || ticket.customer?.last_name}
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
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                            <CardTitle className="text-lg">{t('support.conversation')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                            <div className="p-4 space-y-4">
                                {ticket.messages?.length === 0 && (
                                    <div className="text-center py-12 text-gray-400">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>{t('support.noMessages')}</p>
                                    </div>
                                )}
                                {ticket.messages?.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex gap-3 ${message.is_admin_reply ? 'flex-row' : 'flex-row-reverse'}`}
                                    >
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${message.is_admin_reply
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                            }`}>
                                            {message.user?.first_name?.charAt(0) || 'U'}
                                            {message.user?.last_name?.charAt(0) || ''}
                                        </div>
                                        <div className={`flex-1 max-w-[75%] ${message.is_admin_reply ? '' : 'text-right'}`}>
                                            <div className={`inline-block rounded-2xl px-4 py-3 ${message.is_admin_reply
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-tl-none'
                                                : 'bg-gray-100 text-gray-800 rounded-tr-none'
                                                }`}>
                                                <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                                            </div>
                                            <div className={`mt-1 flex items-center gap-2 text-xs text-gray-400 ${message.is_admin_reply ? '' : 'justify-end'}`}>
                                                <span className="font-medium">{message.user?.first_name} {message.user?.last_name}</span>
                                                <span>•</span>
                                                <span>{formatDate(message.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isCustomerTyping && (
                                    <div className="flex gap-3 flex-row-reverse">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br from-gray-400 to-gray-500">
                                            {(ticket.user?.first_name || ticket.customer?.first_name)?.charAt(0)}
                                            {(ticket.user?.last_name || ticket.customer?.last_name)?.charAt(0)}
                                        </div>
                                        <div className="flex-1 max-w-[75%] text-right">
                                            <div className="inline-block rounded-2xl px-4 py-3 bg-gray-100 text-gray-800 rounded-tr-none">
                                                <div className="flex space-x-1 items-center h-5">
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                </div>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 justify-end">
                                                <span className="font-medium italic">{t('support.typing')}...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reply Form */}
                    {ticket.status !== 'closed' && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>{t('support.sendReply')}</CardTitle>
                                <CannedResponseDropdown onSelect={(content) => setReplyMessage(prev => prev + content)} />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder={t('support.typeYourMessage')}
                                    value={replyMessage}
                                    onChange={(e) => {
                                        setReplyMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    rows={4}
                                    className="resize-none"
                                />
                                <div className="flex items-center justify-end">
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={!replyMessage.trim() || replyMutation.isPending}
                                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        {t('support.sendReply')}
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
                                {t('support.ticketInformation')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('support.category')}</p>
                                <p className="font-medium">{ticket.category.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('common.status')}</p>
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
                                        <SelectItem value="open">{t('support.statuses.open')}</SelectItem>
                                        <SelectItem value="in_progress">{t('support.statuses.inProgress')}</SelectItem>
                                        <SelectItem value="awaiting_response">{t('support.statuses.awaitingResponse')}</SelectItem>
                                        <SelectItem value="resolved">{t('support.statuses.resolved')}</SelectItem>
                                        <SelectItem value="closed">{t('support.statuses.closed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('support.priority')}</p>
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
                                        <SelectItem value="low">{t('support.priorities.low')}</SelectItem>
                                        <SelectItem value="medium">{t('support.priorities.medium')}</SelectItem>
                                        <SelectItem value="high">{t('support.priorities.high')}</SelectItem>
                                        <SelectItem value="urgent">{t('support.priorities.urgent')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('support.customerDetails')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.name')}</p>
                                <p className="font-medium">
                                    {ticket.user?.first_name || ticket.customer?.first_name} {ticket.user?.last_name || ticket.customer?.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.email')}</p>
                                <p className="font-medium">{ticket.user?.email || ticket.customer?.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('orders.phone')}</p>
                                <p className="font-medium">{ticket.user?.phone || ticket.customer?.phone}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer History */}
                    {ticket.user_id && (
                        <CustomerHistoryCard customerId={ticket.user_id} currentTicketId={ticket.id} />
                    )}

                    {/* Related Order */}
                    {ticket.order && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Package className="h-5 w-5 mr-2" />
                                    {t('support.relatedOrder')}
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
                                    {t('support.viewOrder')}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div >
    )
}
