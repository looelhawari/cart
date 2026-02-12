/**
 * Payments API Service — Re-exports from canonical paymentMethodsApi
 *
 * IMPORTANT: This file exists ONLY for backward compatibility.
 * All payment API functions are defined in @/services/paymentMethodsApi.
 *
 * DO NOT add new functions here. Import from @/services/paymentMethodsApi instead.
 */

export {
  initiatePayment,
  getPaymentStatus,
  pollPaymentStatus,
  type PaymentStatusResponse,
} from "../paymentMethodsApi";
