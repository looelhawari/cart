import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    rateLimitService,
    type RateLimitStats,
    type RateLimitConfig,
    type Offender,
    type KeyInfo,
    type IpCheckResult,
} from '@/services/rate-limit.service'
import {
    Shield,
    Activity,
    AlertTriangle,
    Ban,
    RefreshCw,
    Search,
    Trash2,
    Eye,
    X,
    Gauge,
    Globe,
    User,
    Fingerprint,
    Clock,
    Zap,
    Server,
    ChevronDown,
    ChevronUp,
    Copy,
    CheckCircle2,
    XCircle,
    Info,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
}

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ')
}

// ─── Sub-components ───────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtext, color = 'blue' }: {
    icon: React.ElementType
    label: string
    value: string | number
    subtext?: string
    color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray'
}) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        gray: 'bg-gray-50 text-gray-700 border-gray-200',
    }
    const iconColor = {
        blue: 'text-blue-500',
        green: 'text-green-500',
        red: 'text-red-500',
        amber: 'text-amber-500',
        purple: 'text-purple-500',
        gray: 'text-gray-500',
    }

    return (
        <div className={cn('rounded-xl border p-5 transition-shadow hover:shadow-md', colorMap[color])}>
            <div className="flex items-center gap-3 mb-3">
                <Icon className={cn('w-5 h-5', iconColor[color])} />
                <span className="text-sm font-medium opacity-80">{label}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
            {subtext && <p className="text-xs mt-1 opacity-70">{subtext}</p>}
        </div>
    )
}

function SectionHeader({ title, icon: Icon, children }: {
    title: string
    icon: React.ElementType
    children?: React.ReactNode
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Icon className="w-5 h-5 text-gray-500" />
                {title}
            </h2>
            {children}
        </div>
    )
}

// ─── Key Info Modal ───────────────────────────────────────────────────

