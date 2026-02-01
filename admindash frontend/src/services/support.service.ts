import { apiClient } from '@/lib/api-client'
import type { Ticket, TicketMessage, TicketStatus, TicketPriority, PaginatedResponse } from '@/types'

export interface TicketFilters {
    page?: number
    per_page?: number
    search?: string
    status?: TicketStatus | TicketStatus[]
    priority?: TicketPriority | TicketPriority[]
    category?: string[]
    assigned_to?: number | 'unassigned' | 'me'
    customer_id?: number
    date_from?: string
    date_to?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
}

export interface CreateTicketReplyData {
    message: string
    is_internal_note?: boolean
}

export interface SupportAnalytics {
    overview: {
        total_open: number
        total_in_progress: number
        total_awaiting: number
        total_resolved: number
        total_closed: number
        new_tickets: number
        resolved_tickets: number
        unread_messages: number
        urgent_open: number
    }
    performance: {
        avg_response_time_minutes: number
        avg_resolution_time_hours: number
        resolution_rate: number
    }
    tickets_by_priority: Record<string, number>
    tickets_by_category: Record<string, number>
    daily_trend: Record<string, number>
    top_performers: Array<{
        id: number
        first_name: string
        last_name: string
        resolved_count: number
    }>
}

export interface SmartSuggestion {
    title: string
    message: string
}

export interface CustomerHistory {
    history: Ticket[]
    stats: {
        total_tickets: number
        resolved_tickets: number
        avg_messages: number
    }
}

export const supportService = {
    getTickets: async (filters?: TicketFilters): Promise<PaginatedResponse<Ticket>> => {
        return apiClient.get('/admin/support/tickets', filters)
    },

    getTicket: async (id: number): Promise<Ticket & { messages: TicketMessage[] }> => {
        return apiClient.get(`/admin/support/tickets/${id}`)
    },

    replyToTicket: async (id: number, data: CreateTicketReplyData): Promise<TicketMessage> => {
        return apiClient.post(`/admin/support/tickets/${id}/messages`, data)
    },

    assignTicket: async (id: number, userId: number): Promise<Ticket> => {
        return apiClient.post(`/admin/support/tickets/${id}/assign`, { assigned_to: userId })
    },

    updateTicketStatus: async (id: number, status: TicketStatus): Promise<Ticket> => {
        return apiClient.put(`/admin/support/tickets/${id}/status`, { status })
    },

    updateTicketPriority: async (id: number, priority: TicketPriority): Promise<Ticket> => {
        return apiClient.put(`/admin/support/tickets/${id}/priority`, { priority })
    },

    closeTicket: async (id: number, resolutionNotes?: string): Promise<Ticket> => {
        return apiClient.post(`/admin/support/tickets/${id}/close`, { resolution_notes: resolutionNotes })
    },

    uploadAttachment: async (id: number, file: File): Promise<any> => {
        return apiClient.uploadFile(`/admin/support/tickets/${id}/attachments`, file, 'file')
    },

    typing: async (id: number, isTyping: boolean): Promise<any> => {
        return apiClient.post(`/admin/support/tickets/${id}/typing`, { is_typing: isTyping })
    },

    // New enhanced endpoints
    getAnalytics: async (period: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<{ success: boolean, data: SupportAnalytics }> => {
        return apiClient.get('/admin/support/analytics', { period })
    },

    getSuggestions: async (id: number): Promise<{ success: boolean, data: { suggestions: SmartSuggestion[] } }> => {
        return apiClient.get(`/admin/support/tickets/${id}/suggestions`)
    },

    markAsRead: async (id: number): Promise<{ success: boolean }> => {
        return apiClient.post(`/admin/support/tickets/${id}/read`, {})
    },

    getCustomerHistory: async (ticketId: number): Promise<{ success: boolean, data: CustomerHistory }> => {
        return apiClient.get(`/admin/support/tickets/${ticketId}/customer-history`)
    },
}
