import {
  API_BASE_URL,
  safeJsonParse,
  safeResponseJson,
  getAuthToken,
} from "./base";
import { getSessionId } from "./cartApi";
import type { PromoSummary } from "./types";

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name_en: string;
    image: string;
  };
}

export interface OrderStatusHistory {
  id: number;
  order_id: number;
  status: string;
  notes: string | null;
  changed_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  order_number: string;
  status: string;
  status_label: string;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: "cod" | "card";
  payment_method_id: number | null;
  payment_status: "pending" | "completed" | "failed" | "refunded"; // STEP 4: Use 'completed' not 'paid'
  delivery_address_id: number;
  delivery_date: string;
  delivery_time_slot: string;
  delivery_notes: string | null;
  promo_code?: string | null;
  promo_code_snapshot?: PromoSummary | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  delivery_address?: any;
  status_history?: OrderStatusHistory[];
}

export interface CreateOrderData {
  delivery_address_id: number;
  delivery_date: string;
  delivery_time_slot: string;
  payment_method: "cod" | "card";
  payment_method_id?: number;
  delivery_notes?: string;
  promo_code?: string;
}

export const orderApi = {
  /**
   * Get user's orders with optional status filter
   */
  getOrders: async (status?: string, page: number = 1, perPage: number = 10) => {
    const token = await getAuthToken();
    const queryParams = new URLSearchParams();
    if (status) queryParams.append("status", status);
    queryParams.append("page", page.toString());
    queryParams.append("per_page", perPage.toString());

    const response = await fetch(`${API_BASE_URL}/orders?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    // Use safeResponseJson to handle JSON errors gracefully
    const data = await safeResponseJson(response);

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  },

  /**
   * Get a single order by ID
   */
  getOrder: async (orderId: number) => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },

  /**
   * Create a new order from cart
   */
  createOrder: async (data: CreateOrderData) => {
    const token = await getAuthToken();
    const sessionId = await getSessionId();

    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        "X-Session-ID": sessionId,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },

  /**
   * Cancel an order
   */
  cancelOrder: async (orderId: number, reason: string) => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ cancellation_reason: reason }),
    });

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },

  /**
   * Reorder (add order items back to cart)
   */
  reorder: async (orderId: number) => {
    const token = await getAuthToken();
    const { getSessionId } = await import("./cartApi");
    const sessionId = await getSessionId();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/reorder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        "X-Session-ID": sessionId,
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },
};

// Export convenience methods
export const getOrders = orderApi.getOrders;
export const getOrder = orderApi.getOrder;
export const createOrder = orderApi.createOrder;
export const cancelOrder = orderApi.cancelOrder;
export const reorder = orderApi.reorder;
