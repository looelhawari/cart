import { api } from "./api";

// ─── Types ─────────────────────────────────────────

export interface DashboardData {
    active_orders: Order[];
    is_available: boolean;
    assigned_zone: { id: number; name: string; name_ar: string } | null;
    today_stats: {
        total_orders: number;
        delivered: number;
        cancelled: number;
        total_earnings: number;
    };
}

export interface OrderAddress {
    id: number;
    label?: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    area: string;
    city: string;
    landmark: string | null;
}

export interface Order {
    id: number;
    order_number: string;
    status: string;
    subtotal: string;
    delivery_fee: string;
    discount?: string;
    total: string;
    payment_method: string;
    payment_status: string;
    delivery_lat: number | null;
    delivery_lng: number | null;
    /** Can be either a formatted string OR the full address object */
    delivery_address?: string | OrderAddress | null;
    notes: string | null;
    estimated_delivery_minutes: number | null;
    driver_assigned_at: string | null;
    driver_picked_up_at: string | null;
    actual_delivered_at: string | null;
    confirmed_at?: string | null;
    picked_up_at?: string | null;
    delivered_at?: string | null;
    created_at: string;
    updated_at: string;
    status_label?: string;
    customer?: {
        id: number;
        first_name: string;
        last_name: string;
        phone?: string;
    };
    /** Alias — some endpoints return `user` instead of `customer` */
    user?: {
        id: number;
        first_name: string;
        last_name: string;
        phone?: string;
    };
    address?: OrderAddress | null;
    items?: Array<{
        id: number;
        quantity: number;
        price: string;
        subtotal: string;
        total?: string;
        name?: string;
        variant?: string;
        product?: {
            id: number;
            name_en: string;
            name_ar: string;
        };
        product_name?: string;
    }>;
    customer_rating?: {
        id: number;
        rating: number;
        comment: string | null;
    } | null;
}

export interface PaginatedOrders {
    data: Order[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface DriverStats {
    total_orders: number;
    delivered: number;
    cancelled: number;
    total_earnings: number;
    average_rating: string | number | null;
    total_deliveries_all_time: number;
}

// ─── Driver Service ────────────────────────────────

export const driverService = {
    getDashboard: async (): Promise<DashboardData> => {
        const res = await api.get<{ success: boolean; data: DashboardData }>("/driver/dashboard");
        return res.data;
    },

    toggleAvailability: async (): Promise<{ is_available: boolean; message: string }> => {
        const res = await api.post<{ success: boolean; data: { is_available: boolean }; message: string }>("/driver/toggle-availability");
        return { is_available: res.data.is_available, message: res.message };
    },

    updateLocation: async (coords: {
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
        accuracy?: number;
        order_id?: number;
    }): Promise<void> => {
        await api.post("/driver/location", coords);
    },

    getOrders: async (params?: { status?: string; page?: number }): Promise<PaginatedOrders> => {
        const res = await api.get<{ success: boolean; data: PaginatedOrders }>("/driver/orders", params as any);
        return res.data;
    },

    getOrderDetails: async (id: number): Promise<Order> => {
        const res = await api.get<{ success: boolean; data: Order }>(`/driver/orders/${id}`);
        return res.data;
    },

    acceptOrder: async (id: number): Promise<Order> => {
        const res = await api.post<{ success: boolean; data: Order }>(`/driver/orders/${id}/accept`);
        return res.data;
    },

    pickupOrder: async (id: number): Promise<Order> => {
        const res = await api.post<{ success: boolean; data: Order }>(`/driver/orders/${id}/pickup`);
        return res.data;
    },

    deliverOrder: async (id: number): Promise<Order> => {
        const res = await api.post<{ success: boolean; data: Order }>(`/driver/orders/${id}/deliver`);
        return res.data;
    },

    rejectOrder: async (id: number, reason?: string): Promise<{ reassigned: boolean; new_driver_name?: string }> => {
        const res = await api.post<{ success: boolean; data: { reassigned: boolean; new_driver_name?: string } }>(
            `/driver/orders/${id}/reject`,
            reason ? { reason } : undefined,
        );
        return res.data;
    },

    getStats: async (period: string = "7d"): Promise<DriverStats> => {
        const res = await api.get<{ success: boolean; data: DriverStats }>("/driver/stats", { period });
        return res.data;
    },

    rateCustomer: async (orderId: number, payload: { rating: number; comment?: string }): Promise<{ message: string }> => {
        const res = await api.post<{ success: boolean; message: string }>(
            `/driver/orders/${orderId}/rate-customer`,
            payload,
        );
        return { message: res.message };
    },

    canRateCustomer: async (orderId: number): Promise<{ can_rate: boolean; already_rated?: boolean }> => {
        const res = await api.get<{ success: boolean; data: { can_rate: boolean; already_rated?: boolean } }>(
            `/driver/orders/${orderId}/can-rate-customer`,
        );
        return res.data;
    },
};
