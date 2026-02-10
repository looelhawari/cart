import api from './client';

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
  delivered: number;
  cancelled: number;
  total_earnings: number;
  average_rating: number;
  total_deliveries_all_time: number;
}

// ─── API ─────────────────────────────────────────

export const driverApi = {
  getDashboard: async (): Promise<DriverDashboard> => {
    const res = await api.get('/driver/dashboard');
    return res.data.data;
  },

  toggleAvailability: async (): Promise<{ is_available: boolean; message: string }> => {
    const res = await api.post('/driver/toggle-availability');
    return { is_available: res.data.data.is_available, message: res.data.message };
  },

  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    order_id?: number;
  }): Promise<void> => {
    await api.post('/driver/location', data);
  },

  getOrders: async (params?: { status?: string; page?: number }): Promise<{
    data: DriverOrder[];
    current_page: number;
    last_page: number;
  }> => {
    const res = await api.get('/driver/orders', { params });
    return res.data.data;
  },

  getOrderDetails: async (orderId: number): Promise<DriverOrder> => {
    const res = await api.get(`/driver/orders/${orderId}`);
    return res.data.data;
  },

  acceptOrder: async (orderId: number): Promise<DriverOrder> => {
    const res = await api.post(`/driver/orders/${orderId}/accept`);
    return res.data.data;
  },

  pickupOrder: async (orderId: number): Promise<DriverOrder> => {
    const res = await api.post(`/driver/orders/${orderId}/pickup`);
    return res.data.data;
  },

  deliverOrder: async (orderId: number): Promise<DriverOrder> => {
    const res = await api.post(`/driver/orders/${orderId}/deliver`);
    return res.data.data;
  },

  rejectOrder: async (orderId: number, reason?: string): Promise<{ reassigned: boolean }> => {
    const res = await api.post(`/driver/orders/${orderId}/reject`, { reason });
    return res.data.data;
  },

  getStats: async (period?: '1d' | '7d' | '30d' | 'all'): Promise<DriverStats> => {
    const res = await api.get('/driver/stats', { params: { period } });
    return res.data.data;
  },
};
