/**
 * Payment Error Messages - User-Friendly Mapping
 * Maps technical Paymob errors to human-readable messages
 */

export interface PaymentErrorMessage {
  title: string;
  message: string;
  actionable: boolean;
  retryable: boolean;
}

export const mapPaymentError = (
  paymobMessage: string | undefined,
): PaymentErrorMessage => {
  const message = paymobMessage?.toLowerCase() || "";

  // Authentication failures
  if (
    message.includes("authentication failed") ||
    message.includes("3ds failed") ||
    message.includes("3d secure")
  ) {
    return {
      title: "Payment Verification Failed",
      message:
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
      title: "Payment Cancelled",
      message: "You cancelled the payment. Your order is still pending.",
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
      title: "Payment Declined",
      message:
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
      title: "Card Error",
      message: "There's an issue with your card. Please use a different card.",
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
      title: "Connection Error",
      message:
        "We couldn't connect to the payment service. Please check your internet and try again.",
      actionable: true,
      retryable: true,
    };
  }

  // Generic system error
  if (message.includes("system error") || message.includes("technical")) {
    return {
      title: "Payment Service Unavailable",
      message:
        "The payment service is temporarily unavailable. Please try again in a few minutes.",
      actionable: true,
      retryable: true,
    };
  }

  // Default fallback
  return {
    title: "Payment Failed",
    message:
      "We couldn't process your payment. Don't worry, no money was deducted. Please try again.",
    actionable: true,
    retryable: true,
  };
};

/**
 * Get reassuring message for pending payments
 */
export const getPendingPaymentMessage = (): string => {
  return "Your payment is being processed. This usually takes a few seconds.";
};

/**
 * Get success message
 */
export const getSuccessMessage = (): string => {
  return "Payment successful! Your order has been confirmed.";
};
