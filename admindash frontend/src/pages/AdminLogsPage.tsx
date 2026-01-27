import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
    adminLogService,
    AdminLogFilters,
    AdminLog,
    getActionTypeColor,
    getActionTypeIcon,
    getHttpMethodColor,
    getModuleIcon,
    formatModule,
    formatEntityType,
    formatActionType,
    getRoleColor,
} from '../services/admin-log.service';
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
    CheckCircle,
    XCircle,
    AlertTriangle,
    Shield,
    Layers,
    Code,
} from 'lucide-react';

interface LogDetailModalProps {
    log: AdminLog;
    onClose: () => void;
}

const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    const [activeTab, setActiveTab] = useState<'details' | 'request' | 'changes'>('details');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}>
                {/* Header */}
                <div className={`p-6 border-b border-gray-200 flex items-center justify-between shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`p-2 rounded-lg ${getActionTypeColor(log.action_type)}`}>
                            <span className="text-lg">{getActionTypeIcon(log.action_type)}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {log.action_description || log.action}
                            </h3>
                            <p className="text-sm text-gray-500">{t('logs.logId')} #{log.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 shrink-0">
                    <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {(['details', 'request', 'changes'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t(`logs.tabs.${tab}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'details' && (
                        <div className="grid grid-cols-2 gap-6">
                            {/* User Info */}
                            <div className="col-span-2 bg-gray-50 rounded-lg p-4">
                                <h4 className={`text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <User className="w-4 h-4" />
                                    {t('logs.userInformation')}
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500">{t('common.name')}</label>
                                        <p className="text-sm font-medium text-gray-900">{log.user_name || t('common.system')}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">{t('auth.email')}</label>
                                        <p className="text-sm text-gray-900">{log.user_email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">{t('logs.role')}</label>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(log.user_role)}`}>
                                            {log.user_role || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Info */}
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.action')}</label>
                                <p className="mt-1">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium ${getActionTypeColor(log.action_type)}`}>
                                        {getActionTypeIcon(log.action_type)} {formatActionType(log.action_type)}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.status')}</label>
                                <p className="mt-1">
                                    {log.is_successful ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium text-green-700 bg-green-100">
                                            <CheckCircle className="w-4 h-4" /> {t('logs.success')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium text-red-700 bg-red-100">
                                            <XCircle className="w-4 h-4" /> {t('logs.failed')}
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Entity Info */}
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.entityType')}</label>
                                <p className="mt-1 text-sm text-gray-900">{formatEntityType(log.entity_type)}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.entityId')}</label>
                                <p className="mt-1 text-sm text-gray-900 font-mono">{log.entity_id || 'N/A'}</p>
                            </div>

                            {/* Module & Timestamp */}
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.module')}</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    <span className={`${isRTL ? 'ml-1' : 'mr-1'}`}>{getModuleIcon(log.module)}</span>
                                    {formatModule(log.module)}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500">{t('logs.timestamp')}</label>
                                <p className="mt-1 text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</p>
                            </div>

                            {/* Request Details */}
                            <div className="col-span-2 border-t pt-4 mt-2">
                                <h4 className={`text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Globe className="w-4 h-4" />
                                    {t('logs.requestDetails')}
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500">{t('logs.httpMethod')}</label>
                                        <p className="mt-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${getHttpMethodColor(log.http_method)}`}>
                                                {log.http_method || 'N/A'}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">{t('logs.responseStatus')}</label>
                                        <p className="mt-1 text-sm font-mono">{log.response_status || 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500">{t('logs.url')}</label>
                                        <p className="mt-1 text-sm text-gray-900 break-all font-mono text-xs bg-gray-50 p-2 rounded">{log.url || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">{t('logs.ipAddress')}</label>
                                        <p className="mt-1 text-sm font-mono">{log.ip_address}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">{t('logs.routeName')}</label>
                                        <p className="mt-1 text-sm font-mono">{log.route_name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* User Agent */}
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-gray-500">{t('logs.userAgent')}</label>
                                <p className="mt-1 text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">{log.user_agent}</p>
                            </div>

                            {/* Error Message */}
                            {log.error_message && (
                                <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className={`text-sm font-semibold text-red-800 mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <AlertTriangle className="w-4 h-4" />
                                        {t('logs.errorMessage')}
                                    </h4>
                                    <p className="text-sm text-red-700">{log.error_message}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'request' && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('logs.requestData')}</h4>
                                {log.request_data && Object.keys(log.request_data).length > 0 ? (
                                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm font-mono">
                                        {JSON.stringify(log.request_data, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-gray-500 text-sm italic">{t('logs.noRequestData')}</p>
                                )}
                            </div>

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('logs.metadata')}</h4>
                                    <pre className="p-4 bg-gray-900 text-blue-400 rounded-lg overflow-x-auto text-sm font-mono">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'changes' && (
                        <div className="space-y-4">
                            {log.changes && Object.keys(log.changes).length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('logs.changesMade')}</h4>
                                    <div className="space-y-3">
                                        {Object.entries(log.changes).map(([field, change]) => (
                                            <div key={field} className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-sm font-medium text-gray-900 mb-2">{field}</p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div className="bg-red-50 p-2 rounded border border-red-200">
                                                        <span className="text-xs text-red-600 font-medium">{t('logs.oldValue')}</span>
                                                        <p className="text-red-800 font-mono text-xs mt-1 break-all">
                                                            {JSON.stringify(change.old) || 'null'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-green-50 p-2 rounded border border-green-200">
                                                        <span className="text-xs text-green-600 font-medium">{t('logs.newValue')}</span>
                                                        <p className="text-green-800 font-mono text-xs mt-1 break-all">
                                                            {JSON.stringify(change.new) || 'null'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Code className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">{t('logs.noChanges')}</p>
                                    <p className="text-sm text-gray-400 mt-1">{t('logs.changesTracked')}</p>
                                </div>
                            )}

                            {log.old_values && Object.keys(log.old_values).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('logs.previousValues')}</h4>
                                    <pre className="p-4 bg-red-50 text-red-800 rounded-lg overflow-x-auto text-sm font-mono border border-red-200">
                                        {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {log.new_values && Object.keys(log.new_values).length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('logs.newValues')}</h4>
                                    <pre className="p-4 bg-green-50 text-green-800 rounded-lg overflow-x-auto text-sm font-mono border border-green-200">
                                        {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminLogsPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const [filters, setFilters] = useState<AdminLogFilters>({
        page: 1,
        per_page: 25,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Queries
    const { data: logsData, isLoading: logsLoading, refetch } = useQuery({
        queryKey: ['admin-logs', filters],
        queryFn: () => adminLogService.getLogs(filters),
    });

    const { data: statistics, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-logs-statistics'],
        queryFn: () => adminLogService.getStatistics(),
    });

    const { data: users } = useQuery({
        queryKey: ['admin-logs-users'],
        queryFn: () => adminLogService.getUsers(),
    });

    const { data: entityTypes } = useQuery({
        queryKey: ['admin-logs-entity-types'],
        queryFn: () => adminLogService.getEntityTypes(),
    });

    const { data: modules } = useQuery({
        queryKey: ['admin-logs-modules'],
        queryFn: () => adminLogService.getModules(),
    });

    const { data: actionTypes } = useQuery({
        queryKey: ['admin-logs-action-types'],
        queryFn: () => adminLogService.getActionTypes(),
    });

    const handleFilterChange = (key: keyof AdminLogFilters, value: string | number | boolean | undefined) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1,
        }));
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const blob = await adminLogService.exportLogs(filters);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
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
            per_page: 25,
        });
    };

    return (
        <div className={`min-h-screen bg-gray-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
            {/* Header */}
            <div className="mb-6">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                        <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Shield className="w-8 h-8 text-indigo-600" />
                            {t('logs.adminActionLogs')}
                        </h1>
                        <p className="mt-1 text-gray-500">
                            {t('logs.adminSubtitle')}
                        </p>
                    </div>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                            onClick={() => refetch()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('logs.refresh')}
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Download className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {isExporting ? t('logs.exporting') : t('logs.exportCsv')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('logs.totalLogs')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? '...' : statistics?.total_logs?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Activity className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('logs.today')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? '...' : statistics?.today_logs?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('logs.thisWeek')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? '...' : statistics?.this_week_logs?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('logs.thisMonth')}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? '...' : statistics?.this_month_logs?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{t('logs.failedActions')}</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">
                                {statsLoading ? '...' : statistics?.failed_actions?.toLocaleString() || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {/* By Action Type */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className={`text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <FileText className="w-4 h-4 text-gray-400" />
                        {t('logs.byActionType')}
                    </h3>
                    <div className="space-y-2">
                        {statistics?.by_action_type?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getActionTypeColor(item.action_type)}`}>
                                    {getActionTypeIcon(item.action_type)} {formatActionType(item.action_type)}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Module */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className={`text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Layers className="w-4 h-4 text-gray-400" />
                        {t('logs.byModule')}
                    </h3>
                    <div className="space-y-2">
                        {statistics?.by_module?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">
                                    {getModuleIcon(item.module)} {formatModule(item.module)}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Entity Type */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className={`text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Monitor className="w-4 h-4 text-gray-400" />
                        {t('logs.byEntity')}
                    </h3>
                    <div className="space-y-2">
                        {statistics?.by_entity_type?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{formatEntityType(item.entity_type)}</span>
                                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Active Today */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className={`text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Users className="w-4 h-4 text-gray-400" />
                        {t('logs.mostActiveToday')}
                    </h3>
                    <div className="space-y-2">
                        {statistics?.most_active_today?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700">{item.name}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleColor(item.role)}`}>
                                        {item.role}
                                    </span>
                                </div>
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
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Search */}
                        <div className="relative lg:col-span-2">
                            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
                            <input
                                type="text"
                                placeholder={t('logs.searchLogs')}
                                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm`}
                                value={filters.search || ''}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>

                        {/* User Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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

                        {/* Action Type Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={filters.action_type || ''}
                            onChange={(e) => handleFilterChange('action_type', e.target.value || undefined)}
                        >
                            <option value="">{t('logs.allActions')}</option>
                            {actionTypes?.map((type) => (
                                <option key={type} value={type}>
                                    {formatActionType(type)}
                                </option>
                            ))}
                        </select>

                        {/* Module Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={filters.module || ''}
                            onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
                        >
                            <option value="">{t('logs.allModules')}</option>
                            {modules?.map((module) => (
                                <option key={module} value={module}>
                                    {formatModule(module)}
                                </option>
                            ))}
                        </select>

                        {/* Entity Type Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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

                        {/* HTTP Method Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={filters.http_method || ''}
                            onChange={(e) => handleFilterChange('http_method', e.target.value || undefined)}
                        >
                            <option value="">{t('logs.allMethods')}</option>
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                        </select>

                        {/* Date From */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                value={filters.date_from || ''}
                                onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                value={filters.date_to || ''}
                                onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                            />
                        </div>

                        {/* Success Filter */}
                        <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={filters.is_successful === undefined ? '' : String(filters.is_successful)}
                            onChange={(e) => handleFilterChange('is_successful', e.target.value === '' ? undefined : e.target.value === 'true')}
                        >
                            <option value="">{t('logs.allStatus')}</option>
                            <option value="true">{t('logs.successful')}</option>
                            <option value="false">{t('logs.failed')}</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.timestamp')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.user')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.action')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.module')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.entity')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.method')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('logs.status')}
                                </th>
                                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-semibold text-gray-600 uppercase tracking-wider`}>
                                    {t('common.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {logsLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                            <span className="text-gray-500">{t('logs.loadingAdminLogs')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logsData?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">{t('logs.noAdminLogs')}</p>
                                        <p className="text-sm text-gray-400 mt-1">{t('logs.tryAdjustFilters')}</p>
                                    </td>
                                </tr>
                            ) : (
                                logsData?.data?.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
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
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {log.user_name || 'System'}
                                                </p>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(log.user_role)}`}>
                                                    {log.user_role || 'system'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                                                    {getActionTypeIcon(log.action_type)} {formatActionType(log.action_type)}
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                                    {log.action_description || log.action}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-sm text-gray-700">
                                                {getModuleIcon(log.module)} {formatModule(log.module)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div>
                                                <p className="text-sm text-gray-900">{formatEntityType(log.entity_type)}</p>
                                                {log.entity_id && (
                                                    <p className="text-xs text-gray-500">#{log.entity_id}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${getHttpMethodColor(log.http_method)}`}>
                                                {log.http_method || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {log.is_successful ? (
                                                <span className="inline-flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{log.response_status}</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{log.response_status}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className={`inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                            >
                                                <Eye className={`w-3.5 h-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                                {t('logs.details')}
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
                    <div className={`px-4 py-4 border-t border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
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

export default AdminLogsPage;
