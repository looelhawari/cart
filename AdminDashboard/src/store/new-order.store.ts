import { create } from 'zustand'

export interface PendingOrderInfo {
    id: number
    order_number?: string
    customerName?: string
    total?: number
}

interface NewOrderState {
    /** The most recent unacknowledged order, or null if none. */
    pending: PendingOrderInfo | null
    /** Mark a new order as pending — triggers banner + ring. */
    setPending: (order: PendingOrderInfo) => void
    /** Cashier confirmed: clear banner and stop ring. */
    dismiss: () => void
}

export const useNewOrderStore = create<NewOrderState>((set) => ({
    pending: null,
    setPending: (order) => set({ pending: order }),
    dismiss: () => set({ pending: null }),
}))
