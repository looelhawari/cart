import { apiRequest } from "./base";

export interface DeliverySlot {
  slot: string;
  start_hour: number;
  end_hour: number;
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

export interface DeliveryZoneInfo {
  is_deliverable: boolean;
  zone_id?: number | null;
  zone_name?: string | null;
  zone_name_ar?: string | null;
  delivery_fee?: number;
  minimum_order?: number;
  meets_minimum?: boolean;
  estimated_delivery_time?: string | null;
  error?: string;
}

export interface OrderSummary {
  subtotal: number;
  delivery_fee: number;
  tax: number;
  discount: number;
  total: number;
  applied_promo?: string | null;
  promo_code?: any;
  // Zone-based delivery info for the selected address. is_deliverable=false
  // means the address is outside all delivery zones.
  zone?: DeliveryZoneInfo | null;
  free_delivery_threshold?: number;
  tax_rate?: number;
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
   * Calculate order summary with promo code and address (for zone-based delivery fees)
   */
  calculateSummary: (promoCode?: string, addressId?: number) => {
    return apiRequest<{ success: boolean; data: { summary: OrderSummary } }>(
      "/checkout/calculate",
      {
        method: "POST",
        body: JSON.stringify({
          promo_code: promoCode,
          address_id: addressId,
        }),
      },
    );
  },
};

// Export convenience methods
export const getDeliverySlots = checkoutApi.getDeliverySlots;
export const getAddresses = checkoutApi.getAddresses;
export const getPaymentMethods = checkoutApi.getPaymentMethods;
export const calculateSummary = checkoutApi.calculateSummary;
