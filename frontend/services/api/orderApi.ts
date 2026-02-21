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
  refunded: boolean;
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
  payment_method:
    | "cod"
    | "card"
    | "cash_on_delivery"
    | "wallet"
    | "wallet+card";
  payment_method_id: number | null;
  payment_status:
    | "pending"
    | "completed"
    | "failed"
    | "refunded"
    | "partially_refunded";
  delivery_address_id: number;
  delivery_date: string;
  delivery_time_slot: string;
  delivery_notes: string | null;
  promo_code?: string | null;
  promo_code_snapshot?: PromoSummary | null;
  refunded_amount?: number;
  refunded_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  delivery_address?: any;
  status_history?: OrderStatusHistory[];
  refunds?: OrderRefund[];
}

export interface RefundedItemDetail {
  item_id: number;
  product_name: string;
  quantity: number;
  amount: number;
}

export interface OrderRefund {
  id: number;
  order_id: number;
  type: "full" | "partial" | "penalty";
  original_amount: number;
  penalty_percent: number;
  penalty_amount: number;
  refund_amount: number;
  refund_method: "paymob" | "wallet" | "none";
  status: "pending" | "processing" | "completed" | "failed";
  reason: string | null;
  initiated_by: "customer" | "admin";
  refunded_items: RefundedItemDetail[] | null;
  completed_at: string | null;
  created_at: string;
}

export interface CancellationEligibility {
  can_cancel: boolean;
  can_partial_cancel: boolean;
  reason: string;
  refund_type: "full" | "penalty" | "none" | null;
  refund_percent: number;
  penalty_percent: number;
  estimated_refund?: number;
}

export interface CancellationReason {
  key: string;
  label_en: string;
  label_ar: string;
}

export interface PartialCancelResult {
  success: boolean;
  message: string;
  refund?: {
    id: number;
    type: string;
    amount: number;
    refund_amount?: number;
    penalty_amount?: number;
    penalty_percent?: number;
    estimated_days?: string;
    items: Array<{
      item_id: number;
      product_name: string;
      quantity: number;
      amount: number;
    }>;
    status: string;
  };
  order?: Order;
}

export interface CancelResult {
  success: boolean;
  message: string;
  data: {
    order: Order;
    refund: {
      id: number;
      type: string;
      original_amount: number;
      penalty_percent: number;
      penalty_amount: number;
      refund_amount: number;
      status: string;
      estimated_days: string;
    } | null;
  };
}

export interface CreateOrderData {
  delivery_address_id: number;
  delivery_date: string;
  delivery_time_slot: string;
  payment_method: "cod" | "card" | "cash_on_delivery";
  payment_method_id?: number;
  notes?: string;
  promo_code?: string;
}

/** Structured invoice data returned by GET /orders/{id}/invoice */
export interface InvoiceData {
  store: {
    name: string;
    legal_name: string;
    address: string;
    phone: string;
    email: string;
    vat_reg: string;
    tax_rate: number;
  };
  invoice_number: string;
  order_number: string;
  order_id: number;
  order_date: string;
  status: string;
  status_label: string;

  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };

  delivery_address: {
    label: string;
    street: string;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    city: string;
    area: string | null;
    landmark: string | null;
  } | null;
  delivery_date: string | null;
  delivery_slot: string | null;

  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    refunded: boolean;
  }>;

  subtotal: string;
  delivery_fee: string;
  tax: string;
  tax_rate: number;
  discount: string;
  promo: any | null;
  total: string;

  payment_method: string;
  payment_label: string;
  payment_status: string;

  refunds: Array<{
    id: number;
    type: "full" | "partial" | "penalty";
    original_amount: string;
    penalty_percent: number;
    penalty_amount: string;
    refund_amount: string;
    refund_method: string;
    status: string;
    reason: string | null;
    refunded_items: Array<{
      product_name?: string;
      quantity?: number;
      amount?: number;
    }>;
    created_at: string;
  }>;
  total_refunded: string;
  net_paid: string;

  cancelled_at: string | null;
  cancellation_reason: string | null;

  generated_at: string;
}

