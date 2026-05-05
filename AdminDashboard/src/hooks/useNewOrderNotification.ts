import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { useAuthStore } from '@/store/auth.store'

const STORAGE_KEY = 'last_seen_order_id'
const SOUND_URL = '/order-notification.wav'
const POLL_INTERVAL_MS = 15000

/**
 * Polls the orders list and rings the notification sound whenever a new order
 * (id higher than the last one we've already acknowledged) appears.
 *
 * Why a hook (not Echo): there is no order-created broadcast event yet, so we
 * piggy-back on the existing admin orders endpoint with light polling.
 */
export function useNewOrderNotification() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const initializedRef = useRef(false)

    if (!audioRef.current && typeof window !== 'undefined') {
        audioRef.current = new Audio(SOUND_URL)
        audioRef.current.preload = 'auto'
    }

    const { data } = useQuery({
        queryKey: ['orders-notify-poll'],
        queryFn: () => orderService.getOrders({ page: 1, per_page: 1, sort_by: 'created_at', sort_order: 'desc' }),
        enabled: isAuthenticated,
        refetchInterval: POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
        staleTime: 0,
    })

    useEffect(() => {
        const orders = (data?.data as any[] | undefined) || []
        if (!orders.length) return

        const latestId = Number(orders[0]?.id)
        if (!Number.isFinite(latestId)) return

        const stored = Number(localStorage.getItem(STORAGE_KEY) || 0)

        if (!initializedRef.current) {
            initializedRef.current = true
            if (!stored || stored < latestId) {
                localStorage.setItem(STORAGE_KEY, String(latestId))
            }
            return
        }

        if (latestId > stored) {
            localStorage.setItem(STORAGE_KEY, String(latestId))
            const audio = audioRef.current
            if (audio) {
                try {
                    audio.currentTime = 0
                    void audio.play().catch(() => {
                        /* Autoplay can be blocked until first user interaction; silently ignore */
                    })
                } catch {
                    /* no-op */
                }
            }
        }
    }, [data])
}
