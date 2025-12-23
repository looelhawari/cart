import api from "./index";

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
  payment_status: "pending" | "paid" | "failed" | "refunded";
  delivery_address_id: number;
  delivery_date: string;
  delivery_time_slot: string;
  delivery_notes: string | null;
  promo_code: string | null;
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
  getOrders: (status?: string, page: number = 1) => {
    return api.get<{
      orders: {
        data: Order[];
        total: number;
        per_page: number;
        current_page: number;
      };
    }>("/orders", { params: { status, page } });
  },

  /**
   * Get a single order by ID
   */
  getOrder: (orderId: number) => {
    return api.get<{ order: Order }>(`/orders/${orderId}`);
  },

  /**
   * Create a new order from cart
   */
  createOrder: (data: CreateOrderData) => {
    return api.post<{ order: Order; message: string }>("/orders", data);
  },

  /**
   * Cancel an order
   */
  cancelOrder: (orderId: number, reason: string) => {
    return api.post<{ order: Order; message: string }>(
      `/orders/${orderId}/cancel`,
      {
        cancellation_reason: reason,
      }
    );
  },

  /**
   * Reorder (add order items back to cart)
   */
  reorder: (orderId: number) => {
    return api.post<{ cart: any; message: string }>(
      `/orders/${orderId}/reorder`
    );
  },
};

// Export convenience methods
export const getOrders = orderApi.getOrders;
export const getOrder = orderApi.getOrder;
export const createOrder = orderApi.createOrder;
export const cancelOrder = orderApi.cancelOrder;
export const reorder = orderApi.reorder;
