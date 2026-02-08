import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, safeJsonParse, getAuthToken } from "./base";
import { Cart } from "./types";

// Session ID management for guest carts
const SESSION_ID_KEY = "guest_session_id";

// Helper: Get or create session ID for guest users
export const getSessionId = async (): Promise<string> => {
  let sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    // Generate UUID v4
    sessionId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
    await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
};

// Helper: Clear session ID
export const clearSessionId = async () => {
  await AsyncStorage.removeItem(SESSION_ID_KEY);
};

/**
 * Get cart (guest or authenticated)
 * GET /api/v1/cart
 */
export const getCart = async (): Promise<{
  success: boolean;
  data: { cart: Cart };
}> => {
  const token = await getAuthToken();
  // Always send session ID to ensure cart consistency
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Add item to cart
 * POST /api/v1/cart/items
 */
export const addToCart = async (
  productId: number,
  quantity: number = 1,
): Promise<{ success: boolean; message: string; data: { cart: Cart } }> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Update cart item quantity
 * PUT /api/v1/cart/items/{id}
 */
export const updateCartItem = async (
  itemId: number,
  quantity: number,
): Promise<{ success: boolean; message: string; data: { cart: Cart } }> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Remove item from cart
 * DELETE /api/v1/cart/items/{id}
 */
export const removeCartItem = async (
  itemId: number,
): Promise<{ success: boolean; message: string; data: { cart: Cart } }> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Clear all items from cart
 * DELETE /api/v1/cart/clear
 */
export const clearCart = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/clear`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Apply promo code to cart
 * POST /api/v1/cart/apply-promo
 */
export const applyPromoCode = async (
  code: string,
): Promise<{ success: boolean; message: string; data: any }> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/apply-promo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

/**
 * Remove promo code from cart
 * DELETE /api/v1/cart/remove-promo
 */
export const removePromoCode = async (): Promise<{
  success: boolean;
  message: string;
  data: { cart: Cart };
}> => {
  const token = await getAuthToken();
  const sessionId = await getSessionId();

  const response = await fetch(`${API_BASE_URL}/cart/remove-promo`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error = await safeJsonParse(response);
    throw error;
  }

  return await safeJsonParse(response);
};

// Export all cart operations
export const cartApi = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyPromoCode,
  removePromoCode,
};
