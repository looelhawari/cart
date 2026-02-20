import { API_BASE_URL, safeJsonParse, getAuthToken } from "./base";

// ─── Types ───────────────────────────────────────────────────────

export interface TrackingTimelineStep {
    status: string;
    label: string;
    completed: boolean;
    time: string | null;
}

export interface TrackingDriverLocation {
    lat: number;
    lng: number;
    heading: number | null;
    updated_at: string | null;
}

export interface TrackingDriver {
    id: number;
    name: string;
    phone: string;
    photo: string | null;
    rating: number | null;
    location: TrackingDriverLocation;
    assigned_at: string | null;
    picked_up_at: string | null;
}

export interface TrackingDelivery {
    lat: number;
    lng: number;
    zone_name: string | null;
    address: {
        street: string;
        city: string;
        area: string;
        building: string | null;
        floor: string | null;
        apartment: string | null;
    } | null;
    estimated_minutes: number | null;
}

export interface TrackingETA {
    estimated_arrival: string;
    minutes_remaining: number;
    total_minutes: number;
}

export interface OrderTrackingData {
    order_id: number;
    order_number: string;
    status: string;
    status_label: string;
    timeline: TrackingTimelineStep[];
    delivery: TrackingDelivery;
    driver: TrackingDriver | null;
    eta: TrackingETA | null;
}

// ─── API ─────────────────────────────────────────────────────────

export const trackingApi = {
    /**
     * Get live tracking data for an order.
     * Polls this endpoint every N seconds on the tracking screen.
     */
    getTracking: async (orderId: number): Promise<OrderTrackingData> => {
        const token = await getAuthToken();

        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/tracking`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json; charset=utf-8",
                "ngrok-skip-browser-warning": "true",
                "User-Agent": "CART-Mobile-App",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
        });

        const data = await safeJsonParse(response);

        if (!response.ok) {
            throw new Error(data?.message || `HTTP ${response.status}`);
        }

        return data.data as OrderTrackingData;
    },
};
