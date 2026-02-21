import { useState, useEffect, useCallback } from 'react'
import { onRateLimitChange, getRateLimitInfo } from '@/lib/api-client'

/**
 * Rate Limit Info for UI display.
 */
interface RateLimitInfo {
    limit: number
    remaining: number
    reset: number
    retryAfter: number
    policy: string
    isLimited: boolean
    lastUpdated: number
}

/**
 * useRateLimitStatus
 * 
 * React hook that subscribes to global rate limit state.
 * Use this in components to show rate limit warnings/status.
 * 
 * @param endpoint - Optional: filter by endpoint group (e.g., "admin/products")
 * @returns Current rate limit state + helpers
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isLimited, remaining, retryAfter, percentUsed } = useRateLimitStatus('admin/products')
 *   
 *   if (isLimited) {
 *     return <div>Rate limited. Retry in {retryAfter}s</div>
 *   }
 *   
 *   return (
 *     <div>
 *       {percentUsed > 80 && <WarningBanner remaining={remaining} />}
 *       <ProductList />
 *     </div>
 *   )
 * }
 * ```
 */
export function useRateLimitStatus(endpoint?: string) {
    const [state, setState] = useState<Map<string, RateLimitInfo>>(new Map())

    useEffect(() => {
        const unsubscribe = onRateLimitChange((newState) => {
            setState(newState)
        })
        return unsubscribe
    }, [])

    const info = endpoint ? state.get(endpoint) : undefined

    // When no specific endpoint, find the most restrictive
    const globalInfo = !endpoint
        ? (() => {
            let worst: RateLimitInfo | undefined
            state.forEach(i => {
                if (!worst || i.remaining < worst.remaining) worst = i
            })
            return worst
        })()
        : undefined

    const current = info || globalInfo

    const isLimited = current?.isLimited ?? false
    const remaining = current?.remaining ?? -1
    const limit = current?.limit ?? 0
    const retryAfter = current?.retryAfter ?? 0
    const percentUsed = limit > 0 ? Math.round(((limit - remaining) / limit) * 100) : 0
    const policy = current?.policy ?? ''

    // Countdown timer for retry
    const [countdown, setCountdown] = useState(0)

    useEffect(() => {
        if (!isLimited || retryAfter <= 0) {
            setCountdown(0)
            return
        }

        setCountdown(retryAfter)
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [isLimited, retryAfter])

    return {
        /** Whether the client is currently rate limited */
        isLimited,
        /** Remaining requests in the current window */
        remaining,
        /** Maximum requests allowed in the window */
        limit,
        /** Seconds until rate limit resets */
        retryAfter,
        /** Countdown timer (updates every second when limited) */
        countdown,
        /** Percentage of quota consumed (0-100) */
        percentUsed,
        /** Which rate limit policy was applied */
        policy,
        /** All tracked endpoint rate limits */
        allEndpoints: state,
        /** Whether approaching the limit (>80% used) */
        isWarning: percentUsed > 80 && !isLimited,
    }
}

export default useRateLimitStatus
