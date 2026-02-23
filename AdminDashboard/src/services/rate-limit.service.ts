import { apiClient } from '@/lib/api-client'

/**
 * Rate Limit Administration Service
 * 
 * Admin-facing API for monitoring, managing, and analyzing rate limits.
 * Connects to the backend enterprise rate limiter.
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface RateLimitStats {
    active_keys: number
    active_violations?: number
    algorithm?: string
    global_limit_enabled?: boolean
    global_max_rps?: number
    abuse_detection_enabled?: boolean
    fail_open?: boolean
    storage?: string
    endpoint_policies?: number
    // Present only when Redis is unavailable
    error?: string
}

export interface RateLimitConfig {
    algorithm: string
    fail_open: boolean
    global: {
        enabled: boolean
        max_per_second: number
    }
    ip: {
        enabled: boolean
        max_per_minute: number
        max_per_second: number
        burst_capacity: number
        whitelist_count: number
        blacklist_count: number
    }
    user: {
        enabled: boolean
        max_per_minute: number
        burst_capacity: number
    }
    endpoints: Record<string, EndpointPolicy>
    abuse_detection: {
        enabled: boolean
        violation_threshold: number
        violation_window_minutes: number
        tiers: AbuseTier[]
    }
    fingerprinting: {
        enabled: boolean
    }
    logging: {
        enabled: boolean
    }
}

export interface EndpointPolicy {
    max_per_minute: number
    burst_capacity: number
    key_by: string
    fail_open?: boolean
    max_per_hour?: number
    max_per_15_minutes?: number
    penalty_multiplier?: number
}

export interface AbuseTier {
    min_violations: number
    max_violations: number
    limit_multiplier: number
    block_duration_seconds: number
}

export interface Offender {
    key: string
    violations: number
    ttl: number | null
    tier: AbuseTier | null
}

export interface KeyInfo {
    key: string
    token_bucket: Record<string, string> | null
    violations: number
    violation_ttl: number | null
    abuse_tier: AbuseTier | null
}

export interface IpCheckResult {
    ip: string
    config_blacklisted: boolean
    runtime_blacklisted: boolean
    status: 'blocked' | 'allowed'
}

// ─── Service ──────────────────────────────────────────────────────────

export const rateLimitService = {
    /**
     * Get rate limit system stats overview.
     */
    async getStats(): Promise<RateLimitStats> {
        const response = await apiClient.get<{ success: boolean; data: RateLimitStats }>(
            '/admin/rate-limits/stats'
        )
        return response.data
    },

    /**
     * Get current rate limiting configuration.
     */
    async getConfig(): Promise<RateLimitConfig> {
        const response = await apiClient.get<{ success: boolean; data: RateLimitConfig }>(
            '/admin/rate-limits/config'
        )
        return response.data
    },

    /**
     * Get top offenders with violation counts.
     */
    async getOffenders(limit: number = 20): Promise<Offender[]> {
        const response = await apiClient.get<{ success: boolean; data: Offender[] }>(
            '/admin/rate-limits/offenders',
            { limit }
        )
        return response.data
    },

    /**
     * Get detailed info about a specific rate limit key.
     */
    async getKeyInfo(key: string): Promise<KeyInfo> {
        const response = await apiClient.get<{ success: boolean; data: KeyInfo }>(
            `/admin/rate-limits/key/${encodeURIComponent(key)}`
        )
        return response.data
    },

    /**
     * Reset rate limit counters for a key.
     */
    async resetKey(key: string): Promise<{ success: boolean; message: string }> {
        return apiClient.post<{ success: boolean; message: string }>(
            '/admin/rate-limits/reset',
            { key }
        )
    },

    /**
     * Blacklist an IP address temporarily.
     */
    async blacklistIp(ip: string, duration: number = 3600, reason?: string): Promise<{ success: boolean; message: string }> {
        return apiClient.post<{ success: boolean; message: string }>(
            '/admin/rate-limits/blacklist',
            { ip, duration, reason }
        )
    },

    /**
     * Remove an IP from the runtime blacklist.
     */
    async unblacklistIp(ip: string): Promise<{ success: boolean; message: string }> {
        return apiClient.delete<{ success: boolean; message: string }>(
            `/admin/rate-limits/blacklist/${ip}`
        )
    },

    /**
     * Check if an IP is currently blacklisted.
     */
    async checkIp(ip: string): Promise<IpCheckResult> {
        const response = await apiClient.get<{ success: boolean; data: IpCheckResult }>(
            `/admin/rate-limits/check-ip/${ip}`
        )
        return response.data
    },
}

export default rateLimitService
