import { apiClient } from "@/lib/api-client";

export interface RefundRecord {
  id: number;
  order_id: number;
  user_id: number;
  type: "full" | "partial" | "penalty";
  original_amount: number;
  penalty_percent: number;
  penalty_amount: number;
  refund_amount: number;
  refund_method: "paymob" | "wallet" | "none";
  status: "pending" | "processing" | "completed" | "failed";
  reason: string | null;
  initiated_by: "customer" | "admin";
  admin_id: number | null;
  paymob_refund_id: string | null;
  paymob_transaction_id: string | null;
  failure_reason: string | null;
  refunded_items: any[] | null;
  idempotency_key: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: number;
    order_number: string;
    total: number;
    status: string;
    payment_method: string;
    user?: { id: number; name: string; email: string };
    items?: Array<{
      id: number;
      product_name: string;
      quantity: number;
      price: number;
      subtotal: number;
      refunded: boolean;
    }>;
  };
  admin?: { id: number; name: string };
}

export interface RefundFilters {
  page?: number;
  per_page?: number;
  status?: string[];
  type?: string[];
  initiated_by?: string;
  refund_method?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface RefundStats {
  total_refunds: number;
  completed_refunds: number;
  processing_refunds: number;
  failed_refunds: number;
  pending_refunds: number;
  total_refunded_amount: number;
  total_penalty_collected: number;
  avg_refund_amount: number;
  customer_initiated: number;
  admin_initiated: number;
  full_refund_amount: number;
  penalty_refund_amount: number;
  partial_refund_amount: number;
}

export interface RefundStatsResponse {
  stats: RefundStats;
  daily_breakdown: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  date_range: { from: string; to: string };
}

export interface PaginatedRefunds {
  refunds: RefundRecord[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

/**
 * Helper to unwrap Laravel's { success, data } envelope.
 * apiClient.get() already strips the axios wrapper, so the caller
 * receives { success: true, data: { … } }.  We extract .data here.
 */
function unwrap<T>(response: any): T {
  if (response && typeof response === "object" && "data" in response) {
    return response.data as T;
  }
  return response as T;
}

export const refundDashboardService = {
  /** GET /admin/refund-dashboard → { refunds[], pagination } */
  getRefunds: async (filters?: RefundFilters): Promise<PaginatedRefunds> => {
    const response = await apiClient.get("/admin/refund-dashboard", filters);
    return unwrap<PaginatedRefunds>(response);
  },

  /** GET /admin/refund-dashboard/:id → { refund } */
  getRefund: async (id: number): Promise<RefundRecord> => {
    const response = await apiClient.get(`/admin/refund-dashboard/${id}`);
    const data = unwrap<{ refund: RefundRecord }>(response);
    return data.refund;
  },

  /** GET /admin/refund-dashboard/stats → { stats, daily_breakdown, date_range } */
  getStats: async (
    dateFrom?: string,
    dateTo?: string,
  ): Promise<RefundStatsResponse> => {
    const params: any = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const response = await apiClient.get(
      "/admin/refund-dashboard/stats",
      params,
    );
    return unwrap<RefundStatsResponse>(response);
  },

  /** POST /admin/refund-dashboard/reconcile */
  reconcile: async (): Promise<{ reconciled: number; message: string }> => {
    const response = await apiClient.post("/admin/refund-dashboard/reconcile");
    return unwrap<{ reconciled: number; message: string }>(response);
  },

  /** POST /admin/refund-dashboard/partial-item-refund */
  partialItemRefund: async (
    orderId: number,
    itemIds: number[],
    reason: string,
  ): Promise<any> => {
    const response = await apiClient.post(
      "/admin/refund-dashboard/partial-item-refund",
      {
        order_id: orderId,
        item_ids: itemIds,
        reason,
      },
    );
    return unwrap<any>(response);
  },
};