export const orderApi = {
  /**
   * Get user's orders with optional status filter
   */
  getOrders: async (
    status?: string,
    page: number = 1,
    perPage: number = 10,
  ) => {
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
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
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
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
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
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
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
   * Cancel an order (with enterprise refund processing)
   */
  cancelOrder: async (
    orderId: number,
    reason: string,
  ): Promise<CancelResult> => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json; charset=utf-8",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ reason: reason }),
    });

    const data = await safeJsonParse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to cancel order");
    }

    return data;
  },

  /**
   * Check if an order can be cancelled (pre-check for UI)
   */
  checkCancellationEligibility: async (
    orderId: number,
  ): Promise<CancellationEligibility> => {
    const token = await getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/orders/${orderId}/can-cancel`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; charset=utf-8",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const data = await safeJsonParse(response);

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to check cancellation eligibility",
      );
    }

    return data.data;
  },

  /**
   * Get refund history for an order
   */
  getRefundHistory: async (orderId: number): Promise<OrderRefund[]> => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/refunds`, {
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
      throw new Error(data?.message || "Failed to get refund history");
    }

    return data.data.refunds;
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
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "CART-Mobile-App",
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

  /**
   * Get predefined cancellation reasons
   */
  getCancellationReasons: async (): Promise<CancellationReason[]> => {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/orders/cancellation-reasons`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; charset=utf-8",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const data = await safeResponseJson(response);
    // Backend returns { id, label, label_ar } — map to { key, label_en, label_ar }
    const reasons = data?.data || [];
    return reasons.map((r: any) => ({
      key: r.key || r.id || r.value,
      label_en: r.label_en || r.label || r.name,
      label_ar: r.label_ar || r.label,
    }));
  },

  /**
   * Customer partial item cancel/refund
   */
  partialItemCancel: async (
    orderId: number,
    itemIds: number[],
    reason: string,
  ): Promise<PartialCancelResult> => {
    const token = await getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/orders/${orderId}/partial-cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; charset=utf-8",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ item_ids: itemIds, reason }),
      },
    );

    if (!response.ok) {
      const error = await safeJsonParse(response);
      throw error;
    }

    return await safeJsonParse(response);
  },

  /**
   * Get invoice data as JSON (for in-app receipt view)
   */
  getInvoiceData: async (orderId: number): Promise<InvoiceData> => {
    const token = await getAuthToken();

    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice`, {
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
      throw new Error(data?.message || "Failed to load invoice");
    }

    return data.data;
  },

  /**
   * Get the download URL for the invoice PDF
   */
  getInvoiceDownloadUrl: (orderId: number): string => {
    return `${API_BASE_URL}/orders/${orderId}/invoice/download`;
  },

  /**
   * Email invoice PDF to the customer's email address
   */
  emailInvoice: async (orderId: number): Promise<{ success: boolean; message: string }> => {
    const token = await getAuthToken();

    const response = await fetch(
      `${API_BASE_URL}/orders/${orderId}/invoice/email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; charset=utf-8",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "CART-Mobile-App",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
    );

    const data = await safeJsonParse(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to send invoice email");
    }

    return data;
  },
};

// Export convenience methods
export const getOrders = orderApi.getOrders;
export const getOrder = orderApi.getOrder;
export const createOrder = orderApi.createOrder;
export const cancelOrder = orderApi.cancelOrder;
export const checkCancellationEligibility =
  orderApi.checkCancellationEligibility;
export const getRefundHistory = orderApi.getRefundHistory;
export const reorder = orderApi.reorder;
export const getCancellationReasons = orderApi.getCancellationReasons;
export const partialItemCancel = orderApi.partialItemCancel;
export const getInvoiceData = orderApi.getInvoiceData;
export const getInvoiceDownloadUrl = orderApi.getInvoiceDownloadUrl;
export const emailInvoice = orderApi.emailInvoice;

