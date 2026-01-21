import { apiRequest } from "./base";

export interface DeliverySlot {
  slot: string;
  capacity: number;
  is_active: boolean;
}

export interface CheckoutAddress {
  id: number;
  user_id: number;
  label: string;
  recipient_name: string;
  phone_number: string;
  street_address: string;
  building_number: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  city: string;
  governorate: string;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckoutPaymentMethod {
  id: number;
  user_id: number;
  payment_gateway: string;
  token: string;
  card_last4: string;
  card_brand: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderSummary {
  subtotal: number;
  delivery_fee: number;
  tax: number;
  discount: number;
  total: number;
  applied_promo: string | null;
  free_delivery_threshold: number;
  tax_rate: number;
}

export const checkoutApi = {
  /**
   * Get available delivery time slots
   */
  getDeliverySlots: () => {
    return apiRequest<{
      success: boolean;
      data: { delivery_slots: DeliverySlot[] };
    }>("/checkout/delivery-slots", { method: "GET" });
  },

  /**
   * Get user's saved delivery addresses
   */
  getAddresses: () => {
    return apiRequest<{
      success: boolean;
      data: { addresses: CheckoutAddress[] };
    }>("/checkout/addresses", {
      method: "GET",
    });
  },

  /**
   * Get user's saved payment methods
   */
  getPaymentMethods: () => {
    return apiRequest<{
      success: boolean;
      data: { payment_methods: CheckoutPaymentMethod[] };
    }>("/checkout/payment-methods", { method: "GET" });
  },

  /**
   * Calculate order summary with promo code (if any)
   */
  calculateSummary: (promoCode?: string) => {
    return apiRequest<{ success: boolean; data: { summary: OrderSummary } }>(
      "/checkout/calculate",
      {
        method: "POST",
        body: JSON.stringify({ promo_code: promoCode }),
      },
    );
  },
};

// Export convenience methods
export const getDeliverySlots = checkoutApi.getDeliverySlots;
export const getAddresses = checkoutApi.getAddresses;
export const getPaymentMethods = checkoutApi.getPaymentMethods;
export const calculateSummary = checkoutApi.calculateSummary;
