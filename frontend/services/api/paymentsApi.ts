import { apiRequest } from "./base";

export interface InitiatePaymentRequest {
  order_id: number;
  payment_method: "CARD";
  billing_data: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    city: string;
    street: string;
  };
}

export interface InitiatePaymentResponse {
  success: boolean;
  data?: {
    payment_id: number;
    payment_token: string;
    iframe_url: string;
    amount: number;
    currency: string;
  };
  message?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  data?: {
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    amount: number;
    currency: string;
    payment_method: "CARD";
    paid_at: string | null;
    transaction_id: string | null;
  };
  message?: string;
}

/**
 * Initiate payment with Paymob AFTER order creation (Industry Standard)
 */
export const initiatePayment = async (
  data: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> => {
  return await apiRequest("/payments/paymob/initiate", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

/**
 * Get payment status for an order
 */
export const getPaymentStatus = async (
  orderId: number,
): Promise<PaymentStatusResponse> => {
  return await apiRequest(`/payments/order/${orderId}/status`, {
    method: "GET",
  });
};
