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
import { ArrowLeft, Send, User, Package, MessageSquare, Clock, Mail, Phone, ChevronRight, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Ticket, TicketMessage, TicketStatus, TicketPriority } from '@/types'
import echo from '@/lib/echo'
import { CannedResponseDropdown } from '@/components/support/CannedResponseDropdown'
import { CustomerHistoryCard } from '@/components/support/CustomerHistoryCard'

// Format relative time
const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(date)
}

// Typing Indicator Component
const TypingIndicator = ({ userName }: { userName: string }) => (
    <div className="flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium text-xs">
            {userName.charAt(0)}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div className="flex space-x-1.5 items-center h-4">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
        </div>
    </div>
)

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
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const { data: ticket, isLoading } = useQuery({
        queryKey: ['support-ticket', id],
        queryFn: () => supportService.getTicket(Number(id)),
    })

    useEffect(() => {
        scrollToBottom()
    }, [ticket?.messages])

    useEffect(() => {
        if (!id) return;

        console.log(`Listening to complaints.${id}`);
        const channel = echo.private(`complaints.${id}`)
            .listen('.message.sent', (e: { message: TicketMessage }) => {
                console.log('New message received:', e.message);

                queryClient.setQueryData(['support-ticket', id], (oldData: Ticket | undefined) => {
                    if (!oldData) return oldData;
                    if (oldData.messages?.some(m => m.id === e.message.id)) return oldData;
                    return {
                        ...oldData,
                        messages: [...(oldData.messages || []), e.message],
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
                    messages: [...(oldData.messages || []), optimisticMessage],
                };
            });

            setReplyMessage('');
        },
        onSuccess: () => {
            toast({ title: t('support.replySent') })
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['support-ticket', id] })
        },
    })

    const handleTyping = () => {
        if (!id) return;

        if (sendTypingTimeoutRef.current) {
            clearTimeout(sendTypingTimeoutRef.current);
        } else {
            supportService.typing(Number(id), true);
        }

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendReply()
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                    <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
            </div>
        )
    }

    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-medium text-gray-600">{t('support.ticketNotFound')}</p>
                </div>
            </div>
        )
    }

    const customerName = `${ticket.user?.first_name || ticket.customer?.first_name || ''} ${ticket.user?.last_name || ticket.customer?.last_name || ''}`.trim()

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/support')} className="hover:bg-gray-100">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">{customerName}</h1>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{ticket.ticket_number}</span>
                                    <span>•</span>
                                    <span>{ticket.subject}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <TicketPriorityBadge priority={ticket.priority} />
                        <TicketStatusBadge status={ticket.status} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-white">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {/* Original Ticket */}
                        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-semibold text-sm">
                                    {customerName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{customerName}</span>
                                        <span className="text-xs text-gray-400">{formatTimeAgo(ticket.created_at)}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 capitalize">{ticket.category.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                        </div>

                        {/* Messages */}
                        <div className="space-y-4">
                            {ticket.messages?.map((message, index) => {
                                const isAdmin = message.is_admin_reply
                                const showAvatar = index === 0 || ticket.messages![index - 1]?.is_admin_reply !== isAdmin

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex items-end gap-3 ${isAdmin ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                    >
                                        {!isAdmin && showAvatar && (
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-medium text-xs">
                                                {message.user?.first_name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                        {!isAdmin && !showAvatar && <div className="w-8" />}

                                        <div className={`max-w-[70%] ${isAdmin ? 'order-1' : ''}`}>
                                            <div className={`rounded-2xl px-4 py-3 ${isAdmin
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-md shadow-lg shadow-green-500/20'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
                                            </div>
                                            <div className={`mt-1 flex items-center gap-2 text-xs text-gray-400 ${isAdmin ? 'justify-end' : ''}`}>
                                                <span>{formatTimeAgo(message.created_at)}</span>
                                            </div>
                                        </div>

                                        {isAdmin && showAvatar && (
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-medium text-xs order-2">
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                        )}
                                        {isAdmin && !showAvatar && <div className="w-8 order-2" />}
                                    </div>
                                )
                            })}

                            {/* Typing Indicator */}
                            {isCustomerTyping && <TypingIndicator userName={customerName} />}
                        </div>

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {ticket.status !== 'closed' && (
                        <div className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-xl border-t">
                            <div className="flex items-end gap-3">
                                <CannedResponseDropdown onSelect={(content) => setReplyMessage(prev => prev + content)} />
                                <div className="flex-1 relative">
                                    <Textarea
                                        placeholder={t('support.typeYourMessage')}
                                        value={replyMessage}
                                        onChange={(e) => {
                                            setReplyMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        className="resize-none pr-14 min-h-[48px] max-h-[120px] rounded-2xl border-gray-200 focus:border-green-500 focus:ring-green-500/20 transition-all"
                                    />
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={!replyMessage.trim() || replyMutation.isPending}
                                        size="icon"
                                        className="absolute right-2 bottom-2 h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-80 flex-shrink-0 border-l bg-white overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {/* Customer Info */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    {t('support.customerDetails')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{customerName}</p>
                                        <p className="text-xs text-gray-500">Customer</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{ticket.user?.email || ticket.customer?.email}</p>
                                </div>
                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                        <Phone className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <p className="text-sm text-gray-600">{ticket.user?.phone || ticket.customer?.phone || 'N/A'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ticket Info */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-gray-400" />
                                    {t('support.ticketInformation')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1.5">{t('support.category')}</p>
                                    <p className="text-sm font-medium capitalize">{ticket.category.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1.5">{t('common.status')}</p>
                                    <Select
                                        value={ticket.status}
                                        onValueChange={(value: TicketStatus) =>
                                            updateStatusMutation.mutate({ id: ticket.id, status: value })
                                        }
                                    >
                                        <SelectTrigger className="h-9">
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
                                    <p className="text-xs text-gray-500 mb-1.5">{t('support.priority')}</p>
                                    <Select
                                        value={ticket.priority}
                                        onValueChange={(value: TicketPriority) =>
                                            updatePriorityMutation.mutate({ id: ticket.id, priority: value })
                                        }
                                    >
                                        <SelectTrigger className="h-9">
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
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Created {formatTimeAgo(ticket.created_at)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer History */}
                        {ticket.user_id && (
                            <CustomerHistoryCard customerId={ticket.user_id} currentTicketId={ticket.id} />
                        )}

                        {/* Related Order */}
                        {ticket.order && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Package className="h-4 w-4 text-gray-400" />
                                        {t('support.relatedOrder')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-between group hover:border-green-500 hover:text-green-600 transition-all"
                                        onClick={() => navigate(`/orders/${ticket.order_id}`)}
                                    >
                                        <span className="font-mono text-xs">{ticket.order.order_number}</span>
                                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
