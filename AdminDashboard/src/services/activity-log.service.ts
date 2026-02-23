import { apiClient } from '../lib/api-client';

// Types
export interface ActivityLog {
    id: number;
    user_id: number;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    ip_address: string;
    user_agent: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
}

export interface ActivityLogFilters {
    user_id?: number;
    action?: string;
    entity_type?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    per_page?: number;
    page?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface ActivityStatistics {
    total_activities: number;
    today_activities: number;
    this_week_activities: number;
    this_month_activities: number;
    activities_by_action: Array<{ action: string; count: number }>;
    activities_by_entity: Array<{ entity_type: string; count: number }>;
    activities_by_user: Array<{ user_id: number; name: string; count: number }>;
    daily_trend: Array<{ date: string; count: number }>;
}

export interface ActivityUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

// API Functions
export const activityLogService = {
    // Get paginated activity logs with filters
    async getLogs(filters: ActivityLogFilters = {}): Promise<PaginatedResponse<ActivityLog>> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        return apiClient.get<PaginatedResponse<ActivityLog>>('/admin/activity-logs', params);
    },

    // Get activity log statistics
    async getStatistics(): Promise<ActivityStatistics> {
        return apiClient.get<ActivityStatistics>('/admin/activity-logs/statistics');
    },

    // Get single activity log details
    async getLog(id: number): Promise<ActivityLog> {
        return apiClient.get<ActivityLog>(`/admin/activity-logs/${id}`);
    },

    // Get list of admin users for filter dropdown
    async getUsers(): Promise<ActivityUser[]> {
        return apiClient.get<ActivityUser[]>('/admin/activity-logs/users');
    },

    // Get list of entity types for filter dropdown
    async getEntityTypes(): Promise<string[]> {
        return apiClient.get<string[]>('/admin/activity-logs/entity-types');
    },

    // Export logs as CSV
    async exportLogs(filters: ActivityLogFilters = {}): Promise<Blob> {
        const params: Record<string, string | number> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        return apiClient.downloadFile('/admin/activity-logs/export', params);
    },
};

// Helper functions
export const getActionColor = (action: string): string => {
    if (action.startsWith('created')) return 'text-green-600 bg-green-100';
    if (action.startsWith('updated')) return 'text-blue-600 bg-blue-100';
    if (action.startsWith('deleted')) return 'text-red-600 bg-red-100';
    if (action.includes('login')) return 'text-purple-600 bg-purple-100';
    if (action.includes('cancelled')) return 'text-orange-600 bg-orange-100';
    if (action.includes('status')) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
};

export const getActionIcon = (action: string): string => {
    if (action.startsWith('created')) return '➕';
    if (action.startsWith('updated')) return '✏️';
    if (action.startsWith('deleted')) return '🗑️';
    if (action.includes('login')) return '🔐';
    if (action.includes('cancelled')) return '❌';
    if (action.includes('status')) return '🔄';
    if (action.includes('refund')) return '💰';
    return '📝';
};

export const formatEntityType = (entityType: string | null): string => {
    if (!entityType) return 'N/A';
    return entityType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const formatAction = (action: string): string => {
    return action
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default activityLogService;
