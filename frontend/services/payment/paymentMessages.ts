/**
 * Payment Error Messages - User-Friendly Mapping
 * Maps technical Paymob errors to human-readable messages
 * Accepts i18n translations for bilingual support
 */

export interface PaymentErrorMessage {
  title: string;
  message: string;
  actionable: boolean;
  retryable: boolean;
}

export interface PaymentErrorTranslations {
  verificationFailedTitle: string;
  verificationFailedMessage: string;
  cancelledTitle: string;
  cancelledMessage: string;
  declinedTitle: string;
  declinedMessage: string;
  cardErrorTitle: string;
  cardErrorMessage: string;
  connectionErrorTitle: string;
  connectionErrorMessage: string;
  serviceUnavailableTitle: string;
  serviceUnavailableMessage: string;
  failedTitle: string;
  failedMessage: string;
  pendingMessage: string;
  successMessage: string;
}

export const mapPaymentError = (
  paymobMessage: string | undefined,
  translations?: PaymentErrorTranslations,
): PaymentErrorMessage => {
  const message = paymobMessage?.toLowerCase() || "";

  // Authentication failures
  if (
    message.includes("authentication failed") ||
    message.includes("3ds failed") ||
    message.includes("3d secure")
  ) {
    return {
      title: translations?.verificationFailedTitle || "Payment Verification Failed",
      message: translations?.verificationFailedMessage ||
        "We couldn't verify your payment. Please try again or use a different card.",
      actionable: true,
      retryable: true,
    };
  }

  // User cancelled
  if (
    message.includes("cancelled") ||
    message.includes("canceled") ||
    message.includes("user aborted")
  ) {
    return {
      title: translations?.cancelledTitle || "Payment Cancelled",
      message: translations?.cancelledMessage || "You cancelled the payment. Your order is still pending.",
      actionable: true,
      retryable: true,
    };
  }

  // Bank rejected
  if (
    message.includes("declined") ||
    message.includes("rejected") ||
    message.includes("insufficient funds") ||
    message.includes("card declined")
  ) {
    return {
      title: translations?.declinedTitle || "Payment Declined",
      message: translations?.declinedMessage ||
        "Your bank declined this transaction. Please check with your bank or try another card.",
      actionable: true,
      retryable: true,
    };
  }

  // Invalid card
  if (
    message.includes("invalid card") ||
    message.includes("card expired") ||
    message.includes("card number")
  ) {
    return {
      title: translations?.cardErrorTitle || "Card Error",
      message: translations?.cardErrorMessage || "There's an issue with your card. Please use a different card.",
      actionable: true,
      retryable: true,
    };
  }

  // System/network errors
  if (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("connection")
  ) {
    return {
      title: translations?.connectionErrorTitle || "Connection Error",
      message: translations?.connectionErrorMessage ||
        "We couldn't connect to the payment service. Please check your internet and try again.",
      actionable: true,
      retryable: true,
    };
  }

  // Generic system error
  if (message.includes("system error") || message.includes("technical")) {
    return {
      title: translations?.serviceUnavailableTitle || "Payment Service Unavailable",
      message: translations?.serviceUnavailableMessage ||
        "The payment service is temporarily unavailable. Please try again in a few minutes.",
      actionable: true,
      retryable: true,
    };
  }

  // Default fallback
  return {
    title: translations?.failedTitle || "Payment Failed",
    message: translations?.failedMessage ||
      "We couldn't process your payment. Don't worry, no money was deducted. Please try again.",
    actionable: true,
    retryable: true,
  };
};

/**
 * Get reassuring message for pending payments
 */
export const getPendingPaymentMessage = (translations?: PaymentErrorTranslations): string => {
  return translations?.pendingMessage || "Your payment is being processed. This usually takes a few seconds.";
};

/**
 * Get success message
 */
export const getSuccessMessage = (translations?: PaymentErrorTranslations): string => {
  return translations?.successMessage || "Payment successful! Your order has been confirmed.";
};
