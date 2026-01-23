import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys for payment recovery
export const PENDING_PAYMENT_ORDER_KEY = "@payment:pending_order";
export const PAYMENT_ATTEMPT_KEY = "@payment:attempt";
export const ACTIVE_PAYMENT_FLOW_KEY = "@payment:active_flow";

export interface PendingPaymentData {
  orderId: number;
  orderNumber: string;
  total: number;
  paymentAttemptId?: number;
  timestamp: number;
  iframeUrl?: string;
}

/**
 * Mark that we're in an active payment flow (to prevent recovery screen interference)
 */
export const setActivePaymentFlow = async (active: boolean): Promise<void> => {
  try {
    if (active) {
      const timestamp = Date.now().toString();
      await AsyncStorage.setItem(ACTIVE_PAYMENT_FLOW_KEY, timestamp);
    } else {
      await AsyncStorage.removeItem(ACTIVE_PAYMENT_FLOW_KEY);
    }
  } catch (error) {
    console.error("Failed to set active payment flow:", error);
  }
};

/**
 * Check if we're in an active payment flow
 * Auto-expires after 5 minutes (safety for app kills during payment)
 */
export const isActivePaymentFlow = async (): Promise<boolean> => {
  try {
    const timestamp = await AsyncStorage.getItem(ACTIVE_PAYMENT_FLOW_KEY);
    if (!timestamp) return false;

    const startTime = parseInt(timestamp);
    const now = Date.now();
    const elapsed = now - startTime;

    // Active flow expires after 5 minutes (payment should complete by then)
    if (elapsed > 5 * 60 * 1000) {
      await setActivePaymentFlow(false);
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Save pending payment order to AsyncStorage for recovery
 * Called RIGHT BEFORE redirecting to Paymob
 */
export const savePendingPayment = async (
  data: PendingPaymentData,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      PENDING_PAYMENT_ORDER_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      }),
    );
    // Mark as active payment flow
    await setActivePaymentFlow(true);
  } catch (error) {
    console.error("Failed to save pending payment:", error);
  }
};

/**
 * Get pending payment order if exists
 * Called on app resume / cold start
 */
export const getPendingPayment =
  async (): Promise<PendingPaymentData | null> => {
    try {
      const data = await AsyncStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
      if (!data) return null;

      const payment: PendingPaymentData = JSON.parse(data);

      // Expire after 2 hours
      if (Date.now() - payment.timestamp > 2 * 60 * 60 * 1000) {
        await clearPendingPayment();
        return null;
      }

      return payment;
    } catch (error) {
      console.error("Failed to get pending payment:", error);
      return null;
    }
  };

/**
 * Clear pending payment from storage
 * Called after successful payment confirmation or order cancellation
 */
export const clearPendingPayment = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_PAYMENT_ORDER_KEY);
    await AsyncStorage.removeItem(PAYMENT_ATTEMPT_KEY);
    await setActivePaymentFlow(false);
  } catch (error) {
    console.error("Failed to clear pending payment:", error);
  }
};

/**
 * Check if there's a pending payment on app start
 */
export const hasPendingPayment = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(PENDING_PAYMENT_ORDER_KEY);
    return data !== null;
  } catch {
    return false;
  }
};
