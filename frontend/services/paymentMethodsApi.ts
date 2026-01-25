/**
 * Payment Methods API Service (Phase 5)
 * Updated: Phase 5.5 Stage 1 - Uses centralized httpClient
 *
 * Provides API functions for managing saved payment methods:
 * - List saved cards
 * - Set default card
 * - Delete card
 * - Initiate payment with saved card
 */

import httpClient from "./httpClient";
import {
  PaymentMethod,
  PaymentMethodsResponse,
  SetDefaultResponse,
  DeletePaymentMethodResponse,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  InitiateSavedCardPaymentRequest,
  InitiateSavedCardPaymentResponse,
} from "../types";

// ═══════════════════════════════════════════════════════
// PAYMENT METHODS CRUD
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/payment-methods
 *
 * Fetch all saved payment methods for authenticated user.
 * Returns ALL cards including expired (with is_expired flag).
 * Cards are sorted: default → eligible (non-expired verified) → others.
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const response =
    await httpClient.get<PaymentMethodsResponse>("/payment-methods");
  return response.data.payment_methods;
}

/**
 * PUT /api/v1/payment-methods/{id}/default
 *
 * Set a payment method as default.
 *
 * @throws Error if card is expired or unverified
 */
export async function setDefaultPaymentMethod(
  id: number,
): Promise<SetDefaultResponse> {
  return await httpClient.put<SetDefaultResponse>(
    `/payment-methods/${id}/default`,
  );
}

/**
 * DELETE /api/v1/payment-methods/{id}
 *
 * Soft delete a payment method.
 * If deleted card was default, backend auto-picks new default (returned in response).
 */
export async function deletePaymentMethod(
  id: number,
): Promise<DeletePaymentMethodResponse> {
  return await httpClient.delete<DeletePaymentMethodResponse>(
    `/payment-methods/${id}`,
  );
}

// ═══════════════════════════════════════════════════════
// PAYMENT INITIATION
// ═══════════════════════════════════════════════════════

/**
 * POST /api/v1/payments/paymob/initiate
 *
 * Initiate payment with NEW card.
 *
 * @param request.save_card - If true, card will be saved after successful payment
 * @returns iframe_url for 3DS challenge (if required)
 *
 * IMPORTANT (Phase 5.5): iframe_url redirect does NOT guarantee payment success.
 * Frontend must verify order.payment_status via backend after 3DS completion.
 */
export async function initiatePayment(
  request: InitiatePaymentRequest,
): Promise<InitiatePaymentResponse> {
  return await httpClient.post<InitiatePaymentResponse>(
    "/payments/paymob/initiate",
    request,
  );
}

/**
 * POST /api/v1/payments/paymob/initiate-with-saved-card
 *
 * Initiate payment with SAVED card (tokenized).
 *
 * CRITICAL: Returns iframe_url - saved cards MAY require 3DS challenge.
 * Frontend MUST handle WebView for potential 3DS flow.
 *
 * IMPORTANT (Phase 5.5): iframe_url redirect does NOT guarantee payment success.
 * Frontend must verify order.payment_status via backend after 3DS completion.
 *
 * @param request.payment_method_id - ID of saved card to use
 * @returns iframe_url for 3DS challenge (may be required even for saved cards)
 */
export async function initiatePaymentWithSavedCard(
  request: InitiateSavedCardPaymentRequest,
): Promise<InitiateSavedCardPaymentResponse> {
  return await httpClient.post<InitiateSavedCardPaymentResponse>(
    "/payments/paymob/initiate-with-saved-card",
    request,
  );
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Get eligible payment methods (verified + non-expired)
 * Use this to filter cards for payment selection.
 */
export function getEligiblePaymentMethods(
  methods: PaymentMethod[],
): PaymentMethod[] {
  return methods.filter((m) => m.is_verified && !m.is_expired);
}

/**
 * Get default payment method
 */
export function getDefaultPaymentMethod(
  methods: PaymentMethod[],
): PaymentMethod | undefined {
  return methods.find((m) => m.is_default);
}

// ═══════════════════════════════════════════════════════
// PAYMENT STATUS POLLING (Tokenization Phase 3)
// ═══════════════════════════════════════════════════════

/**
 * Payment Status Response
 */
export interface PaymentStatusResponse {
  success: boolean;
  data: {
    payment_id: number;
    order_id: number;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    transaction_id: string | null;
    amount: number;
    currency: string;
    flow: "classic_iframe" | "unified_3ds" | "moto";
    updated_at: string;
  };
}

/**
 * GET /api/v1/payments/status/{paymentId}
 *
 * Poll payment status for real-time updates.
 * Use this instead of relying on redirect URLs.
 *
 * Recommended: Poll every 2 seconds for up to 60 seconds.
 *
 * @param paymentId - Payment attempt ID from initiate response
 * @returns Current payment status
 */
export async function getPaymentStatus(
  paymentId: number,
): Promise<PaymentStatusResponse> {
  return await httpClient.get<PaymentStatusResponse>(
    `/payments/status/${paymentId}`,
  );
}

/**
 * Poll payment status until completion or timeout.
 *
 * @param paymentId - Payment ID to poll
 * @param onStatusChange - Callback for status updates
 * @param options - Polling configuration
 * @returns Final payment status
 */
export async function pollPaymentStatus(
  paymentId: number,
  onStatusChange?: (status: string) => void,
  options: {
    intervalMs?: number;
    maxAttempts?: number;
  } = {},
): Promise<PaymentStatusResponse["data"]> {
  const intervalMs = options.intervalMs || 2000; // 2 seconds
  const maxAttempts = options.maxAttempts || 30; // 60 seconds total

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;

        const response = await getPaymentStatus(paymentId);
        const { status } = response.data;

        onStatusChange?.(status);

        if (status === "PAID" || status === "FAILED" || status === "REFUNDED") {
          // Terminal state reached
          resolve(response.data);
        } else if (attempts >= maxAttempts) {
          // Timeout - return current state
          console.warn(
            `[PaymentPolling] Timeout after ${maxAttempts} attempts`,
          );
          resolve(response.data);
        } else {
          // Continue polling
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        console.error("[PaymentPolling] Error:", error);
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          // Retry on error
          setTimeout(poll, intervalMs);
        }
      }
    };

    poll();
  });
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Get card brand icon name for UI
 * Map backend card_brand to icon names
 */
export function getCardBrandIcon(brand: string): string {
  const icons: Record<string, string> = {
    visa: "credit-card",
    mastercard: "credit-card",
    amex: "credit-card",
    discover: "credit-card",
    card: "credit-card",
  };
  return icons[brand.toLowerCase()] || "credit-card";
}

/**
 * Format card for display
 * Example: "Visa •••• 4242"
 */
export function formatCardDisplay(method: PaymentMethod): string {
  const brandName =
    method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1);
  return `${brandName} •••• ${method.card_last_four}`;
}