function KeyInfoModal({ keyInfo, onClose }: { keyInfo: KeyInfo; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Eye className="w-5 h-5 text-blue-500" />
                        Key Details
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Key</label>
                        <p className="mt-1 font-mono text-sm bg-gray-50 p-2 rounded break-all">{keyInfo.key}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Violations</label>
                            <p className={cn('mt-1 text-2xl font-bold', keyInfo.violations > 0 ? 'text-red-600' : 'text-green-600')}>
                                {keyInfo.violations}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Violation TTL</label>
                            <p className="mt-1 text-2xl font-bold text-gray-700">
                                {keyInfo.violation_ttl ? formatDuration(keyInfo.violation_ttl) : '—'}
                            </p>
                        </div>
                    </div>
                    {keyInfo.abuse_tier && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-red-800 mb-2">Active Abuse Tier</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-red-600">Violations range:</span>
                                <span className="font-mono">{keyInfo.abuse_tier.min_violations}–{keyInfo.abuse_tier.max_violations}</span>
                                <span className="text-red-600">Limit multiplier:</span>
                                <span className="font-mono">{keyInfo.abuse_tier.limit_multiplier}x</span>
                                <span className="text-red-600">Block duration:</span>
                                <span className="font-mono">{formatDuration(keyInfo.abuse_tier.block_duration_seconds)}</span>
                            </div>
                        </div>
                    )}
                    {keyInfo.token_bucket && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Token Bucket State</label>
                            <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1">
                                {Object.entries(keyInfo.token_bucket).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm">
                                        <span className="font-mono text-gray-600">{k}</span>
                                        <span className="font-mono font-medium">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────

export default function RateLimitDashboardPage() {
    const { t, i18n } = useTranslation()
    const isRTL = i18n.language === 'ar'
    const queryClient = useQueryClient()

    // State
    const [ipInput, setIpInput] = useState('')
    const [blacklistIp, setBlacklistIp] = useState('')
    const [blacklistDuration, setBlacklistDuration] = useState(3600)
    const [blacklistReason, setBlacklistReason] = useState('')
    const [keyLookup, setKeyLookup] = useState('')
    const [selectedKeyInfo, setSelectedKeyInfo] = useState<KeyInfo | null>(null)
    const [expandedEndpoints, setExpandedEndpoints] = useState(false)
    const [ipCheckResult, setIpCheckResult] = useState<IpCheckResult | null>(null)
    const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
        setActionFeedback({ type, message })
        setTimeout(() => setActionFeedback(null), 4000)
    }, [])

    // ─── Queries ──────────────────────────────────────────────────────

    const statsQuery = useQuery({
        queryKey: ['rate-limit-stats'],
        queryFn: () => rateLimitService.getStats(),
        refetchInterval: 15_000, // live update every 15s
    })

    const configQuery = useQuery({
        queryKey: ['rate-limit-config'],
        queryFn: () => rateLimitService.getConfig(),
        staleTime: 60_000,
    })

    const offendersQuery = useQuery({
        queryKey: ['rate-limit-offenders'],
        queryFn: () => rateLimitService.getOffenders(30),
        refetchInterval: 20_000,
    })

    const stats = statsQuery.data
    const config = configQuery.data
    const offenders = Array.isArray(offendersQuery.data) ? offendersQuery.data : []

    // ─── Mutations ────────────────────────────────────────────────────

    const resetKeyMutation = useMutation({
        mutationFn: (key: string) => rateLimitService.resetKey(key),
        onSuccess: (_, key) => {
            showFeedback('success', `Reset rate limits for ${key}`)
            queryClient.invalidateQueries({ queryKey: ['rate-limit-offenders'] })
        },
        onError: () => showFeedback('error', 'Failed to reset key'),
    })

    const blacklistMutation = useMutation({
        mutationFn: () => rateLimitService.blacklistIp(blacklistIp, blacklistDuration, blacklistReason),
        onSuccess: () => {
            showFeedback('success', `Blacklisted ${blacklistIp} for ${formatDuration(blacklistDuration)}`)
            setBlacklistIp('')
            setBlacklistReason('')
            queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] })
        },
        onError: () => showFeedback('error', 'Failed to blacklist IP'),
    })

    const unblacklistMutation = useMutation({
        mutationFn: (ip: string) => rateLimitService.unblacklistIp(ip),
        onSuccess: (_, ip) => {
            showFeedback('success', `Removed ${ip} from blacklist`)
            setIpCheckResult(null)
        },
        onError: () => showFeedback('error', 'Failed to unblacklist IP'),
    })

    const checkIpMutation = useMutation({
        mutationFn: (ip: string) => rateLimitService.checkIp(ip),
        onSuccess: (data) => setIpCheckResult(data),
        onError: () => showFeedback('error', 'Failed to check IP'),
    })

    const lookupKeyMutation = useMutation({
        mutationFn: (key: string) => rateLimitService.getKeyInfo(key),
        onSuccess: (data) => setSelectedKeyInfo(data),
        onError: () => showFeedback('error', 'Key not found'),
    })

    // ─── Refresh all ──────────────────────────────────────────────────

    const refreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] })
        queryClient.invalidateQueries({ queryKey: ['rate-limit-config'] })
        queryClient.invalidateQueries({ queryKey: ['rate-limit-offenders'] })
    }

    // ─── Loading / Error States ───────────────────────────────────────

    if (statsQuery.isLoading || configQuery.isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-500">Loading rate limit data...</span>
            </div>
        )
    }

    if (statsQuery.isError || configQuery.isError) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-red-600">
                <AlertTriangle className="w-8 h-8 mb-2" />
                <p>Failed to load rate limit data. Ensure Redis is running.</p>
                <button onClick={refreshAll} className="mt-3 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className={cn('p-6 space-y-8 max-w-7xl mx-auto', isRTL && 'rtl')}>
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-7 h-7 text-blue-600" />
                        {t('rateLimit.title', 'Rate Limit Dashboard')}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {t('rateLimit.subtitle', 'Enterprise rate limiting monitoring & management')}
                    </p>
                </div>
                <button
                    onClick={refreshAll}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('common.refresh', 'Refresh')}
                </button>
            </div>

            {/* ─── Feedback Toast ──────────────────────────────────────── */}
            {actionFeedback && (
                <div className={cn(
                    'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all',
                    actionFeedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                )}>
                    {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {actionFeedback.message}
                </div>
            )}

            {/* ─── Stats Overview ──────────────────────────────────────── */}
            {stats && (
                <>
                    {/* Redis unavailable warning */}
                    {'error' in stats && (stats as any).error && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                            <span>
                                <span className="font-semibold">Redis unavailable — </span>
                                {(stats as any).error}. Rate limiting is running in fail-closed mode.
                            </span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard
                            icon={Gauge}
                            label={t('rateLimit.activeKeys', 'Active Keys')}
                            value={stats.active_keys ?? 0}
                            subtext="Tracked rate limit keys"
                            color="blue"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            label={t('rateLimit.violations', 'Active Violations')}
                            value={stats.active_violations ?? 0}
                            color={(stats.active_violations ?? 0) > 0 ? 'red' : 'green'}
                        />
                        <StatCard
                            icon={Zap}
                            label={t('rateLimit.algorithm', 'Algorithm')}
                            value={(stats.algorithm ?? 'token_bucket').replace('_', ' ')}
                            subtext={stats.storage ?? 'redis'}
                            color="purple"
                        />
                        <StatCard
                            icon={Globe}
                            label={t('rateLimit.globalLimit', 'Global Max RPS')}
                            value={(stats.global_limit_enabled ?? false) ? (stats.global_max_rps ?? 0) : 'OFF'}
                            color={(stats.global_limit_enabled ?? false) ? 'amber' : 'gray'}
                        />
                        <StatCard
                            icon={Server}
                            label={t('rateLimit.endpointPolicies', 'Endpoint Policies')}
                            value={stats.endpoint_policies ?? 0}
                            subtext={(stats.fail_open ?? false) ? 'Fail-open' : 'Fail-closed'}
                            color="blue"
                        />
                    </div>
                </>
            )}

            {/* ─── Configuration Overview ──────────────────────────────── */}
            {config && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <SectionHeader title={t('rateLimit.configuration', 'Configuration')} icon={Settings2}>
                            <span className="text-xs text-gray-400 font-mono">config/rate-limiting.php</span>
                        </SectionHeader>
                    </div>
                    <div className="p-5 grid md:grid-cols-3 gap-6">
                        {/* IP Limits */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Globe className="w-4 h-4" /> IP-based Limits
                            </h3>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status</span>
                                    <span className={config.ip.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                        {config.ip.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Per minute</span>
                                    <span className="font-mono">{config.ip.max_per_minute}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Per second</span>
                                    <span className="font-mono">{config.ip.max_per_second}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Burst capacity</span>
                                    <span className="font-mono">{config.ip.burst_capacity}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Whitelisted</span>
                                    <span className="font-mono text-green-600">{config.ip.whitelist_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Blacklisted</span>
                                    <span className="font-mono text-red-600">{config.ip.blacklist_count}</span>
                                </div>
                            </div>
                        </div>

                        {/* User Limits */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <User className="w-4 h-4" /> User-based Limits
                            </h3>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status</span>
                                    <span className={config.user.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                        {config.user.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Per minute</span>
                                    <span className="font-mono">{config.user.max_per_minute}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Burst capacity</span>
                                    <span className="font-mono">{config.user.burst_capacity}</span>
                                </div>
                            </div>
                        </div>

                        {/* Abuse Detection */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Abuse Detection
                            </h3>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status</span>
                                    <span className={config.abuse_detection.enabled ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                        {config.abuse_detection.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Threshold</span>
                                    <span className="font-mono">{config.abuse_detection.violation_threshold} violations</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Window</span>
                                    <span className="font-mono">{config.abuse_detection.violation_window_minutes}min</span>
                                </div>
                                {config.abuse_detection.tiers.map((tier, i) => (
                                    <div key={i} className="flex justify-between text-xs bg-red-50 px-2 py-1 rounded">
                                        <span>Tier {i + 1} ({tier.min_violations}–{tier.max_violations})</span>
                                        <span className="font-mono">{tier.limit_multiplier}x / {formatDuration(tier.block_duration_seconds)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Endpoint Policies */}
                    <div className="border-t border-gray-100 p-5">
                        <button
                            onClick={() => setExpandedEndpoints(v => !v)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors w-full"
                        >
                            <Activity className="w-4 h-4" />
                            Endpoint Policies ({Object.keys(config.endpoints).length})
                            {expandedEndpoints ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                        </button>
                        {expandedEndpoints && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-left">
                                            <th className="pb-2 font-medium text-gray-500">Endpoint Pattern</th>
                                            <th className="pb-2 font-medium text-gray-500">Limit/min</th>
                                            <th className="pb-2 font-medium text-gray-500">Burst</th>
                                            <th className="pb-2 font-medium text-gray-500">Key By</th>
                                            <th className="pb-2 font-medium text-gray-500">Fail Mode</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(config.endpoints).map(([pattern, policy]) => (
                                            <tr key={pattern} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="py-2 font-mono text-xs text-blue-700">{pattern}</td>
                                                <td className="py-2 font-mono">{policy.max_per_minute}</td>
                                                <td className="py-2 font-mono">{policy.burst_capacity}</td>
                                                <td className="py-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 font-mono">
                                                        {policy.key_by}
                                                    </span>
                                                </td>
                                                <td className="py-2">
                                                    <span className={cn(
                                                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                                        policy.fail_open === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    )}>
                                                        {policy.fail_open === false ? 'Fail-closed' : 'Fail-open'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Top Offenders ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-100">
                    <SectionHeader title={t('rateLimit.topOffenders', 'Top Offenders')} icon={Ban}>
                        <span className="text-xs text-gray-400">{offenders.length} tracked</span>
                    </SectionHeader>
                </div>
                <div className="overflow-x-auto">
                    {offenders.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                            <p>No active offenders. System is clean.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50">
                                    <th className="p-3 text-left font-medium text-gray-500">Key</th>
                                    <th className="p-3 text-left font-medium text-gray-500">Violations</th>
                                    <th className="p-3 text-left font-medium text-gray-500">TTL</th>
                                    <th className="p-3 text-left font-medium text-gray-500">Abuse Tier</th>
                                    <th className="p-3 text-right font-medium text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {offenders.map((offender) => (
                                    <tr key={offender.key} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs break-all max-w-[250px]">{offender.key}</span>
                                                <button
                                                    onClick={() => { navigator.clipboard.writeText(offender.key) }}
                                                    className="p-1 hover:bg-gray-100 rounded"
                                                    title="Copy key"
                                                >
                                                    <Copy className="w-3 h-3 text-gray-400" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                                                offender.violations >= 50 ? 'bg-red-100 text-red-700' :
                                                    offender.violations >= 20 ? 'bg-orange-100 text-orange-700' :
                                                        offender.violations >= 10 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                            )}>
                                                {offender.violations}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600 font-mono text-xs">
                                            {offender.ttl ? formatDuration(offender.ttl) : '—'}
                                        </td>
                                        <td className="p-3">
                                            {offender.tier ? (
                                                <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                                                    {offender.tier.limit_multiplier}x / {formatDuration(offender.tier.block_duration_seconds)} block
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">None</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => lookupKeyMutation.mutate(offender.key)}
                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => resetKeyMutation.mutate(offender.key)}
                                                    disabled={resetKeyMutation.isPending}
                                                    className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reset limits"
                                                >
                                                    <RefreshCw className={cn('w-4 h-4', resetKeyMutation.isPending && 'animate-spin')} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ─── Management Tools ────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* IP Blacklist Management */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <SectionHeader title={t('rateLimit.ipBlacklist', 'IP Blacklist')} icon={Ban} />
                    </div>
                    <div className="p-5 space-y-4">
                        {/* Check IP */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Check IP Status</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={ipInput}
                                    onChange={e => setIpInput(e.target.value)}
                                    placeholder="e.g. 192.168.1.100"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => ipInput && checkIpMutation.mutate(ipInput)}
                                    disabled={!ipInput || checkIpMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                            {ipCheckResult && (
                                <div className={cn(
                                    'mt-3 p-3 rounded-lg text-sm flex items-center justify-between',
                                    ipCheckResult.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                                )}>
                                    <div className="flex items-center gap-2">
                                        {ipCheckResult.status === 'blocked' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        <span className="font-mono">{ipCheckResult.ip}</span>
                                        <span className="font-medium">— {ipCheckResult.status.toUpperCase()}</span>
                                        {ipCheckResult.config_blacklisted && <span className="text-xs bg-red-200 px-1.5 py-0.5 rounded">config</span>}
                                        {ipCheckResult.runtime_blacklisted && <span className="text-xs bg-orange-200 px-1.5 py-0.5 rounded">runtime</span>}
                                    </div>
                                    {ipCheckResult.runtime_blacklisted && (
                                        <button
                                            onClick={() => unblacklistMutation.mutate(ipCheckResult.ip)}
                                            className="text-xs px-2 py-1 bg-white text-red-600 rounded hover:bg-red-50 border border-red-200"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Blacklist IP */}
                        <div className="border-t pt-4">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Add to Blacklist</label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={blacklistIp}
                                    onChange={e => setBlacklistIp(e.target.value)}
                                    placeholder="IP address"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={blacklistDuration}
                                        onChange={e => setBlacklistDuration(Number(e.target.value))}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                        <option value={300}>5 minutes</option>
                                        <option value={900}>15 minutes</option>
                                        <option value={1800}>30 minutes</option>
                                        <option value={3600}>1 hour</option>
                                        <option value={14400}>4 hours</option>
                                        <option value={86400}>24 hours</option>
                                        <option value={604800}>7 days</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={blacklistReason}
                                        onChange={e => setBlacklistReason(e.target.value)}
                                        placeholder="Reason (optional)"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <button
                                    onClick={() => blacklistIp && blacklistMutation.mutate()}
                                    disabled={!blacklistIp || blacklistMutation.isPending}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ban className="w-4 h-4" />
                                    Blacklist IP
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Lookup */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <SectionHeader title={t('rateLimit.keyLookup', 'Key Lookup')} icon={Search} />
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Look up Rate Limit Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={keyLookup}
                                    onChange={e => setKeyLookup(e.target.value)}
                                    placeholder="e.g. rl:ip:192.168.1.100"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => keyLookup && lookupKeyMutation.mutate(keyLookup)}
                                    disabled={!keyLookup || lookupKeyMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    Inspect
                                </button>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Key Format Guide
                            </label>
                            <div className="space-y-1.5 text-xs text-gray-600">
                                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                    <Globe className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <code className="font-mono text-blue-700">rl:ip:&lt;ip_address&gt;</code>
                                        <span className="ml-1 text-gray-400">— per-IP limit key</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                    <User className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <code className="font-mono text-blue-700">rl:user:&lt;user_id&gt;</code>
                                        <span className="ml-1 text-gray-400">— per-user limit key</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                    <Activity className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <code className="font-mono text-blue-700">rl:ep:&lt;pattern&gt;:&lt;dim&gt;</code>
                                        <span className="ml-1 text-gray-400">— endpoint key</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 bg-gray-50 p-2 rounded">
                                    <Fingerprint className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <div>
                                        <code className="font-mono text-blue-700">rl:fp:&lt;hash&gt;</code>
                                        <span className="ml-1 text-gray-400">— fingerprint key</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reset a key */}
                        <div className="border-t pt-4">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Reset Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={keyLookup}
                                    onChange={e => setKeyLookup(e.target.value)}
                                    placeholder="Key to reset"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                    onClick={() => keyLookup && resetKeyMutation.mutate(keyLookup)}
                                    disabled={!keyLookup || resetKeyMutation.isPending}
                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Key Info Modal ──────────────────────────────────────── */}
            {selectedKeyInfo && (
                <KeyInfoModal keyInfo={selectedKeyInfo} onClose={() => setSelectedKeyInfo(null)} />
            )}
        </div>
    )
}

// Re-export Settings2 icon since lucide doesn't have it — use Settings
function Settings2(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
    return <Gauge {...props} />
}
