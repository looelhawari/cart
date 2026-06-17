import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orderService } from '@/services/order.service'
import { useAuthStore } from '@/store/auth.store'
import { useNewOrderStore } from '@/store/new-order.store'

const STORAGE_KEY = 'last_seen_order_id'
const SOUND_URL = '/order-notification.wav'
const POLL_INTERVAL_MS = 15000

/**
 * Polls the orders list, and on any new order:
 *   1. starts the notification audio looping
 *   2. populates the new-order store so the banner reveals
 *
 * The audio keeps looping until the cashier dismisses the banner
 * (which clears `pending` in the store, observed below).
 *
 * Why polling not Echo: there is no order-created broadcast event yet.
 *
 * Audio unlock: browsers block audio.play() until the user has gestured
 * once on the page. We register a one-shot global listener that does a
 * silent play→pause on first interaction, which permanently unlocks the
 * element so later loops fire even though they're triggered by a network
 * event, not a click.
 */
export function useNewOrderNotification() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const pending = useNewOrderStore((s) => s.pending)
    const setPending = useNewOrderStore((s) => s.setPending)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const initializedRef = useRef(false)
    const unlockedRef = useRef(false)
    // Set to true while we're waiting for a user gesture so the next
    // unlock also kicks the loop off (handles "order arrives BEFORE the
    // cashier has clicked anywhere on this tab" case).
    const playOnUnlockRef = useRef(false)

    if (!audioRef.current && typeof window !== 'undefined') {
        const audio = new Audio(SOUND_URL)
        audio.preload = 'auto'
        audio.loop = true
        audioRef.current = audio
    }

    const { data } = useQuery({
        queryKey: ['orders-notify-poll'],
        queryFn: () => orderService.getOrders({ page: 1, per_page: 1, sort_by: 'created_at', sort_order: 'desc' }),
        enabled: isAuthenticated,
        refetchInterval: POLL_INTERVAL_MS,
        refetchIntervalInBackground: true,
        staleTime: 0,
    })

    // One-shot audio unlock on first user gesture.
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const unlock = () => {
            if (unlockedRef.current) return
            unlockedRef.current = true

            const previousVolume = audio.volume
            audio.volume = 0
            audio
                .play()
                .then(() => {
                    audio.pause()
                    audio.currentTime = 0
                    audio.volume = previousVolume
                    // If a banner is already showing because the order
                    // arrived before the cashier clicked, kick the loop now.
                    if (playOnUnlockRef.current) {
                        playOnUnlockRef.current = false
                        audio.volume = previousVolume
                        void audio.play().catch(() => {
                            /* genuinely blocked; user can click Confirm to silence */
                        })
                    }
                })
                .catch(() => {
                    audio.volume = previousVolume
                    // First gesture didn't unlock; keep listening.
                    unlockedRef.current = false
                })

            removeListeners()
        }

        const removeListeners = () => {
            window.removeEventListener('pointerdown', unlock)
            window.removeEventListener('keydown', unlock)
            window.removeEventListener('touchstart', unlock)
        }

        window.addEventListener('pointerdown', unlock, { passive: true })
        window.addEventListener('keydown', unlock)
        window.addEventListener('touchstart', unlock, { passive: true })

        return removeListeners
    }, [])

    // Detect new orders and announce them to the store.
    //
    // BUGFIX (Issue #3): the previous version rang the bell the instant a
    // new order ID appeared in the list — including card-online orders
    // whose payment was still PENDING. The cashier got "ding!" before
    // Paymob had even authorised the card, and 1-in-N of those failed
    // anyway. We now only ring when the order is in a *verified* state:
    //   - COD / card-on-delivery: confirmed at creation time
    //   - card-online: confirmed once the Paymob webhook / reconciliation
    //                   has flipped payment_status to 'completed'
    //
    // Practically, this means a card-online order won't ring on the
    // initial creation poll — it'll ring on a subsequent poll *after*
    // the payment confirms. That's the desired behaviour.
    useEffect(() => {
        const orders = (data?.data as any[] | undefined) || []
        if (!orders.length) return

        const isPaymentVerified = (o: any): boolean => {
            const paymentStatus = String(o?.payment_status ?? '').toLowerCase()
            const paymentMethod = String(o?.payment_method ?? '').toLowerCase()
            // Methods that don't pre-charge the customer — order is fully
            // actionable at creation time, no gateway round-trip to wait for.
            const onDelivery =
                paymentMethod === 'cod' ||
                paymentMethod === 'cash_on_delivery' ||
                paymentMethod === 'card_on_delivery' ||
                paymentMethod === 'card_machine'
            if (onDelivery) return true
            // For card/online flows we require Paymob's webhook or our
            // polling-driven reconciliation to have committed the payment.
            return paymentStatus === 'completed' || paymentStatus === 'paid'
        }

        // Pick the most recent *verified* order, not the most recent order
        // overall — fixes the premature-bell symptom for card payments.
        const latestVerified = orders.find((o) => isPaymentVerified(o))
        if (!latestVerified) return

        const latestId = Number(latestVerified?.id)
        if (!Number.isFinite(latestId)) return

        const stored = Number(localStorage.getItem(STORAGE_KEY) || 0)

        if (!initializedRef.current) {
            initializedRef.current = true
            // ALWAYS (re)baseline to the current latest order on the first
            // poll. Robust to order-ID resets — e.g. a go-live data wipe that
            // TRUNCATEs the orders table restarts IDs at 1, but a stale,
            // higher last_seen_order_id left in this browser's localStorage
            // would otherwise make `latestId > stored` permanently false and
            // silence every future alert. (The old code only updated when
            // stored < latestId, so a stale-high value stuck forever.)
            localStorage.setItem(STORAGE_KEY, String(latestId))
            return
        }

        if (latestId > stored) {
            localStorage.setItem(STORAGE_KEY, String(latestId))
            const customerName = [latestVerified?.user?.first_name, latestVerified?.user?.last_name]
                .filter(Boolean)
                .join(' ')
                .trim() || undefined
            setPending({
                id: latestId,
                order_number: latestVerified?.order_number,
                customerName,
                total:
                    typeof latestVerified?.total === 'number'
                        ? latestVerified.total
                        : Number(latestVerified?.total) || undefined,
            })
        } else if (latestId < stored) {
            // IDs went backwards while running → the orders table was reset
            // (data wipe). Re-baseline silently so alerts resume for the next
            // genuinely new order instead of being stuck forever.
            localStorage.setItem(STORAGE_KEY, String(latestId))
        }
    }, [data, setPending])

    // Drive the audio loop from the `pending` flag — start when something
    // is pending, stop the moment the cashier dismisses.
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        if (pending) {
            try {
                audio.currentTime = 0
                void audio.play().catch((err) => {
                    // Almost always: NotAllowedError because no user gesture yet.
                    // Mark that we want to play as soon as the unlock effect fires.
                    playOnUnlockRef.current = true
                    // eslint-disable-next-line no-console
                    console.warn('[new-order] audio play blocked, waiting for user gesture', err?.name || err)
                })
            } catch {
                /* no-op */
            }
        } else {
            playOnUnlockRef.current = false
            try {
                audio.pause()
                audio.currentTime = 0
            } catch {
                /* no-op */
            }
        }
    }, [pending])

    // Stop the audio if the component unmounts (e.g. logout).
    useEffect(() => {
        return () => {
            const audio = audioRef.current
            if (audio) {
                try {
                    audio.pause()
                    audio.currentTime = 0
                } catch {
                    /* no-op */
                }
            }
        }
    }, [])
}
