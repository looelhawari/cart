import { apiClient } from '../lib/api-client';

// Types
export interface AdminLog {
    id: number;
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    user_role: string | null;
    action: string;
    action_type: string;
    action_description: string | null;
    entity_type: string | null;
    entity_id: number | null;
    entity_name: string | null;
    http_method: string | null;
    route_name: string | null;
    url: string | null;
    ip_address: string | null;
    user_agent: string | null;
    request_data: Record<string, unknown> | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    changes: Record<string, { old: unknown; new: unknown }> | null;
    response_status: number | null;
    is_successful: boolean;
    error_message: string | null;
    module: string | null;
    session_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        role: string;
    };
}

export interface AdminLogFilters {
    user_id?: number;
    action_type?: string;
    entity_type?: string;
    module?: string;
    http_method?: string;
    is_successful?: boolean;
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

export interface AdminLogStatistics {
    total_logs: number;
    today_logs: number;
    this_week_logs: number;
    this_month_logs: number;
    failed_actions: number;
    by_action_type: Array<{ action_type: string; count: number }>;
    by_entity_type: Array<{ entity_type: string; count: number }>;
    by_module: Array<{ module: string; count: number }>;
    by_user: Array<{ user_id: number; name: string; role: string; count: number }>;
    daily_trend: Array<{ date: string; count: number }>;
    hourly_distribution: Array<{ hour: number; count: number }>;
    most_active_today: Array<{ user_id: number; name: string; role: string; count: number }>;
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface UserActivity {
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    total_actions: number;
    today_actions: number;
    last_active: string | null;
    actions_by_type: Array<{ action_type: string; count: number }>;
    actions_by_module: Array<{ module: string; count: number }>;
    recent_actions: AdminLog[];
}

// API Functions
export const adminLogService = {
    // Get paginated admin logs with filters
    async getLogs(filters: AdminLogFilters = {}): Promise<PaginatedResponse<AdminLog>> {
        const params: Record<string, string | number | boolean> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        return apiClient.get<PaginatedResponse<AdminLog>>('/admin/admin-logs', params);
    },

    // Get admin log statistics
    async getStatistics(): Promise<AdminLogStatistics> {
        return apiClient.get<AdminLogStatistics>('/admin/admin-logs/statistics');
    },

    // Get single admin log details
    async getLog(id: number): Promise<AdminLog> {
        return apiClient.get<AdminLog>(`/admin/admin-logs/${id}`);
    },

    // Get list of admin users for filter dropdown
    async getUsers(): Promise<AdminUser[]> {
        return apiClient.get<AdminUser[]>('/admin/admin-logs/users');
    },

    // Get list of entity types for filter dropdown
    async getEntityTypes(): Promise<string[]> {
        return apiClient.get<string[]>('/admin/admin-logs/entity-types');
    },

    // Get list of modules for filter dropdown
    async getModules(): Promise<string[]> {
        return apiClient.get<string[]>('/admin/admin-logs/modules');
    },

    // Get list of action types for filter dropdown
    async getActionTypes(): Promise<string[]> {
        return apiClient.get<string[]>('/admin/admin-logs/action-types');
    },

    // Get recent logs
    async getRecent(limit: number = 10): Promise<AdminLog[]> {
        return apiClient.get<AdminLog[]>('/admin/admin-logs/recent', { limit });
    },

    // Get entity history
    async getEntityHistory(entityType: string, entityId: number): Promise<AdminLog[]> {
        return apiClient.get<AdminLog[]>('/admin/admin-logs/entity-history', {
            entity_type: entityType,
            entity_id: entityId,
        });
    },

    // Get user activity
    async getUserActivity(userId: number): Promise<UserActivity> {
        return apiClient.get<UserActivity>(`/admin/admin-logs/user-activity/${userId}`);
    },

    // Export logs as CSV
    async exportLogs(filters: AdminLogFilters = {}): Promise<Blob> {
        const params: Record<string, string | number | boolean> = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params[key] = value;
            }
        });

        return apiClient.downloadFile('/admin/admin-logs/export', params);
    },
};

// Helper functions
export const getActionTypeColor = (actionType: string): string => {
    switch (actionType) {
        case 'create':
            return 'text-green-700 bg-green-100 border-green-200';
        case 'update':
            return 'text-blue-700 bg-blue-100 border-blue-200';
        case 'delete':
            return 'text-red-700 bg-red-100 border-red-200';
        case 'read':
            return 'text-gray-700 bg-gray-100 border-gray-200';
        case 'export':
            return 'text-purple-700 bg-purple-100 border-purple-200';
        default:
            return 'text-gray-700 bg-gray-100 border-gray-200';
    }
};

export const getActionTypeIcon = (actionType: string): string => {
    switch (actionType) {
        case 'create':
            return '➕';
        case 'update':
            return '✏️';
        case 'delete':
            return '🗑️';
        case 'read':
            return '👁️';
        case 'export':
            return '📤';
        default:
            return '📝';
    }
};

export const getHttpMethodColor = (method: string | null): string => {
    switch (method?.toUpperCase()) {
        case 'GET':
            return 'text-green-700 bg-green-50';
        case 'POST':
            return 'text-blue-700 bg-blue-50';
        case 'PUT':
        case 'PATCH':
            return 'text-yellow-700 bg-yellow-50';
        case 'DELETE':
            return 'text-red-700 bg-red-50';
        default:
            return 'text-gray-700 bg-gray-50';
    }
};

export const getModuleIcon = (module: string | null): string => {
    switch (module) {
        case 'products':
            return '📦';
        case 'orders':
            return '🛒';
        case 'users':
            return '👥';
        case 'categories':
            return '📁';
        case 'promotions':
            return '🏷️';
        case 'promo_codes':
            return '🎟️';
        case 'support':
            return '💬';
        case 'financial':
            return '💰';
        case 'analytics':
            return '📊';
        case 'refunds':
            return '💸';
        default:
            return '📋';
    }
};

export const formatModule = (module: string | null): string => {
    if (!module) return 'N/A';
    return module
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const formatEntityType = (entityType: string | null): string => {
    if (!entityType) return 'N/A';
    return entityType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const formatActionType = (actionType: string): string => {
    return actionType.charAt(0).toUpperCase() + actionType.slice(1);
};

export const getRoleColor = (role: string | null): string => {
    switch (role) {
        case 'super_admin':
            return 'text-purple-700 bg-purple-100';
        case 'admin':
            return 'text-blue-700 bg-blue-100';
        case 'employee':
            return 'text-green-700 bg-green-100';
        default:
            return 'text-gray-700 bg-gray-100';
    }
};

export default adminLogService;
