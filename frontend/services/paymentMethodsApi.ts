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
 *
 * IMPORTANT: Polling is READ-ONLY. The backend webhook (processedCallback)
 * is the ONLY authority that transitions payment state.
 * The `message` field reminds the frontend of this contract.
 */
export interface PaymentStatusResponse {
  success: boolean;
  data: {
    payment_id: number;
    order_id: number;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    order_payment_status: string | null; // e.g. "completed", "failed", "pending"
    order_status: string | null; // e.g. "processing", "confirmed"
    transaction_id: string | null;
    amount: number;
    currency: string;
    flow: "classic_iframe" | "unified_3ds" | "moto";
    updated_at: string;
    paymob_status: string | null; // Remote Paymob status (e.g. "PROCESSED")
    paymob_success: boolean | null; // Remote Paymob success flag
    message: string; // "Final confirmation is webhook-based..."
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
    /**
     * Cancellation signal. When aborted, the next scheduled tick is
     * cancelled and the promise resolves with whatever data was last seen
     * (or rejects with the abort reason if nothing was ever fetched). This
     * exists because the verification screen can be unmounted mid-poll —
     * without abort support, setTimeout-based ticks would keep firing
     * /payments/status/{id} forever, hammering the server and burning
     * battery.
     */
    signal?: AbortSignal;
  } = {},
): Promise<PaymentStatusResponse["data"]> {
  const intervalMs = options.intervalMs || 2000;
  const maxAttempts = options.maxAttempts || 30;
  const signal = options.signal;

  let attempts = 0;
  let lastSeen: PaymentStatusResponse["data"] | null = null;

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Single abort handler that tears down the in-flight loop. If we have
    // a snapshot of the latest response we resolve with that so callers
    // can decide what to do with it; otherwise we reject so the caller's
    // try/catch can render an error state instead of hanging.
    const onAbort = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (lastSeen) {
        resolve(lastSeen);
      } else {
        reject(
          signal?.reason instanceof Error
            ? signal.reason
            : new Error("Polling aborted"),
        );
      }
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const poll = async () => {
      if (signal?.aborted) return; // safety: caller cancelled between ticks

      try {
        attempts++;

        const response = await getPaymentStatus(paymentId);
        lastSeen = response.data;

        if (signal?.aborted) return;

        const { status } = response.data;
        onStatusChange?.(status);

        if (status === "PAID" || status === "FAILED" || status === "REFUNDED") {
          resolve(response.data);
        } else if (attempts >= maxAttempts) {
          // Timed out with no terminal state. Resolve with the last snapshot
          // so the caller can route to a "still processing" screen rather
          // than rejecting and showing a generic error.
          console.warn(
            `[PaymentPolling] Timeout after ${maxAttempts} attempts`,
          );
          resolve(response.data);
        } else {
          timer = setTimeout(poll, intervalMs);
        }
      } catch (error) {
        console.error("[PaymentPolling] Error:", error);
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          timer = setTimeout(poll, intervalMs);
        }
      }
    };

    poll();
  });
}

// ═══════════════════════════════════════════════════════
// CARD DISPLAY HELPERS
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
