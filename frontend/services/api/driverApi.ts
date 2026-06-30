import { API_BASE_URL, safeJsonParse, getAuthToken } from "./base";
import { normalizeApiErrorPayload } from "./errors";

// ─── Types ─────────────────────────────────────────

export interface DriverDashboard {
    active_orders: DriverOrder[];
    is_available: boolean;
    assigned_zone: { id: number; name_en: string; name_ar: string } | null;
    today_stats: {
        total_orders: number;
        delivered: number;
        cancelled: number;
        total_earnings: number;
    };
}

export interface DriverOrder {
    id: number;
    order_number: string;
    status: string;
    total_amount: string;
    delivery_fee: string;
    final_amount: string;
    delivery_lat: number | null;
    delivery_lng: number | null;
    delivery_notes: string | null;
    estimated_delivery_minutes: number | null;
    created_at: string;
    user: {
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
    } | null;
    delivery_address: {
        id: number;
        street: string;
        building: string;
        floor: string;
        apartment: string;
        area: string;
        city: string;
        landmark: string | null;
    } | null;
    items?: Array<{
        id: number;
        product_name: string;
        quantity: number;
        price: string;
        subtotal: string;
    }>;
}

export interface DriverStats {
    total_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    total_earnings: number;
    average_rating: number | null;
    avg_delivery_time_minutes: number | null;
    status_breakdown?: Record<string, number>;
}

// ─── Helpers ───────────────────────────────────────

const driverHeaders = async (): Promise<HeadersInit> => {
    const token = await getAuthToken();
    return {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

const driverGet = async <T>(endpoint: string, params?: Record<string, string>): Promise<T> => {
    const headers = await driverHeaders();
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const response = await fetch(`${API_BASE_URL}${endpoint}${qs}`, {
        method: "GET",
        headers,
    });
    const data = await safeJsonParse(response);
    if (!response.ok) throw normalizeApiErrorPayload(data, response.status, "Action failed. Please try again.");
    return data.data as T;
};

const driverPost = async <T>(endpoint: string, body?: any): Promise<T> => {
    const headers = await driverHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await safeJsonParse(response);
    if (!response.ok) throw normalizeApiErrorPayload(data, response.status, "Action failed. Please try again.");
    return data.data as T;
};

// ─── API ─────────────────────────────────────────

export const driverApi = {
    getDashboard: async (): Promise<DriverDashboard> => {
        return driverGet<DriverDashboard>("/driver/dashboard");
    },

    toggleAvailability: async (): Promise<{ is_available: boolean; message: string }> => {
        const headers = await driverHeaders();
        const response = await fetch(`${API_BASE_URL}/driver/toggle-availability`, {
            method: "POST",
            headers,
        });
        const data = await safeJsonParse(response);
        if (!response.ok) throw normalizeApiErrorPayload(data, response.status, "Action failed. Please try again.");
        return { is_available: data.data.is_available, message: data.message };
    },

    updateLocation: async (locationData: {
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
        accuracy?: number;
        order_id?: number;
    }): Promise<void> => {
        await driverPost("/driver/location", locationData);
    },

    getOrders: async (params?: { status?: string; page?: number }): Promise<{
        data: DriverOrder[];
        current_page: number;
        last_page: number;
    }> => {
        const qp: Record<string, string> = {};
        if (params?.status) qp.status = params.status;
        if (params?.page) qp.page = String(params.page);
        return driverGet("/driver/orders", Object.keys(qp).length ? qp : undefined);
    },

    getOrderDetails: async (orderId: number): Promise<DriverOrder> => {
        return driverGet<DriverOrder>(`/driver/orders/${orderId}`);
    },

    acceptOrder: async (orderId: number): Promise<DriverOrder> => {
        return driverPost<DriverOrder>(`/driver/orders/${orderId}/accept`);
    },

    pickupOrder: async (orderId: number): Promise<DriverOrder> => {
        return driverPost<DriverOrder>(`/driver/orders/${orderId}/pickup`);
    },

    deliverOrder: async (orderId: number): Promise<DriverOrder> => {
        return driverPost<DriverOrder>(`/driver/orders/${orderId}/deliver`);
    },

    rejectOrder: async (orderId: number, reason?: string): Promise<{ reassigned: boolean; new_driver_name?: string }> => {
        return driverPost(`/driver/orders/${orderId}/reject`, reason ? { reason } : undefined);
    },

    getStats: async (period?: string): Promise<DriverStats> => {
        const qp = period ? { period } : undefined;
        return driverGet<DriverStats>("/driver/stats", qp);
    },
};
