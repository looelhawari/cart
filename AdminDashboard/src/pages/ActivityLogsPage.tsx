import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    activityLogService,
    ActivityLogFilters,
    ActivityLog,
    getActionColor,
    getActionIcon,
    formatEntityType,
    formatAction,
} from '../services/activity-log.service';
import {
    Activity,
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Calendar,
    User,
    Clock,
    Monitor,
    Globe,
    TrendingUp,
    Users,
    FileText,
    BarChart3,
    RefreshCw,
    Eye,
    X,
} from 'lucide-react';

interface LogDetailModalProps {
    log: ActivityLog;
    onClose: () => void;
}

const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
                <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="text-lg font-semibold text-gray-900">{t('logs.activityLogDetails')}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.logId')}</label>
                            <p className="mt-1 text-gray-900 font-mono">#{log.id}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.timestamp')}</label>
                            <p className="mt-1 text-gray-900">
                                {new Date(log.created_at).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.user')}</label>
                            <p className="mt-1 text-gray-900">{log.user?.name || t('common.system')}</p>
                            <p className="text-sm text-gray-500">{log.user?.email}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.role')}</label>
                            <p className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.user?.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                                    log.user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {log.user?.role || 'N/A'}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.action')}</label>
                            <p className="mt-1">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${getActionColor(log.action)}`}>
                                    {getActionIcon(log.action)} {formatAction(log.action)}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">{t('logs.entity')}</label>
                            <p className="mt-1 text-gray-900">
                                {formatEntityType(log.entity_type)}
                                {log.entity_id && <span className="text-gray-500 ml-1">#{log.entity_id}</span>}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-500">{t('logs.ipAddress')}</label>
                            <p className="mt-1 text-gray-900 font-mono">{log.ip_address}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-500">{t('logs.userAgent')}</label>
                            <p className="mt-1 text-gray-900 text-sm break-all">{log.user_agent}</p>
                        </div>
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-500">{t('logs.additionalDetails')}</label>
                            <pre className="mt-2 p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm text-gray-700">
                                {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityLogsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const [filters, setFilters] = useState<ActivityLogFilters>({
        page: 1,
        per_page: 20,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Queries
    const { data: logsData, isLoading: logsLoading, refetch } = useQuery({
        queryKey: ['activity-logs', filters],
        queryFn: () => activityLogService.getLogs(filters),
    });

    const { data: statistics, isLoading: statsLoading } = useQuery({
        queryKey: ['activity-logs-statistics'],
        queryFn: () => activityLogService.getStatistics(),
    });

    const { data: users } = useQuery({
        queryKey: ['activity-logs-users'],
        queryFn: () => activityLogService.getUsers(),
    });

    const { data: entityTypes } = useQuery({
        queryKey: ['activity-logs-entity-types'],
        queryFn: () => activityLogService.getEntityTypes(),
    });

    const handleFilterChange = (key: keyof ActivityLogFilters, value: string | number | undefined) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1, // Reset to first page when filters change
        }));
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await activityLogService.exportLogs(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            page: 1,
            per_page: 20,
        });
    };

    return (
        <div className={`min-h-screen bg-gray-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Header */}
            <div className="mb-6">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                        <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Activity className="w-8 h-8 text-indigo-600" />
                            {t('logs.activityLogs')}
                        </h1>
                        <p className="mt-1 text-gray-500">
                            {t('logs.subtitle')}
                        </p>
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                            onClick={() => refetch()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('logs.refresh')}
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {isExporting ? t('logs.exporting') : t('logs.exportCsv')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Activity className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                            <p className="text-sm font-medium text-gray-500">{t('logs.totalActivities')}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {statsLoading ? '...' : statistics?.total_activities?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                        </div>
                        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                            <p className="text-sm font-medium text-gray-500">{t('logs.today')}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {statsLoading ? '...' : statistics?.today_activities?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                            <p className="text-sm font-medium text-gray-500">{t('logs.thisWeek')}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {statsLoading ? '...' : statistics?.this_week_activities?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                            <p className="text-sm font-medium text-gray-500">{t('logs.thisMonth')}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {statsLoading ? '...' : statistics?.this_month_activities?.toLocaleString() || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* By Action */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <FileText className="w-5 h-5 text-gray-400" />
                        {t('logs.byActionType')}
                    </h3>
                    <div className="space-y-3">
                        {statistics?.activities_by_action?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getActionColor(item.action)}`}>
                                    {getActionIcon(item.action)} {formatAction(item.action)}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Entity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Monitor className="w-5 h-5 text-gray-400" />
                        {t('logs.byEntityType')}
                    </h3>
                    <div className="space-y-3">
                        {statistics?.activities_by_entity?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{formatEntityType(item.entity_type)}</span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By User */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className={`text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Users className="w-5 h-5 text-gray-400" />
                        {t('logs.byUser')}
                    </h3>
                    <div className="space-y-3">
                        {statistics?.activities_by_user?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{item.name}</span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-200">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Filter className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {showFilters ? t('logs.hideFilters') : t('logs.showFilters')}
                        </button>
                        {Object.keys(filters).length > 2 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                {t('logs.clearAllFilters')}
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                            <input
                                type="text"
                                placeholder={t('logs.searchLogs')}
                                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`}
                                value={filters.search || ''}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>

                        {/* User Filter */}
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={filters.user_id || ''}
                            onChange={(e) => handleFilterChange('user_id', e.target.value ? parseInt(e.target.value) : undefined)}
                        >
                            <option value="">{t('logs.allUsers')}</option>
                            {users?.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.role})
                                </option>
                            ))}
                        </select>

                        {/* Entity Type Filter */}
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={filters.entity_type || ''}
                            onChange={(e) => handleFilterChange('entity_type', e.target.value || undefined)}
                        >
                            <option value="">{t('logs.allEntities')}</option>
                            {entityTypes?.map((type) => (
                                <option key={type} value={type}>
                                    {formatEntityType(type)}
                                </option>
                            ))}
                        </select>

                        {/* Date From */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={filters.date_from || ''}
                                onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={filters.date_to || ''}
                                onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.timestamp')}
                                </th>
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.user')}
                                </th>
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.action')}
                                </th>
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.entity')}
                                </th>
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.ipAddress')}
                                </th>
                                <th className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logsLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                            <span className="text-gray-500">{t('logs.loadingActivityLogs')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logsData?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">{t('logs.noActivityLogs')}</p>
                                        <p className="text-sm text-gray-400 mt-1">{t('logs.tryAdjustFilters')}</p>
                                    </td>
                                </tr>
                            ) : (
                                (logsData?.data as any[] | undefined)?.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {log.user?.name || 'System'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${log.user?.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                                            log.user?.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {log.user?.role || 'system'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getActionColor(log.action)}`}>
                                                {getActionIcon(log.action)} {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <p className="text-sm text-gray-900">{formatEntityType(log.entity_type)}</p>
                                                {log.entity_id && (
                                                    <p className="text-xs text-gray-500">ID: {log.entity_id}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600 font-mono">{log.ip_address}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                            >
                                                <Eye className={`w-3.5 h-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'}`} />
                                                {t('logs.viewDetails')}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {logsData && logsData.last_page > 1 && (
                    <div className={`px-6 py-4 border-t border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="text-sm text-gray-500">
                            {t('logs.showing')} {logsData.from} {t('logs.to')} {logsData.to} {t('logs.of')} {logsData.total} {t('logs.results')}
                        </div>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                                onClick={() => handleFilterChange('page', Math.max(1, (filters.page || 1) - 1))}
                                disabled={filters.page === 1}
                                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                                <ChevronLeft className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {t('logs.previous')}
                            </button>
                            <span className="text-sm text-gray-700">
                                {t('logs.page')} {logsData.current_page} {t('logs.of')} {logsData.last_page}
                            </span>
                            <button
                                onClick={() => handleFilterChange('page', Math.min(logsData.last_page, (filters.page || 1) + 1))}
                                disabled={filters.page === logsData.last_page}
                                className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                                {t('logs.next')}
                                <ChevronRight className={`w-4 h-4 ${isRTL ? 'mr-1' : 'ml-1'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </div>
    );
};

export default ActivityLogsPage;
